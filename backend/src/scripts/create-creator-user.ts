import '../env';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';

const email = 'creator@adoul.ma';
const password = 'CreatorPassword123!';
const fullName = 'System Creator';

async function createCreatorUser() {
  try {
    const hash = await PasswordService.hashPassword(password);
    
    // Check if user exists
    const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (findError) {
      console.error('Error checking for existing user:', findError);
      throw findError;
    }
    
    if (existingUser) {
      console.log('Creator user already exists. Updating role...');
      await supabase
        .from('users')
        .update({ role: 'creator' })
        .eq('email', email);
    } else {
      console.log('Creating new Creator user...');
      const { error } = await supabase.from('users').insert({
          email,
          password_hash: hash,
          full_name: fullName,
          role: 'creator',
          is_active: true,
          is_verified: true
      });
      if (error) throw error;
    }
    
    console.log(`Creator user configured: ${email} / ${password}`);
  } catch (err) {
    console.error('Error creating creator user:', err);
  } finally {
    process.exit();
  }
}

createCreatorUser();
