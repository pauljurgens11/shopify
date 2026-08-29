import { describe, expect, it } from 'vitest';
import { signRevalidateToken, verifyRevalidateToken } from './revalidate-token.ts';

describe('revalidate tokens', () => {
  it('round-trips for the slug it was minted for', () => {
    const token = signRevalidateToken('demo');
    expect(verifyRevalidateToken('demo', token)).toBe(true);
  });

  it('rejects a foreign slug — a token for one shop must not bust another', () => {
    expect(verifyRevalidateToken('other-shop', signRevalidateToken('demo'))).toBe(false);
  });

  it('rejects an expired token', () => {
    const token = signRevalidateToken('demo', Date.now() - 120_000);
    expect(verifyRevalidateToken('demo', token)).toBe(false);
  });

  it('rejects tampering with the expiry half', () => {
    const token = signRevalidateToken('demo');
    const forged = `${Date.now() + 999_999}.${token.split('.')[1]}`;
    expect(verifyRevalidateToken('demo', forged)).toBe(false);
  });

  it('rejects garbage', () => {
    expect(verifyRevalidateToken('demo', '')).toBe(false);
    expect(verifyRevalidateToken('demo', 'not-a-token')).toBe(false);
    expect(verifyRevalidateToken('demo', '.only-sig')).toBe(false);
  });
});
