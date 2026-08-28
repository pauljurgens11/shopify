import type { Section } from '@merchant/contracts/theme';

/**
 * `product-grid` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ProductGridSettings = Extract<Section, { type: 'product-grid' }>['settings'];

export function ProductGrid({ settings }: { settings: ProductGridSettings }) {
  // TODO(WS-F): implement. Keep it pure — no data fetching inside a section.
  return (
    <section data-section="product-grid" className="w-full">
      <pre className="hidden">{JSON.stringify(settings)}</pre>
    </section>
  );
}
