/**
 * Server-side cart (SPEC §10). Owner: WS-E.
 *
 * The single design decision everything else follows from: a stored cart line
 * holds `variantId` and `quantity` and nothing else. Title, image and price are
 * resolved from the live variant on every read.
 *
 * That is Shopify's behaviour and it matters — a cart left open in another tab
 * while the merchant edits a price must charge the new price, and a cart whose
 * product was deleted must quietly drop the line rather than 500 or, worse,
 * carry a phantom item into checkout. Snapshotting belongs at checkout creation
 * (E3), where the shopper is committing to a number.
 *
 * Totals are subtotal only. Shipping, tax and discounts are the checkout's
 * (E3) — a cart page that guesses at tax and then disagrees with checkout is a
 * conversion bug.
 */
import { newId, newSecret } from '@merchant/config/ids';
import { multiply, sum } from '@merchant/config/money';
import type { Cart, CartLine } from '@merchant/contracts/cart';
import { cartSchema } from '@merchant/contracts/cart';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { conflict, notFound } from '../../lib/errors.ts';
import { stockOf } from '../storefront/products.ts';
import { shopCurrency } from '../storefront/shop.ts';

/** What a cart row actually stores. Everything else is derived on read. */
interface StoredLine {
  id: string;
  variantId: string;
  quantity: number;
}

const VARIANT_INCLUDE = {
  inventoryLevels: { select: { available: true } },
  product: { select: { id: true, title: true, handle: true, status: true, images: true } },
} satisfies Prisma.ProductVariantInclude;

type VariantRow = Prisma.ProductVariantGetPayload<{ include: typeof VARIANT_INCLUDE }>;

function parseLines(value: Prisma.JsonValue): StoredLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [];
    const line = entry as Record<string, unknown>;
    return typeof line.id === 'string' &&
      typeof line.variantId === 'string' &&
      typeof line.quantity === 'number'
      ? [{ id: line.id, variantId: line.variantId, quantity: line.quantity }]
      : [];
  });
}

/**
 * Resolve stored lines against live variants and total them.
 *
 * Lines whose variant or product has disappeared — deleted, or unpublished
 * since it went in the cart — are dropped rather than rendered. `db` is the
 * tenant client, so a variant id from another shop resolves to nothing here
 * too.
 */
async function hydrate(
  db: TenantClient,
  row: {
    id: string;
    token: string;
    currencyCode: string;
    discountCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  stored: StoredLine[],
): Promise<Cart> {
  const variants =
    stored.length === 0
      ? []
      : await db.productVariant.findMany({
          where: { id: { in: stored.map((line) => line.variantId) } },
          include: VARIANT_INCLUDE,
        });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));

  const lines: CartLine[] = stored.flatMap((line) => {
    const variant = byId.get(line.variantId);
    if (variant?.product.status !== 'active') return [];

    const unitPrice = { amount: variant.price, currencyCode: row.currencyCode };
    const image =
      variant.product.images.find((candidate) => candidate.variantIds.includes(variant.id)) ??
      variant.product.images.toSorted((a, b) => a.position - b.position)[0];

    return [
      {
        id: line.id,
        productId: variant.product.id,
        variantId: variant.id,
        quantity: line.quantity,
        title: variant.product.title,
        // Shopify hides the variant label when a product has only the implicit one.
        variantTitle: variant.title === 'Default Title' ? null : variant.title,
        handle: variant.product.handle,
        imageUrl: image?.url ?? null,
        unitPrice,
        lineTotal: multiply(unitPrice, line.quantity),
        // `continue` variants have no meaningful ceiling to show.
        available: variant.inventoryPolicy === 'continue' ? null : stockOf(variant),
      },
    ];
  });

  return cartSchema.parse({
    id: row.id,
    token: row.token,
    currencyCode: row.currencyCode,
    lines,
    subtotal: sum(
      lines.map((line) => line.lineTotal),
      row.currencyCode,
    ),
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    discountCode: row.discountCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function createCart(db: TenantClient, shopId: string): Promise<Cart> {
  const currencyCode = await shopCurrency(db);
  const row = await db.cart.create({
    data: {
      id: newId('cart'),
      shopId,
      // High-entropy rather than a ULID: the cookie carries this across an
      // origin shared by every shop in dev (`*.lvh.me`), and a ULID is
      // time-ordered and therefore guessable from a neighbouring one.
      token: `cart_${newSecret(24)}`,
      currencyCode,
      lineItems: [],
    },
  });
  return hydrate(db, row, []);
}

/**
 * The cart a token names, or null.
 *
 * Null rather than a 404 on purpose: a shopper holding a cookie for a pruned
 * cart, or for a different shop on the shared dev domain, should get a working
 * empty store — the route creates them a fresh cart.
 */
export async function findCart(db: TenantClient, token: string | undefined): Promise<Cart | null> {
  if (!token) return null;
  const row = await db.cart.findFirst({ where: { token } });
  if (!row) return null;
  return hydrate(db, row, parseLines(row.lineItems));
}

async function requireCartRow(db: TenantClient, token: string) {
  const row = await db.cart.findFirst({ where: { token } });
  if (!row) throw notFound('Cart');
  return row;
}

async function save(db: TenantClient, cartId: string, lines: StoredLine[]): Promise<Cart> {
  const updated = await db.cart.update({
    where: { id: cartId },
    data: { lineItems: lines as unknown as Prisma.InputJsonValue },
  });
  return hydrate(db, updated, lines);
}

/**
 * Stock gate. Runs against the TOTAL quantity the line would hold, not the
 * increment — otherwise three "add one" clicks walk straight past a stock of
 * two. The reservation itself happens at checkout completion (E3); this is the
 * readable check that keeps the cart honest.
 */
function assertPurchasable(variant: VariantRow, wanted: number): void {
  if (variant.inventoryPolicy === 'continue') return;

  const available = stockOf(variant);
  if (available <= 0) {
    throw conflict(`${variant.product.title} is sold out.`, 'quantity');
  }
  if (wanted > available) {
    throw conflict(
      `Only ${available} of ${variant.product.title} ${available === 1 ? 'is' : 'are'} available.`,
      'quantity',
    );
  }
}

export async function addLine(
  db: TenantClient,
  token: string,
  input: { variantId: string; quantity: number },
): Promise<Cart> {
  const row = await requireCartRow(db, token);
  const lines = parseLines(row.lineItems);

  const variant = await db.productVariant.findFirst({
    where: { id: input.variantId },
    include: VARIANT_INCLUDE,
  });
  // Scoped client: another shop's variant is simply not here.
  if (variant?.product.status !== 'active') throw notFound('Variant');

  // Shopify merges a repeat add into the existing line rather than stacking.
  const existing = lines.find((line) => line.variantId === input.variantId);
  const quantity = (existing?.quantity ?? 0) + input.quantity;
  assertPurchasable(variant, quantity);

  if (existing) existing.quantity = quantity;
  else lines.push({ id: newId('lineItem'), variantId: input.variantId, quantity });

  return save(db, row.id, lines);
}

export async function updateLine(
  db: TenantClient,
  token: string,
  input: { lineId: string; quantity: number },
): Promise<Cart> {
  const row = await requireCartRow(db, token);
  const lines = parseLines(row.lineItems);
  const line = lines.find((candidate) => candidate.id === input.lineId);
  if (!line) throw notFound('Cart line');

  // Quantity 0 removes the line — Shopify's cart behaviour, and what the
  // quantity stepper sends when a shopper clicks past one.
  if (input.quantity === 0) {
    return save(
      db,
      row.id,
      lines.filter((candidate) => candidate.id !== input.lineId),
    );
  }

  const variant = await db.productVariant.findFirst({
    where: { id: line.variantId },
    include: VARIANT_INCLUDE,
  });
  if (variant?.product.status !== 'active') throw notFound('Variant');
  assertPurchasable(variant, input.quantity);

  line.quantity = input.quantity;
  return save(db, row.id, lines);
}

export async function removeLine(db: TenantClient, token: string, lineId: string): Promise<Cart> {
  const row = await requireCartRow(db, token);
  const lines = parseLines(row.lineItems);
  if (!lines.some((line) => line.id === lineId)) throw notFound('Cart line');
  return save(
    db,
    row.id,
    lines.filter((line) => line.id !== lineId),
  );
}
