import { initTRPC, TRPCError } from '@trpc/server';
import { CacheService } from '../services/cacheService';

export interface UserSessionPayload {
  id: string;
  email: string;
  role: string;
  full_name: string;
  is_active: boolean;
}

export interface TrpcContext {
  req?: any;
  res?: any;
  sessionToken?: string | null;
  user?: UserSessionPayload | null;
  notaryProfile?: any | null;
}

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Universal Authentication Middleware
 * 
 * Verifies session via CacheService (< 1ms).
 * Transparently checks ctx.sessionToken (from HTTP headers) OR rawInput.sessionToken (input payload).
 */
const isAuthed = t.middleware(async ({ ctx, next, input, getRawInput }) => {
  // 1. Check if user already resolved from context headers
  if (ctx.user) {
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        notaryProfile: ctx.notaryProfile,
      },
    });
  }

  // 2. Backward compatibility: check if sessionToken was passed in input payload
  let token = ctx.sessionToken;
  if (!token && input && typeof input === 'object' && 'sessionToken' in input) {
    token = String((input as any).sessionToken);
  }
  if (!token && typeof getRawInput === 'function') {
    try {
      const raw = await getRawInput();
      if (raw && typeof raw === 'object' && 'sessionToken' in raw) {
        token = String((raw as any).sessionToken);
      }
    } catch {
      // ignore
    }
  }

  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'غير مصرح - يرجى تسجيل الدخول للوصول لهذه الخدمة',
    });
  }

  // 3. Verify via Cache Engine (< 1ms cache hit)
  const verified = await CacheService.verifySessionWithCache(token);
  if (!verified || !verified.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'جلسة غير صالحة أو منتهية الصلاحية',
    });
  }

  return next({
    ctx: {
      ...ctx,
      sessionToken: token,
      user: verified.user as UserSessionPayload,
      notaryProfile: verified.notaryProfile,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Role-Restricted Procedure Factory
 */
export const requireRole = (allowedRoles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'ليس لديك الصلاحية الكافية للوصول إلى هذا المورد القضائي/المهني',
      });
    }
    return next({ ctx });
  });

export const notaryProcedure = protectedProcedure.use(
  requireRole(['notary'])
);

export const judgeProcedure = protectedProcedure.use(
  requireRole(['authentication_judge', 'regional_judge', 'supreme_judge'])
);

export const councilProcedure = protectedProcedure.use(
  requireRole(['regional_adoul_council'])
);

/**
 * Resolves user session from CacheService (< 1ms).
 * Throws TRPCError UNAUTHORIZED / FORBIDDEN if session is invalid or user is inactive.
 */
export async function resolveSessionUser(sessionToken: string): Promise<UserSessionPayload> {
  if (!sessionToken || typeof sessionToken !== 'string') {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'رمز الجلسة غير صالح أو مفقود',
    });
  }

  const verified = await CacheService.verifySessionWithCache(sessionToken);
  if (!verified || !verified.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'جلسة غير صالحة أو منتهية الصلاحية',
    });
  }

  if (!verified.user.is_active) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'الحساب غير مفعّل',
    });
  }

  return verified.user as UserSessionPayload;
}

