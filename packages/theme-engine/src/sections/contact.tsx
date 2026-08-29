import type { SectionProps } from '../context.ts';
import { SectionShell } from '../shared/section-shell.tsx';
import { InertForm } from './client/inert-form.tsx';

/**
 * `contact` section.
 *
 * The email and phone links are real; the form is not backed by anything (there
 * is no CMS or ticketing in scope, SPEC §2), so it acknowledges the visitor
 * instead of posting nowhere.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ContactSettings = SectionProps<'contact'>['settings'];

const FIELD =
  'w-full rounded-theme border border-text/20 bg-transparent px-3 py-2.5 text-sm text-text ' +
  'placeholder:text-text/40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

export function Contact({ settings }: SectionProps<'contact'>) {
  const { heading, body, email, phone, showForm } = settings;
  // `tel:` needs the bare number; the setting is a display string. A phone with
  // no digits at all ("ask for Sam") still renders, just not as a link.
  const telDigits = phone ? phone.replace(/[^\d+]/g, '') : '';
  const telHref = telDigits ? `tel:${telDigits}` : null;

  return (
    <SectionShell type="contact" width="narrow" padding="lg">
      <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
      {body ? <p className="mt-3 text-sm text-text/70">{body}</p> : null}

      {email || phone ? (
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {email ? (
            <li>
              <a
                href={`mailto:${email}`}
                className="text-text/70 underline underline-offset-4 transition-colors hover:text-text"
              >
                {email}
              </a>
            </li>
          ) : null}
          {phone ? (
            <li>
              {telHref ? (
                <a
                  href={telHref}
                  className="text-text/70 underline underline-offset-4 transition-colors hover:text-text"
                >
                  {phone}
                </a>
              ) : (
                <span className="text-text/70">{phone}</span>
              )}
            </li>
          ) : null}
        </ul>
      ) : null}

      {showForm ? (
        <InertForm
          buttonLabel="Send"
          successMessage="Thanks — we'll be in touch shortly."
          className="mt-8 flex flex-col items-stretch gap-4"
          buttonClassName="self-start"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="sr-only" htmlFor="contact-name">
                Name
              </label>
              <input id="contact-name" name="name" placeholder="Name" className={FIELD} />
            </div>
            <div>
              <label className="sr-only" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                placeholder="Email"
                className={FIELD}
              />
            </div>
          </div>
          <div>
            <label className="sr-only" htmlFor="contact-message">
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={4}
              placeholder="How can we help?"
              className={FIELD}
            />
          </div>
        </InertForm>
      ) : null}
    </SectionShell>
  );
}
