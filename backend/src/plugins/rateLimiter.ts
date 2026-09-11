import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { CacheService } from '../services/cacheService';

export interface RateLimitOptions {
  windowSeconds?: number;
  generalLimit?: number;
  authLimit?: number;
  heavyLimit?: number;
}

function getClientIp(request: FastifyRequest): string {
  // Only trust X-Forwarded-For if request came from trusted proxy or TRUST_PROXY is enabled
  const trustProxyEnv = process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production';
  if (trustProxyEnv) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0].trim();
      if (first && /^[0-9a-f.:]+$/i.test(first)) return first;
    }
    const realIp = request.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim() && /^[0-9a-f.:]+$/i.test(realIp.trim())) {
      return realIp.trim();
    }
  }
  return request.ip || '127.0.0.1';
}

function classifyRouteTier(url: string): { tier: 'auth' | 'heavy' | 'general' | 'exempt'; max: number; window: number } {
  const cleanUrl = url.toLowerCase();

  // 1. Exempt routes
  if (cleanUrl === '/health' || cleanUrl.startsWith('/health?') || cleanUrl.includes('favicon.ico')) {
    return { tier: 'exempt', max: 0, window: 0 };
  }

  // 2. Sensitive Authentication Routes (Brute-force protection)
  if (
    cleanUrl.includes('auth.login') ||
    cleanUrl.includes('auth.register') ||
    cleanUrl.includes('auth.forgotpassword') ||
    cleanUrl.includes('auth.resetpassword') ||
    cleanUrl.includes('/login') ||
    cleanUrl.includes('/register')
  ) {
    return { tier: 'auth', max: 10, window: 60 };
  }

  // 3. Heavy Compute Operations (OCR, PDF Rendering, Document Conversion)
  if (
    cleanUrl.includes('ocr') ||
    cleanUrl.includes('generatedocx') ||
    cleanUrl.includes('generatepdf') ||
    cleanUrl.includes('convertdocxtopdf') ||
    cleanUrl.includes('previewpdf')
  ) {
    return { tier: 'heavy', max: 20, window: 60 };
  }

  // 4. General API routes
  return { tier: 'general', max: 300, window: 60 };
}

/**
 * Enterprise Distributed Rate Limiting Plugin
 * Uses sliding-window Redis counters with automatic in-memory fallback via CacheService.
 */
const rateLimiterPlugin: FastifyPluginAsync<RateLimitOptions> = async (fastify: FastifyInstance, opts: RateLimitOptions) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Never rate limit CORS preflight requests
    if (request.method === 'OPTIONS') {
      return;
    }

    const { tier, max, window } = classifyRouteTier(request.url);
    if (tier === 'exempt') {
      return;
    }

    // Allow user overrides from opts
    const limit =
      tier === 'auth'
        ? (opts.authLimit ?? max)
        : tier === 'heavy'
        ? (opts.heavyLimit ?? max)
        : (opts.generalLimit ?? max);

    const windowSeconds = opts.windowSeconds ?? window;
    const ip = getClientIp(request);
    const key = `rl:${tier}:${ip}`;

    try {
      const { count, ttl } = await CacheService.incrWithExpiry(key, windowSeconds);

      // Emit standard RateLimit response headers (IETF RFC draft)
      reply.header('RateLimit-Limit', limit);
      reply.header('RateLimit-Remaining', Math.max(0, limit - count));
      reply.header('RateLimit-Reset', ttl);

      if (count > limit) {
        reply.header('Retry-After', ttl);

        // Guarantee CORS headers on rate-limited early replies
        const origin = request.headers.origin;
        if (origin) {
          reply.header('Access-Control-Allow-Origin', origin);
          reply.header('Access-Control-Allow-Credentials', 'true');
        }

        const isBatch = request.url.includes('batch=');
        const userFriendlyMessage =
          tier === 'auth'
            ? `عدد محاولات تسجيل الدخول تجاوز الحد المسموح. يرجى الانتظار ${ttl} ثانية قبل المحاولة مجدداً.`
            : `Too many requests from this address. Please retry in ${ttl} second(s).`;

        if (isBatch) {
          // Return tRPC batch response format so browser tRPC client unwraps the error cleanly
          return reply.status(429).send([
            {
              error: {
                message: userFriendlyMessage,
                code: -32029,
                data: {
                  code: 'TOO_MANY_REQUESTS',
                  httpStatus: 429,
                  retryAfter: ttl,
                },
              },
            },
          ]);
        }

        return reply.status(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: userFriendlyMessage,
          retryAfter: ttl,
        });
      }
    } catch (err) {
      // In case of any unexpected rate limiter failure, fail open so legitimate traffic is not interrupted
      fastify.log.warn({ err }, '[RateLimiter] Error evaluating rate limit counter, failing open');
    }
  });
};

export default fp(rateLimiterPlugin, {
  name: 'rate-limiter',
  fastify: '4.x',
});

