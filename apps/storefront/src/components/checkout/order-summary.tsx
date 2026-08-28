/**
 * Checkout order summary — Shopify's grey right-hand sidebar (PARITY.md).
 * Owner: WS-E.
 *
 * Every number here comes from E3's `totals`, recomputed on each save, so the
 * sidebar and the amount the card is charged cannot drift apart.
 */
'use client';

import type { Checkout } from '@merchant/contracts/checkout';
import { useState } from 'react';

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);

export function OrderSummary({
  checkout,
  onApplyDiscount,
  busy,
}: {
  checkout: Checkout;
  onApplyDiscount?: (code: string) => void;
  busy?: boolean;
}) {
  const [code, setCode] = useState(checkout.discountCode ?? '');
  const { totals, currencyCode } = checkout;

  return (
    <aside className="bg-neutral-50 px-6 py-8 lg:min-h-screen lg:border-l lg:border-neutral-200 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-md lg:mx-0">
        <ul className="flex flex-col gap-4">
          {checkout.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  {line.imageUrl ? (
                    // biome-ignore lint/performance/noImgElement: remote theme URLs, see DECISIONS.md
                    <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                {/* Shopify's grey quantity bubble, overlapping the top-right corner. */}
                <span className="-right-2 -top-2 absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-500 px-1.5 font-medium text-white text-xs tabular-nums">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{line.title}</p>
                {line.variantTitle ? (
                  <p className="truncate text-neutral-500 text-xs">{line.variantTitle}</p>
                ) : null}
              </div>
              <p className="text-sm tabular-nums">{money(line.lineTotal.amount, currencyCode)}</p>
            </li>
          ))}
        </ul>

        {/* Only while the checkout is still editable: the thank-you page reuses
            this sidebar without a handler, and Shopify shows no discount entry
            after purchase. */}
        {onApplyDiscount ? (
          <>
            <form
              className="mt-6 flex gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onApplyDiscount(code.trim());
              }}
            >
              <input
                aria-label="Discount code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Discount code"
                autoComplete="off"
                className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={busy || code.trim().length === 0}
                className="rounded border border-neutral-300 bg-neutral-100 px-5 py-2.5 font-medium text-neutral-700 text-sm hover:bg-neutral-200 disabled:opacity-50"
              >
                Apply
              </button>
            </form>

            {checkout.rejectedDiscount ? (
              <p role="alert" className="mt-2 text-red-600 text-sm">
                {rejectionMessage(checkout.rejectedDiscount)}
              </p>
            ) : null}
          </>
        ) : null}
        {checkout.appliedDiscounts.map((applied) => (
          <p key={applied.discountId} className="mt-2 text-neutral-600 text-sm">
            {applied.code ?? applied.title} applied
          </p>
        ))}

        <dl className="mt-6 flex flex-col gap-2 border-neutral-200 border-t pt-6 text-sm">
          <Row label="Subtotal" value={money(totals.subtotal.amount, currencyCode)} />
          {totals.discountTotal.amount > 0 ? (
            <Row label="Discount" value={`−${money(totals.discountTotal.amount, currencyCode)}`} />
          ) : null}
          <Row
            label="Shipping"
            value={
              checkout.selectedShippingRateId
                ? totals.shippingTotal.amount === 0
                  ? 'Free'
                  : money(totals.shippingTotal.amount, currencyCode)
                : 'Enter shipping address'
            }
          />
          <Row label="Taxes" value={money(totals.taxTotal.amount, currencyCode)} />
        </dl>

        <div className="mt-4 flex items-baseline justify-between border-neutral-200 border-t pt-4">
          <span className="font-medium text-base">Total</span>
          <span className="flex items-baseline gap-2">
            <span className="text-neutral-500 text-xs">{currencyCode}</span>
            <span className="font-semibold text-xl tabular-nums">
              {money(totals.total.amount, currencyCode)}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-600">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** E3 returns a machine reason; the shopper needs a sentence. */
function rejectionMessage({ code, reason }: NonNullable<Checkout['rejectedDiscount']>): string {
  switch (reason) {
    case 'expired':
      return `Discount code ${code} has expired.`;
    case 'not_started':
      return `Discount code ${code} isn’t active yet.`;
    case 'minimum_not_met':
      return `Discount code ${code} isn’t valid for the items in your cart.`;
    case 'usage_limit':
      return `Discount code ${code} has reached its limit.`;
    default:
      return `Enter a valid discount code.`;
  }
}
