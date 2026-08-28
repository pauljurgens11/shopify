/**
 * The discounts & totals engine (SPEC §10, §14.3).
 *
 * A pure function: the caller loads the candidate discounts (all automatics for
 * the shop, plus the row for whatever code the shopper typed) and this decides
 * what applies, what it is worth, and how it lands on each line. No I/O, no
 * clock — `now` is passed in — so the mandatory §14.3 suite needs no database.
 *
 * Two properties everything else is built on:
 *   1. All arithmetic is integer minor units (SPEC §5). Never a float.
 *   2. An order-level discount is split back to lines with `allocate`, so line
 *      discounts always sum to exactly the order discount. Off-by-a-cent here
 *      resurfaces as an unrefundable penny months later.
 *
 * Owner: WS-C.
 */
import {
  add,
  allocate,
  isPositive,
  type Money,
  money,
  multiply,
  percentOf,
  subtract,
  sum,
  zero,
} from '@merchant/config/money';
import type {
  AppliedDiscount,
  Discount,
  DiscountAppliesTo,
  DiscountableLine,
  DiscountEngineResult,
  DiscountPriorUsage,
  DiscountRejectionReason,
} from '@merchant/contracts/discounts';

export type DiscountEngineInput = {
  lines: DiscountableLine[];
  shippingPrice: Money;
  /** Candidate automatics plus the row for the entered code, loaded by the caller. */
  discounts: Discount[];
  /** Exactly what the shopper typed. Matched case-insensitively. */
  enteredCode?: string | null;
  /**
   * The current customer's redemption counts by discount id, so
   * `oncePerCustomer` can be enforced without the engine doing I/O. Omitted
   * (guest checkout, caller without customer context) → not enforced.
   */
  priorUsage?: DiscountPriorUsage;
  now: Date;
};

/**
 * Product discounts run before order discounts, which run before shipping —
 * the same order Shopify shows them in, and the only one where an order-level
 * percentage comes off what the shopper is actually still paying.
 */
const TYPE_ORDER: Record<Discount['type'], number> = {
  amount_off_products: 0,
  amount_off_order: 1,
  free_shipping: 2,
};

type WorkingLine = {
  line: DiscountableLine;
  lineTotal: Money;
  /** Not yet discounted away. Never negative — the clamp, made structural. */
  remaining: Money;
  discounted: Money;
};

function matches(line: DiscountableLine, appliesTo: DiscountAppliesTo): boolean {
  switch (appliesTo.scope) {
    case 'all':
      return true;
    case 'products':
      return appliesTo.productIds.includes(line.productId);
    case 'collections':
      return line.collectionIds.some((id) => appliesTo.collectionIds.includes(id));
  }
}

/**
 * Why this discount cannot apply, or `null` if it can. The date window is
 * authoritative and the denormalized `status` column only gets a veto: a
 * scheduled discount whose start time has passed is live whether or not a job
 * has caught up with the row yet.
 */
function rejectionReason(
  discount: Discount,
  eligible: WorkingLine[],
  cartIsEmpty: boolean,
  currency: string,
  now: Date,
  priorUsage: DiscountPriorUsage | undefined,
): DiscountRejectionReason | null {
  if (discount.status === 'disabled') return 'invalid';

  const startsAt = Date.parse(discount.startsAt);
  if (Number.isNaN(startsAt)) return 'invalid';
  if (now.getTime() < startsAt) return 'not_started';

  if (discount.endsAt !== null) {
    const endsAt = Date.parse(discount.endsAt);
    if (Number.isNaN(endsAt)) return 'invalid';
    if (now.getTime() > endsAt) return 'expired';
  }

  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
    return 'usage_limit';
  }

  // `oncePerCustomer` is a usage limit of one, per customer — so it reports as
  // 'usage_limit' ("has reached its limit"), which is also what keeps the
  // rejection-reason contract unchanged. Enforced only when the caller supplied
  // the customer's redemption counts; without that context (guest checkout)
  // there is nothing to enforce against.
  if (discount.oncePerCustomer && priorUsage !== undefined && (priorUsage[discount.id] ?? 0) > 0) {
    return 'usage_limit';
  }

  // "Not valid for the items in your cart" — the same shopper-facing bucket as a
  // missed minimum. An empty cart is not a mismatch, it is an empty cart.
  if (!cartIsEmpty && eligible.length === 0 && discount.appliesTo.scope !== 'all') {
    return 'minimum_not_met';
  }

  const minimum = discount.minimumRequirement;
  if (minimum.type === 'subtotal' && discount.type !== 'free_shipping') {
    // Pre-discount, so an automatic cannot knock the cart under the bar.
    // Compared by amount: the shop is single-currency (SPEC §2), so a stray
    // currency code on the requirement row must not throw mid-checkout.
    //
    // `free_shipping` is the one exception, checked at apply time instead (see
    // applyDiscounts): its threshold means "free over $X actually paid" — the
    // same rule WS-E uses to drop a free shipping RATE on the discounted
    // subtotal (DECISIONS.md) — so a coupon that takes the cart under the bar
    // must also take the free-shipping DISCOUNT with it.
    const eligibleSubtotal = sum(
      eligible.map((l) => l.lineTotal),
      currency,
    );
    if (eligibleSubtotal.amount < minimum.value.amount) return 'minimum_not_met';
  }
  if (minimum.type === 'quantity') {
    const quantity = eligible.reduce((acc, l) => acc + l.line.quantity, 0);
    if (quantity < minimum.value) return 'minimum_not_met';
  }

  return null;
}

/**
 * Value taken off the eligible lines. Clamped at `base` for both value types:
 * a fixed amount larger than the cart is ordinary, and a percentage above 100
 * is a bad admin row that must still never produce a negative total.
 */
function poolFor(discount: Discount, base: Money): Money {
  const raw =
    discount.valueType === 'percentage' ? percentOf(base, discount.value).amount : discount.value;
  return money(Math.min(raw, base.amount), base.currencyCode);
}

export function applyDiscounts(input: DiscountEngineInput): DiscountEngineResult {
  const currency = input.lines[0]?.unitPrice.currencyCode ?? input.shippingPrice.currencyCode;

  const working: WorkingLine[] = input.lines.map((line) => {
    const lineTotal = multiply(line.unitPrice, line.quantity);
    return { line, lineTotal, remaining: lineTotal, discounted: zero(currency) };
  });
  const subtotal = sum(
    working.map((l) => l.lineTotal),
    currency,
  );

  /* --- pick the candidates: every automatic, plus at most one code --------- */

  const rejected: { code: string; reason: DiscountRejectionReason }[] = [];
  const automatics = input.discounts.filter((d) => d.code === null);
  const codes = input.discounts.filter((d) => d.code !== null);
  const typed = input.enteredCode?.trim();

  // No code typed → no code discount. Falling back to codes[0] here would apply
  // a code-gated discount the shopper never entered.
  const entered = typed
    ? codes.find((d) => d.code?.toLowerCase() === typed.toLowerCase())
    : undefined;

  if (typed && entered === undefined) {
    rejected.push({ code: typed, reason: 'invalid' });
  }
  // Any other code row the caller handed us is not what the shopper typed, so it
  // is neither applied nor reported — a bogus error in checkout is worse.

  const cartIsEmpty = working.length === 0;
  const candidates: Discount[] = [];
  for (const discount of [...automatics, ...(entered ? [entered] : [])]) {
    const eligible = working.filter((l) => matches(l.line, discount.appliesTo));
    const reason = rejectionReason(
      discount,
      eligible,
      cartIsEmpty,
      currency,
      input.now,
      input.priorUsage,
    );
    if (reason === null) {
      candidates.push(discount);
    } else if (discount.code !== null) {
      rejected.push({ code: discount.code, reason });
    }
  }
  // Sequential stacking means order changes cents (10%-then-20% of 1005 is 282
  // off; 20%-then-10% is 281), so the order must be a business rule, not the
  // caller's array order (which for checkout is DB heap order). Within a type,
  // oldest discount first — the promotion the merchant set up first has first
  // claim on the line — with the ULID id as the total-order tiebreak. Same
  // discounts, any input order → identical totals.
  candidates.sort(
    (a, b) =>
      TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
      (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  /* --- apply them, each to what the previous ones left behind -------------- */

  const applied: AppliedDiscount[] = [];
  let shippingRemaining = input.shippingPrice;

  for (const discount of candidates) {
    let amount = zero(currency);
    const lineAllocations: AppliedDiscount['lineAllocations'] = [];

    if (discount.type === 'free_shipping') {
      // The deferred half of the subtotal minimum (see rejectionReason):
      // free_shipping sorts last, so by now `remaining` reflects every line
      // discount, and the threshold is judged on what the shopper actually
      // pays — a coupon can price the cart out of free shipping.
      const minimum = discount.minimumRequirement;
      if (minimum.type === 'subtotal') {
        const eligible = working.filter((l) => matches(l.line, discount.appliesTo));
        const discountedSubtotal = sum(
          eligible.map((l) => l.remaining),
          currency,
        );
        if (discountedSubtotal.amount < minimum.value.amount) {
          if (discount.code !== null) {
            rejected.push({ code: discount.code, reason: 'minimum_not_met' });
          }
          continue;
        }
      }
      amount = shippingRemaining;
      shippingRemaining = zero(shippingRemaining.currencyCode);
    } else {
      const eligible = working.filter((l) => matches(l.line, discount.appliesTo));
      const base = sum(
        eligible.map((l) => l.remaining),
        currency,
      );
      const pool = poolFor(discount, base);
      // Weighted by what is left, so a line already at zero is never overshot.
      const shares = allocate(
        pool,
        eligible.map((l) => l.remaining.amount),
      );

      eligible.forEach((l, i) => {
        const share = shares[i] ?? zero(currency);
        if (share.amount === 0) return;
        l.remaining = subtract(l.remaining, share);
        l.discounted = add(l.discounted, share);
        lineAllocations.push({ lineId: l.line.lineId, amount: share });
      });
      amount = pool;
    }

    // An automatic worth nothing is noise; the shopper's own code stays visible
    // so checkout can still render its chip.
    if (isPositive(amount) || discount.code !== null) {
      applied.push({
        discountId: discount.id,
        code: discount.code,
        title: discount.title,
        amount,
        lineAllocations,
        appliesToShipping: discount.type === 'free_shipping',
      });
    }
  }

  return {
    lines: working.map((l) => ({
      ...l.line,
      lineTotal: l.lineTotal,
      totalDiscount: l.discounted,
    })),
    applied,
    rejected,
    subtotal,
    discountTotal: sum(
      working.map((l) => l.discounted),
      currency,
    ),
    shippingDiscount: subtract(input.shippingPrice, shippingRemaining),
    shippingTotal: shippingRemaining,
  };
}
