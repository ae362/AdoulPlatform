import './env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { exec } from 'child_process';
import path from 'path';
import { fastifyRequestHandler } from '@trpc/server/adapters/fastify';
import { appRouter } from './router';
import { registerRemoteHearingWebsocket } from './ws/remoteHearingSignaling';
import { registerStuReleaseRoute } from './routes/stuRelease';
import { registerOnlyOfficeRoutes } from './routes/onlyoffice';
import { CacheService } from './services/cacheService';
import { TrpcContext } from './routers/trpc';

// Best-effort OnlyOffice service auto-check on startup
try {
  const checkScriptPath = path.resolve(__dirname, '../scripts/ensure-onlyoffice.js');
  exec(`node "${checkScriptPath}"`, (_err, stdout) => {
    if (stdout) console.log(stdout.trim());
  });
} catch {
  // Non-blocking best-effort
}

// 5MB attachments are base64-encoded (~33% bigger) and wrapped in JSON, so we need a higher limit.
const fastify = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });

// tRPC v11 Fastify adapter expects raw body as string to handle its own parsing/transformation
fastify.removeContentTypeParser('application/json');
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (_, body, done) {
  done(null, body);
});

fastify.register(cors, {
  origin: (origin, callback) => {
    // Allow localhost (any port) and your production domain
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Also allow all origins for development
    }
  },
  credentials: true,
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

const port = Number(process.env.PORT) || 4000;
fastify
  .listen({ port, host: '0.0.0.0' })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });
