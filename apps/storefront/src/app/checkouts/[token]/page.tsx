/**
 * `/checkouts/[token]` (SPEC §10, PARITY.md). Owner: WS-E.
 *
 * The token in the URL is the credential — checkout carries no session, which
 * is why E3 makes it high-entropy. A completed checkout redirects to its
 * thank-you page rather than offering to be paid twice.
 */

import { env } from '@merchant/config/env';
import type { Checkout } from '@merchant/contracts/checkout';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AnalyticsBeacon } from '../../../components/analytics-beacon.tsx';
import { CheckoutView } from '../../../components/checkout/checkout-view.tsx';
import { apiGet, storefrontApiUrl } from '../../../lib/api.ts';
import { shopContext } from '../../../lib/shop.ts';

export const metadata: Metadata = { title: 'Checkout' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { slug, shop } = await shopContext();

  const checkout = await apiGet<Checkout>(slug, `/checkouts/${encodeURIComponent(token)}`, {
    freshness: 'no-store',
  });
  if (!checkout) notFound();
  if (checkout.status === 'completed') redirect(`/checkouts/${token}/thank-you`);

  return (
    <>
      <CheckoutView
        initial={checkout}
        shopName={shop.name}
        // The browser posts the card here directly, cross-origin, so our server
        // never sees a PAN (SPEC §11). The vault resolves the shop from the
        // Origin header the browser sets.
        tokenizeUrl={`${env().API_URL}/vault/tokenize`}
      />
      <AnalyticsBeacon
        endpoint={storefrontApiUrl(slug, '/events')}
        events={[{ type: 'begin_checkout', path: `/checkouts/${token}` }]}
      />
    </>
  );
}
