/**
 * Card field presentation (SPEC §10, §11). Owner: WS-E.
 *
 * Display logic ONLY: grouping, a brand for the icon, and turning `MM / YY`
 * into the numbers the vault's contract wants. Nothing here validates a card —
 * `packages/pay` does that authoritatively when the browser posts to
 * `/vault/tokenize`, and it is the only code that ever sees the number.
 *
 * Deliberately a local copy rather than an import from `@merchant/pay`: that
 * module reaches into Prisma and the vault key, none of which belongs in a
 * browser bundle. The prefixes below only choose an icon and a spacing group;
 * being wrong is cosmetic, and the server still decides.
 */

export type DisplayBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** Longest a card number gets across the networks (ISO/IEC 7812). */
const MAX_DIGITS = 19;

export function cardBrandOf(value: string): DisplayBrand {
  const n = digitsOnly(value);
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(n)) return 'discover';
  return 'unknown';
}

/** Amex prints 4-6-5; everything else 4-4-4-4. Shoppers check against the card. */
const GROUPS: Record<DisplayBrand, number[]> = {
  amex: [4, 6, 5],
  visa: [4, 4, 4, 4],
  mastercard: [4, 4, 4, 4],
  discover: [4, 4, 4, 4],
  unknown: [4, 4, 4, 4],
};

export function formatCardNumber(value: string): string {
  const n = digitsOnly(value).slice(0, MAX_DIGITS);
  const groups = GROUPS[cardBrandOf(n)];

  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= n.length) break;
    parts.push(n.slice(index, index + size));
    index += size;
  }
  // Anything past the known grouping (a 19-digit Visa) keeps running in fours.
  while (index < n.length) {
    parts.push(n.slice(index, index + 4));
    index += 4;
  }
  return parts.join(' ');
}

/** `1230` → `12 / 30`, with the separator appearing as the month completes. */
export function formatExpiry(value: string): string {
  const n = digitsOnly(value).slice(0, 6);
  if (n.length < 2) return n;
  return `${n.slice(0, 2)} / ${n.slice(2)}`;
}

/**
 * `12 / 30` → `{ expMonth: 12, expYear: 2030 }`, or null if it is not a date
 * yet. A two-digit year MUST become a four-digit one: `tokenizeCardInput`
 * requires `expYear >= 2000`, so sending 30 makes every card fail validation.
 */
export function parseExpiry(value: string): { expMonth: number; expYear: number } | null {
  const n = digitsOnly(value);
  if (n.length !== 4 && n.length !== 6) return null;

  const expMonth = Number(n.slice(0, 2));
  if (expMonth < 1 || expMonth > 12) return null;

  const rawYear = n.slice(2);
  const expYear = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
  return { expMonth, expYear };
}

/** 3 digits everywhere except Amex, which prints 4 on the front. */
export const cvcLength = (brand: DisplayBrand): number => (brand === 'amex' ? 4 : 3);
