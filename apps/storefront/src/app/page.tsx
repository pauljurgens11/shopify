import { resolveShopSlug } from '../lib/tenant.ts';

/** Placeholder home. WS-E replaces this with the theme-engine renderer. */
export default async function HomePage() {
  const slug = await resolveShopSlug();
  return (
    <main className="mx-auto max-w-3xl p-12">
      <h1 className="font-heading text-3xl">Storefront skeleton</h1>
      <p className="mt-2 opacity-70">Resolved shop: {slug ?? 'none'}</p>
    </main>
  );
}
