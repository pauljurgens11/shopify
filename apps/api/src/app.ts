/**
 * Fastify app assembly (SPEC §3). Owner: WS-A.
 *
 * Routes are AUTOLOADED from src/routes/**. Adding an endpoint means adding a
 * file — there is no central router to edit, and therefore no file that all
 * eight workstreams fight over (CLAUDE.md §3).
 *
 * URL prefix follows the directory path:
 *   src/routes/admin/products/index.ts  →  /admin/api/products   (see prefix below)
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autoload from '@fastify/autoload';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { RATE_LIMITS } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import Fastify, { type FastifyInstance } from 'fastify';
import { rateLimited } from './lib/errors.ts';
import csrf from './plugins/csrf.ts';
import errorHandler from './plugins/error-handler.ts';
import tenancy from './plugins/tenancy.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

export async function buildApp(): Promise<FastifyInstance> {
  const config = env();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      // Never let a card number or a session cookie reach the logs (SPEC §15).
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'req.body.number',
          'req.body.cvc',
          'req.body.password',
        ],
        censor: '[redacted]',
      },
    },
    // A per-request id makes a request traceable across api → worker → webhook delivery.
    genReqId: () => crypto.randomUUID(),
    // Fastify's 10s default is a boot-time budget, and autoload spends it
    // dynamically importing every route file. Under Vitest on a cold cache —
    // which is exactly what CI does after `pnpm install` — transpiling the
    // route tree alone can take most of that, and the whole suite then fails
    // with "Plugin did not start in time" rather than anything diagnostic.
    // Raised as the route tree grows; it bounds startup only, never a request.
    pluginTimeout: 60_000,
    trustProxy: config.NODE_ENV === 'production',
  });

  await app.register(errorHandler);

  // Storefront origins are per-shop subdomains: http://{slug}.lvh.me:3002.
  // The Origin header includes scheme and port, so the pattern must too —
  // a bare `\.lvh.me$` matches nothing. This also has to admit the checkout's
  // direct browser POST to /vault/tokenize (SPEC §11).
  const storefrontHost = config.STOREFRONT_BASE_DOMAIN.split(':')[0] ?? 'lvh.me';
  const storefrontOrigin = new RegExp(
    `^https?://[a-z0-9-]+\\.${storefrontHost.replaceAll('.', '\\.')}(:\\d+)?$`,
  );

  await app.register(cors, {
    // Admin and storefront are separate origins in dev; cookies must survive.
    origin: [config.ADMIN_URL, storefrontOrigin],
    credentials: true,
  });

  await app.register(cookie, { secret: config.SESSION_SECRET });

  await app.register(rateLimit, {
    global: false, // opt in per route group — see RATE_LIMITS
    max: RATE_LIMITS.adminApi.max,
    timeWindow: RATE_LIMITS.adminApi.windowMs,
    // @fastify/rate-limit THROWS whatever this returns, so it has to be an
    // Error carrying a statusCode — a bare SPEC-shaped object arrives at
    // setErrorHandler with no status and comes back out as a 500. Returning an
    // ApiError puts it on the normal error path, so the 429 and the SPEC §5
    // body both come from one place.
    errorResponseBuilder: (_req, context) =>
      rateLimited(`Rate limit exceeded. Retry in ${context.after}.`),
  });

  await app.register(tenancy);
  // After tenancy: it only guards requests tenancy proved with a session cookie.
  await app.register(csrf);

  // Autoloaded route tree — folders become URL segments, with two mappings so
  // the on-disk layout (docs/WORKSTREAMS.md) lands on the SPEC §5/§10 paths:
  //   routes/admin/products/**    → /admin/api/products/**
  //   routes/storefront/carts/**  → /storefront/api/carts/**
  //   routes/api/**               → /api/**            (public Admin REST API)
  //   routes/vault/**, health/**  → /vault/**, /health  (verbatim)
  await app.register(autoload, {
    dir: join(here, 'routes'),
    routeParams: true,
    ignorePattern: /.*\.(test|spec)\.ts$/,
    dirNameRoutePrefix: (folderParent, folderName) => {
      if (folderParent === join(here, 'routes')) {
        if (folderName === 'admin') return 'admin/api';
        if (folderName === 'storefront') return 'storefront/api';
      }
      return folderName;
    },
    options: {},
  });

  return app;
}
