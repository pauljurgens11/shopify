import type { SectionProps } from '../context.ts';
import { InertForm } from './client/inert-form.tsx';

/**
 * `footer` section.
 * Core section: lives at doc level (`doc.footer`) and renders on every page,
 * which is why `validateThemeDoc` rejects one placed inside a page (SPEC §12).
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type FooterSettings = SectionProps<'footer'>['settings'];

/** Neutral wordmarks, not brand logos — the demo must not ship third-party art. */
const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Amex', 'PayPal', 'Apple Pay'];

export function Footer({ settings, data }: SectionProps<'footer'>) {
  const { columns, showNewsletter, text, showPaymentIcons } = settings;
  const year = new Date().getUTCFullYear();
  const newsletter = showNewsletter
    ? (data.slots?.newsletterForm?.('Subscribe') ?? <NewsletterFallback />)
    : null;

  return (
    <footer data-section="footer" className="mt-16 w-full border-text/10 border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            <p className="font-heading text-lg text-text">{data.shop.name}</p>
            {text ? <p className="mt-3 text-sm text-text/60 leading-relaxed">{text}</p> : null}
            {newsletter ? <div className="mt-6">{newsletter}</div> : null}
          </div>

          {columns.length > 0 ? (
            <nav className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:max-w-2xl">
              {columns.map((column, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: headings are model-authored and not unique; this list is static settings data that never reorders
                <div key={`${index}-${column.heading}`}>
                  <h2 className="font-medium text-sm text-text">{column.heading}</h2>
                  <ul className="mt-3 space-y-2">
                    {column.links.map((link) => (
                      <li key={`${link.label}-${link.url}`}>
                        <a
                          href={link.url}
                          className="text-sm text-text/60 transition-colors hover:text-text"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col-reverse gap-6 border-text/10 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-text/50 text-xs">
            © {year} {data.shop.name}. All rights reserved.
          </p>
          {showPaymentIcons ? (
            <ul className="flex flex-wrap items-center gap-2">
              {PAYMENT_METHODS.map((method) => (
                <li
                  key={method}
                  className="rounded-theme border border-text/15 px-2 py-1 text-[10px] text-text/50 uppercase tracking-wider"
                >
                  {method}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

/**
 * SPEC §2 rules out marketing email, so there is no backend to post to. This
 * uses the same `InertForm` as the `newsletter` section: it acknowledges the
 * submit instead of doing nothing at all. The bare button this replaced sat
 * outside any form with no handler, so clicking Subscribe was a no-op — a dead
 * control on every themed page (CLAUDE.md §8).
 *
 * `data.slots.newsletterForm` stays the override for a real island; nothing
 * supplies it today, so this fallback is what renders.
 */
function NewsletterFallback() {
  return (
    <InertForm
      buttonLabel="Subscribe"
      successMessage="Thanks — you're on the list."
      className="flex max-w-sm items-center gap-2"
    >
      <label className="sr-only" htmlFor="footer-newsletter-email">
        Email address
      </label>
      <input
        id="footer-newsletter-email"
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="min-w-0 flex-1 rounded-theme border border-text/20 bg-transparent px-3 py-2 text-sm text-text placeholder:text-text/40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      />
    </InertForm>
  );
}
