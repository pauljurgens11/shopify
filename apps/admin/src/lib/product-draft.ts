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

export type VariantDraft = {
  /** Absent for a row the matrix just invented; present for a row that exists. */
  id?: string;
  /** Stable across re-renders — React keys must not be array indices here. */
  key: string;
  title: string;
  optionValues: Record<string, string>;
  /** Always a string. See the money note above. */
  price: string;
  sku: string;
  /** Integer string. Saved through the inventory service, not the product API. */
  available: string;
};

/* -------------------------------------------------------------------------- */
/* Description                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A rich-text editor is out of scope (B5), so the description is a plain
 * multiline field. Showing `<p>Four pockets…</p>` in it is a tell, so simple
 * markup is unwrapped for editing and re-wrapped on save.
 *
 * "Simple" means paragraphs and line breaks and nothing else. Anything richer
 * is left as raw HTML in the field rather than silently flattened — losing a
 * merchant's list or bold text on an unrelated edit would be worse than showing
 * them the tags.
 */
export function isSimpleHtml(html: string): boolean {
  return (html.match(/<[^>]*>/g) ?? []).every((tag) => /^<\/?(p|br)\s*\/?>$/i.test(tag));
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim();
}

export function textToHtml(text: string): string {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export type ImageDraft = { id?: string; url: string; altText: string };

export type ProductDraft = {
  title: string;
  /** What the textarea holds: plain text normally, raw HTML when too rich to unwrap. */
  description: string;
  /** True when `description` IS the HTML, so saving must not re-wrap it. */
  descriptionIsRich: boolean;
  status: 'active' | 'draft' | 'archived';
  vendor: string;
  productType: string;
  tags: string[];
  options: OptionDraft[];
  variants: VariantDraft[];
  images: ImageDraft[];
};

export function emptyDraft(): ProductDraft {
  return {
    title: '',
    description: '',
    descriptionIsRich: false,
    status: 'active',
    vendor: '',
    productType: '',
    tags: [],
    options: [],
    variants: [
      {
        key: 'default',
        title: DEFAULT_VARIANT_TITLE,
        optionValues: {},
        price: '',
        sku: '',
        available: '0',
      },
    ],
    images: [],
  };
}

export function draftFromProduct(product: Product): ProductDraft {
  return {
    title: product.title,
    description: isSimpleHtml(product.descriptionHtml)
      ? htmlToText(product.descriptionHtml)
      : product.descriptionHtml,
    descriptionIsRich: !isSimpleHtml(product.descriptionHtml),
    status: product.status,
    vendor: product.vendor ?? '',
    productType: product.productType ?? '',
    tags: product.tags,
    options: product.options.map((option) => ({ name: option.name, values: option.values })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      key: variant.id,
      title: variant.title,
      optionValues: variant.optionValues,
      // toDecimal is display-only by contract, and this IS the display value.
      price: toDecimal(variant.price).toFixed(decimalsFor(variant.price.currencyCode)),
      sku: variant.sku ?? '',
      available: String(variant.inventoryQuantity),
    })),
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText ?? '',
    })),
  };
}

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
    return {
      ...(previous?.id ? { id: previous.id } : {}),
      key: previous?.key ?? `new-${index}-${signature(used, optionValues)}`,
      title: variantTitleOf(options, optionValues),
      optionValues,
      // A brand-new combination inherits the first row's price, the way the API
      // templates it — but never its sku, which must stay unique.
      price: source?.price ?? fallback?.price ?? '',
      sku: previous?.sku ?? '',
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

export type DraftErrors = { title?: string; variants?: string };

export function validate(draft: ProductDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.title.trim() === '') errors.title = 'Title is required';

  const used = usableOptions(draft.options);
  if (used.length > MAX_OPTIONS)
    errors.variants = `A product can have at most ${MAX_OPTIONS} options.`;
  else if (draft.variants.length > MAX_VARIANTS) {
    errors.variants = `These options make ${draft.variants.length} variants; the limit is ${MAX_VARIANTS}.`;
  } else if (draft.variants.some((v) => v.price !== '' && !isPriceComplete(v.price))) {
    errors.variants = 'Enter a valid price for every variant.';
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
    descriptionHtml: draft.descriptionIsRich ? draft.description : textToHtml(draft.description),
    status: draft.status,
    vendor: draft.vendor.trim() === '' ? null : draft.vendor.trim(),
    productType: draft.productType.trim() === '' ? null : draft.productType.trim(),
    tags: draft.tags,
    options: usableOptions(draft.options).map((option, position) => ({
      name: option.name.trim(),
      position,
      values: option.values,
    })),
    variants: draft.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      price: priceOf(variant.price, currencyCode),
      sku: variant.sku.trim() === '' ? null : variant.sku.trim(),
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
