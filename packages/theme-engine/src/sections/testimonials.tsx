import type { Section } from '@merchant/contracts/theme';

/**
 * `testimonials` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type TestimonialsSettings = Extract<Section, { type: 'testimonials' }>['settings'];

export function Testimonials({ settings }: { settings: TestimonialsSettings }) {
  // TODO(WS-F): implement. Keep it pure — no data fetching inside a section.
  return (
    <section data-section="testimonials" className="w-full">
      <pre className="hidden">{JSON.stringify(settings)}</pre>
    </section>
  );
}
