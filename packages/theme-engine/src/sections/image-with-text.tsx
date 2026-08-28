import type { SectionProps } from '../context.ts';
import { RichHtml } from '../shared/rich-html.tsx';
import { cx, SectionShell } from '../shared/section-shell.tsx';
import { ThemeButton } from '../shared/theme-button.tsx';
import { ThemeImage } from '../shared/theme-image.tsx';

/**
 * `image-with-text` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ImageWithTextSettings = SectionProps<'image-with-text'>['settings'];

export function ImageWithText({ settings }: SectionProps<'image-with-text'>) {
  const { heading, body, image, imageSide, button } = settings;

  return (
    <SectionShell type="image-with-text" width="wide" padding="lg">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <ThemeImage
          src={image}
          alt=""
          className={cx(
            'aspect-[4/3] w-full rounded-theme',
            imageSide === 'right' ? 'lg:order-2' : null,
          )}
        />
        <div className="flex flex-col items-start gap-4">
          <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
          <RichHtml html={body} />
          {button ? (
            <ThemeButton href={button.url} className="mt-2">
              {button.label}
            </ThemeButton>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}
