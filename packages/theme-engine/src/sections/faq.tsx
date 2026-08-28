import type { SectionProps } from '../context.ts';
import { RichHtml } from '../shared/rich-html.tsx';
import { SectionShell } from '../shared/section-shell.tsx';

/**
 * `faq` section.
 *
 * Native `<details>` disclosure, so the accordion works with JavaScript off and
 * needs no client island.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type FaqSettings = SectionProps<'faq'>['settings'];

export function Faq({ settings }: SectionProps<'faq'>) {
  const { heading, items } = settings;

  return (
    <SectionShell type="faq" width="narrow" padding="lg">
      <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
      <div className="mt-8 divide-y divide-text/10 border-text/10 border-y">
        {items.map((item, index) => (
          <details
            // biome-ignore lint/suspicious/noArrayIndexKey: questions are model-authored and not unique
            key={`${index}-${item.question}`}
            className="group py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-sm text-text marker:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-lg text-text/40 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <RichHtml html={item.answer} className="mt-2 text-sm" />
          </details>
        ))}
      </div>
    </SectionShell>
  );
}
