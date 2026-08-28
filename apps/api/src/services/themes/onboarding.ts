/**
 * Every new shop starts on a real storefront, not an empty one (SPEC §12).
 * Owner: WS-F — called from WS-A's signup handler.
 */

import { newId } from '@merchant/config/ids';
import { dbForShop } from '@merchant/db/tenant';
import { DEFAULT_PRESET, presetThemeDoc } from '@merchant/theme-engine/presets';

/**
 * Publishes the default preset for a brand-new shop.
 *
 * Deliberately never throws: a signup must not fail because the theme table
 * did. A shop with no published version still renders — the storefront and the
 * AI job both fall back to the same preset — it just cannot be edited until the
 * merchant applies one from the builder.
 */
export async function installInitialTheme(shopId: string): Promise<boolean> {
  try {
    const themeJson = presetThemeDoc(DEFAULT_PRESET);
    await dbForShop(shopId).themeVersion.create({
      data: {
        id: newId('theme'),
        shopId,
        themeJson,
        tokens: themeJson.tokens,
        status: 'published',
        publishedAt: new Date(),
        createdByMessage: `Applied the ${DEFAULT_PRESET} preset`,
      },
    });
    return true;
  } catch (error) {
    console.warn(
      `themes: could not install the initial theme for ${shopId} — ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}
