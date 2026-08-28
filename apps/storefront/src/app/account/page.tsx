/**
 * `/account` — order history + profile (SPEC §8, optional path). Owner: WS-E (E5).
 * Signed out renders as a redirect to the login form, never an error page.
 */
import { formatMoney, HOME_PATH, ThemeButton } from '@merchant/theme-engine/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { resolveShopSlug } from '../../lib/tenant.ts';
import { LogoutButton, ProfileForm } from './forms.tsx';
import { currentCustomer, customerOrders } from './session.ts';

export const metadata: Metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

/** Shopper-facing status labels — `partially_fulfilled` is admin dialect. */
const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: 'Unfulfilled',
  partially_fulfilled: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
};

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/**
 * A signed-in shopper with no orders — the first thing a new account sees, and
 * the state the seeded demo customer is in. Designed rather than apologetic: a
 * card the size of the table it replaces, one heading, one sentence, one way
 * out. (H3: the alternative fix is seed-side — see the report.)
 */
function EmptyOrderHistory() {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 rounded-theme border border-text/10 px-6 py-14 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-10 w-10 text-text/30"
      >
        <path d="M6 7h12l1.2 12.2a1 1 0 0 1-1 1.1H5.8a1 1 0 0 1-1-1.1L6 7Z" />
        <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
      </svg>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-heading text-lg text-text">No orders yet</h3>
        <p className="mx-auto max-w-sm text-sm text-text/60">
          Orders you place will show up here with their status and totals.
        </p>
      </div>
      <ThemeButton href={HOME_PATH}>Start shopping</ThemeButton>
    </div>
  );
}

export default async function AccountPage() {
  // Slug only — the layout already resolved the theme. Not `shopContext()`:
  // these pages need no second shop/theme fetch, just the Host header.
  const slug = await resolveShopSlug();
  if (!slug) notFound();
  const customer = await currentCustomer(slug);
  if (!customer) redirect('/account/login');

  const orders = await customerOrders(slug);
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ');

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">My account</h1>
          <p className="mt-1 text-sm text-text/60">
            {name ? `${name} · ` : ''}
            {customer.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_minmax(0,24rem)]">
        <section aria-labelledby="order-history">
          <h2 id="order-history" className="font-heading text-xl">
            Order history
          </h2>
          {orders.length === 0 ? (
            <EmptyOrderHistory />
          ) : (
            <div className="mt-4 overflow-x-auto rounded-theme border border-text/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-text/10 border-b text-text/60">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Order
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-text/10 border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">#{order.orderNumber}</td>
                      <td className="px-4 py-3 text-text/70">
                        {dateFormat.format(new Date(order.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-text/70">
                        {order.cancelledAt
                          ? 'Cancelled'
                          : (FULFILLMENT_LABELS[order.fulfillmentStatus] ??
                            order.fulfillmentStatus)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="account-details">
          <h2 id="account-details" className="font-heading text-xl">
            Account details
          </h2>
          <div className="mt-4 rounded-theme border border-text/10 p-5">
            <ProfileForm customer={customer} />
          </div>
        </section>
      </div>
    </main>
  );
}
