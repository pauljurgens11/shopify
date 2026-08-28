/**
 * A random id that works on the storefront's real origins. Owner: WS-E.
 *
 * NOT `crypto.randomUUID()`: it is gated to secure contexts, and the documented
 * dev storefront is `http://{slug}.lvh.me:3002` — plain HTTP, so
 * `isSecureContext` is false and the function is simply undefined there. A
 * checkout that calls it throws on "Pay now" and never reaches the vault, while
 * working perfectly on `localhost` (which browsers treat as secure) and in
 * production behind TLS. That is the worst shape a bug can have.
 *
 * `crypto.getRandomValues` has no such restriction and is what
 * `@merchant/config/ids` uses server-side; this is the same idea, small enough
 * not to pull that module into a browser bundle.
 */
export function randomId(bytes = 16): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
