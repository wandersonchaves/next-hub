import { Injectable, Logger } from '@nestjs/common';
import { OmniChannelEngine } from '../../../../common/engines/omni-channel.engine';
import { IWhatsAppClient, SendMessageDto } from '../../application/ports/whatsapp-client.port';

@Injectable()
export class EvolutionWhatsAppClient implements IWhatsAppClient {
  private readonly logger = new Logger(EvolutionWhatsAppClient.name);

  constructor(private readonly omniChannelEngine: OmniChannelEngine) {}

  async sendMessage(dto: SendMessageDto): Promise<void> {
    try {
      await this.omniChannelEngine.sendMessage({
        to: dto.to,
        text: dto.text,
        channel: 'WHATSAPP'
      });
    } catch (error) {
      this.logger.error(`EvolutionWhatsAppClient adapter failed: ${error.message}`);
    }
  }
}
