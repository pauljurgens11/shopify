import {
  SECTION_TYPES,
  THEME_PRESETS,
  themeDocSchema,
  validateThemeDoc,
} from '@merchant/contracts/theme';
import { describe, expect, it } from 'vitest';
import { presetThemeDoc } from './index.ts';

/**
 * The presets are the no-API-key fallback, the seed's published theme, and the
 * fixture the AI loop starts from. A preset that stops parsing takes all three
 * down at once, so this is the regression gate for SPEC §12.
 */
describe.each(THEME_PRESETS)('preset "%s"', (name) => {
  const doc = presetThemeDoc(name);

  it('parses themeDocSchema and has zero structural problems', () => {
    const parsed = themeDocSchema.parse(doc);
    expect(validateThemeDoc(parsed)).toEqual([]);
  });

  it('only uses registered section types', () => {
    const used = Object.values(doc.pages).flatMap((sections) => sections.map((s) => s.type));
    expect(used.every((type) => (SECTION_TYPES as readonly string[]).includes(type))).toBe(true);
  });

  it('references only collection handles the seed guarantees exist', () => {
    // H1 seeds a collection with handle `featured`; the issue text is the contract.
    const handles = Object.values(doc.pages)
      .flat()
      .flatMap((s) => {
        if (s.type === 'featured-collection') return [s.settings.collectionHandle];
        if (s.type === 'collection-list') return s.settings.collectionHandles;
        return [];
      });
    expect(handles.length).toBeGreaterThan(0);
    expect([...new Set(handles)]).toEqual(['featured']);
  });

  it('gives every section a unique id per page', () => {
    for (const sections of Object.values(doc.pages)) {
      const ids = sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('returns an independent copy per call, so callers can mutate safely', () => {
    const a = presetThemeDoc(name);
    const b = presetThemeDoc(name);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.tokens.colorPrimary = '#123456';
    a.pages.home.pop();
    expect(presetThemeDoc(name).tokens.colorPrimary).not.toBe('#123456');
    expect(presetThemeDoc(name).pages.home).toHaveLength(b.pages.home.length);
  });
});

it('the three presets are visually distinct', () => {
  const palettes = THEME_PRESETS.map((n) => JSON.stringify(presetThemeDoc(n).tokens));
  expect(new Set(palettes).size).toBe(THEME_PRESETS.length);
});
