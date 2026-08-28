/**
 * The card field logic worth testing: formatting, brand detection and expiry
 * parsing.
 *
 * All three fail *silently and visibly* if wrong — an Amex spaced 4-4-4-4 looks
 * broken to anyone who owns one, and `MM/YY` parsed as year 25 instead of 2025
 * makes every card look expired at the vault. They are also pure, which the
 * rest of this screen is not: the layout is JSX (SPEC §14 forbids snapshotting
 * it) and the payment flow itself is H2 flow (b)'s job.
 */
import { describe, expect, it } from 'vitest';
import { cardBrandOf, formatCardNumber, formatExpiry, parseExpiry } from './card.ts';

describe('cardBrandOf', () => {
  it('recognises the brands the mock processor issues', () => {
    expect(cardBrandOf('4242424242424242')).toBe('visa');
    expect(cardBrandOf('5555555555554444')).toBe('mastercard');
    expect(cardBrandOf('378282246310005')).toBe('amex');
    expect(cardBrandOf('6011111111111117')).toBe('discover');
  });

  it('recognises a brand from the first digits, before the number is complete', () => {
    // The icon has to appear as the shopper types, not once they finish.
    expect(cardBrandOf('42')).toBe('visa');
    expect(cardBrandOf('37')).toBe('amex');
  });

  it('returns unknown rather than guessing', () => {
    expect(cardBrandOf('')).toBe('unknown');
    expect(cardBrandOf('9999')).toBe('unknown');
  });

  it('ignores spaces the formatter inserted', () => {
    expect(cardBrandOf('4242 4242 4242 4242')).toBe('visa');
  });
});

describe('formatCardNumber', () => {
  it('groups in fours for most brands', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('groups Amex 4-6-5, the way the card is printed', () => {
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
  });

  it('formats as you type, without a trailing separator', () => {
    expect(formatCardNumber('4242')).toBe('4242');
    expect(formatCardNumber('42424')).toBe('4242 4');
  });

  it('strips anything that is not a digit and caps at 19', () => {
    expect(formatCardNumber('4242-4242 abc')).toBe('4242 4242');
    expect(formatCardNumber('1'.repeat(25)).replace(/ /g, '')).toHaveLength(19);
  });
});

describe('expiry', () => {
  it('inserts the slash as the shopper types', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('12')).toBe('12 / ');
    expect(formatExpiry('1230')).toBe('12 / 30');
    expect(formatExpiry('12/30')).toBe('12 / 30');
  });

  it('expands a two-digit year into the century the vault expects', () => {
    // `expYear: 30` fails the contract's min(2000) and every card reads as
    // expired; this is the one conversion that has to be right.
    expect(parseExpiry('12 / 30')).toEqual({ expMonth: 12, expYear: 2030 });
    expect(parseExpiry('01/26')).toEqual({ expMonth: 1, expYear: 2026 });
  });

  it('accepts a four-digit year unchanged', () => {
    expect(parseExpiry('12 / 2030')).toEqual({ expMonth: 12, expYear: 2030 });
  });

  it('rejects an impossible or incomplete date rather than sending it', () => {
    for (const bad of ['', '12', '13 / 30', '00 / 30', '1 / 3']) {
      expect(parseExpiry(bad), bad).toBeNull();
    }
  });
});
