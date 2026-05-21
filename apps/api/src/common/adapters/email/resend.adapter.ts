import { Injectable, Logger } from '@nestjs/common';
import { IEmailProvider } from '../../interfaces/email.interface';
import { Resend } from 'resend';

@Injectable()
export class ResendAdapter implements IEmailProvider {
  private readonly logger = new Logger(ResendAdapter.name);
  private resend: Resend;

  constructor() {
    // In production, ensure RESEND_API_KEY is available
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    
    // Log for debugging in development
    if (isDev) {
      const previewContent = options.text || options.html?.replace(/<[^>]*>?/gm, '').substring(0, 100) || 'No content';
      this.logger.log('--- DEVELOPMENT EMAIL LOG ---');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Content Preview: ${previewContent}...`);
      this.logger.log('-----------------------------');
    }

    try {
      // If no real API key is provided, just simulate success in dev
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123456789') {
        if (isDev) {
          this.logger.warn('RESEND_API_KEY not set or using default. Skipping actual send.');
          return true;
        }
      }

      const response = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Acme <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html || options.text || '',
      });

      if (response.error) {
        // Check if it's the specific trial restriction error
        const isSandboxError = response.error.message.includes('only send testing emails to your own email address');
        
        if (isSandboxError) {
          this.logger.warn(`Resend Sandbox Restriction: Email to ${options.to} blocked, but logged above.`);
        } else {
          this.logger.error(`Failed to send email: ${response.error.message}`);
        }
        
        // In development, we don't want to break the flow
        if (isDev) {
          return true;
        }
        return false;
      }

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error('Unexpected error sending email', error);
      if (isDev) return true;
      return false;
    }
  }
}
