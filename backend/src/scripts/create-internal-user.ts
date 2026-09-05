import '../env';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';

type UserRole =
  | 'government_authority'
  | 'national_notary_authority'
  | 'regional_adoul_council'
  | 'authentication_judge'
  | 'society_member'
  | 'president_office'
  | 'notary';

function readFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readOption(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function usage(): string {
  return [
    'Usage:',
    '  npm run create:internal-user -- --email user@example.com --password "StrongPass1" --full-name "..." --role authentication_judge',
    '',
    'Options:',
    '  --email        (required)',
    '  --password     (required unless --update without password)',
    '  --full-name    (optional; default: بوابة قاضي التوثيق)',
    '  --role         (optional; default: authentication_judge)',
    '  --update       Update existing user if present',
    '  --inactive     Set is_active=false',
    '  --unverified   Set is_verified=false',
  ].join('\n');
}

function validateEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Ensure backend/.env or backend/.env.local is configured.'
    );
  }

  if (url.includes('example.supabase.co') || key === 'service-key') {
    throw new Error(
      'SUPABASE_URL/SUPABASE_SERVICE_KEY look like placeholders. Update backend/.env or backend/.env.local.'
    );
  }
}

async function main() {
  if (readFlag('--help') || readFlag('-h')) {
    console.log(usage());
    return;
  }

  validateEnv();

  const email = readOption('--email');
  const password = readOption('--password');
  const fullName = readOption('--full-name') ?? 'بوابة قاضي التوثيق';
  const role = (readOption('--role') ?? 'authentication_judge') as UserRole;
  const shouldUpdate = readFlag('--update');
  const isActive = !readFlag('--inactive');
  const isVerified = !readFlag('--unverified');

  if (!email) {
    console.error('Missing required option: --email\n');
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (!password && !shouldUpdate) {
    console.error('Missing required option: --password\n');
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (password) {
    const passwordValidation = PasswordService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      console.error('Password does not meet strength requirements:');
      for (const err of passwordValidation.errors) console.error(`- ${err}`);
      process.exitCode = 1;
      return;
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (!shouldUpdate) {
      console.log(
        `User already exists (no changes): id=${existing.id} email=${existing.email} role=${existing.role}`
      );
      return;
    }

    const updates: Record<string, unknown> = {
      role,
      full_name: fullName,
      is_active: isActive,
      is_verified: isVerified,
    };

    if (password) {
      updates.password_hash = await PasswordService.hashPassword(password);
    }

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', existing.id)
      .select('id, email, role, full_name, is_active, is_verified')
      .single();

    if (updateError || !updated) {
      throw updateError ?? new Error('Failed to update user');
    }

    console.log(
      `Updated user: id=${updated.id} email=${updated.email} role=${updated.role} active=${updated.is_active} verified=${updated.is_verified}`
    );
    return;
  }

  if (!password) {
    console.error(
      'User does not exist and no password was provided. Provide --password to create a new user.'
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await PasswordService.hashPassword(password);

  const { data: created, error: createError } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      role,
      full_name: fullName,
      is_active: isActive,
      is_verified: isVerified,
    })
    .select('id, email, role, full_name, is_active, is_verified')
    .single();

  if (createError || !created) {
    throw createError ?? new Error('Failed to create user');
  }

  console.log(
    `Created user: id=${created.id} email=${created.email} role=${created.role} active=${created.is_active} verified=${created.is_verified}`
  );
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exitCode = 1;
});
