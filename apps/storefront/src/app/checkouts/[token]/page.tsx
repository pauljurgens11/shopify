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
import { updateCheckout } from '../../../lib/checkout-actions.ts';
import { shopContext } from '../../../lib/shop.ts';
import { currentCustomer } from '../../account/session.ts';

export const metadata: Metadata = { title: 'Checkout' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { slug, shop } = await shopContext();

  let checkout = await apiGet<Checkout>(slug, `/checkouts/${encodeURIComponent(token)}`, {
    freshness: 'no-store',
  });
  if (!checkout) notFound();
  if (checkout.status === 'completed') redirect(`/checkouts/${token}/thank-you`);

  // Saved cards are an account feature (SPEC §11): only a signed-in shopper is
  // offered the box, and the API independently refuses to save without the
  // session. Null for the guest path, which is the default (SPEC §8).
  const customer = await currentCustomer(slug);

  // Shopify does not ask a signed-in shopper for their email again (E5's
  // prefill handoff). It is also what makes "save this card" reachable: the
  // box only shows while the checkout is under the shopper's own account, so
  // without this it would appear only after they retyped their own address.
  // Idempotent — once the checkout carries an email this never runs again.
  if (customer && !checkout.email) {
    const filled = await updateCheckout(token, { email: customer.email });
    if (filled.checkout) checkout = filled.checkout;
  }

  return (
    <>
      <CheckoutView
        initial={checkout}
        shopName={shop.name}
        accountEmail={customer?.email ?? null}
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
