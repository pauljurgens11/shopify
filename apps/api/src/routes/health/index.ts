/**
 * Example of the autoload pattern: this file's path becomes its URL.
 * Copy this shape for new routes — never edit a central router.
 *
 * NOTE: because this directory has an `index.ts`, autoload loads ONLY this file
 * and ignores its siblings (unlike routes/storefront/, which has none). A new
 * /health/* route goes in here, not in a new file next to it — a sibling file
 * registers nothing and fails silently.
 */
import type { FastifyInstance } from 'fastify';
import { hostResolvesToShop } from '../../lib/custom-domains.ts';

export default async function routes(app: FastifyInstance) {
  app.get('/', () => ({ status: 'ok', uptime: process.uptime() }));

  /**
   * `GET /health/tls-ask?domain=…` — Caddy's on-demand TLS gate (A5, SPEC §17).
   *
   * The production Caddyfile serves every unclaimed hostname as a storefront
   * and mints a certificate for it on first request, which is what makes
   * `{slug}.{base}` and merchant custom domains work with no wildcard cert.
   * Ungated that is an open invitation: anyone who points a DNS record at the
   * box makes Caddy ask a public CA for a certificate, and a few hundred of
   * those exhaust the deployment's issuance rate limit — after which the *real*
   * hostnames stop renewing too.
   *
   * So Caddy asks here first, and only a hostname that resolves to a shop is
   * allowed. 2xx means issue, anything else means refuse — that is the whole of
   * Caddy's contract, so the body is irrelevant and a refusal is a bare 404
   * rather than a SPEC §5 error envelope.
   *
   * Sits under /health because it resolves no tenant of its own: the hostname
   * arrives as a query parameter rather than as this request's Host, and it has
   * to be answerable before any certificate for that host exists.
   */
  app.get('/tls-ask', async (request, reply) => {
    const { domain } = request.query as { domain?: string };
    if (!domain) return reply.code(400).send('missing domain');
    if (!(await hostResolvesToShop(domain))) return reply.code(404).send('unknown host');
    return reply.code(200).send('ok');
  });
}
