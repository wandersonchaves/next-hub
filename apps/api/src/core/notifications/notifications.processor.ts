import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER } from '../../common/interfaces/email.interface';
import type { IEmailProvider } from '../../common/interfaces/email.interface';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(@Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'welcome-email':
        await this.emailProvider.sendEmail({
          to: job.data.email,
          subject: 'Welcome to our platform!',
          text: `Hello ${job.data.name || 'there'}, welcome to our SaaS!`,
        });
        break;
      case 'usage-alert':
        await this.emailProvider.sendEmail({
          to: job.data.email,
          subject: 'Usage Limit Alert',
          text: `You have reached ${job.data.percentage}% of your plan limit.`,
        });
        break;
      case 'org-invite':
        await this.emailProvider.sendEmail({
          to: job.data.email,
          subject: job.data.subject,
          html: job.data.html,
        });
        break;
    }
  }
}
