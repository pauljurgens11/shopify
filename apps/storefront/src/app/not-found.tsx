/**
 * Shown for an unknown shop, product or collection. Deliberately plain: at this
 * point there may be no theme to render it with (an unresolved host has no
 * shop at all), so it must not depend on one.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-3xl">Page not found</h1>
      <p className="opacity-70">The page you were looking for is not here.</p>
      <a href="/" className="mt-2 underline">
        Back to the store
      </a>
    </main>
  );
}
