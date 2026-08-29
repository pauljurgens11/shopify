/**
 * The product form's state, and the two conversions around it. Owner: WS-B (B5).
 *
 * Pure and React-free so the parts that are easy to get wrong can be tested
 * without rendering anything (SPEC §14 forbids component tests, not this):
 *
 *   - MONEY. A price is a STRING for as long as it is in an input — "19.99",
 *     mid-edit "19.", empty. It becomes integer minor units exactly once, at
 *     the API boundary, via `fromDecimal`. A float never exists (CLAUDE.md §5).
 *   - THE VARIANT MATRIX. The form previews the rows the API is going to
 *     generate. Both sides expand options first-varies-slowest, so a drift here
 *     shows up as the table reordering itself after a save — `matrixOf` mirrors
 *     `apps/api/src/services/catalog/variants.ts` and the test pins the order.
 */
import { fromDecimal, toDecimal } from '@merchant/config/money';
import type { Product } from '@merchant/contracts/products';

export const DEFAULT_VARIANT_TITLE = 'Default Title';

/** Shopify's ceilings, mirrored so the builder stops before the API refuses. */
export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;

export type OptionDraft = { name: string; values: string[] };

/** What the Shipping card's unit select offers; grams is what we store. */
export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

export const GRAMS_PER_UNIT: Record<WeightUnit, number> = {
  kg: 1000,
  g: 1,
  lb: 453.59237,
  oz: 28.349523125,
};

export type VariantDraft = {
  /** Absent for a row the matrix just invented; present for a row that exists. */
  id?: string;
  /** Stable across re-renders — React keys must not be array indices here. */
  key: string;
  title: string;
  optionValues: Record<string, string>;
  /** Always a string. See the money note above. */
  price: string;
  /** Empty = no compare-at price, which is the normal case. */
  compareAtPrice: string;
  sku: string;
  barcode: string;
  taxable: boolean;
  requiresShipping: boolean;
  /**
   * The number as TYPED, in `weightUnit`. Only grams reach the wire; the unit
   * is a display choice the schema has nowhere to keep, so a reloaded product
   * always comes back in kg.
   */
  weight: string;
  weightUnit: WeightUnit;
  inventoryPolicy: 'deny' | 'continue';
  /** Integer string. Saved through the inventory service, not the product API. */
  available: string;
};

/** `1500` grams → `"1.5"` kg, with no trailing zeros to retype around. */
export function weightToDisplay(grams: number | null, unit: WeightUnit): string {
  if (grams === null) return '';
  const value = grams / GRAMS_PER_UNIT[unit];
  return String(Number.parseFloat(value.toFixed(4)));
}

/** Weight is not money: grams are whole units and a float here loses nothing. */
export function weightToGrams(value: string, unit: WeightUnit): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * GRAMS_PER_UNIT[unit]);
}

export type ImageDraft = { id?: string; url: string; altText: string };

export type ProductDraft = {
  title: string;
  /**
   * RAW HTML. The description is edited in a rich text field, so what the
   * control holds is the markup itself — there is nothing to unwrap on the way
   * in or re-wrap on the way out, and a merchant's list or bold text survives
   * an unrelated edit byte for byte.
   */
  descriptionHtml: string;
  status: 'active' | 'draft' | 'archived';
  /** The storefront URL slug. Empty on a new product — the API derives it. */
  handle: string;
  seoTitle: string;
  seoDescription: string;
  vendor: string;
  productType: string;
  tags: string[];
  /** Manual collections only; smart membership is a rule, not a checkbox. */
  collectionIds: string[];
  options: OptionDraft[];
  variants: VariantDraft[];
  images: ImageDraft[];
};

/** The single row a product has before any option exists. */
export function emptyVariant(): VariantDraft {
  return {
    key: 'default',
    title: DEFAULT_VARIANT_TITLE,
    optionValues: {},
    price: '',
    compareAtPrice: '',
    sku: '',
    barcode: '',
    taxable: true,
    requiresShipping: true,
    weight: '',
    weightUnit: 'kg',
    inventoryPolicy: 'deny',
    available: '0',
  };
}

export function emptyDraft(): ProductDraft {
  return {
    title: '',
    descriptionHtml: '',
    status: 'active',
    handle: '',
    seoTitle: '',
    seoDescription: '',
    vendor: '',
    productType: '',
    tags: [],
    collectionIds: [],
    options: [],
    variants: [emptyVariant()],
    images: [],
  };
}

export function draftFromProduct(product: Product): ProductDraft {
  return {
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    status: product.status,
    handle: product.handle,
    seoTitle: product.seo.title ?? '',
    seoDescription: product.seo.description ?? '',
    vendor: product.vendor ?? '',
    productType: product.productType ?? '',
    tags: product.tags,
    collectionIds: product.collectionIds,
    options: product.options.map((option) => ({ name: option.name, values: option.values })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      key: variant.id,
      title: variant.title,
      optionValues: variant.optionValues,
      // toDecimal is display-only by contract, and this IS the display value.
      price: toDecimal(variant.price).toFixed(decimalsFor(variant.price.currencyCode)),
      compareAtPrice:
        variant.compareAtPrice === null
          ? ''
          : toDecimal(variant.compareAtPrice).toFixed(
              decimalsFor(variant.compareAtPrice.currencyCode),
            ),
      sku: variant.sku ?? '',
      barcode: variant.barcode ?? '',
      taxable: variant.taxable,
      requiresShipping: variant.requiresShipping,
      weight: weightToDisplay(variant.weightGrams, 'kg'),
      weightUnit: 'kg' as const,
      inventoryPolicy: variant.inventoryPolicy,
      available: String(variant.inventoryQuantity),
    })),
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText ?? '',
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Handles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What the URL-handle field accepts WHILE TYPING. Deliberately lenient about
 * the edges: stripping a trailing `-` on every keystroke makes "tee-shirt"
 * impossible to type, because the dash disappears before the "s" arrives.
 */
export const handleWhileTyping = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 255);

/** `handleSchema`'s exact shape, applied on the way out. `"a-"` saves as `"a"`. */
export const normalizeHandle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
    .replace(/-+$/, '');

/**
 * Mirrors `apps/api/src/services/catalog/handles.ts`, so the SEO card previews
 * the URL the API is actually going to derive rather than a near miss.
 */
export const handleFromTitle = (title: string): string =>
  normalizeHandle(
    title
      .normalize('NFKD')
      // Combining marks stripped, so "Café Blend" is cafe-blend, not caf-blend.
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 200),
  ) || 'product';

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK']);
const decimalsFor = (currencyCode: string) => (ZERO_DECIMAL.has(currencyCode) ? 0 : 2);

/* -------------------------------------------------------------------------- */
/* The option matrix                                                            */
/* -------------------------------------------------------------------------- */

const signature = (options: OptionDraft[], values: Record<string, string>) =>
  options.map((option) => (values[option.name] ?? '').toLowerCase()).join(' / ');

/** Options with a name and at least one value — a half-typed option adds no rows. */
export const usableOptions = (options: OptionDraft[]): OptionDraft[] =>
  options.filter((option) => option.name.trim() !== '' && option.values.length > 0);

/**
 * Every combination the API will generate, first option varying slowest, so the
 * table reads `S / Black, S / White, M / Black, M / White` down the page.
 */
export function matrixOf(options: OptionDraft[]): Record<string, string>[] {
  let rows: Record<string, string>[] = [{}];
  for (const option of usableOptions(options)) {
    rows = rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.name]: value })));
  }
  return rows;
}

export const variantTitleOf = (options: OptionDraft[], values: Record<string, string>): string => {
  const used = usableOptions(options);
  return used.length === 0
    ? DEFAULT_VARIANT_TITLE
    : used.map((o) => values[o.name] ?? '').join(' / ');
};

/**
 * Re-key each variant's `optionValues` when an option was RENAMED, so the
 * signature match in `reconcileVariants` still finds the row.
 *
 * Options are positional identities in the builder ("Option 1"), so when the
 * option count is unchanged, a name that differs at a position is a rename of
 * that option — without the re-key, every keystroke of the new name orphaned
 * all rows: ids dropped, prices reset to row 1's, skus blanked, and the save
 * then deleted and recreated the variants server-side, destroying their
 * inventory. Adding or removing an option changes no surviving name, so those
 * cases pass through untouched.
 */
export function renameOptionKeys(
  oldOptions: OptionDraft[],
  newOptions: OptionDraft[],
  variants: VariantDraft[],
): VariantDraft[] {
  if (oldOptions.length !== newOptions.length) return variants;
  const renames = new Map<string, string>();
  oldOptions.forEach((option, index) => {
    const next = newOptions[index];
    if (next && next.name !== option.name) renames.set(option.name, next.name);
  });
  if (renames.size === 0) return variants;

  return variants.map((variant) => ({
    ...variant,
    optionValues: Object.fromEntries(
      Object.entries(variant.optionValues).map(([key, value]) => [renames.get(key) ?? key, value]),
    ),
  }));
}

/**
 * Re-derive the variant rows after an option edit, carrying each surviving
 * combination's price, sku, id and stock across.
 *
 * This is the client-side half of the same promise the API makes: adding a size
 * must not reset the prices the merchant already typed.
 */
export function reconcileVariants(options: OptionDraft[], current: VariantDraft[]): VariantDraft[] {
  const used = usableOptions(options);
  const bySignature = new Map(current.map((v) => [signature(used, v.optionValues), v]));
  // With no options the single row keeps whatever the merchant typed.
  const fallback = current[0];

  return matrixOf(options).map((optionValues, index) => {
    const previous = bySignature.get(signature(used, optionValues));
    const source = previous ?? (used.length === 0 ? fallback : undefined);
    // A brand-new combination inherits the first row's attributes, exactly the
    // way `variantColumns` templates them server-side — but never the fields
    // that identify one physical thing (sku, barcode), which must stay unique.
    const template = source ?? fallback;
    return {
      ...(previous?.id ? { id: previous.id } : {}),
      key: previous?.key ?? `new-${index}-${signature(used, optionValues)}`,
      title: variantTitleOf(options, optionValues),
      optionValues,
      price: template?.price ?? '',
      compareAtPrice: template?.compareAtPrice ?? '',
      sku: previous?.sku ?? '',
      barcode: previous?.barcode ?? '',
      taxable: template?.taxable ?? true,
      requiresShipping: template?.requiresShipping ?? true,
      weight: template?.weight ?? '',
      weightUnit: template?.weightUnit ?? 'kg',
      inventoryPolicy: template?.inventoryPolicy ?? 'deny',
      available: previous?.available ?? '0',
    };
  });
}

/**
 * Merge typed or pasted option values into the existing list, case-insensitively
 * de-duplicated.
 *
 * Takes them ALL AT ONCE on purpose. A paste of "S, M, L" reaches the field as a
 * single change event, so adding them one at a time would start each from the
 * same stale `values` prop and only the last would survive.
 */
export function addOptionValues(values: string[], incoming: string[]): string[] {
  const next = [...values];
  for (const raw of incoming) {
    const value = raw.trim();
    if (value !== '' && !next.some((v) => v.toLowerCase() === value.toLowerCase())) {
      next.push(value);
    }
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                   */
/* -------------------------------------------------------------------------- */

/** What a price input may hold mid-edit. `19.` is allowed while typing. */
export const PRICE_PATTERN = /^\d*(?:\.\d*)?$/;

export const isPriceComplete = (value: string): boolean => /^\d+(?:\.\d+)?$/.test(value.trim());

export type DraftErrors = { title?: string; price?: string; variants?: string };

export function validate(draft: ProductDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.title.trim() === '') errors.title = 'Title is required';

  // A half-typed price ("19.") is fine while the field has focus and wrong at
  // save time; the message lands on whichever card is actually showing it.
  const badPrice = draft.variants.some(
    (v) =>
      (v.price !== '' && !isPriceComplete(v.price)) ||
      (v.compareAtPrice !== '' && !isPriceComplete(v.compareAtPrice)),
  );

  const used = usableOptions(draft.options);
  if (used.length > MAX_OPTIONS) {
    errors.variants = `A product can have at most ${MAX_OPTIONS} options.`;
  } else if (draft.variants.length > MAX_VARIANTS) {
    errors.variants = `These options make ${draft.variants.length} variants; the limit is ${MAX_VARIANTS}.`;
  } else if (badPrice) {
    if (used.length === 0) errors.price = 'Enter a valid price.';
    else errors.variants = 'Enter a valid price for every variant.';
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Draft → API                                                                  */
/* -------------------------------------------------------------------------- */

/** An empty price means free, which is a legitimate product (a sample, a gift). */
const priceOf = (value: string, currencyCode: string) =>
  fromDecimal(value.trim() === '' ? '0' : value.trim(), currencyCode);

/**
 * The body for POST/PUT `/admin/api/products`.
 *
 * `images` is sent in full every time on purpose: the API replaces the image
 * rows wholesale, so a partial list would delete the rest.
 */
export function draftToInput(draft: ProductDraft, currencyCode: string) {
  return {
    title: draft.title.trim(),
    descriptionHtml: draft.descriptionHtml,
    status: draft.status,
    // Omitted while empty so the API derives it from the title; sending it
    // explicitly is what MOVES a storefront URL, and only the SEO card does.
    ...(normalizeHandle(draft.handle) === '' ? {} : { handle: normalizeHandle(draft.handle) }),
    seo: {
      title: draft.seoTitle.trim() === '' ? null : draft.seoTitle.trim(),
      description: draft.seoDescription.trim() === '' ? null : draft.seoDescription.trim(),
    },
    vendor: draft.vendor.trim() === '' ? null : draft.vendor.trim(),
    productType: draft.productType.trim() === '' ? null : draft.productType.trim(),
    tags: draft.tags,
    collectionIds: draft.collectionIds,
    options: usableOptions(draft.options).map((option, position) => ({
      name: option.name.trim(),
      position,
      values: option.values,
    })),
    variants: draft.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      price: priceOf(variant.price, currencyCode),
      compareAtPrice:
        variant.compareAtPrice.trim() === ''
          ? null
          : fromDecimal(variant.compareAtPrice.trim(), currencyCode),
      sku: variant.sku.trim() === '' ? null : variant.sku.trim(),
      barcode: variant.barcode.trim() === '' ? null : variant.barcode.trim(),
      taxable: variant.taxable,
      requiresShipping: variant.requiresShipping,
      weightGrams: weightToGrams(variant.weight, variant.weightUnit),
      inventoryPolicy: variant.inventoryPolicy,
      optionValues: variant.optionValues,
    })),
    images: draft.images.map((image, position) => ({
      url: image.url,
      altText: image.altText.trim() === '' ? null : image.altText.trim(),
      position,
    })),
  };
}

/**
 * Stock the merchant retyped, matched back to saved variants by option values —
 * a brand-new product has no variant ids until the API answers.
 *
 * Quantities never ride along with the product write: they move only through
 * the inventory adjustment service, so `available` is applied separately.
 */
export function stockChanges(
  draft: ProductDraft,
  saved: Product,
): Array<{ variantId: string; available: number }> {
  const used = usableOptions(draft.options);
  const bySignature = new Map(
    saved.variants.map((v) => [signature(used, v.optionValues), v] as const),
  );

  const changes: Array<{ variantId: string; available: number }> = [];
  for (const variant of draft.variants) {
    const match = variant.id
      ? saved.variants.find((v) => v.id === variant.id)
      : bySignature.get(signature(used, variant.optionValues));
    if (!match) continue;

    const wanted = Number.parseInt(variant.available, 10);
    if (!Number.isFinite(wanted) || wanted < 0) continue;
    if (wanted === match.inventoryQuantity) continue;
    changes.push({ variantId: match.id, available: wanted });
  }
  return changes;
}
