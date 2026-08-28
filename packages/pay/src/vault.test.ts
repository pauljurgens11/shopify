/**
 * Vault unit suite (SPEC §14.2 — mandatory, blocking).
 *
 * Pure parts only: no database. The one rule these tests exist to defend is
 * that a PAN never survives anywhere readable — not in the stored blob, not in
 * a validation error.
 */
import { describe, expect, it } from 'vitest';
import {
  detectBrand,
  luhnValid,
  normalizeCardNumber,
  openCardBlob,
  sealCardBlob,
  VaultValidationError,
  validateCard,
  validateExpiry,
} from './vault.ts';

const VISA = '4242424242424242';

describe('normalizeCardNumber', () => {
  it('strips the spaces and dashes a card field formats in', () => {
    expect(normalizeCardNumber('4242 4242 4242 4242')).toBe(VISA);
    expect(normalizeCardNumber('4242-4242-4242-4242')).toBe(VISA);
  });

  it('leaves other characters alone, so validation still rejects them', () => {
    expect(normalizeCardNumber('4242abc')).toBe('4242abc');
  });
});

describe('luhnValid', () => {
  it.each([
    ['visa (mock approve card)', VISA],
    ['visa (mock decline card)', '4000000000000002'],
    ['visa (mock insufficient funds)', '4000000000009995'],
    ['mastercard', '5555555555554444'],
    ['mastercard 2-series', '2223003122003222'],
    ['amex (15 digits)', '378282246310005'],
    ['discover', '6011111111111117'],
    ['jcb', '3530111333300000'],
    ['diners (14 digits)', '30569309025904'],
  ])('accepts %s', (_label, number) => {
    expect(luhnValid(number)).toBe(true);
  });

  it('rejects an off-by-one digit', () => {
    expect(luhnValid('4242424242424241')).toBe(false);
  });

  it('accepts a number the customer typed with spaces', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['non-digits', '4242abcd42424242'],
    ['too short to be a card', '42424242424'],
    ['too long to be a card', '42424242424242424242'],
  ])('rejects %s', (_label, number) => {
    expect(luhnValid(number)).toBe(false);
  });
});

describe('detectBrand', () => {
  it.each([
    [VISA, 'visa'],
    ['4111111111111111', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['5105105105105100', 'mastercard'],
    ['2223003122003222', 'mastercard'],
    ['2720999999999999', 'mastercard'],
    ['378282246310005', 'amex'],
    ['371449635398431', 'amex'],
    ['6011111111111117', 'discover'],
    ['6511111111111119', 'discover'],
    ['6441111111111116', 'discover'],
    ['3530111333300000', 'jcb'],
    ['30569309025904', 'diners'],
    ['38520000023237', 'diners'],
  ])('detects %s as %s', (number, brand) => {
    expect(detectBrand(number)).toBe(brand);
  });

  it.each([
    ['an unassigned prefix', '9999999999999999'],
    ['a 2-series below the mastercard range', '2220999999999999'],
    ['a 2-series above the mastercard range', '2721999999999999'],
    ['an empty string', ''],
  ])('returns "unknown" for %s', (_label, number) => {
    expect(detectBrand(number)).toBe('unknown');
  });
});

describe('validateExpiry', () => {
  const now = new Date('2026-08-28T12:00:00Z');

  it('accepts a card expiring at the end of the current month', () => {
    expect(validateExpiry(8, 2026, now)).toBe(true);
  });

  it('accepts a future month and a future year', () => {
    expect(validateExpiry(9, 2026, now)).toBe(true);
    expect(validateExpiry(1, 2030, now)).toBe(true);
  });

  it('rejects last month', () => {
    expect(validateExpiry(7, 2026, now)).toBe(false);
  });

  it('rejects a past year, even in a later month', () => {
    expect(validateExpiry(12, 2025, now)).toBe(false);
  });
});

describe('card blob', () => {
  it('round-trips number and cvc', () => {
    expect(openCardBlob(sealCardBlob(VISA, '123'))).toEqual({ number: VISA, cvc: '123' });
  });

  it('never stores the PAN in readable form', () => {
    const sealed = sealCardBlob(VISA, '123');
    for (const part of [sealed.ciphertext, sealed.iv, sealed.authTag]) {
      expect(part).not.toContain('4242');
      expect(Buffer.from(part, 'base64').toString('latin1')).not.toContain('4242');
    }
  });

  it('refuses to open a blob whose authTag was tampered with', () => {
    const sealed = sealCardBlob(VISA, '123');
    const authTag = Buffer.from(sealed.authTag, 'base64');
    authTag[0] = (authTag[0] ?? 0) ^ 0xff;
    expect(() => openCardBlob({ ...sealed, authTag: authTag.toString('base64') })).toThrow();
  });
});

describe('validateCard', () => {
  const valid = { number: '4242 4242 4242 4242', expMonth: 12, expYear: 2030, cvc: '123' };

  it('returns safe metadata only — never the PAN', () => {
    const meta = validateCard(valid);
    expect(meta).toEqual({ brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 });
    expect(JSON.stringify(meta)).not.toContain(VISA);
  });

  it.each([
    ['a number that fails Luhn', { number: '4242424242424241' }, 'number'],
    ['a number with non-digits', { number: '4242abcd42424242' }, 'number'],
    ['an expired card', { expMonth: 1, expYear: 2020 }, 'expYear'],
    ['a cvc that is not 3–4 digits', { cvc: '12' }, 'cvc'],
  ])('rejects %s with a field-tagged error', (_label, patch, field) => {
    const card = { ...valid, number: VISA, ...patch };
    expect(() => validateCard(card)).toThrow(VaultValidationError);
    try {
      validateCard(card);
    } catch (error) {
      expect((error as VaultValidationError).field).toBe(field);
      // CLAUDE.md §9: a PAN must never reach an error message.
      expect((error as Error).message).not.toContain('4242');
    }
  });
});
