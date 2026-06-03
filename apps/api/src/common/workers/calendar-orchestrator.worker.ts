import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarService } from '../../modules/prospector/infrastructure/google-calendar.service';

@Injectable()
@Processor('calendar-orchestrator')
export class CalendarOrchestratorWorker extends WorkerHost {
  private readonly logger = new Logger(CalendarOrchestratorWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { leadId, startTime, attendeeEmail, organizationId, unitId, title } = job.data;
    this.logger.log(`Processing Calendar Event for Lead ${leadId} (Email: ${attendeeEmail})`);

    try {
      // 1. Generate real invite via Google Calendar Service (Enabling Meet)
      const { eventId, meetUrl } = await this.googleCalendar.createEvent({
        title,
        startTime: new Date(startTime),
        endTime: new Date(new Date(startTime).getTime() + 30 * 60000),
        attendeeEmail
      });

      // 2. Atomic transaction to ensure consistency
      await this.prisma.client.$transaction(async (tx) => {
        // Create Appointment record with Meet URL
        await tx.appointment.create({
          data: {
            title,
            startTime: new Date(startTime),
            endTime: new Date(new Date(startTime).getTime() + 30 * 60000),
            leadId,
            unitId,
            organizationId,
            status: 'SCHEDULED',
            googleEventId: eventId,
            metadata: {
              meetUrl,
              origin: 'AUTOPILOT_CLOSING'
            }
          }
        });

        // 3. TELEMETRIA: Update Pipeline Stage
        await (tx as any).leadPipeline.upsert({
          where: { leadId },
          update: {
            stage: 'REUNIAO_MARCADA',
            estimatedValue: 599
          },
          create: {
            leadId,
            organizationId,
            stage: 'REUNIAO_MARCADA',
            estimatedValue: 599
          }
        });
      });

      this.logger.log(`Success: Appointment confirmed with Google Meet: ${meetUrl}`);
    } catch (err) {
      this.logger.error(`Critical Worker Failure for lead ${leadId}: ${err.message}`);
      throw err;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Calendar Job ${job.id} completed successfully.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Calendar Job ${job.id} failed after retries: ${error.message}`);
  }
}
