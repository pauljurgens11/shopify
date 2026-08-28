/**
 * Theme token → CSS custom property mapping. Owner: WS-F.
 *
 * The renderer sets these on a wrapper element; every section reads them through
 * Tailwind's @theme mapping in the storefront's globals.css. One Tailwind build,
 * every shop's branding.
 */
import type { ThemeTokens } from '@merchant/contracts/theme';

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

export function themeCssVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    '--theme-color-primary': tokens.colorPrimary,
    '--theme-color-background': tokens.colorBackground,
    '--theme-color-text': tokens.colorText,
    '--theme-color-accent': tokens.colorAccent,
    '--theme-font-heading': FONT_STACKS[tokens.fontHeading] ?? FONT_STACKS.inter ?? 'sans-serif',
    '--theme-font-body': FONT_STACKS[tokens.fontBody] ?? FONT_STACKS.inter ?? 'sans-serif',
    '--theme-radius': RADIUS[tokens.radius],
    // Raw enum value ('solid' | 'outline' | 'soft'); button components branch on
    // it via data-attribute or class. Without this var the token is dead weight.
    '--theme-button-style': tokens.buttonStyle,
  };
}
