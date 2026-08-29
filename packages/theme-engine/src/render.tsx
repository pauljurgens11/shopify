/**
 * Theme render pipeline. Owner: WS-F.
 *
 * Two jobs:
 *  1. Tokens → CSS custom properties. The storefront sets these once on a
 *     wrapper element; every section reads them through Tailwind's `@theme`
 *     mapping in `apps/storefront/src/app/globals.css`. One Tailwind build,
 *     every shop's branding — which is why a hardcoded colour anywhere in
 *     `sections/` or `shared/` silently breaks theme switching.
 *  2. ThemeDoc + page + data → an ordered list of rendered sections.
 */
import type { ThemeDoc, ThemeTokens } from '@merchant/contracts/theme';
import type { ReactNode } from 'react';
import type { SectionDataContext, ThemePage } from './context.ts';
import { renderSection } from './sections/index.tsx';

export type {
  CollectionData,
  SectionDataContext,
  SectionProps,
  SectionSlots,
  ThemeCollection,
  ThemePage,
} from './context.ts';

const RADIUS: Record<ThemeTokens['radius'], string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
  full: '9999px',
};

const FONT_STACKS: Record<string, string> = {
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  playfair: "'Playfair Display', ui-serif, Georgia, serif",
  'dm-sans': "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  'space-grotesk': "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  lora: "'Lora', ui-serif, Georgia, serif",
  archivo: "'Archivo', ui-sans-serif, system-ui, sans-serif",
  fraunces: "'Fraunces', ui-serif, Georgia, serif",
  'source-sans': "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
  'work-sans': "'Work Sans', ui-sans-serif, system-ui, sans-serif",
};

/** Google Fonts family names, keyed by the token enum value. */
const FONT_FAMILIES: Record<string, string> = {
  inter: 'Inter',
  playfair: 'Playfair Display',
  'dm-sans': 'DM Sans',
  'space-grotesk': 'Space Grotesk',
  lora: 'Lora',
  archivo: 'Archivo',
  fraunces: 'Fraunces',
  'source-sans': 'Source Sans 3',
  'work-sans': 'Work Sans',
};

const PRIMARY = 'var(--theme-color-primary)';
const BACKGROUND = 'var(--theme-color-background)';
const TEXT = 'var(--theme-color-text)';

/**
 * Button appearance, resolved here rather than in the component. `ThemeButton`
 * is a Server Component with no access to tokens, and CSS cannot branch on the
 * *value* of a custom property — so the branch happens once, at token time.
 */
const BUTTON_STYLES: Record<ThemeTokens['buttonStyle'], Record<string, string>> = {
  solid: {
    '--theme-button-bg': PRIMARY,
    '--theme-button-fg': BACKGROUND,
    '--theme-button-border': PRIMARY,
    '--theme-button-bg-hover': `color-mix(in srgb, ${PRIMARY} 85%, ${TEXT})`,
    '--theme-button-fg-hover': BACKGROUND,
  },
  outline: {
    '--theme-button-bg': 'transparent',
    '--theme-button-fg': PRIMARY,
    '--theme-button-border': PRIMARY,
    '--theme-button-bg-hover': PRIMARY,
    '--theme-button-fg-hover': BACKGROUND,
  },
  soft: {
    '--theme-button-bg': `color-mix(in srgb, ${PRIMARY} 14%, transparent)`,
    '--theme-button-fg': PRIMARY,
    '--theme-button-border': 'transparent',
    '--theme-button-bg-hover': `color-mix(in srgb, ${PRIMARY} 26%, transparent)`,
    '--theme-button-fg-hover': PRIMARY,
  },
};

/**
 * Anchored hex check at the point of emission. Callers already validate colours
 * through the contracts `hexColor` schema, but that defense lives in another
 * workstream's file — and these strings land verbatim in a `style` attribute,
 * where `;}` would inject live CSS. A bad value gets a neutral fallback rather
 * than a throw: a wrong colour beats a crashed storefront.
 */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

export function themeCssVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    '--theme-color-primary': safeColor(tokens.colorPrimary, '#000000'),
    '--theme-color-background': safeColor(tokens.colorBackground, '#ffffff'),
    '--theme-color-text': safeColor(tokens.colorText, '#000000'),
    '--theme-color-accent': safeColor(tokens.colorAccent, '#000000'),
    '--theme-font-heading': FONT_STACKS[tokens.fontHeading] ?? FONT_STACKS.inter ?? 'sans-serif',
    '--theme-font-body': FONT_STACKS[tokens.fontBody] ?? FONT_STACKS.inter ?? 'sans-serif',
    '--theme-radius': RADIUS[tokens.radius],
    // Raw enum value ('solid' | 'outline' | 'soft'), kept as a styling hook for
    // anything that needs to branch structurally rather than by colour.
    '--theme-button-style': tokens.buttonStyle,
    ...BUTTON_STYLES[tokens.buttonStyle],
  };
}

/**
 * Stylesheet URL for the two typefaces the theme names — the only external
 * asset a storefront loads. The storefront puts this in a `<link>` in `<head>`.
 */
export function googleFontsHref(tokens: ThemeTokens): string {
  const families = [...new Set([tokens.fontHeading, tokens.fontBody])]
    .map((token) => FONT_FAMILIES[token])
    .filter((name): name is string => Boolean(name))
    .map((name) => `family=${name.replace(/ /g, '+')}:wght@400;500;600;700`);
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

/** Render one page's sections, in document order. */
export function renderPage(doc: ThemeDoc, page: ThemePage, data: SectionDataContext): ReactNode {
  return doc.pages[page].map((section) => renderSection(section, data));
}

/** The footer lives at doc level and renders on every page (SPEC §12). */
export function renderFooter(doc: ThemeDoc, data: SectionDataContext): ReactNode {
  return renderSection({ id: 'footer', type: 'footer', settings: doc.footer }, data);
}
