import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { HandleIncomingMessageUseCase, IncomingMessageDto } from '../../application/use-cases/handle-incoming-message.use-case';
import { TenantContextService } from '../../../../common/utils/tenant-context/tenant-context.service';

@Processor('whatsapp-inbound')
export class WhatsAppInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppInboundProcessor.name);

  constructor(
    private readonly handleIncomingMessage: HandleIncomingMessageUseCase,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { data } = job;

    // The data is already cleaned and formatted by the Controller (Secretary Mode)
    const dto: IncomingMessageDto = {
      leadId: data.leadId,
      externalId: data.externalId,
      phone: data.phone,
      text: data.text,
      timestamp: data.timestamp,
      organizationId: data.organizationId,
      unitId: data.unitId,
    };

    if (!dto.text) {
      this.logger.debug(`Empty message ${dto.externalId} received. Skipping.`);
      return;
    }

    this.logger.log(`Worker: Processing message ${dto.externalId} from ${dto.phone}`);

    // Execute Use Case within Multi-tenant Context
    return this.tenantContext.run(
      { organizationId: dto.organizationId, unitId: dto.unitId },
      () => this.handleIncomingMessage.execute(dto),
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    const maxAttempts = job.opts.attempts ?? 5;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[DLQ-CRITICAL] Inbound Job ${job.id} failed permanently on attempt ${job.attemptsMade}/${maxAttempts}. ` +
        `Payload: ${JSON.stringify(job.data)}. ` +
        `Error: ${error.message}. Stack: ${error.stack}`
      );
    } else {
      this.logger.warn(
        `Inbound Job ${job.id} failed on attempt ${job.attemptsMade}/${maxAttempts}. Will retry. ` +
        `Error: ${error.message}`
      );
    }
  }
}
