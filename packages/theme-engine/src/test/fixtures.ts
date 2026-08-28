/**
 * Shared render fixtures. F2 extends the smoke-render suite with these, so keep
 * them shaped exactly like the storefront contracts — a fixture that drifts from
 * `@merchant/contracts/storefront` turns the suite into theatre.
 */
import type { Cart } from '@merchant/contracts/cart';
import type { StorefrontProduct } from '@merchant/contracts/storefront';
import type { SectionType } from '@merchant/contracts/theme';
import { settingsSchemaFor } from '@merchant/contracts/theme';
import type { CollectionData, SectionDataContext, ThemeCollection } from '../render.tsx';

const USD = 'USD';

export function demoProduct(overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
  return {
    id: 'prod_01J9ZKQ4YQK7T8V2N3M5P6R7S8',
    title: 'Alpine Merino Crewneck',
    handle: 'alpine-merino-crewneck',
    descriptionHtml: '<p>A <strong>midweight</strong> crewneck in 18.5-micron merino.</p>',
    vendor: 'Aurora Supply Co.',
    productType: 'Knitwear',
    tags: ['new', 'knitwear'],
    images: [
      { url: 'https://picsum.photos/seed/alpine-1/1200/1500', altText: 'Front' },
      { url: 'https://picsum.photos/seed/alpine-2/1200/1500', altText: 'Back' },
    ],
    options: [
      { name: 'Size', values: ['S', 'M', 'L'] },
      { name: 'Colour', values: ['Fog', 'Ink'] },
    ],
    variants: [
      {
        id: 'var_01J9ZKQ4YQK7T8V2N3M5P6R7S9',
        title: 'S / Fog',
        sku: 'AMC-S-FOG',
        price: { amount: 12400, currencyCode: USD },
        compareAtPrice: { amount: 16000, currencyCode: USD },
        optionValues: { Size: 'S', Colour: 'Fog' },
        available: true,
        imageUrl: 'https://picsum.photos/seed/alpine-1/1200/1500',
      },
    ],
    priceRange: {
      min: { amount: 12400, currencyCode: USD },
      max: { amount: 13800, currencyCode: USD },
    },
    available: true,
    seo: { title: null, description: null },
    ...overrides,
  };
}

export function demoCollection(overrides: Partial<ThemeCollection> = {}): ThemeCollection {
  return {
    id: 'col_01J9ZKQ4YQK7T8V2N3M5P6R7SA',
    title: 'Featured',
    handle: 'featured',
    descriptionHtml: '<p>The pieces we are wearing this week.</p>',
    imageUrl: 'https://picsum.photos/seed/featured/1600/900',
    productCount: 12,
    ...overrides,
  };
}

export function demoCollectionData(overrides: Partial<CollectionData> = {}): CollectionData {
  return {
    collection: demoCollection(),
    products: [
      demoProduct(),
      demoProduct({ id: 'prod_01J9ZKQ4YQK7T8V2N3M5P6R7SB', handle: 'trail-cap' }),
    ],
    pagination: { prevUrl: null, nextUrl: '/collections/featured?cursor=abc' },
    sort: 'manual',
    ...overrides,
  };
}

export function demoCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'chk_01J9ZKQ4YQK7T8V2N3M5P6R7SC',
    token: 'cart-token',
    currencyCode: USD,
    lines: [
      {
        id: 'line-1',
        productId: 'prod_01J9ZKQ4YQK7T8V2N3M5P6R7S8',
        variantId: 'var_01J9ZKQ4YQK7T8V2N3M5P6R7S9',
        quantity: 2,
        title: 'Alpine Merino Crewneck',
        variantTitle: 'S / Fog',
        handle: 'alpine-merino-crewneck',
        imageUrl: 'https://picsum.photos/seed/alpine-1/1200/1500',
        unitPrice: { amount: 12400, currencyCode: USD },
        lineTotal: { amount: 24800, currencyCode: USD },
        available: 9,
      },
    ],
    subtotal: { amount: 24800, currencyCode: USD },
    itemCount: 2,
    discountCode: null,
    createdAt: '2026-08-28T10:00:00.000Z',
    updatedAt: '2026-08-28T10:00:00.000Z',
    ...overrides,
  };
}

export function demoContext(overrides: Partial<SectionDataContext> = {}): SectionDataContext {
  return {
    shop: { name: 'Aurora Supply Co.', slug: 'demo', currencyCode: USD },
    pageUrl: 'https://demo.lvh.me:3002/products/alpine-merino-crewneck',
    product: demoProduct(),
    relatedProducts: [demoProduct({ id: 'prod_01J9ZKQ4YQK7T8V2N3M5P6R7SB', handle: 'trail-cap' })],
    collection: demoCollectionData(),
    cart: demoCart(),
    collectionsByHandle: { featured: demoCollectionData() },
    productsByHandle: { 'alpine-merino-crewneck': demoProduct() },
    newestProducts: [demoProduct()],
    ...overrides,
  };
}

/**
 * Smallest settings object each section type accepts — everything else comes
 * from the schema `.default()`s, which is exactly what the AI emits at minimum.
 */
const MINIMAL_SETTINGS: Record<SectionType, Record<string, unknown>> = {
  'announcement-bar': { text: 'Free shipping on orders over $75' },
  hero: { heading: 'Built for the long way round' },
  'image-with-text': { heading: 'Our story', body: 'Small batches, Portland-made.' },
  'featured-collection': { heading: 'Featured', collectionHandle: 'featured' },
  'product-grid': {},
  'collection-list': { heading: 'Shop by category', collectionHandles: ['featured'] },
  'rich-text': { body: '<p>Made to be worn out.</p>' },
  'image-banner': {},
  slideshow: { slides: [{ heading: 'Autumn' }] },
  testimonials: { items: [{ quote: 'Worth every cent.', author: 'Ada L.' }] },
  'logo-list': { logos: [{ alt: 'Field & Forest' }] },
  newsletter: {},
  faq: { items: [{ question: 'Do you ship internationally?', answer: 'Yes, to 40 countries.' }] },
  contact: {},
  'product-detail': {},
  'collection-page': {},
  'cart-page': {},
  footer: {},
};

/** Settings for `type` with every optional field left at its schema default. */
export function defaultSettingsFor(type: SectionType): unknown {
  return settingsSchemaFor(type).parse(MINIMAL_SETTINGS[type]);
}
