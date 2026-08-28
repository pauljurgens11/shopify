/**
 * Settings → General, Taxes, Checkout (SPEC §9, §10). Owner: WS-A.
 *
 * These three live in JSON columns on `Shop`. Every update is a partial merge
 * over what is stored: the settings forms PUT only the section they own, and a
 * blank field must mean "unchanged", never "cleared".
 */
import {
  type CheckoutSettings,
  checkoutSettingsSchema,
  type GeneralSettings,
  generalSettingsSchema,
  type TaxSettings,
  taxSettingsSchema,
} from '@merchant/contracts/shops';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';

async function requireShop(db: TenantClient) {
  const shop = await db.shop.findFirst();
  if (!shop) throw notFound('Shop not found.');
  return shop;
}

export async function getGeneralSettings(db: TenantClient): Promise<GeneralSettings> {
  return generalSettingsSchema.parse(await requireShop(db));
}

/**
 * Currency is deliberately not updatable: it is fixed per shop (SPEC §2, no
 * multi-currency), and every Money row already written is in it.
 */
export async function updateGeneralSettings(
  db: TenantClient,
  shopId: string,
  input: { name?: string; email?: string | null; timezone?: string },
): Promise<GeneralSettings> {
  const shop = await db.shop.update({ where: { id: shopId }, data: input });
  return generalSettingsSchema.parse(shop);
}

/** A column written before a field existed still has to parse to the defaults. */
export async function getTaxSettings(db: TenantClient): Promise<TaxSettings> {
  return taxSettingsSchema.parse((await requireShop(db)).taxSettings ?? {});
}

export async function updateTaxSettings(
  db: TenantClient,
  shopId: string,
  input: Partial<TaxSettings>,
): Promise<TaxSettings> {
  const current = await getTaxSettings(db);
  const next = taxSettingsSchema.parse({ ...current, ...input });
  await db.shop.update({ where: { id: shopId }, data: { taxSettings: next } });
  return next;
}

export async function getCheckoutSettings(db: TenantClient): Promise<CheckoutSettings> {
  return checkoutSettingsSchema.parse((await requireShop(db)).checkoutSettings ?? {});
}

export async function updateCheckoutSettings(
  db: TenantClient,
  shopId: string,
  input: Partial<CheckoutSettings>,
): Promise<CheckoutSettings> {
  const current = await getCheckoutSettings(db);
  const next = checkoutSettingsSchema.parse({ ...current, ...input });
  await db.shop.update({ where: { id: shopId }, data: { checkoutSettings: next } });
  return next;
}
