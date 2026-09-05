import '../env';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';

async function main() {
    const email = 'regional@council.gov.ma';
    const password = 'Password@2025';
    const fullName = 'رئيس المجلس الجهوي';
    // Cast to any to bypass local type checks if the type isn't updated in supabase definitions yet
    const role = 'regional_adoul_council' as any;

    console.log('Creating Regional Council User...');
    console.log('Email:', email);
    console.log('Role:', '' + role);

    try {
        const hash = await PasswordService.hashPassword(password);

        // Check if user exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
             console.log('User already exists. Updating password...');
             const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    password_hash: hash,
                    role: role, // Ensure role is correct
                    is_active: true
                })
                .eq('id', existing.id);
            
            if (updateError) throw updateError;
            console.log('User updated successfully.');
        } else {
            const { data, error } = await supabase
                .from('users')
                .insert({
                    email,
                    password_hash: hash,
                    full_name: fullName,
                    role: role,
                    is_active: true,
                    is_verified: true
                })
                .select()
                .single();

            if (error) throw error;
            console.log('User created successfully:', data);
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main().catch(console.error);
