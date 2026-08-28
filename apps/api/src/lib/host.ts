/**
 * Host header → shop slug (SPEC §6).
 *
 * Kept as a pure function, and deliberately duplicated from
 * `apps/storefront/src/lib/tenant.ts` rather than shared: that module imports
 * `next/headers`, which cannot load inside Fastify. The two implementations
 * must agree — see `test/host.test.ts` for the cases that matter.
 *
 * Owner: WS-A.
 */

/**
 * `demo.lvh.me:3002` + base `lvh.me:3002` → `demo`.
 *
 * Returns null for the apex, `www`, multi-level subdomains and any host outside
 * the base domain. Null means "no shop here", never "guess" — a wrong guess is
 * a cross-tenant render.
 */
export function shopSlugFromHost(host: string | undefined, baseDomain: string): string | null {
  if (!host) return null;

  const hostname = host.split(':')[0]?.toLowerCase();
  const base = baseDomain.split(':')[0]?.toLowerCase();
  if (!hostname || !base) return null;

  const suffix = `.${base}`;
  if (!hostname.endsWith(suffix)) return null;

  const slug = hostname.slice(0, -suffix.length);
  if (!slug || slug.includes('.') || slug === 'www') return null;
  return slug;
}
