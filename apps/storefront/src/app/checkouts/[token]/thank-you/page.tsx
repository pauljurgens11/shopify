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

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      <div className="order-2 px-6 py-8 lg:order-1 lg:px-10 lg:py-12">
        <header className="mb-8">
          <h1 className="font-medium text-2xl tracking-tight">{shop.name}</h1>
        </header>

        {/* Shopify's map card. A real map is out of scope (SPEC §2); the shape
            of the page is what the parity target is. */}
        <div className="mb-8 flex h-44 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-400 text-sm">
          Delivery map unavailable
        </div>

        <div className="mb-8 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-lg text-white"
          >
            ✓
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
            <div>
              <p className="mb-1 font-medium">Contact information</p>
              <p className="text-neutral-600">{checkout.email}</p>
            </div>
            {address ? (
              <div>
                <p className="mb-1 font-medium">Shipping address</p>
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
              </div>
            ) : null}
          </div>
        </section>

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
