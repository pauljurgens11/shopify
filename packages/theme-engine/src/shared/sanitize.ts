/**
 * The storefront's entire HTML injection surface (SPEC §12: a theme is data,
 * never code). Model-authored `rich-text`/`image-with-text` bodies and
 * merchant-authored product/collection descriptions both pass through here
 * before any `dangerouslySetInnerHTML`.
 *
 * Owner: WS-F.
 */
import sanitizeHtml from 'sanitize-html';

/** Exactly the tags a storefront body needs — anything else is unwrapped. */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h2', 'h3'];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
  // Relative paths (`/collections/new`) plus the three safe absolute schemes.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // `<img>`/`<iframe>` payloads must not survive as bare text.
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'iframe'],
  transformTags: {
    a: (tagName, attribs) => {
      const next: Record<string, string> = { ...attribs };
      // Any target (not just `_blank`) can open a window with a live opener.
      if (next.target !== undefined) next.rel = 'noopener noreferrer';
      return { tagName, attribs: next };
    },
  },
};

/** Sanitize model- or merchant-authored HTML. Always call before rendering it. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
