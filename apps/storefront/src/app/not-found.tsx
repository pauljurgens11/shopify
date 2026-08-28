/**
 * Shown for an unknown shop, product or collection. Deliberately plain: at this
 * point there may be no theme to render it with (an unresolved host has no
 * shop at all), so it must not depend on one — no `ThemeButton`, whose colours
 * come from custom properties the layout only sets when a shop resolved.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-medium text-sm uppercase tracking-[0.2em] opacity-50">404</p>
      <h1 className="font-heading text-3xl">Page not found</h1>
      <p className="opacity-70">
        The page you were looking for was moved, removed, or never existed.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
        <a href="/" className="rounded-theme border border-current px-5 py-2.5">
          Back to the store
        </a>
        <a href="/search" className="underline opacity-70 hover:opacity-100">
          Search products
        </a>
      </div>
    </main>
  );
}
