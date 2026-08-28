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
    // ULIDs make a request traceable across api → worker → webhook delivery.
    genReqId: () => crypto.randomUUID(),
    trustProxy: config.NODE_ENV === 'production',
  });

  await app.register(errorHandler);

  await app.register(cors, {
    // Admin and storefront are separate origins in dev; cookies must survive.
    origin: [config.ADMIN_URL, new RegExp(`\\.${config.STOREFRONT_BASE_DOMAIN.split(':')[0]}$`)],
    credentials: true,
  });

  await app.register(cookie, { secret: config.SESSION_SECRET });

  await app.register(rateLimit, {
    global: false, // opt in per route group — see RATE_LIMITS
    max: RATE_LIMITS.adminApi.max,
    timeWindow: RATE_LIMITS.adminApi.windowMs,
  });

  await app.register(tenancy);

  // Autoloaded route tree. `dirNameRoutePrefix` turns folders into URL segments.
  await app.register(autoload, {
    dir: join(here, 'routes'),
    routeParams: true,
    ignorePattern: /.*\.(test|spec)\.ts$/,
    options: {},
  });

  return app;
}
