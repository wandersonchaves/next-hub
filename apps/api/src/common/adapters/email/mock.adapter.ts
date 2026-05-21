import { Injectable, Logger } from '@nestjs/common';
import { IEmailProvider } from '../../interfaces/email.interface';

@Injectable()
export class MockEmailAdapter implements IEmailProvider {
  private readonly logger = new Logger(MockEmailAdapter.name);

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    this.logger.log(`[MOCK EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    // Simula um delay de rede para ser realista, mas sem gastar créditos
    return true;
  }
}
