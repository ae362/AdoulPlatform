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
  return list.filter(Boolean).map((email) => ({ email }));
}

function toSender(email: string, name?: string) {
  return name ? { email, name } : { email };
}

export function isBrevoConfigured() {
  return !!(process.env.BREVO_API_KEY);
}

let brevoClient: any | null = null;

function getBrevoClient() {
  if (brevoClient) return brevoClient;

  const apiKey = normalize(process.env.BREVO_API_KEY || '');
  if (!apiKey) throw new Error('Missing BREVO_API_KEY');

  // Brevo API client using node-fetch or axios
  brevoClient = {
    apiKey,
    baseUrl: 'https://api.brevo.com/v3',
  };
  return brevoClient;
}

export async function sendBrevoEmail(options: EmailOptions): Promise<string> {
  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.BREVO_FROM;
  if (!fromEmail) throw new Error('Missing BREVO_FROM_EMAIL');
  const fromName = process.env.BREVO_FROM_NAME || 'Adoul Platform';

  const brevo = getBrevoClient();

  const payload = {
    sender: toSender(fromEmail, fromName),
    to: toRecipients(options.to),
    ...(options.cc?.length ? { cc: toRecipients(options.cc) } : null),
    ...(options.bcc?.length ? { bcc: toRecipients(options.bcc) } : null),
    ...(options.replyTo ? { replyTo: toSender(options.replyTo) } : null),
    subject: options.subject,
    ...(options.text ? { textContent: options.text } : null),
    ...(options.html ? { htmlContent: options.html } : null),
  };

  const response = await fetch(`${brevo.baseUrl}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': brevo.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const error = await response.json();
      errorMessage = error.message || error.code || response.statusText;
    } catch (e) {
      // Response wasn't JSON
    }
    
    console.error('Brevo API Error:', { status: response.status, message: errorMessage, apiKey: brevo.apiKey?.substring(0, 10) + '...' });
    throw new Error(`Brevo API error (${response.status}): ${errorMessage}. Please check your BREVO_API_KEY in environment variables. Get it from: https://app.brevo.com/account/settings`);
  }

  const result: any = await response.json();
  const messageId = result?.messageId;
  return messageId ? String(messageId) : `msg_${Date.now()}`;
}
