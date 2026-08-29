/**
 * Loading skeletons for the checkout routes (PARITY.md "Checkout (E4)").
 * Owner: WS-E.
 *
 * Both checkout routes are `force-dynamic` with a `no-store` read, so there is
 * always a server round trip with nothing on screen. Shopify never shows a bare
 * spinner there; it shows the shape of the page. Each skeleton mirrors its real
 * page's grid exactly — same `max-w-6xl`, same `1.15fr_1fr` split, same grey
 * sidebar — so the swap to real content shifts nothing.
 *
 * The thank-you one earns its keep twice: it is also what the shopper sees for
 * the moment between a successful charge and the confirmation rendering, where
 * the alternative is the paid checkout form sitting there looking payable.
 *
 * Deliberately NOT built on `components/skeleton.tsx`: those primitives are
 * theme-token-driven (`bg-text/10`, `rounded-theme`) and wrap the page in the
 * storefront's `<main>` width, and checkout opts out of the theme entirely
 * (DECISIONS.md, WS-E) — it is Shopify's neutral-grey checkout, not the shop's.
 *
 * Not a route file — Next only treats `page`/`layout`/`loading`/`route` as
 * special, so this stays a plain module the two `loading.tsx` files share.
 */

function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-neutral-200 ${className}`} />;
}

/** The real left column, as field counts: Contact, Delivery, Payment. */
const SECTIONS = [
  { id: 'contact', fields: ['email', 'marketing'] },
  { id: 'delivery', fields: ['country', 'name', 'address', 'apartment', 'city'] },
  { id: 'payment', fields: ['number', 'expiry', 'name'] },
];

/** The grey right-hand column: three item rows, then the totals block. */
function SummarySkeleton() {
  return (
    <div className="order-1 bg-neutral-50 px-6 py-8 lg:order-2 lg:min-h-screen lg:border-neutral-200 lg:border-l lg:px-10 lg:py-12">
      <div className="mx-auto max-w-md lg:mx-0">
        <ul className="flex flex-col gap-4">
          {[0, 1].map((row) => (
            <li key={row} className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-200" />
              <div className="flex-1 space-y-2">
                <Bar className="h-3 w-2/3" />
                <Bar className="h-3 w-1/3" />
              </div>
              <Bar className="h-3 w-14" />
            </li>
          ))}
        </ul>
        <Bar className="mt-6 h-11 w-full" />
        <div className="mt-6 space-y-3 border-neutral-200 border-t pt-6">
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-full" />
        </div>
        <div className="mt-4 border-neutral-200 border-t pt-4">
          <Bar className="h-6 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.15fr_1fr]"
    >
      <span className="sr-only">Loading checkout</span>
      <div className="order-2 px-6 py-8 lg:order-1 lg:px-10 lg:py-12">
        <Bar className="mb-8 h-7 w-48" />
        <Bar className="h-11 w-full" />
        {SECTIONS.map((section) => (
          <div key={section.id} className="mt-8 space-y-3">
            <Bar className="h-5 w-32" />
            {section.fields.map((field) => (
              <Bar key={field} className="h-11 w-full" />
            ))}
          </div>
        ))}
        <Bar className="mt-6 h-14 w-full" />
      </div>
      <SummarySkeleton />
    </div>
  );
}

export function ThankYouSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.15fr_1fr]"
    >
      <span className="sr-only">Loading your order confirmation</span>
      <div className="order-2 px-6 py-8 lg:order-1 lg:px-10 lg:py-12">
        <Bar className="mb-8 h-7 w-48" />
        <Bar className="mb-8 h-44 w-full" />
        <div className="mb-8 flex items-start gap-4">
          <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-200" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-40" />
            <Bar className="h-5 w-56" />
          </div>
        </div>
        <div className="space-y-4 rounded-lg border border-neutral-200 p-6">
          <Bar className="h-4 w-32" />
          <Bar className="h-3 w-2/3" />
          <Bar className="h-3 w-1/2" />
        </div>
        <Bar className="mt-8 h-12 w-44" />
      </div>
      <SummarySkeleton />
    </div>
  );
}
