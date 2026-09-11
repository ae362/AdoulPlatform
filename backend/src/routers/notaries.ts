import { z } from 'zod';
import { notarySchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';
import { publicProcedure, protectedProcedure, router } from './trpc';

const idInput = z.object({ id: z.string() });

export const notariesRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          name: z.string().optional(),
          location: z.string().optional(),
          court: z.string().optional(),
          electronic: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      // Query users with role 'notary' and their profiles from the auth system
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, notary_profiles(*)')
        .eq('role', 'notary');

      if (error) throw new Error(error.message);

      const normalize = (str?: string | null) =>
        (str || '')
          .trim()
          .toLowerCase()
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .replace(/[\u064B-\u065F]/g, '');

      let results = (data || []).map((user: any) => {
        const profile = Array.isArray(user.notary_profiles) ? user.notary_profiles[0] : user.notary_profiles;

        return {
          id: user.id,
          full_name: user.full_name || '',
          cin: profile?.cin || null,
          tax_id: profile?.tax_identification_number || null,
          dob: profile?.dob || null,
          appointment_number: profile?.appointment_decree_number || null,
          insurance_no: profile?.insurance_policy_number || null,
          start_date: null,
          office_location: profile?.office_address || null,
          region: profile?.appellate_court || null,
          phone: profile?.phone || null,
          email: user.email || '',
          photo_url: profile?.profile_picture_url || null,
          description: profile?.description || null,
          primary_court: profile?.primary_court || null,
          court_name: profile?.court_name || null,
        };
      });

      // Filter by court if provided (strictly scoped)
      if (input?.court) {
        const courtTerm = normalize(input.court);
        const simplified = courtTerm
          .replace(/^(المحكمه\s+)?(الابتدائيه\s+)?(ب|في\s+)?/, '')
          .trim();

        results = results.filter((n) => {
          const reg = normalize(n.region);
          const prim = normalize(n.primary_court);
          const cName = normalize(n.court_name);

          return (
            (prim && (prim.includes(courtTerm) || courtTerm.includes(prim))) ||
            (reg && (reg.includes(courtTerm) || courtTerm.includes(reg))) ||
            (cName && (cName.includes(courtTerm) || courtTerm.includes(cName))) ||
            (simplified && (
              (prim && (prim.includes(simplified) || simplified.includes(prim))) ||
              (reg && (reg.includes(simplified) || simplified.includes(reg))) ||
              (cName && (cName.includes(simplified) || simplified.includes(cName)))
            ))
          );
        });
      }

      // Filter by name/search with Arabic normalization
      const nameTerm = normalize(input?.name || input?.search);
      if (nameTerm) {
        results = results.filter((n) => normalize(n.full_name).includes(nameTerm));
      }

      // Filter by location (City/Region)
      if (input?.location) {
        const loc = normalize(input.location);
        results = results.filter((n) => {
          if (n.primary_court && normalize(n.primary_court).includes(loc)) {
            return true;
          }
          return (
            (n.office_location && normalize(n.office_location).includes(loc)) ||
            (n.region && normalize(n.region).includes(loc))
          );
        });
      }

      return results;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, full_name, email, notary_profiles(*)')
        .eq('id', input.id)
        .single();

      if (error || !user) return null;

      const profile = Array.isArray(user.notary_profiles) ? user.notary_profiles[0] : user.notary_profiles;

      return {
        id: user.id,
        full_name: user.full_name || '',
        cin: profile?.cin || null,
        tax_id: profile?.tax_identification_number || null,
        dob: profile?.dob || null,
        appointment_number: profile?.appointment_decree_number || null,
        insurance_no: profile?.insurance_policy_number || null,
        start_date: null,
        office_location: profile?.office_address || null,
        region: profile?.appellate_court || null,
        phone: profile?.phone || null,
        email: user.email || '',
        photo_url: profile?.profile_picture_url || null,
        description: profile?.description || null,
        primary_court: profile?.primary_court || null,
        court_name: profile?.court_name || null,
      };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        full_name: z.string().optional(),
        phone: z.string().optional(),
        cin: z.string().optional(),
        tax_id: z.string().optional(),
        dob: z.string().optional(),
        office_location: z.string().optional(),
        insurance_no: z.string().optional(),
        primary_court: z.string().optional(),
        appointment_number: z.string().optional(),
        start_date: z.string().optional(),
        appellate_court: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // IDOR Defense: only allow updating own profile unless caller is national authority
      if (input.id !== ctx.user.id && ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council') {
        throw new Error('غير مصرح لك بتعديل هذا الملف التعريفي');
      }

      const { id, full_name, ...profileData } = input;

      // Update User (Full Name)
      if (full_name) {
        const { error: userError } = await supabase
          .from('users')
          .update({ full_name })
          .eq('id', id);
        if (userError) throw new Error(userError.message);
      }

      // Update Profile
      const updateData: any = {};
      if (input.phone) updateData.phone = input.phone;
      if (input.cin) updateData.cin = input.cin;
      if (input.tax_id !== undefined) updateData.tax_identification_number = input.tax_id || null;
      if (input.insurance_no !== undefined) updateData.insurance_policy_number = input.insurance_no || null;
      if (input.dob) updateData.dob = input.dob;
      if (input.office_location) updateData.office_address = input.office_location;
      if (input.primary_court) updateData.primary_court = input.primary_court;
      if (input.appointment_number) updateData.appointment_decree_number = input.appointment_number;
      if (input.appellate_court) updateData.appellate_court = input.appellate_court;

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await supabase
          .from('notary_profiles')
          .update(updateData)
          .eq('user_id', id);

        if (profileError) throw new Error(profileError.message);
      }
      return { success: true };
    }),

  createAccount: publicProcedure
    .input(
      z.object({
        full_name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        cin: z.string().optional(),
        tax_id: z.string().optional(),
        insurance_no: z.string().optional(),
        dob: z.string().optional(),
        office_location: z.string().optional(),
        start_date: z.string().optional(),
        region: z.string(),
        primary_court: z.string(),
        appointment_number: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Create Auth User
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.full_name,
          role: 'notary',
        },
      });

      if (authError) throw new Error(`Auth Error: ${authError.message}`);
      const userId = authUser.user.id;

      // Hash password for public.users table check
      const passwordHash = await PasswordService.hashPassword(input.password);

      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        email: input.email,
        full_name: input.full_name,
        role: 'notary',
        password_hash: passwordHash,
      });

      if (userError) throw new Error(`User Error: ${userError.message}`);

      // 3. Create Profile
      const { error: profileError } = await supabase.from('notary_profiles').insert({
        user_id: userId,
        cin: input.cin,
        tax_identification_number: input.tax_id ?? null,
        insurance_policy_number: input.insurance_no ?? null,
        dob: input.dob,
        appointment_decree_number: input.appointment_number || 'PENDING',
        office_address: input.office_location,
        appellate_court: input.region,
        primary_court: input.primary_court,
        court_name: input.primary_court,
        court_type: 'first_instance',
        phone: input.phone,
        is_active: true,
      });

      if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

      return { success: true, id: userId };
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Role enforcement: Only national authority can delete user accounts
      if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'admin') {
        throw new Error('غير مصرح - هذه العملية تتطلب صلاحية الهيئة الوطنية للعدول');
      }

      // Delete from Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(input.id);
      if (authError) throw new Error(authError.message);

      // Explicit delete from public.users to be sure
      await supabase.from('users').delete().eq('id', input.id);

      return { success: true };
    }),

  // Legacy CRUD operations
  create: protectedProcedure.input(notarySchema).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council') {
      throw new Error('غير مصرح');
    }
    const { id, ...rest } = input;
    const { data, error } = await supabase.from('notaries').insert(rest).select('*').single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: protectedProcedure.input(notarySchema.extend({ id: z.string() })).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council') {
      throw new Error('غير مصرح');
    }
    const { id, ...rest } = input;
    const { data, error } = await supabase.from('notaries').update(rest).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council') {
      throw new Error('غير مصرح');
    }
    const { error } = await supabase.from('notaries').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
