import type { SectionProps } from '../context.ts';
import { SectionShell } from '../shared/section-shell.tsx';
import { ThemeImage } from '../shared/theme-image.tsx';

/**
 * `logo-list` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type LogoListSettings = SectionProps<'logo-list'>['settings'];

export function LogoList({ settings }: SectionProps<'logo-list'>) {
  const { heading, logos } = settings;

  return (
    <SectionShell type="logo-list" width="wide" padding="md">
      {heading ? (
        <h2 className="text-center text-text/60 text-xs uppercase tracking-[0.2em]">{heading}</h2>
      ) : null}
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
        {logos.map((logo, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: alt text is model-authored and not unique
            key={`${index}-${logo.alt}`}
            className="flex h-10 items-center opacity-60 transition-opacity hover:opacity-100"
          >
            <ThemeImage
              src={logo.image}
              alt={logo.alt}
              fit="contain"
              className="h-10 w-28 rounded-theme"
              fallback={
                <span className="px-2 text-center text-[10px] text-text/50 uppercase tracking-wider">
                  {logo.alt}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
