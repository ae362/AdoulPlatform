function getRequiredEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

function normalize(raw: string) {
  return raw.trim().replace(/^[<"'`]+/, '').replace(/[>"'`]+$/, '').trim();
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

function toRecipients(v: string | string[]) {
  const list = Array.isArray(v) ? v : [v];
  return list.filter(Boolean).map((email) => ({ Email: email }));
}

function toSender(email: string, name?: string) {
  return name ? { Email: email, Name: name } : { Email: email };
}

export function isMailjetConfigured() {
  return !!(
    (process.env.MJ_APIKEY_PUBLIC && process.env.MJ_APIKEY_PRIVATE) ||
    (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY)
  );
}

let mailjetClient: any | null = null;

function getMailjetClient() {
  if (mailjetClient) return mailjetClient;

  const publicKey = normalize(process.env.MJ_APIKEY_PUBLIC || process.env.MAILJET_API_KEY || '');
  const privateKey = normalize(process.env.MJ_APIKEY_PRIVATE || process.env.MAILJET_SECRET_KEY || '');
  if (!publicKey) throw new Error('Missing MJ_APIKEY_PUBLIC (or MAILJET_API_KEY)');
  if (!privateKey) throw new Error('Missing MJ_APIKEY_PRIVATE (or MAILJET_SECRET_KEY)');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Mailjet = require('node-mailjet') as any;

  // Mailjet docs: Mailjet.apiConnect(publicKey, privateKey)
  mailjetClient = Mailjet.apiConnect(publicKey, privateKey);
  return mailjetClient;
}

export async function sendMailjetEmail(options: EmailOptions): Promise<string> {
  const fromEmail =
    process.env.MAILJET_FROM_EMAIL ||
    process.env.MAILJET_FROM ||
    process.env.MJ_FROM_EMAIL ||
    process.env.MJ_FROM;
  if (!fromEmail) throw new Error('Missing MAILJET_FROM_EMAIL');
  const fromName = process.env.MAILJET_FROM_NAME || process.env.MJ_FROM_NAME || 'Adoul Platform';

  // Use the official Node.js SDK style shown in Mailjet docs.
  const mailjet = getMailjetClient();

  const request = mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: toSender(fromEmail, fromName),
        To: toRecipients(options.to),
        ...(options.cc?.length ? { Cc: toRecipients(options.cc) } : null),
        ...(options.bcc?.length ? { Bcc: toRecipients(options.bcc) } : null),
        ...(options.replyTo ? { ReplyTo: toSender(options.replyTo) } : null),
        Subject: options.subject,
        ...(options.text ? { TextPart: options.text } : null),
        ...(options.html ? { HTMLPart: options.html } : null),
      },
    ],
  });

  const result: any = await request;
  const to0 = result?.body?.Messages?.[0]?.To?.[0];
  const messageId = to0?.MessageID || to0?.MessageId;
  return messageId ? String(messageId) : `msg_${Date.now()}`;
}
