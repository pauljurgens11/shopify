/**
 * Two abandoned checkouts (issue H5): open, younger than 72h, carrying a
 * seeded customer's email and no completed order — exactly what C4's
 * "Abandoned checkouts" customer segment matches. Without them that tab is
 * empty on every demo and reads as an unbuilt feature.
 *
 * Both sit on YESTERDAY (hour fixed), the newest whole day the seed's
 * end-of-history anchoring allows: always < 48h old regardless of the clock
 * time the seed ran at, so the segment can never silently age out mid-demo.
 * The cart snapshot rows mirror the CartLine shape checkout.ts freezes
 * (`packages/contracts/src/cart.ts`).
 */
import { newId, newSecret } from '@merchant/config/ids';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { SeededProduct } from './catalog.ts';
import { daysAgo, type SeedContext } from './context.ts';
import type { SeededCustomer } from './customers.ts';

function cartLine(product: SeededProduct, quantity: number, currencyCode: string) {
  const variant = product.variants[0];
  if (!variant) throw new Error(`seed: ${product.handle} has no variants`);
  return {
    id: newId('lineItem'),
    productId: product.id,
    variantId: variant.id,
    quantity,
    title: product.title,
    variantTitle: variant.title === 'Default Title' ? null : variant.title,
    handle: product.handle,
    imageUrl: product.imageUrl,
    unitPrice: { amount: variant.price, currencyCode },
    lineTotal: { amount: variant.price * quantity, currencyCode },
    available: 10,
  };
}

export async function createAbandonedCheckouts(
  db: PrismaClient,
  ctx: SeedContext,
  input: { products: SeededProduct[]; customers: SeededCustomer[] },
): Promise<void> {
  const sellable = input.products.filter((p) => p.status === 'active');
  // Deterministic picks, not rng: two draws here would shift every RNG-derived
  // value seeded after this step between runs of different versions.
  const shoppers = input.customers.filter((c) => c.email !== 'jane@example.com').slice(0, 2);

  const drafts = shoppers.flatMap((customer, index) => {
    const product = sellable[index * 2] ?? sellable[0];
    if (!product) return [];
    return [
      {
        customer,
        createdAt: daysAgo(ctx, 1, index === 0 ? 9 : 19, index === 0 ? 12 : 47),
        lines: [cartLine(product, 1, ctx.currencyCode)],
      },
    ];
  });

  for (const draft of drafts) {
    await db.checkout.create({
      data: {
        id: newId('checkout'),
        shopId: ctx.shopId,
        token: `chk_${newSecret(24)}`,
        cartSnapshot: draft.lines as unknown as Prisma.InputJsonValue,
        email: draft.customer.email,
        status: 'open',
        completedOrderId: null,
        createdAt: draft.createdAt,
        updatedAt: draft.createdAt,
      },
    });
  }
}
