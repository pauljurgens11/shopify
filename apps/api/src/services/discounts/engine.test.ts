/**
 * SPEC §14.3 — the mandatory, blocking discounts + totals math suite.
 *
 * Every rule in the engine gets a case here, plus two invariants that cheap
 * per-line rounding would break: allocations sum exactly to the discount, and
 * no total ever goes negative or fractional.
 */
import type { Discount, DiscountableLine } from '@merchant/contracts/discounts';
import { describe, expect, it } from 'vitest';
import { applyDiscounts } from './engine.ts';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const USD = 'USD';

/** Valid prefixed-ULID shapes; the engine only ever compares them for equality. */
const id = (prefix: string, n: number) => `${prefix}_01J8ZC${String(n).padStart(20, '0')}`;

const usd = (amount: number) => ({ amount, currencyCode: USD });

let lineSeq = 0;
function line(over: Partial<DiscountableLine> = {}): DiscountableLine {
  lineSeq += 1;
  return {
    lineId: `line_${lineSeq}`,
    productId: id('prod', lineSeq),
    variantId: id('var', lineSeq),
    collectionIds: [],
    unitPrice: usd(1000),
    quantity: 1,
    ...over,
  };
}

let discountSeq = 0;
function discount(over: Partial<Discount> = {}): Discount {
  discountSeq += 1;
  return {
    id: id('dis', discountSeq),
    title: `Discount ${discountSeq}`,
    code: null,
    type: 'amount_off_order',
    valueType: 'percentage',
    value: 10,
    appliesTo: { scope: 'all' },
    minimumRequirement: { type: 'none' },
    usageLimit: null,
    oncePerCustomer: false,
    usedCount: 0,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const run = (
  lines: DiscountableLine[],
  discounts: Discount[],
  opts: { shippingPrice?: number; enteredCode?: string | null } = {},
) =>
  applyDiscounts({
    lines,
    shippingPrice: usd(opts.shippingPrice ?? 0),
    discounts,
    enteredCode: opts.enteredCode ?? null,
    now: NOW,
  });

const lineDiscount = (result: ReturnType<typeof run>, lineId: string) =>
  result.lines.find((l) => l.lineId === lineId)?.totalDiscount.amount;

/* -------------------------------------------------------------------------- */
/* Eligibility                                                                  */
/* -------------------------------------------------------------------------- */

describe('eligibility', () => {
  it('rejects a code that has not started, and silently skips the automatic', () => {
    const future = { startsAt: '2026-09-01T00:00:00.000Z' };
    const coded = run([line()], [discount({ code: 'SOON', ...future })], { enteredCode: 'SOON' });
    expect(coded.applied).toEqual([]);
    expect(coded.rejected).toEqual([{ code: 'SOON', reason: 'not_started' }]);

    const auto = run([line()], [discount(future)]);
    expect(auto.applied).toEqual([]);
    expect(auto.rejected).toEqual([]);
    expect(auto.discountTotal).toEqual(usd(0));
  });

  it('rejects an expired code but honours one ending later today', () => {
    const expired = run([line()], [discount({ code: 'OLD', endsAt: '2026-06-01T00:00:00.000Z' })], {
      enteredCode: 'OLD',
    });
    expect(expired.rejected).toEqual([{ code: 'OLD', reason: 'expired' }]);

    const live = run([line()], [discount({ code: 'LIVE', endsAt: '2026-06-15T23:59:59.000Z' })], {
      enteredCode: 'LIVE',
    });
    expect(live.discountTotal).toEqual(usd(100));
  });

  it('treats the date window as authoritative and `disabled` as a veto', () => {
    // A stale `status` column must not resurrect or kill a discount on its own.
    const staleStatus = run([line()], [discount({ status: 'scheduled' })]);
    expect(staleStatus.discountTotal).toEqual(usd(100));

    const disabled = run([line()], [discount({ code: 'OFF', status: 'disabled' })], {
      enteredCode: 'OFF',
    });
    expect(disabled.rejected).toEqual([{ code: 'OFF', reason: 'invalid' }]);
  });

  it('never applies a code discount when the shopper typed nothing', () => {
    // The caller may hand over code rows it happens to have loaded; without an
    // enteredCode none of them may apply — and none may be "rejected" either.
    for (const enteredCode of [null, '', '   '] as const) {
      const result = run([line()], [discount({ code: 'FREE10' })], { enteredCode });
      expect(result.applied).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.discountTotal).toEqual(usd(0));
    }
  });

  it('rejects a code whose usage limit is spent', () => {
    const spent = run([line()], [discount({ code: 'MAX', usageLimit: 5, usedCount: 5 })], {
      enteredCode: 'MAX',
    });
    expect(spent.rejected).toEqual([{ code: 'MAX', reason: 'usage_limit' }]);

    const left = run([line()], [discount({ code: 'MAX', usageLimit: 5, usedCount: 4 })], {
      enteredCode: 'MAX',
    });
    expect(left.applied).toHaveLength(1);
  });

  it('rejects a code whose subtotal minimum is not met, using pre-discount totals', () => {
    const minimum = { type: 'subtotal', value: usd(5000) } as const;
    const under = run(
      [line({ unitPrice: usd(4999) })],
      [discount({ code: 'BIG', minimumRequirement: minimum })],
      { enteredCode: 'BIG' },
    );
    expect(under.rejected).toEqual([{ code: 'BIG', reason: 'minimum_not_met' }]);

    // Exactly on the threshold qualifies, and an automatic already taking 10%
    // off must not push the cart under the bar for the code.
    const at = run(
      [line({ unitPrice: usd(5000) })],
      [discount(), discount({ code: 'BIG', minimumRequirement: minimum })],
      { enteredCode: 'BIG' },
    );
    expect(at.rejected).toEqual([]);
    expect(at.applied).toHaveLength(2);
  });

  it('counts the quantity minimum across eligible lines only', () => {
    const target = id('prod', 900);
    const lines = [
      line({ productId: target, quantity: 2 }),
      line({ quantity: 5 }), // not eligible — must not count toward the minimum
    ];
    const promo = discount({
      code: 'THREE',
      type: 'amount_off_products',
      appliesTo: { scope: 'products', productIds: [target] },
      minimumRequirement: { type: 'quantity', value: 3 },
    });
    expect(run(lines, [promo], { enteredCode: 'THREE' }).rejected).toEqual([
      { code: 'THREE', reason: 'minimum_not_met' },
    ]);

    const enough = [line({ productId: target, quantity: 3 }), line({ quantity: 1 })];
    expect(run(enough, [promo], { enteredCode: 'THREE' }).applied).toHaveLength(1);
  });

  it('rejects an entered code with no matching discount row', () => {
    const result = run([line()], [], { enteredCode: 'NOPE' });
    expect(result.rejected).toEqual([{ code: 'NOPE', reason: 'invalid' }]);
    expect(result.discountTotal).toEqual(usd(0));
  });
});

/* -------------------------------------------------------------------------- */
/* Discount types                                                               */
/* -------------------------------------------------------------------------- */

describe('amount_off_order', () => {
  it('takes a percentage off the whole cart and allocates it to lines', () => {
    const a = line({ unitPrice: usd(3000) });
    const b = line({ unitPrice: usd(2000) });
    const result = run([a, b], [discount({ value: 10 })]);

    expect(result.subtotal).toEqual(usd(5000));
    expect(result.discountTotal).toEqual(usd(500));
    expect(lineDiscount(result, a.lineId)).toBe(300);
    expect(lineDiscount(result, b.lineId)).toBe(200);
    expect(result.applied[0]?.lineAllocations).toEqual([
      { lineId: a.lineId, amount: usd(300) },
      { lineId: b.lineId, amount: usd(200) },
    ]);
  });

  it('rounds a percentage half-up at the minor unit', () => {
    // 15% of $33.33 = 499.95 minor units.
    const result = run([line({ unitPrice: usd(3333) })], [discount({ value: 15 })]);
    expect(result.discountTotal).toEqual(usd(500));
  });

  it('clamps a percentage above 100 rather than paying the shopper', () => {
    // Not reachable through the admin form, but a bad row must not owe money.
    const result = run([line({ unitPrice: usd(1000) })], [discount({ value: 150 })]);
    expect(result.discountTotal).toEqual(usd(1000));
    expect(result.lines[0]?.totalDiscount).toEqual(usd(1000));
  });

  it('takes a fixed amount off and clamps it at the subtotal', () => {
    const fixed = discount({ valueType: 'fixed', value: 2500 });
    expect(run([line({ unitPrice: usd(4000) })], [fixed]).discountTotal).toEqual(usd(2500));

    const over = run([line({ unitPrice: usd(1000) })], [fixed]);
    expect(over.discountTotal).toEqual(usd(1000));
    expect(over.lines[0]?.totalDiscount).toEqual(usd(1000));
    expect(over.applied[0]?.amount).toEqual(usd(1000));
  });
});

describe('amount_off_products', () => {
  it('applies only to lines matching a product scope', () => {
    const target = id('prod', 500);
    const eligible = line({ productId: target, unitPrice: usd(2000) });
    const other = line({ unitPrice: usd(2000) });
    const result = run(
      [eligible, other],
      [
        discount({
          type: 'amount_off_products',
          value: 25,
          appliesTo: { scope: 'products', productIds: [target] },
        }),
      ],
    );

    expect(result.discountTotal).toEqual(usd(500));
    expect(lineDiscount(result, eligible.lineId)).toBe(500);
    expect(lineDiscount(result, other.lineId)).toBe(0);
  });

  it('applies to lines in a collection scope', () => {
    const collection = id('col', 7);
    const inside = line({ collectionIds: [collection], unitPrice: usd(1500) });
    const outside = line({ collectionIds: [id('col', 8)], unitPrice: usd(1500) });
    const result = run(
      [inside, outside],
      [
        discount({
          type: 'amount_off_products',
          valueType: 'fixed',
          value: 500,
          appliesTo: { scope: 'collections', collectionIds: [collection] },
        }),
      ],
    );

    expect(lineDiscount(result, inside.lineId)).toBe(500);
    expect(lineDiscount(result, outside.lineId)).toBe(0);
  });

  it('discounts the whole line, not one unit, when quantity > 1', () => {
    const result = run(
      [line({ unitPrice: usd(1000), quantity: 3 })],
      [discount({ type: 'amount_off_products', value: 10 })],
    );
    expect(result.subtotal).toEqual(usd(3000));
    expect(result.discountTotal).toEqual(usd(300));
  });

  it('does not apply when no line matches', () => {
    const result = run(
      [line()],
      [
        discount({
          code: 'SHOES',
          type: 'amount_off_products',
          appliesTo: { scope: 'products', productIds: [id('prod', 999)] },
        }),
      ],
      { enteredCode: 'SHOES' },
    );
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual([{ code: 'SHOES', reason: 'minimum_not_met' }]);
  });
});

describe('free_shipping', () => {
  it('zeroes shipping without touching the line discounts', () => {
    const result = run([line({ unitPrice: usd(4000) })], [discount({ type: 'free_shipping' })], {
      shippingPrice: 995,
    });

    expect(result.shippingDiscount).toEqual(usd(995));
    expect(result.shippingTotal).toEqual(usd(0));
    expect(result.discountTotal).toEqual(usd(0));
    expect(result.lines[0]?.totalDiscount).toEqual(usd(0));
    expect(result.applied[0]?.appliesToShipping).toBe(true);
  });

  it('never discounts more shipping than was charged', () => {
    const result = run([line()], [discount({ type: 'free_shipping' })], { shippingPrice: 0 });
    expect(result.shippingDiscount).toEqual(usd(0));
    expect(result.shippingTotal).toEqual(usd(0));
  });
});

/* -------------------------------------------------------------------------- */
/* Stacking (SPEC §14.3)                                                        */
/* -------------------------------------------------------------------------- */

describe('stacking', () => {
  it('applies every automatic plus the one entered code, ignoring other codes', () => {
    const result = run(
      [line({ unitPrice: usd(10000) })],
      [
        discount({ title: 'Auto 10%' }),
        discount({ title: 'Ship', type: 'free_shipping' }),
        discount({ title: 'Code 10%', code: 'tenoff' }),
        discount({ title: 'Second code', code: 'ALSOTEN' }),
      ],
      { shippingPrice: 500, enteredCode: 'TENOFF' },
    );

    // A code the shopper did not type must never surface as an error in checkout.
    expect(result.applied.map((a) => a.title)).toEqual(['Auto 10%', 'Code 10%', 'Ship']);
    expect(result.rejected).toEqual([]);
  });

  it('applies discounts sequentially to what is left of a line', () => {
    // 10% of 10000 = 1000, then 10% of the remaining 9000 = 900. Not 2000.
    const result = run([line({ unitPrice: usd(10000) })], [discount(), discount()]);
    expect(result.applied.map((a) => a.amount.amount)).toEqual([1000, 900]);
    expect(result.discountTotal).toEqual(usd(1900));
  });

  it('applies product discounts before order discounts', () => {
    const target = id('prod', 300);
    const a = line({ productId: target, unitPrice: usd(5000) });
    const b = line({ unitPrice: usd(5000) });
    const result = run(
      [a, b],
      [
        discount({
          title: 'Order 10%',
          type: 'amount_off_order',
          value: 10,
        }),
        discount({
          title: 'Products 20%',
          type: 'amount_off_products',
          value: 20,
          appliesTo: { scope: 'products', productIds: [target] },
        }),
      ],
    );

    expect(result.applied.map((a) => a.title)).toEqual(['Products 20%', 'Order 10%']);
    // 20% off line A = 1000; then 10% of the remaining 9000 = 900, split 400/500.
    expect(lineDiscount(result, a.lineId)).toBe(1400);
    expect(lineDiscount(result, b.lineId)).toBe(500);
    expect(result.discountTotal).toEqual(usd(1900));
  });

  it('keeps a line at zero rather than negative once it is fully discounted', () => {
    const result = run(
      [line({ unitPrice: usd(2000) })],
      [
        discount({ title: 'All of it', valueType: 'fixed', value: 2000 }),
        discount({ title: 'And more', valueType: 'fixed', value: 1500 }),
      ],
    );

    expect(result.discountTotal).toEqual(usd(2000));
    expect(result.lines[0]?.totalDiscount).toEqual(usd(2000));
    expect(result.applied.map((a) => a.title)).toEqual(['All of it']);
  });
});

/* -------------------------------------------------------------------------- */
/* Edge cases                                                                   */
/* -------------------------------------------------------------------------- */

describe('edge cases', () => {
  it('handles 100% off', () => {
    const result = run(
      [line({ unitPrice: usd(1999), quantity: 2 }), line({ unitPrice: usd(500) })],
      [discount({ value: 100 }), discount({ type: 'free_shipping' })],
      { shippingPrice: 1200 },
    );

    expect(result.discountTotal).toEqual(usd(4498));
    expect(result.subtotal.amount - result.discountTotal.amount).toBe(0);
    expect(result.shippingTotal).toEqual(usd(0));
    for (const l of result.lines) expect(l.totalDiscount).toEqual(l.lineTotal);
  });

  it('handles an empty cart', () => {
    const result = run([], [discount({ code: 'TENOFF' })], { enteredCode: 'TENOFF' });
    expect(result.lines).toEqual([]);
    expect(result.subtotal).toEqual(usd(0));
    expect(result.discountTotal).toEqual(usd(0));
    // The shopper's code is still eligible — it just has nothing to take off.
    expect(result.applied).toEqual([
      expect.objectContaining({ code: 'TENOFF', amount: usd(0), lineAllocations: [] }),
    ]);
  });

  it('drops a zero-value automatic but keeps the shopper code visible', () => {
    const result = run(
      [line({ unitPrice: usd(1000) })],
      [
        discount({ title: 'Everything', valueType: 'fixed', value: 1000 }),
        discount({ title: 'Nothing left', value: 50 }),
        discount({ title: 'Shopper code', code: 'LATE', value: 50 }),
      ],
      { enteredCode: 'LATE' },
    );

    expect(result.applied.map((a) => a.title)).toEqual(['Everything', 'Shopper code']);
    expect(result.applied[1]?.amount).toEqual(usd(0));
  });

  it('carries the cart currency onto every amount', () => {
    const result = run([line({ unitPrice: { amount: 1000, currencyCode: 'JPY' } })], [discount()], {
      shippingPrice: 0,
    });
    expect(result.subtotal.currencyCode).toBe('JPY');
    expect(result.discountTotal.currencyCode).toBe('JPY');
  });
});

/* -------------------------------------------------------------------------- */
/* Invariants                                                                   */
/* -------------------------------------------------------------------------- */

describe('invariants', () => {
  it('allocates an order discount to lines without losing a cent', () => {
    // $9.99 + $9.99 + 2x$12.99 = $45.96. Rounding each line's share of a $10.00
    // discount independently gives $9.99 back — one cent short, every order.
    const lines = [
      line({ unitPrice: usd(999), quantity: 1 }),
      line({ unitPrice: usd(999), quantity: 1 }),
      line({ unitPrice: usd(1299), quantity: 2 }),
    ];
    const result = run(lines, [discount({ valueType: 'fixed', value: 1000 })]);

    expect(result.subtotal).toEqual(usd(4596));
    expect(result.applied[0]?.amount).toEqual(usd(1000));
    // The engine's own totals must agree with what it told the shopper it took.
    const allocated = result.lines.reduce((acc, l) => acc + l.totalDiscount.amount, 0);
    expect(allocated).toBe(1000);
    expect(result.discountTotal).toEqual(usd(1000));
    expect(result.applied[0]?.lineAllocations.reduce((acc, a) => acc + a.amount.amount, 0)).toBe(
      1000,
    );
  });

  it('never produces a negative or fractional total, on 50 random carts', () => {
    // Deterministic LCG — a flaky money test is worse than no money test.
    let seed = 0x2545f491;
    let cartsWithLineDiscount = 0;
    let cartsWithShippingDiscount = 0;
    const rand = (n: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % n;
    };

    for (let cart = 0; cart < 50; cart += 1) {
      const lines = Array.from({ length: 1 + rand(4) }, () =>
        line({ unitPrice: usd(1 + rand(50_000)), quantity: 1 + rand(5) }),
      );
      const discounts = Array.from({ length: rand(4) }, () => {
        const percentage = rand(2) === 0;
        return discount({
          type: (['amount_off_order', 'amount_off_products', 'free_shipping'] as const)[rand(3)],
          valueType: percentage ? 'percentage' : 'fixed',
          value: percentage ? rand(101) : rand(60_000),
          code: rand(3) === 0 ? `CODE${cart}` : null,
        });
      });
      const shippingPrice = rand(2000);
      const result = applyDiscounts({
        lines,
        shippingPrice: usd(shippingPrice),
        discounts,
        enteredCode: null,
        now: NOW,
      });

      const amounts = [
        result.subtotal,
        result.discountTotal,
        result.shippingDiscount,
        result.shippingTotal,
        ...result.lines.flatMap((l) => [l.lineTotal, l.totalDiscount]),
        ...result.applied.map((a) => a.amount),
      ];
      for (const m of amounts) {
        expect(Number.isInteger(m.amount)).toBe(true);
        expect(m.amount).toBeGreaterThanOrEqual(0);
      }

      // Nothing is discounted twice, and nothing is lost: what the shopper was
      // told each discount is worth is exactly what landed on the lines.
      const allocated = result.lines.reduce((acc, l) => acc + l.totalDiscount.amount, 0);
      const promised = result.applied
        .filter((a) => !a.appliesToShipping)
        .reduce((acc, a) => acc + a.amount.amount, 0);
      expect(allocated).toBe(promised);
      expect(allocated).toBe(result.discountTotal.amount);
      expect(result.discountTotal.amount).toBeLessThanOrEqual(result.subtotal.amount);
      if (result.discountTotal.amount > 0) cartsWithLineDiscount += 1;
      if (result.shippingDiscount.amount > 0) cartsWithShippingDiscount += 1;
      expect(result.shippingTotal.amount).toBe(shippingPrice - result.shippingDiscount.amount);
      for (const l of result.lines) {
        expect(l.totalDiscount.amount).toBeLessThanOrEqual(l.lineTotal.amount);
      }
    }

    // A property test that never actually discounted anything proves nothing.
    expect(cartsWithLineDiscount).toBeGreaterThan(10);
    expect(cartsWithShippingDiscount).toBeGreaterThan(5);
  });
});
