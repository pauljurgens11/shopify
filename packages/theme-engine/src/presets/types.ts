import type { themeDocSchema } from '@merchant/contracts/theme';
import type { z } from 'zod';

/**
 * Presets are authored as schema *input*: every field with a `.default()` may be
 * omitted, and `presetThemeDoc` parses on the way out. That makes an invalid
 * preset a parse error the test suite catches, rather than a broken storefront.
 */
export type ThemeDocInput = z.input<typeof themeDocSchema>;
