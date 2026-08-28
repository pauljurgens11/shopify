/**
 * Shop-level lookups the storefront surface needs. Owner: WS-E.
 */
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';

/**
 * Money DTOs carry the shop's currency, which lives on the Shop row rather than
 * on each price column (SPEC §5). Read through the tenant client, so it can
 * only ever be this shop's.
 */
export async function shopCurrency(db: TenantClient): Promise<string> {
  const shop = await db.shop.findFirst({ select: { currencyCode: true } });
  if (!shop) throw notFound('Store');
  return shop.currencyCode;
}
