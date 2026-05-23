import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Nexus Prospector Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(
    @InjectQueue('whatsapp-inbound') private readonly whatsappQueue: Queue,
  ) {}

  @Post('evolution')
  @ApiOperation({ summary: 'Evolution API Webhook Inbound' })
  async handleEvolutionWebhook(
    @Body() payload: any,
    @Headers('organization-id') organizationId: string,
    @Headers('branch-id') branchId: string,
  ) {
    if (!organizationId || !branchId) {
      throw new BadRequestException('organization-id and branch-id headers are required');
    }

    // Adiciona na fila para processamento assíncrono
    await this.whatsappQueue.add('process-message', {
      ...payload,
      organizationId,
      branchId,
    }, {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return { status: 'queued' };
  }
}
