import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  constructor(@InjectQueue('notifications') private readonly notificationsQueue: Queue) {}

  async sendWelcomeEmail(email: string, name?: string) {
    await this.notificationsQueue.add('welcome-email', {
      email,
      name,
    });
  }

  async sendUsageAlert(email: string, percentage: number) {
    await this.notificationsQueue.add('usage-alert', {
      email,
      percentage,
    });
  }

  async sendOrgInvite(email: string, subject: string, html: string) {
    await this.notificationsQueue.add('org-invite', {
      email,
      subject,
      html,
    });
  }
}
