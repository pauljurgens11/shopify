import type { SectionProps } from '../context.ts';
import { cx } from '../shared/section-shell.tsx';
import { ThemeButton } from '../shared/theme-button.tsx';
import { ThemeImage } from '../shared/theme-image.tsx';

/**
 * `image-banner` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ImageBannerSettings = SectionProps<'image-banner'>['settings'];

const ALIGN_TEXT = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
const ALIGN_ITEMS = { left: 'items-start', center: 'items-center', right: 'items-end' } as const;

export function ImageBanner({ settings }: SectionProps<'image-banner'>) {
  const { image, heading, body, button, alignment } = settings;
  const onImage = image !== null;

  return (
    <section data-section="image-banner" className="relative w-full overflow-hidden">
      <ThemeImage src={image} alt="" className="absolute inset-0 h-full w-full" />
      {onImage ? <div aria-hidden="true" className="absolute inset-0 bg-text/40" /> : null}
      <div
        className={cx(
          'relative mx-auto flex min-h-[22rem] w-full max-w-7xl flex-col justify-center gap-4 px-4 py-16 sm:px-6',
          ALIGN_ITEMS[alignment],
          ALIGN_TEXT[alignment],
        )}
      >
        {heading ? (
          <h2
            className={cx(
              'max-w-2xl font-heading text-2xl leading-tight sm:text-4xl',
              onImage ? 'text-background' : 'text-text',
            )}
          >
            {heading}
          </h2>
        ) : null}
        {body ? (
          <p
            className={cx(
              'max-w-xl text-sm sm:text-base',
              onImage ? 'text-background/85' : 'text-text/70',
            )}
          >
            {body}
          </p>
        ) : null}
        {button ? (
          <ThemeButton
            href={button.url}
            variant={onImage ? 'on-image' : 'primary'}
            className="mt-2"
          >
            {button.label}
          </ThemeButton>
        ) : null}
      </div>
    </section>
  );
}
