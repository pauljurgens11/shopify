import type { Metadata } from 'next';

/**
 * Titles the tab "Apps · Shopify" (H3; PARITY.md). Owner: WS-H.
 *
 * A server layout is the only thing that can name these pages: every leaf under
 * `/store/{slug}` is a client component, and a client component cannot export
 * `metadata`. Detail routes inherit their section's title, which is what
 * Shopify's admin does. The suffix comes from the root layout's title template.
 */
export const metadata: Metadata = { title: 'Apps' };

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
