/**
 * The plain-text ↔ html round trip the COLLECTION form edits descriptions
 * through. Owner: WS-B.
 *
 * The product form no longer uses it — its description is a rich text editor
 * that holds html directly (B5) — so these assertions moved here from
 * `product-draft.test.ts` rather than being deleted with it.
 */
import { describe, expect, it } from 'vitest';
import { htmlToText, isSimpleHtml, textToHtml } from './description-html.ts';

describe('description html', () => {
  it('unwraps simple paragraphs for editing and puts them back', () => {
    expect(htmlToText('<p>First line.</p><p>Second line.</p>')).toBe('First line.\n\nSecond line.');
    expect(textToHtml('First line.\n\nSecond line.')).toBe('<p>First line.</p><p>Second line.</p>');
  });

  it('round-trips entities instead of double-escaping them', () => {
    expect(htmlToText('<p>Salt &amp; Pepper</p>')).toBe('Salt & Pepper');
    expect(textToHtml('Salt & Pepper')).toBe('<p>Salt &amp; Pepper</p>');
    expect(htmlToText(textToHtml('Salt & Pepper'))).toBe('Salt & Pepper');
  });

  it('knows which markup it can safely unwrap', () => {
    expect(isSimpleHtml('<p>Hi</p><p>There<br>Again</p>')).toBe(true);
    expect(isSimpleHtml('plain text')).toBe(true);
    expect(isSimpleHtml('<p>Hi <em>there</em></p>')).toBe(false);
  });

  it('keeps an empty description empty rather than emitting an empty tag', () => {
    expect(textToHtml('')).toBe('');
    expect(textToHtml('   \n  ')).toBe('');
  });
});
