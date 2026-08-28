import type { SectionProps } from '../context.ts';
import { cx } from '../shared/section-shell.tsx';
import { ThemeButton } from '../shared/theme-button.tsx';
import { ThemeImage } from '../shared/theme-image.tsx';
import { SlideshowControls } from './client/slideshow-controls.tsx';

/**
 * `slideshow` section.
 *
 * The track is a CSS scroll-snap strip, so it is a working swipeable carousel
 * with JavaScript off; `SlideshowControls` only adds dots and autoplay.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type SlideshowSettings = SectionProps<'slideshow'>['settings'];

export function Slideshow({ settings }: SectionProps<'slideshow'>) {
  const { autoplay, intervalSeconds, slides } = settings;

  return (
    <section data-section="slideshow" className="w-full">
      {/* The slides stay Server Components; the wrapper only holds the ref. */}
      <SlideshowControls
        count={slides.length}
        autoplay={autoplay}
        intervalSeconds={intervalSeconds}
      >
        {slides.map((slide, index) => (
          // biome-ignore lint/a11y/useSemanticElements: the ARIA carousel pattern specifies role=group for a slide; <fieldset> groups form controls and is wrong here
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional settings data and never reorder
            key={index}
            className="relative w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
          >
            <ThemeImage
              src={slide.image}
              alt=""
              className="h-[22rem] w-full sm:h-[32rem]"
              eager={index === 0}
            />
            {slide.image ? (
              <div aria-hidden="true" className="absolute inset-0 bg-text/35" />
            ) : null}
            {slide.heading || slide.body || slide.button ? (
              <div className="absolute inset-0 mx-auto flex w-full max-w-7xl flex-col items-start justify-center gap-4 px-4 sm:px-6">
                {slide.heading ? (
                  <h2
                    className={cx(
                      'max-w-2xl font-heading text-2xl leading-tight sm:text-4xl',
                      slide.image ? 'text-background' : 'text-text',
                    )}
                  >
                    {slide.heading}
                  </h2>
                ) : null}
                {slide.body ? (
                  <p
                    className={cx(
                      'max-w-xl text-sm sm:text-base',
                      slide.image ? 'text-background/85' : 'text-text/70',
                    )}
                  >
                    {slide.body}
                  </p>
                ) : null}
                {slide.button ? (
                  <ThemeButton
                    href={slide.button.url}
                    variant={slide.image ? 'on-image' : 'primary'}
                    className="mt-2"
                  >
                    {slide.button.label}
                  </ThemeButton>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </SlideshowControls>
    </section>
  );
}
