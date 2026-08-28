/**
 * A tiny in-process TTL cache. Owner: WS-A.
 *
 * Used for the per-request shop lookups on the storefront and Admin API paths:
 * without it every storefront page view costs a `shops` SELECT before the
 * handler even starts. The TTL is short on purpose — a revoked API token or a
 * deleted shop must not stay usable for long, and stale entries here cannot
 * leak across tenants because the key IS the tenant discriminator.
 */
export type TtlCache<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
};

export function ttlCache<T>(ttlMs: number, maxEntries = 1_000): TtlCache<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key) {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      // Insertion-ordered Map: the oldest key is the first one. Crude, but this
      // holds one entry per active shop, not per request.
      if (entries.size >= maxEntries) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    clear() {
      entries.clear();
    },
  };
}
