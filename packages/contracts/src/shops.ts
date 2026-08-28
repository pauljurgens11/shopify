/** Shop + settings (SPEC §7, §16 Settings pages). Owner: WS-A. */
import { z } from 'zod';
import { idSchema, moneySchema, positiveMoneySchema, timestampsSchema } from './common.ts';

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

export type TaxSettings = z.infer<typeof taxSettingsSchema>;
export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>;

/* -------------------------------------------------------------------------- */
/* Settings update inputs (A4)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Every settings PUT is a partial merge over what is stored, so a form that
 * only touches one field cannot blank the rest.
 */
export const updateTaxSettingsInput = taxSettingsSchema.partial();
export const updateCheckoutSettingsInput = checkoutSettingsSchema.partial();

/**
 * The id is assigned by the server; the client never chooses one.
 *
 * Prices are non-negative here even though `shippingRateSchema` reads them
 * back through the looser `moneySchema`: a negative rate would *subtract* from
 * the order total at checkout, which is a money bug rather than a validation
 * nicety. The bounds are ordered for the same reason a merchant would expect —
 * min above max is a rate that can never be selected, and silently dead.
 */
export const upsertShippingRateInput = shippingRateSchema
  .omit({ id: true })
  .extend({
    price: positiveMoneySchema,
    minOrderSubtotal: positiveMoneySchema.nullable().default(null),
    maxOrderSubtotal: positiveMoneySchema.nullable().default(null),
  })
  .refine(
    (rate) =>
      !rate.minOrderSubtotal ||
      !rate.maxOrderSubtotal ||
      rate.minOrderSubtotal.amount <= rate.maxOrderSubtotal.amount,
    { message: 'Maximum order price must be at least the minimum.', path: ['maxOrderSubtotal'] },
  );
export type UpsertShippingRateInput = z.infer<typeof upsertShippingRateInput>;

export const generalSettingsSchema = shopSchema.pick({
  name: true,
  email: true,
  currencyCode: true,
  timezone: true,
  plan: true,
});
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export const shippingRateListResponse = z.object({ data: z.array(shippingRateSchema) });

/**
 * Read by E3 at checkout: everything the shipping and tax steps need, in one
 * request, already narrowed to the rates that apply to that cart.
 */
export const shippingAndTaxResponse = z.object({
  rates: z.array(shippingRateSchema),
  tax: taxSettingsSchema,
});
