/**
 * Cart (SPEC §10). Owner: WS-E.
 *
 * Rendered by F1's `cart-page` core section, which is not on any themed page —
 * it is a fixed page every theme has — so it is rendered directly rather than
 * through `renderPage`.
 *
 * Never cached, and never prerendered: it is one shopper's cart.
 */

import { renderFooter } from '@merchant/theme-engine/render';
import { CartPage as CartSection } from '@merchant/theme-engine/sections/cart-page';
import type { Metadata } from 'next';
import { sectionData } from '../../lib/render.tsx';
import { currentCart, shopContext } from '../../lib/shop.ts';

export const metadata: Metadata = { title: 'Cart' };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const { slug, shop, theme } = await shopContext();
  const cart = await currentCart(slug);
  const data = sectionData({ shop, cart });

  return (
    <>
      <main>
        <CartSection
          settings={{
            showNoteField: false,
            showShippingEstimate: false,
            checkoutButtonLabel: 'Check out',
          }}
          data={data}
        />
      </main>
      {renderFooter(theme, data)}
    </>
  );
}
