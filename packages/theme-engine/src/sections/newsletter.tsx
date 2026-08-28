import type { Section } from '@merchant/contracts/theme';

/**
 * `newsletter` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type NewsletterSettings = Extract<Section, { type: 'newsletter' }>['settings'];

export function Newsletter({ settings }: { settings: NewsletterSettings }) {
  // TODO(WS-F): implement. Keep it pure — no data fetching inside a section.
  return (
    <section data-section="newsletter" className="w-full">
      <pre className="hidden">{JSON.stringify(settings)}</pre>
    </section>
  );
}
