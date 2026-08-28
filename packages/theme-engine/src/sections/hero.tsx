import type { SectionProps } from '../context.ts';
import { cx } from '../shared/section-shell.tsx';
import { ThemeButton } from '../shared/theme-button.tsx';
import { ThemeImage } from '../shared/theme-image.tsx';

/**
 * `hero` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type HeroSettings = SectionProps<'hero'>['settings'];

const HEIGHTS = {
  small: 'min-h-[20rem]',
  medium: 'min-h-[28rem]',
  large: 'min-h-[36rem]',
  full: 'min-h-[calc(100svh-4rem)]',
} as const;

const ALIGN_TEXT = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
const ALIGN_ITEMS = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
} as const;

export function Hero({ settings }: SectionProps<'hero'>) {
  const {
    heading,
    subheading,
    image,
    imagePosition,
    alignment,
    height,
    primaryButton,
    secondaryButton,
    overlayOpacity,
  } = settings;

  // Text sits on the overlay only when there is an image to overlay.
  const onImage = imagePosition === 'background' && image !== null;

  const copy = (
    <div
      className={cx('flex max-w-2xl flex-col gap-5', ALIGN_ITEMS[alignment], ALIGN_TEXT[alignment])}
    >
      <h2
        className={cx(
          'font-heading text-3xl leading-tight sm:text-5xl',
          onImage ? 'text-background' : 'text-text',
        )}
      >
        {heading}
      </h2>
      {subheading ? (
        <p className={cx('text-base sm:text-lg', onImage ? 'text-background/85' : 'text-text/70')}>
          {subheading}
        </p>
      ) : null}
      {primaryButton || secondaryButton ? (
        <div className="mt-2 flex flex-wrap gap-3">
          {primaryButton ? (
            <ThemeButton href={primaryButton.url} size="lg">
              {primaryButton.label}
            </ThemeButton>
          ) : null}
          {secondaryButton ? (
            <ThemeButton
              href={secondaryButton.url}
              size="lg"
              variant={onImage ? 'on-image' : 'secondary'}
            >
              {secondaryButton.label}
            </ThemeButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (imagePosition === 'background') {
    return (
      <section
        data-section="hero"
        className={cx('relative w-full overflow-hidden', HEIGHTS[height])}
      >
        <ThemeImage src={image} alt="" className="absolute inset-0 h-full w-full" eager />
        {image ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-text"
            // Model-authored 0–100; the only inline style in the engine, because
            // the value is data rather than one of a fixed set of classes.
            style={{ opacity: overlayOpacity / 100 }}
          />
        ) : null}
        <div
          className={cx(
            'relative mx-auto flex w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-24',
            HEIGHTS[height],
            ALIGN_ITEMS[alignment],
          )}
        >
          {copy}
        </div>
      </section>
    );
  }

  return (
    <section data-section="hero" className="w-full">
      <div
        className={cx(
          'mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2',
          HEIGHTS[height],
        )}
      >
        <ThemeImage
          src={image}
          alt=""
          className={cx(
            'aspect-[4/3] w-full rounded-theme lg:aspect-[5/6]',
            imagePosition === 'right' ? 'lg:order-2' : null,
          )}
          eager
        />
        <div className={cx('flex flex-col', ALIGN_ITEMS[alignment])}>{copy}</div>
      </div>
    </section>
  );
}
