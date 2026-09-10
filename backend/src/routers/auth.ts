import { getAppellateCourts, getCourtMappingJson } from '../../../shared/courts';
import { z } from 'zod';
import { publicProcedure, router } from './trpc';
import { supabase } from '../services/supabase';
import { PasswordService } from '../services/password';
import { CacheService } from '../services/cacheService';
import { TRPCError } from '@trpc/server';

// User role enum
const userRoleSchema = z.enum([
  'government_authority',
  'national_notary_authority',
  'regional_adoul_council',
  'authentication_judge',
  'society_member',
  'creator',
  'notary',
  'president_office',
]);

const courtTypeSchema = z.enum(['appellate', 'first_instance']);

// Partner schema
const partnerSchema = z.object({
  partner_name: z.string().min(1, 'اسم الشريك مطلوب'),
  contact_info: z.string().optional(),
  position_order: z.number().int().min(1).max(4),
});

// Registration schema
const registerSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirm_password: z.string(),
  role: userRoleSchema,
  full_name: z.string().min(1, 'الاسم الكامل مطلوب'),
  
  // Notary-specific fields (required when role = 'notary')
  appointment_decree_number: z.string().optional(),
  appointment_date: z.string().optional(),
  cin: z.string().optional(),
  tax_id: z.string().optional(),
  dob: z.string().optional(),
  court_type: courtTypeSchema.optional(),
  court_name: z.string().optional(),
  appellate_court: z.string().optional(),
  primary_court: z.string().optional(),
  phone: z.string().optional(),
  office_address: z.string().optional(),
  partners: z.array(partnerSchema).max(4).optional(),
}).refine(data => data.password === data.confirm_password, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirm_password'],
}).refine(data => {
  // If role is notary, require notary-specific fields
  if (data.role === 'notary') {
    return data.appointment_decree_number && data.court_type && data.court_name;
  }
  return true;
}, {
  message: 'معلومات العدل مطلوبة',
  path: ['appointment_decree_number'],
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  rememberMe: z.boolean().optional().default(false),
});

// Session info response
const sessionInfoSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: userRoleSchema,
    full_name: z.string(),
    is_active: z.boolean(),
  }),
  notary_profile: z.object({
    appointment_decree_number: z.string(),
    appointment_date: z.string().optional().nullable(),
    court_type: courtTypeSchema,
    court_name: z.string(),
    appellate_court: z.string().optional(),
    primary_court: z.string().nullable(),
    phone: z.string().nullable(),
    office_address: z.string().nullable(),
    profile_picture_url: z.string().nullable(),
    description: z.string().nullable().optional(),
  }).nullable(),
});

export const authRouter = router({
  /**
   * Register a new user
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, role, full_name, partners, ...notaryFields } = input;

      // ⚠️ CRITICAL: Only العدل (notary) can register publicly
      // All other roles (government_authority, national_notary_authority, authentication_judge)
      // have secret internal registration that is never exposed to the public
      if (role !== 'notary') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'هذا السجل غير متاح إلا لموظفي العدل. الأدوار الأخرى تتوفر على نظام داخلي خاص وسري ذو صلاحيات عليا.',
        });
      }

      // Validate password strength
      const passwordValidation = PasswordService.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.errors.join(', '),
        });
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'البريد الإلكتروني مستخدم بالفعل',
        });
      }

      // Hash password
      const password_hash = await PasswordService.hashPassword(password);

      // Create user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash,
          role,
          full_name,
        })
        .select('id, email, role, full_name, is_active')
        .single();

      if (userError || !user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في إنشاء الحساب',
        });
      }

      // If role is notary, create notary profile
      if (role === 'notary' && notaryFields.appointment_decree_number) {
        const { data: profile, error: profileError} = await supabase
          .from('notary_profiles')
          .insert({
            user_id: user.id,
            appointment_decree_number: notaryFields.appointment_decree_number,
            cin: notaryFields.cin || null,
            tax_identification_number: notaryFields.tax_id || null,
            dob: notaryFields.dob || null,
            appellate_court: notaryFields.appellate_court || notaryFields.court_name,
            primary_court: notaryFields.primary_court || null,
            court_type: notaryFields.court_type!,
            court_name: notaryFields.court_name!,
            phone: notaryFields.phone || null,
            office_address: notaryFields.office_address || null,
            profile_picture_url: null,
          })
          .select('id')
          .single();

        if (profileError || !profile) {
          console.error('❌ Failed to create notary profile in DB:', profileError);
          // Rollback user creation
          await supabase.from('users').delete().eq('id', user.id);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'فشل في إنشاء ملف العدل',
          });
        }

        // Add partners if provided
        if (partners && partners.length > 0) {
          const partnersData = partners.map(p => ({
            notary_profile_id: profile.id,
            partner_name: p.partner_name,
            contact_info: p.contact_info || null,
            position_order: p.position_order,
          }));

          await supabase.from('notary_partners').insert(partnersData);
        }
      }

      // Log the registration event
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        email,
        event_type: 'register',
        success: true,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
      };
    }),

  /**
   * Login user
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      try {
        const { email, password, rememberMe } = input;

        // Find user by email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, password_hash, role, full_name, is_active')
          .eq('email', email)
          .single();

        if (userError || !user) {
          // Log failed login attempt
          try {
            await supabase.from('auth_audit_log').insert({
              email,
              event_type: 'login',
              success: false,
              error_message: 'User not found',
            });
          } catch (e) {
            // Ignore audit log errors
          }

          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          });
        }

        // Check if user is active
        if (!user.is_active) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'الحساب معطل. يرجى الاتصال بالدعم',
          });
        }

        // Verify password
        const isValidPassword = await PasswordService.verifyPassword(
          password,
          user.password_hash
        );

        if (!isValidPassword) {
          // Log failed login attempt
          try {
            await supabase.from('auth_audit_log').insert({
              user_id: user.id,
              email,
              event_type: 'login',
              success: false,
              error_message: 'Invalid password',
            });
          } catch (e) {
            // Ignore audit log errors
          }

          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          });
        }

        // Generate session token
        const sessionToken = PasswordService.generateSessionToken();
        const expiresAt = new Date();
        // If rememberMe is true, extend expiry to 30 days, otherwise 7 days
        const expiryDays = rememberMe ? 30 : 7;
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        // Create session
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
          });

        if (sessionError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'فشل في إنشاء الجلسة',
          });
        }

        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);

        // Log successful login
        try {
          await supabase.from('auth_audit_log').insert({
            user_id: user.id,
            email,
            event_type: 'login',
            success: true,
          });
        } catch (e) {
          // Ignore audit log errors
        }

        // Get notary profile if applicable
        let notaryProfile = null;
        if (user.role === 'notary') {
          const { data: profile } = await supabase
            .from('notary_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          notaryProfile = profile;
        }

        const sessionPayload = {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            is_active: user.is_active,
          },
          notaryProfile,
          expires_at: expiresAt.toISOString(),
        };

        // Cache session immediately for instant subsequent lookups
        CacheService.cacheSession(sessionToken, sessionPayload, expiryDays * 86400).catch(() => {});

        return {
          success: true,
          sessionToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            is_active: user.is_active,
          },
          notaryProfile,
        };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    }),

  /**
   * Logout user
   */
  logout: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .mutation(async ({ input }) => {
      const { sessionToken } = input;

      // Get session to log user
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      // Delete session
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', sessionToken);

      // Invalidate cached session
      CacheService.invalidateSession(sessionToken).catch(() => {});

      // Log logout
      if (session) {
        await supabase.from('auth_audit_log').insert({
          user_id: session.user_id,
          event_type: 'logout',
          success: true,
        });
      }

      return { success: true };
    }),

  /**
   * Get current session info
   */
  getSession: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const { sessionToken } = input;

      // 1. Fast Path: High-speed Cache Lookup (< 1ms)
      try {
        const cached = await CacheService.getCachedSession(sessionToken);
        if (cached && cached.user) {
          // If cached session has an expiration timestamp, verify validity
          if (!cached.expires_at || new Date(cached.expires_at) >= new Date()) {
            return {
              user: cached.user,
              notaryProfile: cached.notaryProfile ?? null,
            };
          } else {
            // Expired in cache, invalidate
            await CacheService.invalidateSession(sessionToken).catch(() => {});
          }
        }
      } catch {
        // Fall through to database query
      }

      // 2. Slow Path: Remote Supabase DB Query
      // Find session
      const { data: session, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id, expires_at')
        .eq('session_token', sessionToken)
        .single();

      if (sessionError || !session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Check if session expired
      if (new Date(session.expires_at) < new Date()) {
        await supabase
          .from('user_sessions')
          .delete()
          .eq('session_token', sessionToken);

        CacheService.invalidateSession(sessionToken).catch(() => {});

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'انتهت صلاحية الجلسة',
        });
      }

      // Get user info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, role, full_name, is_active')
        .eq('id', session.user_id)
        .single();

      if (userError || !user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'المستخدم غير موجود',
        });
      }

      // Get notary profile if applicable
      let notaryProfile = null;
      if (user.role === 'notary') {
        const { data: profile } = await supabase
          .from('notary_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        notaryProfile = profile;
      }

      // 3. Populate Cache for subsequent requests (15-min sliding window)
      CacheService.cacheSession(
        sessionToken,
        {
          user,
          notaryProfile,
          expires_at: session.expires_at,
        },
        900
      ).catch(() => {});

      return {
        user,
        notaryProfile,
      };
    }),

  /**
   * Extend session expiry for "Remember Me" feature
   * When user has "Remember Me" checked, extend their session by 30 days
   */
  extendSession: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .mutation(async ({ input }) => {
      const { sessionToken } = input;

      // Find session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Extend session by 30 days
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);

      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('session_token', sessionToken);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في تمديد الجلسة',
        });
      }

      // Invalidate cache so next read updates to new expiry
      CacheService.invalidateSession(sessionToken).catch(() => {});

      return {
        success: true,
        expiresAt: newExpiresAt.toISOString(),
      };
    }),

  /**
   * Get notary partners with availability status
   */
  getNotaryPartners: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const { sessionToken } = input;

      // Verify session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Get notary profile
      const { data: profile } = await supabase
        .from('notary_profiles')
        .select('id')
        .eq('user_id', session.user_id)
        .single();

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ملف العدل غير موجود',
        });
      }

      // Get partners
      const { data: partners } = await supabase
        .from('notary_partners')
        .select('id, partner_name, contact_info, position_order, is_available')
        .eq('notary_profile_id', profile.id)
        .order('position_order');

      return partners || [];
    }),

  /**
   * Update partner availability
   */
  updatePartnerAvailability: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      partnerId: z.string().uuid(),
      isAvailable: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const { sessionToken, partnerId, isAvailable } = input;

      // Verify session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Get notary profile
      const { data: profile } = await supabase
        .from('notary_profiles')
        .select('id')
        .eq('user_id', session.user_id)
        .single();

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ملف العدل غير موجود',
        });
      }

      // Update partner availability (verify ownership)
      const { data: updated, error } = await supabase
        .from('notary_partners')
        .update({ is_available: isAvailable })
        .eq('id', partnerId)
        .eq('notary_profile_id', profile.id)
        .select()
        .single();

      if (error || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في تحديث حالة الشريك',
        });
      }

      return {
        success: true,
        partner: updated,
      };
    }),

  /**
   * Get all appellate courts (محاكم الاستئناف) - Cached for 24h
   */
  getAppellateCourts: publicProcedure
    .query(async () => {
      return CacheService.remember('ref:courts:appellate', 86400, async () => {
        return getAppellateCourts();
      });
    }),

  /**
   * Get primary courts for a specific appellate court - Cached for 24h
   */
  getPrimaryCourts: publicProcedure
    .input(z.object({ appellateCourt: z.string() }))
    .query(async ({ input }) => {
      const cacheKey = `ref:courts:primary:${encodeURIComponent(input.appellateCourt)}`;
      return CacheService.remember(cacheKey, 86400, async () => {
        return getCourtMappingJson(input.appellateCourt);
      });
    }),

  /**
   * Update notary profile information
   * Requires valid session token
   */
  updateNotaryProfile: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      appointment_decree_number: z.string().min(1, 'رقم قرار التعيين مطلوب'),
      appellate_court: z.string().min(1, 'محكمة الاستئناف مطلوبة'),
      primary_court: z.string().nullable(),
      phone: z.string().nullable(),
      office_address: z.string().nullable(),
      profile_picture_url: z.string().nullable(),
      description: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { sessionToken, ...updates } = input;

      // Verify session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Get user
      const { data: user } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', session.user_id)
        .single();

      if (!user || user.role !== 'notary') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'هذه العملية متاحة للعدل فقط',
        });
      }

      // Update notary profile
      const { data: updatedProfile, error } = await supabase
        .from('notary_profiles')
        .update({
          appointment_decree_number: updates.appointment_decree_number,
          appellate_court: updates.appellate_court,
          primary_court: updates.primary_court,
          phone: updates.phone,
          office_address: updates.office_address,
          profile_picture_url: updates.profile_picture_url,
          description: updates.description,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في تحديث الملف الشخصي',
        });
      }

      return {
        success: true,
        profile: updatedProfile,
      };
    }),

  /**
   * Add a partner to notary profile
   */
  addNotaryPartner: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      partner_name: z.string().min(1, 'اسم الشريك مطلوب'),
      contact_info: z.string().optional(),
      position_order: z.number().int().min(1).max(4),
    }))
    .mutation(async ({ input }) => {
      const { sessionToken, ...partnerData } = input;

      // Verify session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Get notary profile
      const { data: profile } = await supabase
        .from('notary_profiles')
        .select('id')
        .eq('user_id', session.user_id)
        .single();

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ملف العدل غير موجود',
        });
      }

      // Check if position_order is already taken
      const { data: existingPartner } = await supabase
        .from('notary_partners')
        .select('id')
        .eq('notary_profile_id', profile.id)
        .eq('position_order', partnerData.position_order)
        .single();

      if (existingPartner) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'هذا الترتيب محجوز بالفعل',
        });
      }

      // Add partner
      const { data: newPartner, error } = await supabase
        .from('notary_partners')
        .insert({
          notary_profile_id: profile.id,
          partner_name: partnerData.partner_name,
          contact_info: partnerData.contact_info || null,
          position_order: partnerData.position_order,
          is_available: true,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في إضافة الشريك',
        });
      }

      return {
        success: true,
        partner: newPartner,
      };
    }),

  /**
   * Update a partner
   */
  updateNotaryPartner: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      partnerId: z.string().uuid(),
      partner_name: z.string().min(1, 'اسم الشريك مطلوب'),
      contact_info: z.string().optional(),
      position_order: z.number().int().min(1).max(4),
    }))
    .mutation(async ({ input }) => {
      const { sessionToken, partnerId, ...updates } = input;

      // Verify session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Get notary profile
      const { data: profile } = await supabase
        .from('notary_profiles')
        .select('id')
        .eq('user_id', session.user_id)
        .single();

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ملف العدل غير موجود',
        });
      }

      // Update partner (verify ownership)
      const { data: updated, error } = await supabase
        .from('notary_partners')
        .update({
          partner_name: updates.partner_name,
          contact_info: updates.contact_info || null,
          position_order: updates.position_order,
        })
        .eq('id', partnerId)
        .eq('notary_profile_id', profile.id)
        .select()
        .single();

      if (error || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في تحديث الشريك',
        });
      }

      return {
        success: true,
        partner: updated,
      };
    }),

  /**
   * Delete a partner
   */
  deleteNotaryPartner: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      partnerId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const { sessionToken, partnerId } = input;

      // Verify session
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'جلسة غير صالحة',
        });
      }

      // Get notary profile
      const { data: profile } = await supabase
        .from('notary_profiles')
        .select('id')
        .eq('user_id', session.user_id)
        .single();

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ملف العدل غير موجود',
        });
      }

      // Delete partner (verify ownership)
      const { error } = await supabase
        .from('notary_partners')
        .delete()
        .eq('id', partnerId)
        .eq('notary_profile_id', profile.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'فشل في حذف الشريك',
        });
      }

      return {
        success: true,
      };
    }),
});
