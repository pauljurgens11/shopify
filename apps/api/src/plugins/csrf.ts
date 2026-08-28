/**
 * CSRF for cookie-authenticated mutations (SPEC §8). Owner: WS-A.
 *
 * The cookie is SameSite=Lax, which already blocks cross-site POSTs from a
 * form. The header check closes the rest: a cross-origin `fetch` that sets a
 * custom header triggers a CORS preflight, and app.ts only admits the admin and
 * storefront origins — so a foreign page cannot make this request at all.
 *
 * Scope is deliberately narrow: only requests whose shop was proved by a
 * session cookie. Bearer requests are exempt per SPEC (no ambient credential),
 * the storefront resolves by Host rather than by a cookie, and `/auth/login`
 * must stay callable with plain curl or every demo script breaks.
 */
import { CSRF_HEADER } from '@merchant/config/constants';
import fp from 'fastify-plugin';
import { forbidden } from '../lib/errors.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export default fp(
  async (app) => {
    app.addHook('onRequest', async (request) => {
      if (request.authKind !== 'session') return;
      if (SAFE_METHODS.has(request.method)) return;

      // Any non-empty value passes: presence is what proves the request came
      // from script on an allowed origin. Pinning an exact string would buy
      // nothing and break the first client that sends its own product name.
      const header = request.headers[CSRF_HEADER];
      const value = Array.isArray(header) ? header[0] : header;
      if (!value) {
        throw forbidden(`Missing ${CSRF_HEADER} header.`);
      }
    });
  },
  // Must run after tenancy: authKind is what decides whether this applies.
  { name: 'csrf', dependencies: ['tenancy'] },
);
