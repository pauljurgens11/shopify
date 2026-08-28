/**
 * `/checkouts/[token]/thank-you` (PARITY.md). Owner: WS-E.
 *
 * Reachable by refresh long after the complete response is gone, so everything
 * on it comes from the checkout row: E3 exposes `completedOrderNumber` on a
 * completed checkout for exactly this.
 *
 * No `purchase` beacon is fired here. WS-G drops browser-sent purchase events
 * as forgeable revenue; the real one is written server-side by `createOrder`.
 */
import type { Checkout } from '@merchant/contracts/checkout';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { OrderSummary } from '../../../../components/checkout/order-summary.tsx';
import { apiGet } from '../../../../lib/api.ts';
import { shopContext } from '../../../../lib/shop.ts';

export const metadata: Metadata = { title: 'Order confirmed' };
export const dynamic = 'force-dynamic';

export default async function ThankYouPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { slug, shop } = await shopContext();

  const checkout = await apiGet<Checkout>(slug, `/checkouts/${encodeURIComponent(token)}`, {
    freshness: 'no-store',
  });
  if (!checkout) notFound();
  // Landing here unpaid means the shopper backed out; send them to finish.
  if (checkout.status !== 'completed') redirect(`/checkouts/${token}`);

  const firstName = checkout.shippingAddress?.firstName ?? null;
  const address = checkout.shippingAddress;
  // Both come off the checkout, which E3 reprices on every read — so the card
  // repeats what was actually bought rather than a second source of truth.
  const billing = checkout.billingSameAsShipping ? address : checkout.billingAddress;
  const shippingMethod =
    checkout.shippingOptions.find((option) => option.id === checkout.selectedShippingRateId)
      ?.title ?? null;

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      <div className="order-2 px-6 py-8 lg:order-1 lg:px-10 lg:py-12">
        <header className="mb-8">
          <h1 className="font-medium text-2xl tracking-tight">{shop.name}</h1>
        </header>

        {/* Shopify's map card. A real map is out of scope (SPEC §2), so this is
            decoration, not a failed feature — an apology ("map unavailable") in
            the last screenshot of the demo reads as something broken. */}
        <div
          aria-hidden="true"
          className="mb-8 h-44 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
        >
          <svg
            viewBox="0 0 400 176"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full text-neutral-300"
            role="presentation"
          >
            <g stroke="currentColor" strokeWidth="8" fill="none">
              <path d="M-20 44 H420 M-20 128 H420 M96 -20 V196 M276 -20 V196" />
            </g>
            <path
              d="M-20 152 L120 92 L240 118 L420 30"
              stroke="currentColor"
              strokeWidth="14"
              fill="none"
              opacity="0.7"
            />
            <g transform="translate(196 62)" className="text-neutral-400">
              <path
                d="M12 0a12 12 0 0 0-12 12c0 9 12 24 12 24s12-15 12-24A12 12 0 0 0 12 0z"
                fill="currentColor"
              />
              <circle cx="12" cy="12" r="4.5" fill="#f5f5f5" />
            </g>
          </svg>
        </div>

        <div className="mb-8 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" role="presentation">
              <path
                d="m4.5 10.5 3.5 3.5 7.5-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-neutral-500 text-sm">
              Confirmation #{checkout.completedOrderNumber ?? '—'}
            </p>
            <h2 className="font-medium text-xl">Thank you{firstName ? `, ${firstName}` : ''}!</h2>
          </div>
        </div>

        <section className="rounded-lg border border-neutral-200 p-6">
          <h3 className="mb-4 font-medium text-base">Order details</h3>
          <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
            <Detail label="Contact information">
              <p className="text-neutral-600">{checkout.email}</p>
            </Detail>
            {shippingMethod ? (
              <Detail label="Shipping method">
                <p className="text-neutral-600">{shippingMethod}</p>
              </Detail>
            ) : null}
            {address ? (
              <Detail label="Shipping address">
                <AddressBlock address={address} />
              </Detail>
            ) : null}
            {billing ? (
              <Detail label="Billing address">
                <AddressBlock address={billing} />
              </Detail>
            ) : null}
          </div>
        </section>

        {/* A plain anchor, not `next/link`: this leaves the bare checkout shell
            for the themed storefront one, and a document load is the cheapest
            way to be certain the theme's fonts and tokens come with it. */}
        <a
          href="/"
          className="mt-8 inline-flex rounded bg-neutral-900 px-6 py-3.5 font-medium text-sm text-white hover:bg-neutral-800"
        >
          Continue shopping
        </a>
      </div>

      <div className="order-1 lg:order-2">
        <OrderSummary checkout={checkout} />
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-medium">{label}</p>
      {children}
    </div>
  );
}

function AddressBlock({ address }: { address: NonNullable<Checkout['shippingAddress']> }) {
  return (
    <address className="text-neutral-600 not-italic">
      {address.firstName} {address.lastName}
      <br />
      {address.address1}
      {address.address2 ? (
        <>
          <br />
          {address.address2}
        </>
      ) : null}
      <br />
      {address.city}
      {address.provinceCode ? `, ${address.provinceCode}` : ''} {address.zip}
      <br />
      {address.country}
    </address>
  );
}
