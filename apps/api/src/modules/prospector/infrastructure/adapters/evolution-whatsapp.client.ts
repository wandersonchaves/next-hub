import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IWhatsAppClient, SendMessageDto } from '../../application/ports/whatsapp-client.port';

@Injectable()
export class EvolutionWhatsAppClient implements IWhatsAppClient {
  private readonly logger = new Logger(EvolutionWhatsAppClient.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(dto: SendMessageDto): Promise<void> {
    const apiUrl = this.configService.get<string>('EVOLUTION_API_URL');
    const apiKey = this.configService.get<string>('EVOLUTION_API_KEY');
    const instanceName = this.configService.get<string>('EVOLUTION_INSTANCE_NAME');

    if (!apiUrl || !apiKey || !instanceName) {
      this.logger.error('Evolution API config is missing');
      return;
    }

    try {
      await axios.post(
        `${apiUrl}/message/sendText/${instanceName}`,
        {
          number: dto.to,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false,
          },
          textMessage: {
            text: dto.text,
          },
        },
        {
          headers: {
            apikey: apiKey,
          },
        },
      );
      this.logger.debug(`Message sent to ${dto.to}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.response?.data || error.message}`);
    }
  }
}
