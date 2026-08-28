/** Server-side cart, referenced by a cookie token (SPEC §10). Owner: WS-E. */
import { z } from 'zod';
import { idSchema, moneySchema, timestampsSchema } from './common.ts';

export const cartLineSchema = z.object({
  id: z.string(),
  productId: idSchema,
  variantId: idSchema,
  quantity: z.number().int().positive().max(999),
  /** Denormalized for render; authoritative price is recomputed server-side. */
  title: z.string(),
  variantTitle: z.string().nullable(),
  handle: z.string(),
  imageUrl: z.string().url().nullable(),
  unitPrice: moneySchema,
  lineTotal: moneySchema,
  available: z.number().int().nullable(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const cartSchema = z
  .object({
    id: idSchema,
    token: z.string(),
    currencyCode: z.string().length(3),
    lines: z.array(cartLineSchema).default([]),
    subtotal: moneySchema,
    itemCount: z.number().int().nonnegative(),
    discountCode: z.string().nullable().default(null),
  })
  .merge(timestampsSchema);
export type Cart = z.infer<typeof cartSchema>;

export const addToCartInput = z.object({
  variantId: idSchema,
  quantity: z.number().int().positive().max(999).default(1),
});

export const updateCartLineInput = z.object({
  lineId: z.string(),
  /** 0 removes the line, matching Shopify's cart behaviour. */
  quantity: z.number().int().nonnegative().max(999),
});

export const applyCartDiscountInput = z.object({ code: z.string().min(1).max(64) });
