import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from './sanitize.ts';

/**
 * The theme doc is authored by a model. `rich-text`/`image-with-text` bodies and
 * product descriptions are the only places HTML reaches the DOM, so this is the
 * whole XSS surface of the storefront (SPEC §12: "safe by construction").
 */
describe('sanitizeRichText', () => {
  it('removes script tags and their contents', () => {
    expect(sanitizeRichText('<p>Hi</p><script>alert(1)</script>')).toBe('<p>Hi</p>');
  });

  it('strips event-handler attributes but keeps the surrounding text', () => {
    const out = sanitizeRichText('<p onerror="alert(1)" onclick="x()">Hi</p>');
    expect(out).toBe('<p>Hi</p>');
  });

  it('keeps the allowlisted formatting tags', () => {
    const html =
      '<h2>Care</h2><p><strong>Cold</strong> wash, <em>line</em> dry.<br /></p>' +
      '<ul><li>One</li></ul><ol><li>Two</li></ol><h3>Fit</h3>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('unwraps disallowed tags instead of dropping their text', () => {
    expect(sanitizeRichText('<div><span>Kept</span></div>')).toBe('Kept');
  });

  it('drops images, iframes and their payloads entirely', () => {
    expect(sanitizeRichText('<img src=x onerror=alert(1)><iframe src="//evil"></iframe>')).toBe('');
  });

  it('keeps safe links and drops javascript: URLs', () => {
    expect(sanitizeRichText('<a href="/collections/new">New</a>')).toBe(
      '<a href="/collections/new">New</a>',
    );
    expect(sanitizeRichText('<a href="https://example.com">Ex</a>')).toContain(
      'href="https://example.com"',
    );
    expect(sanitizeRichText('<a href="javascript:alert(1)">X</a>')).toBe('<a>X</a>');
  });

  it('adds rel=noopener to links that open a new tab', () => {
    const out = sanitizeRichText('<a href="https://example.com" target="_blank">Ex</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('adds rel=noopener to any targeted link, not just _blank', () => {
    // `_top` and named targets survive the allowlist too, opener intact.
    for (const target of ['_top', 'shopwin']) {
      const out = sanitizeRichText(`<a href="https://example.com" target="${target}">Ex</a>`);
      expect(out).toContain('rel="noopener noreferrer"');
    }
  });

  it('escapes bare text so a stray angle bracket cannot open a tag', () => {
    expect(sanitizeRichText('5 < 6 & 7 > 6')).toBe('5 &lt; 6 &amp; 7 &gt; 6');
  });
});
