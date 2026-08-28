/**
 * Home — the theme's `home` sections (SPEC §10). Owner: WS-E.
 */
import { renderFooter, renderPage } from '@merchant/theme-engine/render';
import { AnalyticsBeacon } from '../components/analytics-beacon.tsx';
import { storefrontApiUrl } from '../lib/api.ts';
import { resolveThemeReferences } from '../lib/page-data.ts';
import { sectionData } from '../lib/render.tsx';
import { currentCart, shopContext } from '../lib/shop.ts';

export default async function HomePage() {
  const { slug, shop, theme, isPreview } = await shopContext();

  const [references, cart] = await Promise.all([
    resolveThemeReferences(slug, theme, 'home'),
    currentCart(slug),
  ]);

  const data = sectionData({ shop, cart, ...references });

  return (
    <>
      <main>{renderPage(theme, 'home', data)}</main>
      {renderFooter(theme, data)}
      {/* The builder's own iframe views are not shopper traffic. */}
      {isPreview ? null : (
        <AnalyticsBeacon
          endpoint={storefrontApiUrl(slug, '/events')}
          events={[{ type: 'page_view', path: '/' }]}
        />
      )}
    </>
  );
}
