import type { Section } from '@merchant/contracts/theme';

/**
 * `image-with-text` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ImageWithTextSettings = Extract<Section, { type: 'image-with-text' }>['settings'];

export function ImageWithText({ settings }: { settings: ImageWithTextSettings }) {
  // TODO(WS-F): implement. Keep it pure — no data fetching inside a section.
  return (
    <section data-section="image-with-text" className="w-full">
      <pre className="hidden">{JSON.stringify(settings)}</pre>
    </section>
  );
}
