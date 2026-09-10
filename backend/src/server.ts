import './env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyRequestHandler } from '@trpc/server/adapters/fastify';
import { appRouter } from './router';
import { registerRemoteHearingWebsocket } from './ws/remoteHearingSignaling';
import { registerStuReleaseRoute } from './routes/stuRelease';
import { registerOnlyOfficeRoutes } from './routes/onlyoffice';
import { CacheService } from './services/cacheService';
import { TrpcContext } from './routers/trpc';
import securityHeaders from './plugins/securityHeaders';
import rateLimiter from './plugins/rateLimiter';

// 5MB attachments are base64-encoded (~33% bigger) and wrapped in JSON, so we need a higher limit.
const fastify = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });

// Register Enterprise Security Headers
fastify.register(securityHeaders);

// Register Distributed Rate Limiter
fastify.register(rateLimiter);

// tRPC v11 Fastify adapter expects raw body as string to handle its own parsing/transformation
fastify.removeContentTypeParser('application/json');
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (_, body, done) {
  done(null, body);
});

// Configure Enterprise CORS with Strict Whitelist Enforcement
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

fastify.register(cors, {
  origin: (origin, callback) => {
    // 1. Allow non-browser requests (mobile apps, server-to-server, curl, local scripts)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allow localhost and 127.0.0.1 in non-production environments
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    // 3. Strict match against explicit whitelist
    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS policy`), false);
    }

    // 4. Default fallback: allow in dev, reject in strict production
    if (isDev) {
      return callback(null, true);
    }

    return callback(new Error('Cross-Origin Request Blocked by Security Policy'), false);
  },
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-session-token',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Range',
  ],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// Health check route to verify backend is up on this port and report cache engine status
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 4000,
    cache: CacheService.getStatus(),
  };
});

// Initialize enterprise cache provider (Redis with seamless In-Memory fallback)
CacheService.init().catch((err) => {
  fastify.log.warn({ err }, 'CacheService background initialization warning');
});

// Local hardware bridge: best-effort forced release of STU sessions on unload.
registerStuReleaseRoute(fastify).catch((err) => {
  fastify.log.error({ err }, 'Failed to register /stu/release route');
});

// OnlyOffice integration (DOCX WYSIWYG editing server -> callback persists artifacts to Supabase).
registerOnlyOfficeRoutes(fastify).catch((err) => {
  fastify.log.error({ err }, 'Failed to register OnlyOffice routes');
});

const createContext = async (opts: { req: any; res: any }): Promise<TrpcContext> => {
  const req = opts.req;
  let sessionToken: string | null = null;
  const authHeader = req.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.slice(7).trim();
  } else if (req.headers?.['x-session-token']) {
    sessionToken = String(req.headers['x-session-token']).trim();
  } else if (req.query && typeof req.query === 'object' && (req.query as any).sessionToken) {
    sessionToken = String((req.query as any).sessionToken).trim();
  }

  let user = null;
  let notaryProfile = null;

  if (sessionToken) {
    const verified = await CacheService.verifySessionWithCache(sessionToken);
    if (verified) {
      user = verified.user;
      notaryProfile = verified.notaryProfile ?? null;
    }
  }

  return {
    req,
    res: opts.res,
    sessionToken,
    user,
    notaryProfile,
  };
};

const trpcOptions = {
  router: appRouter,
  createContext,
  allowBatching: true,
};

// Note: In some tRPC v11 builds, the fastifyTRPCPlugin prefix handling can differ between ESM/CJS.
// Using a wildcard route ensures all tRPC paths (including batch requests) are handled correctly.
fastify.all('/trpc/*', async (req, res) => {
  const path = (req.params as any)['*'] as string;
  await fastifyRequestHandler({
    ...(trpcOptions as any),
    req,
    res,
    path,
  });
});

try {
  // Keep this best-effort: if websocket plugin fails, the API should still work.
  registerRemoteHearingWebsocket(fastify).catch((err) => {
    fastify.log.error({ err }, 'Failed to register websocket signaling');
  });
} catch (err) {
  fastify.log.error({ err }, 'Failed to register websocket handlers');
}

// Graceful Process Termination Handlers
const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Force termination fallback if graceful shutdown hangs
  const forceTimer = setTimeout(() => {
    fastify.log.error('Graceful shutdown timed out (10s). Forcing process exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  try {
    await fastify.close();
    fastify.log.info('Fastify server stopped accepting new connections.');

    await CacheService.disconnect();
    fastify.log.info('CacheService (Redis & Memory cleanup) stopped cleanly.');

    clearTimeout(forceTimer);
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const port = Number(process.env.PORT) || 4000;
fastify
  .listen({ port, host: '0.0.0.0' })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });

