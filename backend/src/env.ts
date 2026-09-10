import path from 'path';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { z } from 'zod';

// Load env vars in a stable precedence order, regardless of where the process is started from.
// Precedence (first wins; dotenv does not override existing keys):
// 1) OS env
// 2) backend/.env.local
// 3) repo-root/.env.local
// 4) backend/.env
// 5) repo-root/.env

const cwd = process.cwd();
const backendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendDir, '..');

const candidates = [
  path.join(backendDir, '.env.local'),
  path.join(repoRoot, '.env.local'),
  path.join(backendDir, '.env'),
  path.join(repoRoot, '.env'),
  path.join(cwd, '.env.local'),
  path.join(cwd, '.env'),
  path.join(cwd, 'backend', '.env.local'),
  path.join(cwd, 'backend', '.env'),
];

for (const p of candidates) {
  try {
    if (existsSync(p)) loadEnv({ path: p });
  } catch {
    // ignore
  }
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  COOKIE_SECRET: z.string().min(16).default('adoul-sovereign-cookie-secret-2026-production'),
  JWT_SECRET: z.string().min(16).default('adoul-sovereign-jwt-secret-2026-production'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
  OLLAMA_CONTRACT_MODEL: z.string().optional(),
  OLLAMA_VISION_MODEL: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_FROM_EMAIL: z.string().optional(),
  BREVO_FROM_NAME: z.string().default('Adoul Platform'),
  DEED_SEAL_PEPPER: z.string().min(16).default('sovereign-moroccan-notary-seal-pepper-2026'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, unknown> = process.env): AppEnv {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    if (rawEnv.NODE_ENV === 'production') {
      console.error('FATAL: Environment validation failed in production mode:\n' + errorDetails);
      process.exit(1);
    } else {
      console.warn('WARNING: Environment validation issues detected (non-fatal in dev/test):\n' + errorDetails);
      return envSchema.parse({
        ...rawEnv,
        NODE_ENV: 'development',
      });
    }
  }

  if (result.data.NODE_ENV === 'production') {
    if (!result.data.SUPABASE_URL || !result.data.SUPABASE_SERVICE_KEY) {
      console.warn('WARNING: Running in production without SUPABASE_URL or SUPABASE_SERVICE_KEY configured.');
    }
  }

  return result.data;
}

export const env = validateEnv();

// Synchronize back to process.env
process.env.NODE_ENV = env.NODE_ENV;
process.env.PORT = String(env.PORT);
process.env.HOST = env.HOST;
process.env.COOKIE_SECRET = env.COOKIE_SECRET;
process.env.JWT_SECRET = env.JWT_SECRET;
