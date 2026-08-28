/**
 * Storefront shell (SPEC §10). Owner: WS-E.
 *
 * Theme tokens land as CSS custom properties on `<body>`, which `globals.css`
 * maps into Tailwind's `@theme`. That is how one Tailwind build serves every
 * shop's branding — and why nothing in here may hardcode a colour or a font.
 *
 * The layout cannot read `?preview=`: Next does not give layouts search params.
 * Each page therefore renders its own sections with the previewed theme, while
 * the chrome here stays on the published one — which is right, because the
 * builder previews page content, not the browser frame around it.
 */
import { googleFontsHref, themeCssVariables } from '@merchant/theme-engine/render';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { StorefrontHeader } from '../components/storefront-header.tsx';
import { currentCart, optionalShopContext } from '../lib/shop.ts';
import { PATHNAME_HEADER } from '../middleware.ts';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const context = await optionalShopContext();
  if (!context) return { title: 'Store not found' };
  const { shop } = context;
  return {
    title: { default: shop.name, template: `%s · ${shop.name}` },
    description: `Shop ${shop.name}.`,
  };
}

/** A themeless white shell — checkout, and any host that resolves no shop. */
function PlainShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Checkout is Shopify's checkout, not our storefront: a clean white page with
  // the shop name as a logotype and no navigation at all (PARITY.md). It opts
  // out of the theme chrome rather than fighting it from inside.
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? '';
  if (pathname.startsWith('/checkouts')) return <PlainShell>{children}</PlainShell>;

  // Deliberately not `shopContext()`: `notFound()` from the ROOT layout is a
  // Next error, not a 404, because the not-found page renders inside this
  // layout. An unknown subdomain gets the plain shell and the page below calls
  // `notFound()` itself, so `not-found.tsx` renders instead of an error page.
  const context = await optionalShopContext();
  if (!context) return <PlainShell>{children}</PlainShell>;
  const { shop, theme } = context;

  const cart = await currentCart(shop.slug);

  return (
    <html lang="en">
      <head>
        {/* The only external asset a storefront loads (F1's pipeline). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={googleFontsHref(theme.tokens)} />
      </head>
      <body style={themeCssVariables(theme.tokens) as React.CSSProperties}>
        <StorefrontHeader
          shopName={shop.name}
          navigation={theme.navigation}
          itemCount={cart?.itemCount ?? 0}
        />
        {children}
      </body>
    </html>
  );
}
