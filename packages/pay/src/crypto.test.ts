/**
 * Cipher primitives (SPEC §14.2 — mandatory, blocking).
 *
 * Hermetic: every case passes its own key, so these run without a .env.
 */
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, keyFromHex } from './crypto.ts';

const KEY = keyFromHex('a'.repeat(64));
const OTHER_KEY = keyFromHex('b'.repeat(64));

describe('keyFromHex', () => {
  it('accepts 64 hex chars (32 bytes)', () => {
    expect(keyFromHex('0'.repeat(64))).toHaveLength(32);
  });

  it.each([
    ['too short', 'a'.repeat(62)],
    ['too long', 'a'.repeat(66)],
    ['not hex', 'z'.repeat(64)],
    ['empty', ''],
  ])('rejects a key that is %s', (_label, hex) => {
    expect(() => keyFromHex(hex)).toThrow(/32 bytes/i);
  });
});

describe('encrypt / decrypt', () => {
  it('round-trips a payload', () => {
    expect(decrypt(encrypt('{"number":"4242"}', KEY), KEY)).toBe('{"number":"4242"}');
  });

  it('round-trips non-ASCII (cardholder names are not all ASCII)', () => {
    expect(decrypt(encrypt('Åsa Öström — ünïcode', KEY), KEY)).toBe('Åsa Öström — ünïcode');
  });

  it('uses a fresh IV per call, so identical plaintexts differ on disk', () => {
    const a = encrypt('same', KEY);
    const b = encrypt('same', KEY);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('rejects a tampered authTag', () => {
    const sealed = encrypt('secret', KEY);
    expect(() => decrypt({ ...sealed, authTag: flipFirstByte(sealed.authTag) }, KEY)).toThrow();
  });

  it('rejects tampered ciphertext', () => {
    const sealed = encrypt('secret', KEY);
    expect(() =>
      decrypt({ ...sealed, ciphertext: flipFirstByte(sealed.ciphertext) }, KEY),
    ).toThrow();
  });

  it('rejects a tampered IV', () => {
    const sealed = encrypt('secret', KEY);
    expect(() => decrypt({ ...sealed, iv: flipFirstByte(sealed.iv) }, KEY)).toThrow();
  });

  it('rejects the wrong key', () => {
    expect(() => decrypt(encrypt('secret', KEY), OTHER_KEY)).toThrow();
  });

  it('never echoes the plaintext in the failure message', () => {
    const sealed = encrypt('4242424242424242', KEY);
    expect(() => decrypt(sealed, OTHER_KEY)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('4242') }),
    );
  });
});

/** Corrupt one byte of a base64 field without changing its length. */
function flipFirstByte(base64: string): string {
  const buf = Buffer.from(base64, 'base64');
  buf[0] = (buf[0] ?? 0) ^ 0xff;
  return buf.toString('base64');
}
