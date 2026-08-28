/**
 * The discount form's state, and its translation to and from the API.
 *
 * Money is dollars-as-strings while the merchant is typing and integer minor
 * units the moment it crosses the boundary, via `fromDecimal` — a float never
 * exists (CLAUDE.md §5). Percentages are already integers and stay that way.
 *
 * Owner: WS-C (C6).
 */
import { fromDecimal, toDecimal } from '@merchant/config/money';
import type { Discount } from '@merchant/contracts/discounts';

export type MinimumKind = 'none' | 'subtotal' | 'quantity';
export type AppliesToScope = 'all' | 'collections' | 'products';

export type DiscountDraft = {
  title: string;
  method: 'code' | 'automatic';
  code: string;
  type: Discount['type'];
  valueType: Discount['valueType'];
  /** Percentage points, or dollars-as-typed for a fixed amount. */
  value: string;
  appliesToScope: AppliesToScope;
  collectionIds: string[];
  productIds: string[];
  minimumKind: MinimumKind;
  /** Dollars-as-typed. */
  minimumSubtotal: string;
  minimumQuantity: string;
  hasUsageLimit: boolean;
  usageLimit: string;
  oncePerCustomer: boolean;
  startsAt: string;
  hasEndDate: boolean;
  endsAt: string;
};

/** `2026-08-28` — what a Polaris date field holds, in the browser's own day. */
export function dateInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyDraft(type: Discount['type']): DiscountDraft {
  return {
    title: '',
    method: 'code',
    code: '',
    type,
    valueType: type === 'free_shipping' ? 'percentage' : 'percentage',
    value: type === 'free_shipping' ? '100' : '',
    appliesToScope: 'all',
    collectionIds: [],
    productIds: [],
    minimumKind: 'none',
    minimumSubtotal: '',
    minimumQuantity: '',
    hasUsageLimit: false,
    usageLimit: '',
    oncePerCustomer: false,
    startsAt: dateInputValue(new Date()),
    hasEndDate: false,
    endsAt: '',
  };
}

export function draftFromDiscount(discount: Discount, currencyCode: string): DiscountDraft {
  const minimum = discount.minimumRequirement;
  const appliesTo = discount.appliesTo;
  return {
    title: discount.title,
    method: discount.code ? 'code' : 'automatic',
    code: discount.code ?? '',
    type: discount.type,
    valueType: discount.valueType,
    value:
      discount.valueType === 'percentage'
        ? String(discount.value)
        : // A fixed value is minor units on the wire; JPY has no decimal places,
          // so the shop's own currency has to do the conversion.
          String(toDecimal({ amount: discount.value, currencyCode })),
    appliesToScope: appliesTo.scope,
    collectionIds: appliesTo.scope === 'collections' ? appliesTo.collectionIds : [],
    productIds: appliesTo.scope === 'products' ? appliesTo.productIds : [],
    minimumKind: minimum.type,
    minimumSubtotal: minimum.type === 'subtotal' ? String(toDecimal(minimum.value)) : '',
    minimumQuantity: minimum.type === 'quantity' ? String(minimum.value) : '',
    hasUsageLimit: discount.usageLimit !== null,
    usageLimit: discount.usageLimit === null ? '' : String(discount.usageLimit),
    oncePerCustomer: discount.oncePerCustomer,
    startsAt: dateInputValue(new Date(discount.startsAt)),
    hasEndDate: discount.endsAt !== null,
    endsAt: discount.endsAt ? dateInputValue(new Date(discount.endsAt)) : '',
  };
}

/** Local midnight, so "starts today" means today wherever the merchant is. */
const startOfDay = (value: string) => new Date(`${value}T00:00:00`);
const endOfDay = (value: string) => new Date(`${value}T23:59:59`);

export function draftToInput(draft: DiscountDraft, currencyCode: string) {
  const appliesTo =
    draft.appliesToScope === 'collections'
      ? { scope: 'collections' as const, collectionIds: draft.collectionIds }
      : draft.appliesToScope === 'products'
        ? { scope: 'products' as const, productIds: draft.productIds }
        : { scope: 'all' as const };

  const minimumRequirement =
    draft.minimumKind === 'subtotal'
      ? {
          type: 'subtotal' as const,
          value: fromDecimal(draft.minimumSubtotal.trim() || '0', currencyCode),
        }
      : draft.minimumKind === 'quantity'
        ? { type: 'quantity' as const, value: Number(draft.minimumQuantity || '1') }
        : { type: 'none' as const };

  return {
    title: draft.title.trim(),
    code: draft.method === 'code' ? draft.code.trim().toUpperCase() : null,
    type: draft.type,
    valueType: draft.valueType,
    value:
      draft.type === 'free_shipping'
        ? 100
        : draft.valueType === 'percentage'
          ? Number(draft.value || '0')
          : fromDecimal(draft.value.trim() || '0', currencyCode).amount,
    appliesTo,
    minimumRequirement,
    usageLimit: draft.hasUsageLimit && draft.usageLimit !== '' ? Number(draft.usageLimit) : null,
    oncePerCustomer: draft.oncePerCustomer,
    startsAt: startOfDay(draft.startsAt).toISOString(),
    endsAt: draft.hasEndDate && draft.endsAt !== '' ? endOfDay(draft.endsAt).toISOString() : null,
  };
}

export function validate(draft: DiscountDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.title.trim() === '') errors.title = 'Add a title so you can find this discount later.';
  if (draft.method === 'code' && draft.code.trim() === '') {
    errors.code = 'Enter a discount code.';
  }
  if (draft.type !== 'free_shipping') {
    const value = Number(draft.value);
    if (draft.value.trim() === '' || Number.isNaN(value) || value <= 0) {
      errors.value = 'Enter a value greater than zero.';
    } else if (draft.valueType === 'percentage' && value > 100) {
      errors.value = 'A percentage cannot be more than 100.';
    }
  }
  if (draft.appliesToScope === 'collections' && draft.collectionIds.length === 0) {
    errors.appliesTo = 'Choose at least one collection.';
  }
  if (draft.appliesToScope === 'products' && draft.productIds.length === 0) {
    errors.appliesTo = 'Choose at least one product.';
  }
  if (draft.hasEndDate && draft.endsAt !== '' && draft.endsAt < draft.startsAt) {
    errors.endsAt = 'The end date cannot be before the start date.';
  }
  return errors;
}

/** Shopify's Generate button: an unambiguous, shoutable code. */
export function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
