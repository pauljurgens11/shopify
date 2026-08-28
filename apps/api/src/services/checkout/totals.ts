/**
 * Checkout pricing (SPEC §10). Owner: WS-E.
 *
 * **The only place a checkout total is computed.** Every step update, the
 * shipping-rate list and the final charge all call `computeCheckoutTotals`, so
 * the sidebar and the card can never disagree — drift between the two is the
 * worst bug this surface has.
 *
 * The order of operations, and why:
 *
 *   1. C1's engine prices the lines. Product discounts, then order discounts —
 *      the engine owns that, we never re-derive it.
 *   2. Shipping rates are filtered on the DISCOUNTED subtotal. A "free over
 *      $150" rate must stop applying when a coupon takes the order under $150,
 *      which is what Shopify does and what a merchant means by the threshold.
 *   3. The engine runs again with the chosen rate's price, so a `free_shipping`
 *      discount can zero it. Line discounts are unchanged by that second pass —
 *      no discount type reads the shipping price when pricing lines — so the
 *      second result is authoritative for everything.
 *   4. Tax is the shop's flat rate applied ONCE to (subtotal − discountTotal).
 *      Not per line and re-summed: that rounds differently and the pennies show
 *      up as an order whose parts do not add to its total.
 *
 * `shippingTotal` is stored net of any free-shipping discount, and
 * `discountTotal` is line-level only. C2's `assertTotalsBalance` assumes exactly
 * that split (DECISIONS.md), which is what lets the order it records be checked
 * against the identity rather than trusted.
 */
import { percentOf } from '@merchant/config/money';
import type { CartLine } from '@merchant/contracts/cart';
import type { CheckoutTotals, ShippingOption } from '@merchant/contracts/checkout';
import type { MoneyDto } from '@merchant/contracts/common';
import type {
  AppliedDiscount,
  Discount,
  DiscountRejectionReason,
} from '@merchant/contracts/discounts';
import { applyDiscounts } from '../discounts/engine.ts';

/** A shipping rate as A4 stores it on `Shop.shippingRates`. */
export interface ShopShippingRate {
  id: string;
  name: string;
  price: MoneyDto;
  minOrderSubtotal: MoneyDto | null;
  maxOrderSubtotal: MoneyDto | null;
}

export interface PricingInput {
  currencyCode: string;
  /** The checkout's frozen snapshot, never the live cart. */
  lines: CartLine[];
  /** Collection membership per line, so collection-scoped discounts can match. */
  collectionIdsByProduct: Map<string, string[]>;
  rates: ShopShippingRate[];
  selectedShippingRateId: string | null;
  taxRatePercentage: number;
  /** Automatics plus the row for the entered code, loaded by the caller. */
  discounts: Discount[];
  enteredCode: string | null;
  now: Date;
}

export interface PricingResult {
  totals: CheckoutTotals;
  appliedDiscounts: AppliedDiscount[];
  rejectedDiscount: { code: string; reason: DiscountRejectionReason } | null;
  /** Rates the discounted subtotal qualifies for, cheapest first. */
  shippingOptions: ShippingOption[];
  /**
   * The rate actually priced. Null when nothing was selected, and null when the
   * selection stopped qualifying — a shopper must not keep free shipping a
   * coupon just priced them out of.
   */
  selectedShippingRateId: string | null;
}

const money = (amount: number, currencyCode: string): MoneyDto => ({ amount, currencyCode });

function engineLines(input: PricingInput) {
  return input.lines.map((line) => ({
    lineId: line.id,
    productId: line.productId,
    variantId: line.variantId,
    collectionIds: input.collectionIdsByProduct.get(line.productId) ?? [],
    unitPrice: line.unitPrice,
    quantity: line.quantity,
  }));
}

/** A rate applies when the discounted subtotal sits inside its bounds. */
function applicableRates(
  rates: ShopShippingRate[],
  discountedSubtotal: number,
): ShopShippingRate[] {
  return rates
    .filter((rate) => {
      if (rate.minOrderSubtotal !== null && discountedSubtotal < rate.minOrderSubtotal.amount) {
        return false;
      }
      if (rate.maxOrderSubtotal !== null && discountedSubtotal > rate.maxOrderSubtotal.amount) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.price.amount - b.price.amount || a.id.localeCompare(b.id));
}

export function computeCheckoutTotals(input: PricingInput): PricingResult {
  const currency = input.currencyCode;
  const lines = engineLines(input);
  const subtotal = input.lines.reduce((acc, line) => acc + line.lineTotal.amount, 0);

  // Pass one prices the lines. Shipping is zero here because we do not know the
  // rate yet — and no discount type reads the shipping price when pricing lines.
  const lineOnly = applyDiscounts({
    lines,
    shippingPrice: money(0, currency),
    discounts: input.discounts,
    enteredCode: input.enteredCode,
    now: input.now,
  });

  const discountedSubtotal = subtotal - lineOnly.discountTotal.amount;
  const options = applicableRates(input.rates, discountedSubtotal);

  const selected = options.find((rate) => rate.id === input.selectedShippingRateId) ?? null;
  const shippingPrice = selected?.price.amount ?? 0;

  // Pass two, now that the rate is known, so `free_shipping` can zero it.
  const priced = applyDiscounts({
    lines,
    shippingPrice: money(shippingPrice, currency),
    discounts: input.discounts,
    enteredCode: input.enteredCode,
    now: input.now,
  });

  const discountTotal = priced.discountTotal.amount;
  const shippingTotal = shippingPrice - priced.shippingDiscount.amount;
  // Once, over the whole discounted base — see the header.
  const taxTotal = percentOf(
    money(subtotal - discountTotal, currency),
    input.taxRatePercentage,
  ).amount;

  const rejected = priced.rejected[0] ?? null;

  return {
    totals: {
      subtotal: money(subtotal, currency),
      discountTotal: money(discountTotal, currency),
      shippingTotal: money(shippingTotal, currency),
      taxTotal: money(taxTotal, currency),
      total: money(subtotal - discountTotal + shippingTotal + taxTotal, currency),
    },
    appliedDiscounts: priced.applied,
    rejectedDiscount: rejected
      ? { code: rejected.code, reason: rejected.reason as DiscountRejectionReason }
      : null,
    shippingOptions: options.map((rate) => ({
      id: rate.id,
      title: rate.name,
      price: rate.price,
      // A4 stores no delivery estimate; the merchant puts it in the rate name
      // ("Standard shipping (3–5 days)"), which is where Shopify shows it too.
      estimatedDelivery: null,
    })),
    selectedShippingRateId: selected?.id ?? null,
  };
}
