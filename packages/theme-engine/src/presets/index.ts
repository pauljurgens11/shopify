/**
 * The three canned ThemeDocs (SPEC §12). They are the storefront's fallback
 * when `ANTHROPIC_API_KEY` is unset, the theme H1 seeds as published, and the
 * starting point the AI builder edits — so a preset that stops validating takes
 * all three down at once. `presets.test.ts` is that gate.
 *
 * Owner: WS-F.
 */
import { type ThemeDoc, type ThemePreset, themeDocSchema } from '@merchant/contracts/theme';
import { aurora } from './aurora.ts';
import { bloom } from './bloom.ts';
import { monochrome } from './monochrome.ts';
import type { ThemeDocInput } from './types.ts';

const PRESETS: Record<ThemePreset, ThemeDocInput> = { aurora, monochrome, bloom };

/** The preset a new shop starts on, and the one the seed publishes. */
export const DEFAULT_PRESET: ThemePreset = 'aurora';

/**
 * A validated, freshly-parsed ThemeDoc. Parsing per call fills in every schema
 * default AND hands back an independent object — callers (the seed, the AI
 * builder, the preview) mutate what they get.
 */
export function presetThemeDoc(name: ThemePreset): ThemeDoc {
  return themeDocSchema.parse(PRESETS[name]);
}

export type { ThemeDocInput } from './types.ts';
