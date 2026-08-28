import type { SectionProps } from '../context.ts';
import { RichHtml } from '../shared/rich-html.tsx';
import { cx, SectionShell } from '../shared/section-shell.tsx';

/**
 * `rich-text` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type RichTextSettings = SectionProps<'rich-text'>['settings'];

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

/**
 * `list-outside` hangs the marker in the left padding, which looks broken once
 * the text is centred or right-aligned — the bullets end up stranded. Inside
 * markers travel with the text.
 */
const LIST_MARKERS = '[&_ul]:list-inside [&_ul]:pl-0 [&_ol]:list-inside [&_ol]:pl-0';

export function RichText({ settings }: SectionProps<'rich-text'>) {
  const { heading, body, alignment, width } = settings;

  return (
    <SectionShell
      type="rich-text"
      width={width === 'wide' ? 'default' : 'narrow'}
      padding="lg"
      innerClassName={cx(ALIGN[alignment])}
    >
      {heading ? (
        <h2 className="mb-4 font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
      ) : null}
      {/* Model-authored HTML — RichHtml is the engine's one sanitized entry point. */}
      <RichHtml html={body} className={alignment === 'left' ? undefined : LIST_MARKERS} />
    </SectionShell>
  );
}
