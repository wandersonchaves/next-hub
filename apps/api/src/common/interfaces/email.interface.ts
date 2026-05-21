export interface IEmailProvider {
  sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
