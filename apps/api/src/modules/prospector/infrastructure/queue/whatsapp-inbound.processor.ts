import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { HandleIncomingMessageUseCase } from '../../application/use-cases/handle-incoming-message.use-case';
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

    // Extrair dados do webhook da Evolution API
    const payload = {
      externalId: data.key.id,
      phone: data.key.remoteJid.split('@')[0],
      text: data.message?.conversation || data.message?.extendedTextMessage?.text || '',
      timestamp: new Date(data.messageTimestamp * 1000),
      organizationId: data.organizationId,
      branchId: data.branchId,
    };

    if (!payload.text) {
      this.logger.debug(`Empty message received from ${payload.phone}. Skipping.`);
      return;
    }

    this.logger.log(`Processing WhatsApp message ${payload.externalId} from ${payload.phone}`);

    // Executar Caso de Uso dentro do contexto Multi-tenant
    return this.tenantContext.run(
      { organizationId: payload.organizationId, branchId: payload.branchId },
      () => this.handleIncomingMessage.execute(payload),
    );
  }
}
