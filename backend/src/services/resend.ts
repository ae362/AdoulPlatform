import { Resend } from 'resend';

function getRequiredEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

export function getResendClient() {
  const apiKey = getRequiredEnv('RESEND_API_KEY');
  return new Resend(apiKey);
}

export function getResendFrom() {
  const from = getRequiredEnv('RESEND_FROM');
  // Ensure the from address is in valid email format
  // If it's just a domain, prepend noreply@
  if (!from.includes('@')) {
    return `noreply@${from}`;
  }
  return from;
}

