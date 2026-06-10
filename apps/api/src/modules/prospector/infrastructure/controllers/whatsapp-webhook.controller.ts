import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GoogleCalendarService } from '../../infrastructure/google-calendar.service';

@ApiTags('Nexus Prospector Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  
  // 1. BLINDAGEM DE CONCORRÊNCIA: Trava in-memory para evitar loops de processamento
  private static activeLocks = new Set<string>();

  constructor(
    @InjectQueue('whatsapp-inbound') private readonly whatsappQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService, // Injetado para amarração/alinhamento com o worker
  ) {}

  @Post('evolution')
  @ApiOperation({ summary: 'Evolution API Webhook Inbound (Synchronous Persistence Mode)' })
  async handleEvolutionWebhook(
    @Body() payload: any,
  ) {
    this.logger.debug(`GOD-MODE: Webhook Received. Event: ${payload.event}`);

    // 1. Robust Data Extraction
    const data = payload.data || {};
    const info = data.Info || {};
    const message = data.Message || {};

    const externalId = info.ID || data.key?.id;
    const remoteJid = info.Sender || info.Chat || data.key?.remoteJid || '';
    const isFromMe = info.IsFromMe === true || data.key?.fromMe === true;
    
    let messageDate: Date;
    if (info.Timestamp && typeof info.Timestamp === 'string') {
      messageDate = new Date(info.Timestamp);
    } else {
      const ts = data.messageTimestamp || info.Timestamp || Math.floor(Date.now() / 1000);
      messageDate = new Date(ts * 1000);
    }

    const messageContent = message.conversation || 
                           message.extendedTextMessage?.text ||
                           message.buttonsResponseMessage?.selectedDisplayText ||
                           data.message?.conversation ||
                           '';

    if (!externalId) return { skipped: true, reason: 'no_id' };
    if (isFromMe) return { skipped: true, reason: 'is_from_me' };
    if (remoteJid.includes('@status') || remoteJid.includes('@newsletter')) return { skipped: true, reason: 'system_message' };
    if (!messageContent) return { skipped: true, reason: 'empty_content' };

    // 2. Global Lead Match
    const rawPhone = remoteJid.split('@')[0].split(':')[0];
    const phoneSignature = rawPhone.replace(/\D/g, '').slice(-8);

    return this.prisma.client.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { phone: { endsWith: phoneSignature } },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          score: true,
          status: true,
          unitId: true,
          organizationId: true,
          metadata: true
        }
      });

      if (!lead) {
        this.logger.warn(`GOD-MODE WARN: Lead not found! Phone: ${rawPhone}`);
        return { skipped: true, reason: 'lead_not_found' };
      }

      // LOCK CHECK: Se já estiver processando este lead, aborte.
      if (WhatsAppWebhookController.activeLocks.has(lead.id)) {
        this.logger.warn(`CONCURRENCY GUARD: Aborting concurrent execution for lead ${lead.id}`);
        return { status: 'accepted', message: 'concurrency_lock_active' };
      }

      // 3. PERSISTÊNCIA SÍNCRONA
      const existingInteraction = await tx.interaction.findUnique({
        where: { externalId },
        select: { id: true }
      });
      if (existingInteraction) return { skipped: true, reason: 'duplicate' };

      // SET LOCK
      WhatsAppWebhookController.activeLocks.add(lead.id);

      try {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const hasEmailInMessage = emailRegex.test(messageContent);
        const hasEmailInDb = !!(lead.email && lead.email.includes('@'));
        const isEmailCaptured = hasEmailInMessage || hasEmailInDb;

        const hasChannel = /meet|zoom/i.test(messageContent) || 
          (lead.metadata && typeof lead.metadata === 'object' && 
            (('meetingChannel' in (lead.metadata as any)) || ('channel' in (lead.metadata as any))));
        const hasScheduleKeywords = /agenda|marca|confirm|quarta|quinta|sexta|terça|segunda|sábado|domingo|hora|h/i.test(messageContent);
        const isChannelAndScheduleDefined = hasChannel && hasScheduleKeywords;

        let updatedScore = lead.score;
        let updatedStatus = lead.status;
        let leadEmail = lead.email;

        if (!leadEmail && hasEmailInMessage) {
          const match = messageContent.match(emailRegex);
          if (match) {
            leadEmail = match[0];
          }
        }

        if (isEmailCaptured) {
          updatedScore = 70;
        }

        let meetUrl: string | undefined = undefined;

        if (isChannelAndScheduleDefined && leadEmail) {
          updatedScore = 95;
          updatedStatus = 'Meeting_Scheduled';

          try {
            const title = `Reunião NextHub - ${lead.name}`;
            const startTime = new Date();
            startTime.setDate(startTime.getDate() + 1);
            startTime.setHours(14, 0, 0, 0);
            const endTime = new Date(startTime.getTime() + 30 * 60000);

            const calendarResult = await this.googleCalendar.createEvent({
              title,
              startTime,
              endTime,
              attendeeEmail: leadEmail,
            });

            meetUrl = calendarResult.meetUrl;

            await tx.appointment.create({
              data: {
                title,
                startTime,
                endTime,
                leadId: lead.id,
                unitId: lead.unitId,
                organizationId: lead.organizationId,
                status: 'SCHEDULED',
                googleEventId: calendarResult.eventId,
                metadata: {
                  meetUrl,
                  origin: 'WEBHOOK_SYNCHRONOUS'
                }
              }
            });
          } catch (calErr) {
            this.logger.error(`Error synchronizing with Google Calendar in webhook: ${calErr.message}`);
          }
        }

        // Prepare metadata update
        const leadMetadata = (lead.metadata && typeof lead.metadata === 'object') ? (lead.metadata as any) : {};
        const updatedMetadata = {
          ...leadMetadata,
          scoreIA: updatedScore
        };

        await tx.interaction.create({
          data: {
            externalId,
            content: messageContent,
            type: 'INBOUND',
            leadId: lead.id,
            unitId: lead.unitId,
            organizationId: lead.organizationId,
            createdAt: messageDate,
          }
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            lastInteractionAt: messageDate,
            score: updatedScore,
            status: updatedStatus,
            email: leadEmail,
            metadata: updatedMetadata
          }
        });

        // 4. CAPTURA DE HISTÓRICO LINEAR
        const interactions = await tx.interaction.findMany({
          where: { leadId: lead.id },
          orderBy: { createdAt: 'asc' },
          take: 40
        });

        const structuredHistory = interactions
          .map(i => `${i.type === 'INBOUND' ? 'Lead' : 'SDR'}: ${i.content}`)
          .join('\n');

        // 5. DEBOUNCE DISPATCH
        await this.whatsappQueue.add('process-message', {
          leadId: lead.id,
          externalId,
          phone: lead.phone,
          text: messageContent,
          historyContext: structuredHistory, 
          timestamp: Math.floor(messageDate.getTime() / 1000),
          organizationId: lead.organizationId,
          unitId: lead.unitId,
        }, {
          jobId: `debounce-${lead.id}`, 
          delay: 30000, 
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        });

        return { status: 'accepted', externalId };
      } catch (err) {
        if (err.code === 'P2002') return { skipped: true, reason: 'duplicate' };
        throw err;
      } finally {
        setTimeout(() => WhatsAppWebhookController.activeLocks.delete(lead.id), 5000);
      }
    });
  }
}
