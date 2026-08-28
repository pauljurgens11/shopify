/**
 * The four demo collections (H1).
 *
 * `featured` is a hard contract with F1: every theme preset's
 * featured-collection section points at that handle, and `presets.test.ts`
 * enforces it. Renaming it here blanks the storefront home page.
 */
import { newId } from '@merchant/config/ids';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { SeededProduct } from './catalog.ts';
import { daysAgo, type SeedContext } from './context.ts';

export interface SeededCollection {
  id: string;
  handle: string;
  productIds: string[];
}

export async function createCollections(
  db: PrismaClient,
  ctx: SeedContext,
  products: SeededProduct[],
): Promise<SeededCollection[]> {
  const active = products.filter((p) => p.status === 'active');
  const byType = (type: string) => active.filter((p) => p.productType === type);
  const tagged = (tag: string) => active.filter((p) => p.tags.includes(tag));

  const definitions = [
    {
      handle: 'featured',
      title: 'Featured',
      description:
        'The pieces we put out front this week — the ones we would hand you first if you walked into the shop on Alder Street.',
      type: 'manual' as const,
      sortOrder: 'manual',
      ruleSet: null,
      members: [
        ...tagged('flagship'),
        ...byType('Knitwear').slice(0, 2),
        ...byType('Outerwear').slice(0, 2),
      ],
    },
    {
      handle: 'new-arrivals',
      title: 'New Arrivals',
      description: 'Everything that has landed in the last few weeks, newest first.',
      type: 'smart' as const,
      sortOrder: 'created-desc',
      // A smart collection is the only way B3's rule engine and the "Automatic"
      // badge on the collections index have anything to show.
      ruleSet: {
        appliedDisjunctively: false,
        rules: [{ column: 'tag', relation: 'equals', condition: 'new' }],
      },
      members: tagged('new'),
    },
    {
      handle: 'outerwear',
      title: 'Outerwear',
      description:
        'Waxed canvas, recycled down and three-layer shells. Built for a wet coast and a long winter.',
      type: 'manual' as const,
      sortOrder: 'manual',
      ruleSet: null,
      members: byType('Outerwear'),
    },
    {
      handle: 'everyday-basics',
      title: 'Everyday Basics',
      description: 'Tees, socks and chinos worth rebuying. The quiet half of the wardrobe.',
      type: 'manual' as const,
      sortOrder: 'title-asc',
      ruleSet: null,
      members: tagged('basics'),
    },
  ];

  const collections: SeededCollection[] = [];
  const joinRows: Prisma.CollectionProductCreateManyInput[] = [];

  for (const [index, definition] of definitions.entries()) {
    const id = newId('collection');
    // Dedupe: a product may satisfy two of the selectors above.
    const members = [...new Map(definition.members.map((p) => [p.id, p])).values()];
    const createdAt = daysAgo(ctx, 280 - index * 30, 11);

    await db.collection.create({
      data: {
        id,
        shopId: ctx.shopId,
        title: definition.title,
        handle: definition.handle,
        descriptionHtml: `<p>${definition.description}</p>`,
        type: definition.type,
        ruleSet: definition.ruleSet ?? undefined,
        sortOrder: definition.sortOrder,
        imageUrl: `https://picsum.photos/seed/collection-${definition.handle}/1600/900`,
        seoTitle: `${definition.title} — Aurora Supply Co.`,
        seoDescription: definition.description.slice(0, 160),
        createdAt,
        updatedAt: createdAt,
      },
    });

    members.forEach((product, position) => {
      joinRows.push({
        shopId: ctx.shopId,
        collectionId: id,
        productId: product.id,
        // Smart collections have no manual order; leaving position 0 across the
        // set is what B3 will see when it recomputes membership from the rules.
        position: definition.type === 'manual' ? position : 0,
      });
    });

    collections.push({ id, handle: definition.handle, productIds: members.map((p) => p.id) });
  }

  await db.collectionProduct.createMany({ data: joinRows });
  return collections;
}
