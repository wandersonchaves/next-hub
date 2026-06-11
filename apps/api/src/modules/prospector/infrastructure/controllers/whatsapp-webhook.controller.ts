import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GoogleCalendarService } from '../../infrastructure/google-calendar.service';
import { ProspectorSseService } from '../../services/prospector-sse.service';

@ApiTags('Nexus Prospector Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  
  // 1. BLINDAGEM DE CONCORRÊNCIA: Trava in-memory para evitar loops de processamento
  private static activeLocks = new Set<string>();

  constructor(
    @InjectQueue('whatsapp-inbound') private readonly whatsappQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly sseService: ProspectorSseService,
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
        let calendarEventId: string | undefined = undefined;

        if (isEmailCaptured && hasChannel && leadEmail) {
          updatedScore = 95;
          updatedStatus = 'Meeting_Scheduled';

          try {
            const parsedDates = parseRelativeDate(messageContent) || {
              startTime: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(14, 0, 0, 0);
                return d;
              })(),
              endTime: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(14, 30, 0, 0);
                return d;
              })()
            };

            const startTime = parsedDates.startTime;
            const endTime = parsedDates.endTime;
            const title = `Reunião NextHub - ${lead.name}`;

            const calendarResult = await this.googleCalendar.createEvent({
              title,
              startTime,
              endTime,
              attendeeEmail: leadEmail,
            });

            meetUrl = calendarResult.meetUrl;
            calendarEventId = calendarResult.eventId;

            await tx.appointment.create({
              data: {
                title,
                startTime,
                endTime,
                leadId: lead.id,
                unitId: lead.unitId,
                organizationId: lead.organizationId,
                status: 'SCHEDULED',
                googleEventId: calendarEventId,
                metadata: {
                  meetUrl,
                  origin: 'WEBHOOK_SYNCHRONOUS',
                  scheduledTime: startTime.toISOString()
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
          scoreIA: updatedScore,
          ...(calendarEventId ? { calendarEventId } : {}),
          ...(meetUrl ? { meetUrl } : {})
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

        // Broadcast lead update to SSE clients
        this.sseService.broadcast({
          leadId: lead.id,
          status: updatedStatus,
          scoreIA: updatedScore
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

function parseRelativeDate(text: string): { startTime: Date; endTime: Date } | null {
  const normalized = text.toLowerCase();
  let date = new Date();
  
  if (normalized.includes('amanhã') || normalized.includes('amanha')) {
    date.setDate(date.getDate() + 1);
  } else if (normalized.includes('hoje')) {
    // Keep today
  } else {
    date.setDate(date.getDate() + 1);
  }
  
  let hours = 14;
  let minutes = 0;
  
  const timeRegex = /(?:às|as|at)?\s*(\d{1,2})(?:h|:(\d{2}))/i;
  const match = normalized.match(timeRegex);
  if (match) {
    hours = parseInt(match[1], 10);
    if (match[2]) {
      minutes = parseInt(match[2], 10);
    }
  } else {
    const simpleHourRegex = /(?:às|as|at)\s*(\d{1,2})\b/i;
    const simpleMatch = normalized.match(simpleHourRegex);
    if (simpleMatch) {
      hours = parseInt(simpleMatch[1], 10);
    }
  }
  
  if (hours < 0 || hours > 23) hours = 14;
  if (minutes < 0 || minutes > 59) minutes = 0;
  
  const startTime = new Date(date);
  startTime.setHours(hours, minutes, 0, 0);
  
  const endTime = new Date(startTime.getTime() + 30 * 60000);
  
  return { startTime, endTime };
}
