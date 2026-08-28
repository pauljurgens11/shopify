import type { Section } from '@merchant/contracts/theme';

/**
 * `featured-collection` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type FeaturedCollectionSettings = Extract<
  Section,
  { type: 'featured-collection' }
>['settings'];

export function FeaturedCollection({ settings }: { settings: FeaturedCollectionSettings }) {
  // TODO(WS-F): implement. Keep it pure — no data fetching inside a section.
  return (
    <section data-section="featured-collection" className="w-full">
      <pre className="hidden">{JSON.stringify(settings)}</pre>
    </section>
  );
}
