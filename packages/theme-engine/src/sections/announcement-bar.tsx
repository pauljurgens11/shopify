import type { SectionProps } from '../context.ts';

/**
 * `announcement-bar` section — the strip above the header.
 * Core section: part of the header story (SPEC §12).
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type AnnouncementBarSettings = SectionProps<'announcement-bar'>['settings'];

export function AnnouncementBar({ settings, data }: SectionProps<'announcement-bar'>) {
  const { text, link, dismissible } = settings;
  // The dismiss control needs state, so it is one of E2's client islands.
  const dismiss = dismissible ? data.slots?.announcementDismiss?.() : null;

  return (
    <section data-section="announcement-bar" className="w-full bg-primary text-background">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-center px-10 py-2">
        <p className="text-center text-xs tracking-wide sm:text-sm">
          {text}
          {link ? (
            <>
              {' '}
              <a href={link.url} className="font-medium underline underline-offset-4">
                {link.label}
              </a>
            </>
          ) : null}
        </p>
        {dismiss ? <div className="absolute right-3 flex items-center">{dismiss}</div> : null}
      </div>
    </section>
  );
}
