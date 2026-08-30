/**
 * Every new shop starts on a real storefront, not an empty one (SPEC §12).
 * Owner: WS-F — called from WS-A's signup handler.
 */

import { DEFAULT_COLLECTION_HANDLE } from '@merchant/config/constants';
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

/**
 * Creates the `featured` collection a brand-new shop's theme already points at.
 *
 * Every preset's `featured-collection` section and its "Shop" link address that
 * handle (`packages/theme-engine/src/presets`), and until now only the seeded
 * demo shop had one — so a shop created through signup opened on a home page
 * saying "No products here yet" and a nav item that 404ed.
 *
 * It is smart rather than manual on purpose: a manual collection starts empty
 * and stays empty, so the merchant's first product would still not appear.
 * `price greater than -1` is the rule engine's way of saying "the whole
 * catalogue" — prices are non-negative minor units (SPEC §5) and every product
 * has at least one variant — so the collection fills itself in as products are
 * added, and the merchant can recurate or replace it whenever they like.
 *
 * Never throws, for the same reason `installInitialTheme` does not: a signup
 * must not fail because a nicety did.
 */
export async function installDefaultCollection(shopId: string): Promise<boolean> {
  try {
    await dbForShop(shopId).collection.create({
      data: {
        id: newId('collection'),
        shopId,
        title: 'Featured',
        handle: DEFAULT_COLLECTION_HANDLE,
        descriptionHtml: '<p>The products you want shoppers to see first.</p>',
        type: 'smart',
        sortOrder: 'created-desc',
        ruleSet: {
          appliedDisjunctively: false,
          rules: [{ column: 'price', relation: 'greater_than', condition: '-1' }],
        },
      },
    });
    return true;
  } catch (error) {
    console.warn(
      `themes: could not install the default collection for ${shopId} — ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}
