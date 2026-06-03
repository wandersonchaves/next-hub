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

    // Padrão Evolution Go (Alta Performance): Endpoint fixo e Instância via Header
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const fullUrl = `${baseUrl}/send/text`;

    try {
      this.logger.debug(`OmniChannel (Evolution Go): Sending message to ${payload.to} via ${fullUrl}`);

      await axios.post(
        fullUrl,
        {
          number: payload.to,
          text: payload.text,
        },
        {
          headers: {
            apikey: apiKey,
            instance: instanceName,
          },
          timeout: 30000, // Increased to 30s for better resilience
        },
      );
      
      this.logger.debug(`OmniChannel: WhatsApp message sent successfully`);
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        this.logger.error(`OmniChannel DNS Error: Could not resolve ${fullUrl}. Check your internet connection.`);
      } else {
        const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        this.logger.error(`OmniChannel WhatsApp failed at ${fullUrl}: ${errorData}`);
      }
      throw error;
    }
  }
}
