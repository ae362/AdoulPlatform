import path from 'path';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';

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
  // Most specific
  path.join(backendDir, '.env.local'),
  path.join(repoRoot, '.env.local'),
  // Base files
  path.join(backendDir, '.env'),
  path.join(repoRoot, '.env'),
  // Fallbacks for unusual working directories
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
