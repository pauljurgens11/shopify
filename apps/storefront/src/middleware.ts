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
 */
import { type NextRequest, NextResponse } from 'next/server';

export const THEME_PREVIEW_HEADER = 'x-theme-preview';

export function middleware(request: NextRequest) {
  const preview = request.nextUrl.searchParams.get('preview');
  if (!preview) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set(THEME_PREVIEW_HEADER, preview);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's own assets — the preview applies to real pages.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
