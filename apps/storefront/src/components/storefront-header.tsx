/**
 * Theme navigation header (SPEC §10). Owner: WS-E.
 *
 * Server Component: the only moving part is the cart count, which the layout
 * already fetched and `CartCount` keeps in step with adds made on the page.
 * Token-driven throughout — a hardcoded colour here would break theme
 * switching (H2 flow d) just as surely as one inside a section.
 */
import type { ThemeDoc } from '@merchant/contracts/theme';
import { CART_PATH, HOME_PATH, SEARCH_PATH } from '@merchant/theme-engine/shared';
import { CartCount } from './cart-count.tsx';

export function StorefrontHeader({
  shopName,
  navigation,
  itemCount,
}: {
  shopName: string;
  navigation: ThemeDoc['navigation'];
  itemCount: number;
}) {
  return (
    <header className="border-b border-text/10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <a href={HOME_PATH} className="font-heading text-xl tracking-tight">
          {shopName}
        </a>

        <div className="hidden items-center gap-6 text-sm md:flex">
          {navigation.links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              className="opacity-80 hover:opacity-100"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <a href={SEARCH_PATH} className="opacity-80 hover:opacity-100">
            Search
          </a>
          {/* E5's account pages had no entry point anywhere in the store; signed
              out, /account redirects to the login form, so one link covers both. */}
          <a href="/account" className="opacity-80 hover:opacity-100">
            Account
          </a>
          <a href={CART_PATH} className="opacity-80 hover:opacity-100">
            Cart
            <CartCount initial={itemCount} />
          </a>
        </div>
      </nav>
    </header>
  );
}
