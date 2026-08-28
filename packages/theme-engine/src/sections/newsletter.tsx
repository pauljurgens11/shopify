import type { SectionProps } from '../context.ts';
import { SectionShell } from '../shared/section-shell.tsx';
import { InertForm } from './client/inert-form.tsx';

/**
 * `newsletter` section.
 *
 * There is no email backend and there will not be one — SPEC §2 puts marketing
 * email out of scope. The form acknowledges the visitor rather than posting
 * nowhere; WS-E can slot a real one via `slots.newsletterForm`.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type NewsletterSettings = SectionProps<'newsletter'>['settings'];

export function Newsletter({ settings, data }: SectionProps<'newsletter'>) {
  const { heading, body, buttonLabel } = settings;

  return (
    <SectionShell type="newsletter" width="narrow" padding="lg" innerClassName="text-center">
      <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
      {body ? <p className="mx-auto mt-3 max-w-md text-sm text-text/70">{body}</p> : null}
      <div className="mt-6 flex justify-center">
        {data.slots?.newsletterForm?.(buttonLabel) ?? (
          <InertForm
            buttonLabel={buttonLabel}
            successMessage="Thanks — you're on the list."
            className="flex w-full max-w-md items-center gap-2"
          >
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-theme border border-text/20 bg-transparent px-3 py-2.5 text-sm text-text placeholder:text-text/40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            />
          </InertForm>
        )}
      </div>
    </SectionShell>
  );
}
