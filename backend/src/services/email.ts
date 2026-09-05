import { isBrevoConfigured, sendBrevoEmail } from './brevo';
import { isSmtpConfigured, sendSmtpEmail } from './smtp';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<string> {
  const transport = String(process.env.EMAIL_TRANSPORT || 'auto').toLowerCase();

  if (transport === 'smtp') {
    return sendSmtpEmail(options);
  }

  if (transport === 'brevo') {
    return sendBrevoEmail(options);
  }

  if (transport !== 'auto') {
    throw new Error('Invalid EMAIL_TRANSPORT (use: auto|smtp|brevo).');
  }

  // In auto mode, prefer Brevo API when configured to avoid SMTP provider rejections.
  if (isBrevoConfigured()) return sendBrevoEmail(options);

  if (isSmtpConfigured()) return sendSmtpEmail(options);

  throw new Error('Email service is not configured (set SMTP_* or BREVO_* env vars).');
}
