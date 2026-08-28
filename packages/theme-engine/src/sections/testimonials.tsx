import type { SectionProps } from '../context.ts';
import { SectionShell } from '../shared/section-shell.tsx';

/**
 * `testimonials` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type TestimonialsSettings = SectionProps<'testimonials'>['settings'];

export function Testimonials({ settings }: SectionProps<'testimonials'>) {
  const { heading, items } = settings;

  return (
    <SectionShell type="testimonials" width="wide" padding="lg">
      <h2 className="text-center font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: quotes are model-authored and not unique
            key={`${index}-${item.author}`}
            className="flex flex-col gap-4 rounded-theme border border-text/10 p-6"
          >
            <Stars rating={item.rating} />
            <blockquote className="text-sm text-text/80 leading-relaxed">"{item.quote}"</blockquote>
            <footer className="mt-auto text-xs">
              <span className="font-medium text-text">{item.author}</span>
              {item.role ? <span className="text-text/50"> · {item.role}</span> : null}
            </footer>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/** Filled stars in the accent colour; the label is what a screen reader gets. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-accent" role="img" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          // biome-ignore lint/suspicious/noArrayIndexKey: five fixed positions
          key={index}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={index < rating ? 'size-4 fill-current' : 'size-4 fill-current opacity-20'}
        >
          <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8L10 1.6z" />
        </svg>
      ))}
    </span>
  );
}
