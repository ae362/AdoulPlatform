import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Enterprise HTTP Security Headers Plugin
 * Enforces defense-in-depth headers aligned with OWASP & RFC specifications.
 */
const securityHeadersPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onSend', async (_request, reply) => {
    // 1. Prevent MIME sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // 2. Clickjacking protection: SAMEORIGIN allows legitimate internal framing (OnlyOffice / PDF view)
    reply.header('X-Frame-Options', 'SAMEORIGIN');

    // 3. Referrer Policy: Send full URL for same-origin, domain-only for cross-origin HTTPS, none for HTTP
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 4. X-XSS-Protection (legacy fallback for older browsers)
    reply.header('X-XSS-Protection', '1; mode=block');

    // 5. Modern Permissions-Policy: Restrict APIs while permitting Camera/Mic for remote notary hearings
    reply.header(
      'Permissions-Policy',
      'camera=(self), microphone=(self), geolocation=(), display-capture=(self)'
    );

    // 6. Strict-Transport-Security (HSTS) in production
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // 7. Content Security Policy (CSP)
    // Structured to permit OnlyOffice iframe collaboration, Google Fonts, and secure WebSockets
    const isProd = process.env.NODE_ENV === 'production';
    const cspDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self' http://localhost:* http://127.0.0.1:* https:",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' ws: wss: http: https:",
      "media-src 'self' blob:",
      "object-src 'none'",
    ];

    if (isProd) {
      reply.header('Content-Security-Policy', cspDirectives.join('; '));
    }
  });
};

export default fp(securityHeadersPlugin, {
  name: 'security-headers',
  fastify: '4.x',
});

