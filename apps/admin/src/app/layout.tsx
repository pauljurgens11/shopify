import type { Metadata } from 'next';
import '@shopify/polaris/build/esm/styles.css';
import { Providers } from '../components/shell/providers.tsx';

// SPEC §1: the product is "Merchant" wherever a brand name is unavoidable.
// Never the Shopify name or logo.
//
// `template` is what gives every page the "Products · Merchant" title H3 asks
// for: a segment that exports `title: 'Products'` gets the suffix for free.
// Pages under /store/{slug} are client components and cannot export metadata,
// so their titles come from a server `layout.tsx` per section directory — one
// per area, not one per page (see the WS-H DECISIONS entry on page titles).
export const metadata: Metadata = {
  title: { default: 'Merchant', template: '%s · Merchant' },
  description: 'Merchant admin',
  // Declared rather than relying on the /favicon.ico convention: the asset is an
  // SVG so it stays crisp at every size, and the browser only knows to ask for
  // it if it is linked.
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
