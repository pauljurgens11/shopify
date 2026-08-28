/**
 * Carries `?preview=` into the layout (SPEC §12). Owner: WS-E.
 *
 * Next gives pages their search params but NOT layouts — and the layout is
 * where the theme's colours and fonts are applied, as CSS custom properties on
 * `<body>`. Without this, a previewed draft renders its sections but wears the
 * published theme's palette, which is precisely the part F4's builder preview
 * exists to show.
 *
 * So the token is copied onto a request header, which layouts and pages can
 * both read. It is verified by the API, never trusted here.
 *
 * The pathname rides along for the same reason: the root layout has to know
 * whether it is wrapping the store or the checkout.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const THEME_PREVIEW_HEADER = 'x-theme-preview';
/**
 * The path, for layouts. Checkout is a different surface from the store — white
 * page, no nav, no theme chrome (PARITY.md) — and a layout has no other way to
 * know which one it is rendering.
 */
export const PATHNAME_HEADER = 'x-pathname';

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  const preview = request.nextUrl.searchParams.get('preview');
  if (preview) headers.set(THEME_PREVIEW_HEADER, preview);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's own assets — the preview applies to real pages.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
