/**
 * Pure-helper tests for the tenant extension. The full end-to-end tenancy
 * suite (SPEC §14.1, real Postgres) lives in apps/api — these cover the
 * stamping/scoping logic that suite builds on, with no database needed.
 */
import { describe, expect, it } from 'vitest';
import { scopeWhere, stampWriteData } from './tenant.ts';

const SHOP = 'shop_01TESTSHOP';

describe('stampWriteData', () => {
  it('stamps a flat create payload', () => {
    expect(stampWriteData('Customer', { email: 'a@b.c' }, SHOP)).toEqual({
      email: 'a@b.c',
      shopId: SHOP,
    });
  });

  it('stamps every row of a createMany array', () => {
    const out = stampWriteData('Customer', [{ email: 'a' }, { email: 'b' }], SHOP);
    expect(out).toEqual([
      { email: 'a', shopId: SHOP },
      { email: 'b', shopId: SHOP },
    ]);
  });

  it('overrides a caller-supplied foreign shopId', () => {
    const out = stampWriteData('Product', { title: 'x', shopId: 'shop_EVIL' }, SHOP);
    expect(out).toEqual({ title: 'x', shopId: SHOP });
  });

  it('stamps nested relation creates (the WS-B day-one case)', () => {
    const out = stampWriteData(
      'Product',
      {
        title: 'Trail Jacket',
        variants: { create: [{ title: 'S' }, { title: 'M' }] },
        images: { create: { url: 'https://x/1.jpg' } },
      },
      SHOP,
    );
    expect(out).toEqual({
      title: 'Trail Jacket',
      shopId: SHOP,
      variants: {
        create: [
          { title: 'S', shopId: SHOP },
          { title: 'M', shopId: SHOP },
        ],
      },
      images: { create: { url: 'https://x/1.jpg', shopId: SHOP } },
    });
  });

  it('stamps nested createMany.data and connectOrCreate.create', () => {
    const out = stampWriteData(
      'Product',
      {
        title: 'x',
        variants: { createMany: { data: [{ title: 'S' }], skipDuplicates: true } },
        collections: {
          connectOrCreate: [
            { where: { id: 'colprod_1' }, create: { position: 1, collectionId: 'col_1' } },
          ],
        },
      },
      SHOP,
    );
    expect(out).toEqual({
      title: 'x',
      shopId: SHOP,
      variants: { createMany: { data: [{ title: 'S', shopId: SHOP }], skipDuplicates: true } },
      collections: {
        connectOrCreate: [
          {
            // `where` untouched — it is a unique lookup, not an insert payload.
            where: { id: 'colprod_1' },
            create: { position: 1, collectionId: 'col_1', shopId: SHOP },
          },
        ],
      },
    });
  });

  it('recurses two levels deep', () => {
    const out = stampWriteData(
      'Order',
      { email: 'x@y.z', lineItems: { create: [{ title: 'A', quantity: 1 }] } },
      SHOP,
    );
    expect(out).toEqual({
      email: 'x@y.z',
      shopId: SHOP,
      lineItems: { create: [{ title: 'A', quantity: 1, shopId: SHOP }] },
    });
  });

  it('does NOT descend into JSON columns that merely look like nested writes', () => {
    // `shippingAddress` is a Json column on Order, not a relation — a payload
    // containing a `create` key inside it must pass through byte-identical.
    const json = { create: { sneaky: true }, city: 'Berlin' };
    const out = stampWriteData('Order', { shippingAddress: json }, SHOP);
    expect(out).toEqual({ shippingAddress: json, shopId: SHOP });
  });

  it('leaves nested connect untouched (documented residual vector)', () => {
    const out = stampWriteData(
      'CollectionProduct',
      { position: 1, collection: { connect: { id: 'col_1' } } },
      SHOP,
    );
    expect(out).toEqual({
      position: 1,
      shopId: SHOP,
      collection: { connect: { id: 'col_1' } },
    });
  });
});

describe('scopeWhere', () => {
  it('constrains tenant models by shopId via AND', () => {
    expect(scopeWhere('Product', { status: 'active' }, SHOP)).toEqual({
      status: 'active',
      AND: [{ shopId: SHOP }],
    });
  });

  it('preserves caller AND clauses', () => {
    const out = scopeWhere('Product', { AND: [{ status: 'active' }] }, SHOP);
    expect(out.AND).toEqual([{ status: 'active' }, { shopId: SHOP }]);
  });

  it('wraps a non-array AND', () => {
    const out = scopeWhere('Product', { AND: { status: 'active' } }, SHOP);
    expect(out.AND).toEqual([{ status: 'active' }, { shopId: SHOP }]);
  });

  it('constrains Shop by its own id, not a shopId column', () => {
    expect(scopeWhere('Shop', undefined, SHOP)).toEqual({ AND: [{ id: SHOP }] });
  });

  it('scopes OrderSequence like any tenant table', () => {
    expect(scopeWhere('OrderSequence', undefined, SHOP)).toEqual({
      AND: [{ shopId: SHOP }],
    });
  });
});
