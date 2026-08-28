/**
 * The signature is the only thing standing between a merchant's endpoint and
 * anyone who learns its URL, so it is verified here against an INDEPENDENT
 * implementation (WebCrypto) rather than against itself.
 */
import { describe, expect, it } from 'vitest';
import { signWebhookBody, verifyWebhookSignature } from './hmac.ts';

const SECRET = 'whsec_5f3c9a1b8d2e4706b1c8a95d3f7e2064';

/** Same algorithm, different library — a copy of the code under test would prove nothing. */
async function hmacViaWebCrypto(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Buffer.from(sig).toString('base64');
}

describe('signWebhookBody', () => {
  it('matches an independent HMAC-SHA256 computation', async () => {
    const body = JSON.stringify({ topic: 'orders/create', data: { id: 'ord_1' } });
    expect(signWebhookBody(body, SECRET)).toBe(await hmacViaWebCrypto(body, SECRET));
  });

  it('signs the raw bytes, so equivalent JSON with different whitespace differs', () => {
    const compact = '{"a":1}';
    const spaced = '{ "a": 1 }';
    expect(signWebhookBody(compact, SECRET)).not.toBe(signWebhookBody(spaced, SECRET));
  });

  it('is base64, like Shopify — merchants copy their verification code across', () => {
    const sig = signWebhookBody('{}', SECRET);
    expect(sig).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(Buffer.from(sig, 'base64')).toHaveLength(32);
  });

  it('depends on the secret', () => {
    expect(signWebhookBody('{}', SECRET)).not.toBe(signWebhookBody('{}', `${SECRET}x`));
  });

  it('handles multi-byte characters as UTF-8', async () => {
    const body = JSON.stringify({ title: 'Café — Aurora ☕' });
    expect(signWebhookBody(body, SECRET)).toBe(await hmacViaWebCrypto(body, SECRET));
  });
});

describe('verifyWebhookSignature', () => {
  it('accepts its own signature and rejects a tampered body', () => {
    const body = '{"amount":1999}';
    const sig = signWebhookBody(body, SECRET);
    expect(verifyWebhookSignature(body, SECRET, sig)).toBe(true);
    expect(verifyWebhookSignature('{"amount":199900}', SECRET, sig)).toBe(false);
  });

  it('rejects garbage without throwing (length mismatch must not crash the receiver)', () => {
    expect(verifyWebhookSignature('{}', SECRET, '')).toBe(false);
    expect(verifyWebhookSignature('{}', SECRET, 'not-base64-at-all!!')).toBe(false);
    expect(verifyWebhookSignature('{}', SECRET, 'c2hvcnQ=')).toBe(false);
  });
});
