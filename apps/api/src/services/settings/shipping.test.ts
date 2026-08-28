/**
 * Shipping-rate eligibility (SPEC §10).
 *
 * E3 shows the checkout's shipping step from this function, so "which rates
 * apply to a £50 cart" is a real product decision, not glue. The bounds are
 * inclusive both ends, which is the half of it that is easy to get wrong and
 * invisible until a customer sits exactly on a threshold.
 */
import { money } from '@merchant/config/money';
import type { ShippingRate } from '@merchant/contracts/shops';
import { describe, expect, it } from 'vitest';
import { eligibleShippingRates } from './shipping.ts';

const usd = (amount: number) => money(amount, 'USD');

const rate = (
  name: string,
  price: number,
  min: number | null,
  max: number | null,
): ShippingRate => ({
  id: `ship_${name}`,
  name,
  price: usd(price),
  minOrderSubtotal: min === null ? null : usd(min),
  maxOrderSubtotal: max === null ? null : usd(max),
});

// Standard always applies; Free needs $50+; Small-order surcharge caps out at $25.
const STANDARD = rate('Standard', 500, null, null);
const FREE = rate('Free', 0, 5000, null);
const SMALL = rate('Small order', 900, null, 2500);

const namesFor = (subtotal: number) =>
  eligibleShippingRates([STANDARD, FREE, SMALL], usd(subtotal)).map((r) => r.name);

describe('eligibleShippingRates', () => {
  it('always offers a rate with no conditions', () => {
    for (const subtotal of [0, 1000, 100_000]) {
      expect(namesFor(subtotal)).toContain('Standard');
    }
  });

  it('includes a minimum-subtotal rate only once the cart reaches it', () => {
    expect(namesFor(4999)).not.toContain('Free');
    expect(namesFor(5000)).toContain('Free'); // inclusive: exactly $50 qualifies
    expect(namesFor(5001)).toContain('Free');
  });

  it('includes a maximum-subtotal rate only up to and including it', () => {
    expect(namesFor(2499)).toContain('Small order');
    expect(namesFor(2500)).toContain('Small order'); // inclusive at the top too
    expect(namesFor(2501)).not.toContain('Small order');
  });

  it('requires both bounds when a rate carries both', () => {
    const banded = [rate('Mid', 300, 1000, 2000)];
    const names = (subtotal: number) =>
      eligibleShippingRates(banded, usd(subtotal)).map((r) => r.name);

    expect(names(999)).toEqual([]);
    expect(names(1000)).toEqual(['Mid']);
    expect(names(1500)).toEqual(['Mid']);
    expect(names(2000)).toEqual(['Mid']);
    expect(names(2001)).toEqual([]);
  });

  it('orders by price so checkout can default to the cheapest', () => {
    expect(namesFor(6000)).toEqual(['Free', 'Standard']);
  });

  it('returns nothing rather than throwing when no rate fits', () => {
    expect(eligibleShippingRates([FREE], usd(100))).toEqual([]);
    expect(eligibleShippingRates([], usd(100))).toEqual([]);
  });

  it('treats a zero subtotal as a real cart, not a missing one', () => {
    // An all-discount cart still has to be shippable.
    expect(namesFor(0)).toEqual(['Standard', 'Small order']);
  });
});
