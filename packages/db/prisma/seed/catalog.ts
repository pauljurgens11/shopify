/**
 * Products, options, variants, images and opening stock (H1).
 *
 * Images are curated, pinned Unsplash photos (data/images.ts) — real
 * photography that matches each product's subject, identical on every machine
 * and every reset. A demo where "merino crewneck" shows a landscape photo, or
 * where the shirts change picture between screenshots, looks broken.
 */
import { newId } from '@merchant/config/ids';
import type { Prisma, PrismaClient } from '@prisma/client';
import { daysAgo, type SeedContext } from './context.ts';
import { PRODUCT_IMAGES, unsplashImage } from './data/images.ts';
import { SEED_PRODUCTS, type SeedProduct } from './data/products.ts';
import type { InventoryLedger } from './inventory.ts';
import type { SeededLocation } from './shop.ts';

export interface SeededVariant {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  position: number;
  optionValues: Record<string, string>;
  requiresShipping: boolean;
  taxable: boolean;
}

export interface SeededProduct {
  id: string;
  handle: string;
  title: string;
  status: string;
  tags: string[];
  productType: string;
  vendor: string;
  imageUrl: string;
  createdAt: Date;
  variants: SeededVariant[];
}

const IMAGES_PER_PRODUCT = 2;

function productImageUrl(handle: string, index: number): string {
  const curated = PRODUCT_IMAGES[handle]?.[index];
  if (curated) return unsplashImage(curated, 1200, 1500);
  // Unmapped handle: a deterministic placeholder keeps the seed running, but it
  // is a wrong-subject photo — add the product to PRODUCT_IMAGES (data/images.ts).
  return `https://picsum.photos/seed/${handle}-${index + 1}/1200/1500`;
}

function slugPart(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
}

/** Cartesian product of the option values, in declaration order — Shopify's order. */
function variantCombinations(product: SeedProduct): Record<string, string>[] {
  const options = product.options ?? [];
  if (options.length === 0) return [{}];

  return options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((partial) =>
        option.values.map((value) => ({ ...partial, [option.name]: value })),
      ),
    [{}],
  );
}

export async function createCatalog(
  db: PrismaClient,
  ctx: SeedContext,
  locations: { retail: SeededLocation; warehouse: SeededLocation },
  ledger: InventoryLedger,
): Promise<SeededProduct[]> {
  const products: SeededProduct[] = [];

  const productRows: Prisma.ProductCreateManyInput[] = [];
  const optionRows: Prisma.ProductOptionCreateManyInput[] = [];
  const variantRows: Prisma.ProductVariantCreateManyInput[] = [];
  const imageRows: Prisma.ProductImageCreateManyInput[] = [];

  SEED_PRODUCTS.forEach((source, productIndex) => {
    const productId = newId('product');
    // Oldest product first, newest a few days back: the Products index sorts on
    // createdAt and a table where every row shares a timestamp looks generated.
    const createdAt = daysAgo(ctx, 300 - productIndex * 8, 10, productIndex % 60);
    const combinations = variantCombinations(source);

    const variants: SeededVariant[] = combinations.map((optionValues, position) => {
      const suffix = Object.values(optionValues).map(slugPart).join('-');
      return {
        id: newId('variant'),
        productId,
        // Shopify's own label for the implicit variant of an option-less product.
        title: Object.values(optionValues).join(' / ') || 'Default Title',
        sku: suffix ? `${source.skuPrefix}-${suffix}` : source.skuPrefix,
        price: source.price,
        position,
        optionValues,
        requiresShipping: true,
        taxable: true,
      };
    });

    productRows.push({
      id: productId,
      shopId: ctx.shopId,
      title: source.title,
      handle: source.handle,
      descriptionHtml: `<p>${source.description}</p>`,
      status: source.status ?? 'active',
      vendor: source.vendor,
      productType: source.productType,
      tags: source.tags,
      seoTitle: `${source.title} — Aurora Supply Co.`,
      seoDescription: source.description.slice(0, 160),
      createdAt,
      updatedAt: createdAt,
    });

    (source.options ?? []).forEach((option, position) => {
      optionRows.push({
        id: newId('option'),
        shopId: ctx.shopId,
        productId,
        name: option.name,
        position,
        values: option.values,
        createdAt,
      });
    });

    for (const variant of variants) {
      variantRows.push({
        id: variant.id,
        shopId: ctx.shopId,
        productId,
        title: variant.title,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: source.compareAtPrice ?? null,
        position: variant.position,
        optionValues: variant.optionValues,
        requiresShipping: true,
        taxable: true,
        weightGrams: source.weightGrams ?? null,
        inventoryPolicy: 'deny',
        createdAt,
        updatedAt: createdAt,
      });

      // Opening stock, as a `received` adjustment rather than a bare level —
      // see inventory.ts. Retail carries a browsing quantity, the warehouse the
      // real depth, which is what makes the two-location UI worth looking at.
      ledger.record({
        variantId: variant.id,
        locationId: locations.retail.id,
        delta: ctx.rng.int(3, 14),
        reason: 'received',
        actor: 'seed',
        createdAt,
      });
      ledger.record({
        variantId: variant.id,
        locationId: locations.warehouse.id,
        delta: ctx.rng.int(18, 70),
        reason: 'received',
        actor: 'seed',
        createdAt,
      });
    }

    for (let i = 0; i < IMAGES_PER_PRODUCT; i++) {
      imageRows.push({
        id: newId('image'),
        shopId: ctx.shopId,
        productId,
        url: productImageUrl(source.handle, i),
        altText: `${source.title} — view ${i + 1}`,
        position: i,
        variantIds: [],
        createdAt,
      });
    }

    products.push({
      id: productId,
      handle: source.handle,
      title: source.title,
      status: source.status ?? 'active',
      tags: source.tags,
      productType: source.productType,
      vendor: source.vendor,
      imageUrl: productImageUrl(source.handle, 0),
      createdAt,
      variants,
    });
  });

  await db.product.createMany({ data: productRows });
  await db.productOption.createMany({ data: optionRows });
  await db.productVariant.createMany({ data: variantRows });
  await db.productImage.createMany({ data: imageRows });

  return products;
}
