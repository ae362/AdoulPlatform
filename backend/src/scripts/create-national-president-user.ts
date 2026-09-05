import '../env';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';

async function main() {
    const email = 'president@adoul.ma';
    const password = 'Password@2025';
    const fullName = 'رئيس الهيئة الوطنية';
    const role = 'national_notary_authority' as any;

    console.log('Creating National President User...');
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
                    role: role, 
                    is_active: true,
                    full_name: fullName
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
            console.log('User created successfully:', data.id);
        }

    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    }
}

main();
