/**
 * Webhook body signing (SPEC §13). Owner: WS-G.
 *
 * Base64 HMAC-SHA256, the same shape Shopify uses, so a merchant's existing
 * verification snippet works against us with only the header name changed.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const DIGEST_BYTES = 32; // SHA-256

/** Sign the exact bytes that go on the wire — never a re-serialized object. */
export function signWebhookBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

/**
 * Constant-time compare. Returns false rather than throwing on malformed input:
 * this also runs in the demo receiver, where the "signature" is whatever the
 * caller sent.
 */
export function verifyWebhookSignature(body: string, secret: string, signature: string): boolean {
  const provided = Buffer.from(signature, 'base64');
  if (provided.length !== DIGEST_BYTES) return false;
  const expected = Buffer.from(signWebhookBody(body, secret), 'base64');
  return timingSafeEqual(expected, provided);
}
