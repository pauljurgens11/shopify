import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SECTION_TYPES,
  type Section,
  type SectionType,
  THEME_PRESETS,
  type ThemeTokens,
} from '@merchant/contracts/theme';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { presetThemeDoc } from './presets/index.ts';
import { googleFontsHref, renderFooter, renderPage, themeCssVariables } from './render.tsx';
import { SECTION_COMPONENTS } from './sections/index.tsx';
import { defaultSettingsFor, demoContext, demoProduct } from './test/fixtures.ts';

/** `renderPage` returns a LIST of sections; wrap it so it is a single element. */
const markup = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node));

const TOKENS: ThemeTokens = {
  colorPrimary: '#7c4a2d',
  colorBackground: '#fbf7f0',
  colorText: '#2b2118',
  colorAccent: '#c98b4b',
  fontHeading: 'fraunces',
  fontBody: 'work-sans',
  radius: 'md',
  buttonStyle: 'solid',
};

describe('themeCssVariables', () => {
  it('maps every token to a --theme-* custom property', () => {
    const vars = themeCssVariables(TOKENS);
    expect(vars['--theme-color-primary']).toBe('#7c4a2d');
    expect(vars['--theme-color-text']).toBe('#2b2118');
    expect(vars['--theme-radius']).toBe('0.5rem');
    expect(vars['--theme-font-heading']).toContain('Fraunces');
  });

  it('derives button colors from the palette so ThemeButton needs no token access', () => {
    const solid = themeCssVariables({ ...TOKENS, buttonStyle: 'solid' });
    const outline = themeCssVariables({ ...TOKENS, buttonStyle: 'outline' });
    const soft = themeCssVariables({ ...TOKENS, buttonStyle: 'soft' });

    // A button style that does not change the button is a dead token.
    const bg = (v: Record<string, string>) => v['--theme-button-bg'];
    expect(new Set([bg(solid), bg(outline), bg(soft)]).size).toBe(3);

    // Every derived value must trace back to a token, never to a literal color.
    for (const vars of [solid, outline, soft]) {
      for (const key of ['--theme-button-bg', '--theme-button-fg', '--theme-button-border']) {
        expect(vars[key]).toBeDefined();
      }
      expect(vars['--theme-button-fg']).toMatch(/var\(--theme-color-|#/);
    }
    expect(solid['--theme-button-bg']).toContain('--theme-color-primary');
  });
});

describe('googleFontsHref', () => {
  it('requests exactly the two families the theme names', () => {
    const href = googleFontsHref(TOKENS);
    expect(href.startsWith('https://fonts.googleapis.com/css2?')).toBe(true);
    expect(href).toContain('family=Fraunces');
    expect(href).toContain('family=Work+Sans');
    expect(href).toContain('display=swap');
  });

  it('requests one family when heading and body share a typeface', () => {
    const href = googleFontsHref({ ...TOKENS, fontHeading: 'inter', fontBody: 'inter' });
    expect(href.match(/family=/g)).toHaveLength(1);
  });
});

describe('renderPage', () => {
  it.each(THEME_PRESETS)('renders every page of the "%s" preset', (name) => {
    const doc = presetThemeDoc(name);
    for (const page of ['home', 'product', 'collection'] as const) {
      const html = markup(renderPage(doc, page, demoContext()));
      expect(html.length).toBeGreaterThan(0);
      // Every section in the doc must actually reach the DOM.
      for (const section of doc.pages[page]) {
        expect(html).toContain(`data-section="${section.type}"`);
      }
    }
    expect(markup(renderFooter(doc, demoContext()))).toContain('data-section="footer"');
  });

  it('renders each registered section type with only its schema defaults', () => {
    for (const type of SECTION_TYPES) {
      const section = { id: `s-${type}`, type, settings: defaultSettingsFor(type) } as Section;
      const doc = presetThemeDoc('aurora');
      doc.pages.home = [section];
      expect(() => markup(renderPage(doc, 'home', demoContext()))).not.toThrow();
    }
  });

  it('does not throw when the storefront has no data to inject yet', () => {
    const doc = presetThemeDoc('aurora');
    const bare = { shop: { name: 'Aurora Supply Co.', slug: 'demo', currencyCode: 'USD' } };
    for (const page of ['home', 'product', 'collection'] as const) {
      expect(() => markup(renderPage(doc, page, bare))).not.toThrow();
    }
  });

  it('renders the storefront-owned client island through the product-detail slot', () => {
    const doc = presetThemeDoc('aurora');
    const html = markup(
      renderPage(
        doc,
        'product',
        demoContext({ slots: { productForm: () => <div id="buy-box" /> } }),
      ),
    );
    expect(html).toContain('id="buy-box"');
  });

  it('sanitizes product description HTML before it reaches the DOM', () => {
    const doc = presetThemeDoc('aurora');
    const ctx = demoContext({
      product: demoProduct({
        descriptionHtml: '<p><strong>Merino</strong></p><script>alert(1)</script>',
      }),
    });
    const html = markup(renderPage(doc, 'product', ctx));
    expect(html).toContain('<strong>Merino</strong>');
    expect(html).not.toContain('<script>');
  });

  it('ignores a section type it does not know instead of crashing the page', () => {
    const doc = presetThemeDoc('aurora');
    doc.pages.home = [{ id: 'x', type: 'not-a-section', settings: {} } as unknown as Section];
    expect(markup(renderPage(doc, 'home', demoContext()))).toBe('');
  });
});

describe('section registry', () => {
  it('has a component for every registered type', () => {
    for (const type of SECTION_TYPES) {
      expect(typeof SECTION_COMPONENTS[type as SectionType]).toBe('function');
    }
  });
});

/**
 * The #1 landmine of this workstream: one hardcoded colour and switching themes
 * stops visibly changing the storefront (H2 smoke flow (d)). Colour lives in
 * `themeCssVariables` and nowhere else — this guards F2's 13 files too.
 */
describe('token discipline', () => {
  const dirs = ['sections', 'shared'];
  const files = dirs.flatMap((dir) => {
    const abs = join(import.meta.dirname, dir);
    // Recursive: client islands live in `sections/client/` and are bound by the
    // same rule — they render into the same page.
    return readdirSync(abs, { recursive: true })
      .map(String)
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
      .map((f) => [join(dir, f), readFileSync(join(abs, f), 'utf8')] as const);
  });

  it.each(files.map(([name]) => name))('%s hardcodes no colour', (name) => {
    const source = files.find(([f]) => f === name)?.[1] ?? '';
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\b(?:rgba?|hsla?)\(/);
    // Tailwind's built-in palette bypasses the theme entirely.
    expect(source).not.toMatch(
      /\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/,
    );
  });
});
