/**
 * Money is ALWAYS integer minor units (SPEC §5). No floats anywhere in this file
 * or anywhere that consumes it — `0.1 + 0.2` is how storefronts charge $19.999999.
 *
 * Currency is single-per-shop (SPEC §2 puts multi-currency out of scope), but the
 * code stays on the row so orders are self-describing and the mixing bugs are
 * caught here rather than in a report six months later.
 */

export type Money = { amount: number; currencyCode: string };

export const DEFAULT_CURRENCY = 'USD';

export function money(amount: number, currencyCode: string = DEFAULT_CURRENCY): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money must be integer minor units, got ${amount}. Use fromDecimal().`);
  }
  return { amount, currencyCode };
}

export function zero(currencyCode: string = DEFAULT_CURRENCY): Money {
  return { amount: 0, currencyCode };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currencyCode: a.currencyCode };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currencyCode: a.currencyCode };
}

/** Currency comes from the items themselves; the parameter only matters for `[]`. */
export function sum(items: Money[], currencyCode?: string): Money {
  return items.reduce(add, zero(currencyCode ?? items[0]?.currencyCode ?? DEFAULT_CURRENCY));
}

/** Line total. Quantity is a count, so this stays exact. */
export function multiply(a: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) throw new Error(`Quantity must be an integer, got ${quantity}`);
  return { amount: a.amount * quantity, currencyCode: a.currencyCode };
}

/** Percentage off, rounded half-up to the minor unit. `percentage` is 0–100. */
export function percentOf(a: Money, percentage: number): Money {
  return { amount: Math.round((a.amount * percentage) / 100), currencyCode: a.currencyCode };
}

/** Clamp at zero — a discount may never make a total negative (SPEC §14.3). */
export function clampToZero(a: Money): Money {
  return a.amount < 0 ? zero(a.currencyCode) : a;
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

export function isPositive(a: Money): boolean {
  return a.amount > 0;
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
}

/**
 * Split `total` across `weights` losing not one cent (largest-remainder method).
 *
 * This is how an order-level discount is attributed back to line items: naive
 * per-line rounding drifts, and then the line items no longer sum to the order
 * total, which shows up as an off-by-a-cent refund months later.
 */
export function allocate(total: Money, weights: number[]): Money[] {
  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  if (weightSum <= 0) return weights.map(() => zero(total.currencyCode));

  const shares = weights.map((w) => Math.floor((total.amount * w) / weightSum));
  let remainder = total.amount - shares.reduce((acc, s) => acc + s, 0);

  // Hand the leftover minor units to the largest fractional parts, deterministically.
  const order = weights
    .map((w, i) => ({ i, frac: (total.amount * w) % weightSum }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (const { i } of order) {
    if (remainder <= 0) break;
    shares[i] = (shares[i] ?? 0) + 1;
    remainder -= 1;
  }

  return shares.map((amount) => ({ amount, currencyCode: total.currencyCode }));
}

/** Minor units per major unit. Zero-decimal currencies would break naive /100. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK']);

export function minorUnitFactor(currencyCode: string): number {
  return ZERO_DECIMAL.has(currencyCode.toUpperCase()) ? 1 : 100;
}

/**
 * Parse merchant/admin input ("19.99") into minor units. Never use for arithmetic.
 *
 * Digit-wise on the string — `Math.round(1.005 * 100)` is 100, not 101, because
 * 1.005 has no exact binary representation. Extra decimals round half away from
 * zero.
 */
export function fromDecimal(
  value: string | number,
  currencyCode: string = DEFAULT_CURRENCY,
): Money {
  const factor = minorUnitFactor(currencyCode);
  const decimals = factor === 1 ? 0 : 2;
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(
    typeof value === 'number' ? String(value) : value.trim(),
  );
  if (!match) throw new Error(`Not a decimal amount: ${String(value)}`);
  const [, sign, whole = '0', fracRaw = ''] = match;

  const roundUp = fracRaw.length > decimals && (fracRaw.charCodeAt(decimals) ?? 0) - 48 >= 5;
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  const minor =
    BigInt(whole) * BigInt(factor) + BigInt(frac === '' ? 0 : frac) + BigInt(roundUp ? 1 : 0);
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Amount out of range: ${String(value)}`);
  }
  const amount = Number(minor) * (sign ? -1 : 1);
  return { amount, currencyCode };
}

export function toDecimal(m: Money): number {
  return m.amount / minorUnitFactor(m.currencyCode);
}

/** Display only. Never round-trip a formatted string back into arithmetic. */
export function format(m: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currencyCode,
  }).format(toDecimal(m));
}
