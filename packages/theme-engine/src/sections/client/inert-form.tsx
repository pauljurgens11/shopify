'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import { ThemeButton } from '../../shared/theme-button.tsx';

/**
 * Newsletter and contact forms have no backend by design: SPEC §2 rules out
 * marketing email, and there is no CMS to receive a contact message. This is
 * the honest middle ground — the form submits to nothing but tells the visitor
 * so, instead of reloading the page or silently doing nothing.
 *
 * One of only two client leaves in the theme engine (the other is the slideshow
 * controller). Sections themselves stay Server Components.
 *
 * Owner: WS-F.
 */
export function InertForm({
  buttonLabel,
  successMessage,
  className,
  buttonClassName,
  children,
}: {
  buttonLabel: string;
  successMessage: string;
  className?: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p role="status" className="text-sm text-text/70">
        {successMessage}
      </p>
    );
  }

  return (
    // Browser validation is left on: the newsletter field is `required`, so an
    // empty submit must not produce a cheerful "thanks" for nothing.
    <form onSubmit={onSubmit} className={className}>
      {children}
      <ThemeButton type="submit" className={buttonClassName}>
        {buttonLabel}
      </ThemeButton>
    </form>
  );
}
