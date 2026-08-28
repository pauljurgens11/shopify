import type { Section } from '@merchant/contracts/theme';

/**
 * `collection-page` section.
 * Core section: required on its page (SPEC §12).
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type CollectionPageSettings = Extract<Section, { type: 'collection-page' }>['settings'];

export function CollectionPage({ settings }: { settings: CollectionPageSettings }) {
  // TODO(WS-F): implement. Keep it pure — no data fetching inside a section.
  return (
    <section data-section="collection-page" className="w-full">
      <pre className="hidden">{JSON.stringify(settings)}</pre>
    </section>
  );
}
