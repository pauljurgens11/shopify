/**
 * Turning stored HTML into something editable in a plain textarea, and back.
 * Owner: WS-B — used by the product form (B5) and the collection form (B6).
 *
 * A rich-text editor is out of scope, so descriptions are edited as text.
 * Showing `<p>Four pockets…</p>` in the field is a parity tell, so simple
 * markup is unwrapped and re-wrapped; anything richer is left as raw HTML
 * rather than silently flattened, because losing a merchant's list or bold
 * text on an unrelated edit is worse than showing them the tags.
 */
/** Paragraphs and line breaks and nothing else — the markup we can round-trip. */
export function isSimpleHtml(html: string): boolean {
  return (html.match(/<[^>]*>/g) ?? []).every((tag) => /^<\/?(p|br)\s*\/?>$/i.test(tag));
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim();
}

export function textToHtml(text: string): string {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
