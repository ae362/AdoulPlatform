import nodemailer, { Transporter } from 'nodemailer';

function getRequiredEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

let transporter: Transporter | null = null;

export function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getSmtpTransporter(): Transporter {
  if (transporter) return transporter;

  const host = getRequiredEnv('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = getRequiredEnv('SMTP_USER');
  const pass = getRequiredEnv('SMTP_PASS');

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

export function getSmtpFrom() {
  const email =
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.MAILJET_FROM_EMAIL ||
    process.env.MAILJET_FROM ||
    'noreply@example.com';
  const name = process.env.SMTP_FROM_NAME || process.env.MAILJET_FROM_NAME || 'Adoul Platform';
  return { address: email, name };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export async function sendSmtpEmail(options: EmailOptions): Promise<string> {
  const t = getSmtpTransporter();
  const from = getSmtpFrom();

  const mailOptions = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo,
  };

  Object.keys(mailOptions).forEach(
    (key) =>
      mailOptions[key as keyof typeof mailOptions] === undefined &&
      delete mailOptions[key as keyof typeof mailOptions]
  );

  const info = await t.sendMail(mailOptions);
  return info.messageId || `msg_${Date.now()}`;
}
