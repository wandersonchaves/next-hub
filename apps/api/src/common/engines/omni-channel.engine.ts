import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendMessagePayload {
  to: string;
  text: string;
  channel?: 'WHATSAPP' | 'SMS' | 'EMAIL'; // defaults to WHATSAPP via Evolution
}

@Injectable()
export class OmniChannelEngine {
  private readonly logger = new Logger(OmniChannelEngine.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    const channel = payload.channel || 'WHATSAPP';
    
    if (channel === 'WHATSAPP') {
      return this.sendWhatsApp(payload);
    } else {
      this.logger.warn(`Channel ${channel} not yet implemented in OmniChannelEngine`);
    }
  }

  private async sendWhatsApp(payload: SendMessagePayload): Promise<void> {
    const apiUrl = this.configService.get<string>('EVOLUTION_API_URL');
    const apiKey = this.configService.get<string>('EVOLUTION_API_KEY');
    const instanceName = this.configService.get<string>('EVOLUTION_INSTANCE_NAME');

    if (!apiUrl || !apiKey || !instanceName) {
      this.logger.error('Evolution API config is missing in OmniChannelEngine');
      return;
    }

    try {
      await axios.post(
        `${apiUrl}/message/sendText/${instanceName}`,
        {
          number: payload.to,
          options: {
            delay: 1500,
            presence: 'composing',
            linkPreview: false,
          },
          textMessage: {
            text: payload.text,
          },
        },
        {
          headers: {
            apikey: apiKey,
          },
        },
      );
      this.logger.debug(`OmniChannel: WhatsApp sent to ${payload.to}`);
    } catch (error) {
      this.logger.error(`OmniChannel WhatsApp failed: ${error.response?.data || error.message}`);
      throw error;
    }
  }
}
