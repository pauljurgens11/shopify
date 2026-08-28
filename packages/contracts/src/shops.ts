/** Shop + settings (SPEC §7, §16 Settings pages). Owner: WS-A. */
import { z } from 'zod';
import { idSchema, moneySchema, timestampsSchema } from './common.ts';

export const shopSchema = z
  .object({
    id: idSchema,
    slug: z.string(),
    name: z.string(),
    email: z.string().email().nullable(),
    currencyCode: z.string().length(3),
    timezone: z.string(),
    plan: z.enum(['trial', 'basic', 'grow', 'advanced']).default('trial'),
    /** Shopify-style onboarding checklist state on Home (SPEC §8). */
    onboarding: z
      .object({
        addProduct: z.boolean().default(false),
        customizeStorefront: z.boolean().default(false),
        addPaymentProcessor: z.boolean().default(false),
        placeTestOrder: z.boolean().default(false),
        dismissed: z.boolean().default(false),
      })
      .default({}),
  })
  .merge(timestampsSchema);
export type Shop = z.infer<typeof shopSchema>;

export const updateShopInput = shopSchema
  .pick({ name: true, email: true, timezone: true })
  .partial();

/** Settings → Taxes. Flat percentage, SPEC §10 keeps tax providers out of scope. */
export const taxSettingsSchema = z.object({
  ratePercentage: z.number().min(0).max(100).default(0),
  pricesIncludeTax: z.boolean().default(false),
});

/** Settings → Shipping. Flat + price-conditional only (SPEC §10). */
export const shippingRateSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(255),
  price: moneySchema,
  minOrderSubtotal: moneySchema.nullable().default(null),
  maxOrderSubtotal: moneySchema.nullable().default(null),
});
export type ShippingRate = z.infer<typeof shippingRateSchema>;

export const checkoutSettingsSchema = z.object({
  requireCustomerAccount: z.boolean().default(false),
  showTipping: z.boolean().default(false),
  orderNotePrompt: z.string().max(255).nullable().default(null),
});
