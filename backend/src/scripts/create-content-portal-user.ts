import '../env';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const email = getArg('email') ?? process.env.PORTAL_ADMIN_EMAIL ?? 'portal.admin@adoul.ma';
const password = getArg('password') ?? process.env.PORTAL_ADMIN_PASSWORD ?? 'PortalAdminPassword123!';
const fullName = getArg('name') ?? process.env.PORTAL_ADMIN_NAME ?? 'Portal Admin';

async function createPortalAdminUser() {
  try {
    const hash = await PasswordService.hashPassword(password);

    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (findError) throw findError;

    if (existingUser) {
      console.log('User already exists. Ensuring role=creator...');
      const { error } = await supabase
        .from('users')
        .update({ role: 'creator', full_name: fullName, is_active: true, is_verified: true })
        .eq('email', email);
      if (error) throw error;
    } else {
      console.log('Creating new portal admin user...');
      const { error } = await supabase.from('users').insert({
        email,
        password_hash: hash,
        full_name: fullName,
        role: 'creator',
        is_active: true,
        is_verified: true,
      });
      if (error) throw error;
    }

    console.log(`Portal admin configured: ${email} / ${password}`);
  } catch (err) {
    console.error('Error creating portal admin user:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

createPortalAdminUser();

