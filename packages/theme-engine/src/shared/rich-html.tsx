import { sanitizeRichText } from './sanitize.ts';
import { cx } from './section-shell.tsx';

/**
 * The ONLY way HTML reaches the storefront DOM. Model-authored bodies and
 * merchant descriptions both go through `sanitizeRichText` here, so no section
 * has to remember to sanitize (SPEC §12).
 * Owner: WS-F.
 */
export function RichHtml({ html, className }: { html: string | null; className?: string }) {
  if (!html) return null;
  const clean = sanitizeRichText(html);
  if (!clean.trim()) return null;
  return (
    <div
      className={cx(
        'max-w-none text-text/80 leading-relaxed',
        '[&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary',
        '[&_h2]:font-heading [&_h2]:text-xl [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-2',
        '[&_h3]:font-heading [&_h3]:text-lg [&_h3]:text-text [&_h3]:mt-5 [&_h3]:mb-2',
        '[&_p]:my-3 [&_strong]:text-text [&_strong]:font-semibold',
        '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-1',
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: `clean` is the output of sanitizeRichText above; this component exists so the storefront has exactly one audited injection point
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
