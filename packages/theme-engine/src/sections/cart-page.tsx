import type { SectionProps } from '../context.ts';
import { formatMoney, Price } from '../shared/price.tsx';
import { SectionShell } from '../shared/section-shell.tsx';
import { ThemeButton } from '../shared/theme-button.tsx';
import { CHECKOUT_PATH, HOME_PATH, productPath } from '../shared/urls.ts';

/**
 * `cart-page` section.
 * Core section: required on its page (SPEC §12).
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type CartPageSettings = SectionProps<'cart-page'>['settings'];

export function CartPage({ settings, data }: SectionProps<'cart-page'>) {
  const { showNoteField, showShippingEstimate, checkoutButtonLabel } = settings;
  const cart = data.cart ?? null;

  if (!cart || cart.lines.length === 0) {
    return (
      <SectionShell type="cart-page" padding="lg" width="narrow">
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <h1 className="font-heading text-2xl text-text sm:text-3xl">Your cart is empty</h1>
          <p className="text-sm text-text/60">
            Nothing here yet — have a look at what's new this season.
          </p>
          <ThemeButton href={HOME_PATH}>Continue shopping</ThemeButton>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell type="cart-page" padding="lg" width="wide">
      <h1 className="font-heading text-2xl text-text sm:text-3xl">Your cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ul className="divide-y divide-text/10 border-text/10 border-y">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex gap-4 py-5" data-cart-line={line.id}>
              <a
                href={productPath(line.handle)}
                className="h-24 w-20 shrink-0 overflow-hidden rounded-theme bg-text/5"
              >
                {line.imageUrl ? (
                  <img
                    src={line.imageUrl}
                    alt={line.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </a>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <a href={productPath(line.handle)} className="font-medium text-sm text-text">
                  {line.title}
                </a>
                {line.variantTitle ? (
                  <p className="text-text/60 text-xs">{line.variantTitle}</p>
                ) : null}
                <p className="text-text/60 text-xs">{formatMoney(line.unitPrice)} each</p>
                <div className="mt-2">
                  {/* Quantity stepper and remove are stateful — E2's island. */}
                  {data.slots?.cartLine?.(line) ?? (
                    <p className="text-sm text-text/70">Qty {line.quantity}</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <Price price={line.lineTotal} className="font-medium text-sm" />
              </div>
            </li>
          ))}
        </ul>

        <aside className="flex flex-col gap-4 rounded-theme border border-text/10 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-text/70">Subtotal</span>
            <Price price={cart.subtotal} className="font-medium text-base" />
          </div>

          {showShippingEstimate ? (
            <p className="text-text/60 text-xs">
              Shipping is calculated at checkout from your delivery address.
            </p>
          ) : (
            <p className="text-text/60 text-xs">Taxes and shipping calculated at checkout.</p>
          )}

          {showNoteField ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cart-note" className="text-sm text-text/70">
                Order note
              </label>
              <textarea
                id="cart-note"
                name="note"
                rows={3}
                placeholder="Gift wrap, delivery instructions…"
                className="w-full rounded-theme border border-text/20 bg-transparent px-3 py-2 text-sm text-text placeholder:text-text/40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              />
            </div>
          ) : null}

          <ThemeButton href={CHECKOUT_PATH} size="lg" block>
            {checkoutButtonLabel}
          </ThemeButton>
        </aside>
      </div>
    </SectionShell>
  );
}
