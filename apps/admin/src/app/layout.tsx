import { BRAND_NAME } from '@merchant/config/constants';
import type { Metadata } from 'next';
import '@shopify/polaris/build/esm/styles.css';
import { Providers } from '../components/shell/providers.tsx';

// SPEC §1: the product is "Shopify" wherever a brand name is unavoidable, and
// the string lives in `BRAND_NAME` so it is one edit rather than thirty.
//
// `template` is what gives every page the "Products · Shopify" title H3 asks
// for: a segment that exports `title: 'Products'` gets the suffix for free.
// Pages under /store/{slug} are client components and cannot export metadata,
// so their titles come from a server `layout.tsx` per section directory — one
// per area, not one per page (see the WS-H DECISIONS entry on page titles).
export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
  description: `${BRAND_NAME} admin`,
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
