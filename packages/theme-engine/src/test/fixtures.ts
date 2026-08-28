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

/**
 * Every optional field populated — the other half of the render matrix. The AI
 * emits both extremes, and a section that only survives its defaults is a
 * section that breaks on real model output.
 */
const MAXIMAL_SETTINGS: Record<SectionType, Record<string, unknown>> = {
  'announcement-bar': {
    text: 'Free carbon-neutral shipping on every order over $75.',
    link: { label: 'See the details', url: '/collections/featured' },
    dismissible: true,
  },
  hero: {
    heading: 'Made for the long way round',
    subheading: 'Merino, waxed canvas and honest hardware, cut in small runs.',
    image: 'https://picsum.photos/seed/hero/2400/1200',
    imagePosition: 'left',
    alignment: 'left',
    height: 'full',
    primaryButton: { label: 'Shop the collection', url: '/collections/featured' },
    secondaryButton: { label: 'Read our story', url: '/collections/featured' },
    overlayOpacity: 65,
  },
  'image-with-text': {
    heading: 'Small batches, built to outlast us',
    body: 'Every run is capped at 300 pieces so we can keep the mills close.',
    image: 'https://picsum.photos/seed/story/1400/1400',
    imageSide: 'right',
    button: { label: 'How we make things', url: '/collections/featured' },
  },
  'featured-collection': {
    heading: "This week's edit",
    collectionHandle: 'featured',
    productsToShow: 12,
    columns: 5,
    showViewAll: true,
  },
  'product-grid': {
    heading: 'Just landed',
    productHandles: ['alpine-merino-crewneck'],
    columns: 5,
    rows: 4,
  },
  'collection-list': {
    heading: 'Shop by category',
    collectionHandles: ['featured', 'does-not-exist'],
    columns: 4,
  },
  'rich-text': {
    heading: 'A note on how we make things',
    body: '<p>We dye in <strong>small lots</strong>.</p><script>alert(1)</script>',
    alignment: 'right',
    width: 'wide',
  },
  'image-banner': {
    image: 'https://picsum.photos/seed/banner/2400/900',
    heading: 'Autumn/Winter',
    body: 'Twelve pieces. One palette.',
    button: { label: 'Shop the season', url: '/collections/featured' },
    alignment: 'left',
  },
  slideshow: {
    autoplay: true,
    intervalSeconds: 15,
    slides: [
      {
        image: 'https://picsum.photos/seed/slide-1/2400/1200',
        heading: 'Soft season',
        body: 'Washed linen and brushed cotton.',
        button: { label: 'Shop new in', url: '/collections/featured' },
      },
      { image: null, heading: null, body: null, button: null },
    ],
  },
  testimonials: {
    heading: 'Worn and reported back on',
    items: [
      {
        quote: 'Three winters on the crest and it still looks new.',
        author: 'Marta O.',
        role: 'Bend, OR',
        rating: 5,
      },
      { quote: 'The fit notes were exact.', author: 'Dev P.', role: null, rating: 1 },
    ],
  },
  'logo-list': {
    heading: 'Stocked by',
    logos: [
      { image: 'https://picsum.photos/seed/logo-1/240/120', alt: 'Field & Forest' },
      { image: null, alt: 'Northline Goods' },
    ],
  },
  newsletter: {
    heading: 'Field notes, once a month',
    body: 'Restock alerts, repair guides, and nothing else.',
    buttonLabel: 'Sign up',
  },
  faq: {
    heading: 'Shipping & returns',
    items: [
      { question: 'How long does delivery take?', answer: 'Two business days to dispatch.' },
      { question: 'Do you repair what you sell?', answer: 'Yes, at no charge.' },
    ],
  },
  contact: {
    heading: 'Not sure about the fit?',
    body: 'Tell us your usual size and we will tell you what to order.',
    email: 'hello@aurorasupply.example',
    phone: '+1 (503) 555-0142',
    showForm: true,
  },
  'product-detail': {
    galleryLayout: 'grid',
    showVendor: true,
    showSku: true,
    showQuantitySelector: true,
    showShareButtons: true,
    relatedProducts: true,
  },
  'collection-page': {
    showFilters: true,
    showSort: true,
    columns: 5,
    productsPerPage: 48,
    showDescription: true,
  },
  'cart-page': {
    showNoteField: true,
    showShippingEstimate: true,
    checkoutButtonLabel: 'Continue to checkout',
  },
  footer: {
    columns: [
      { heading: 'Shop', links: [{ label: 'Featured', url: '/collections/featured' }] },
      { heading: 'Shop', links: [] },
    ],
    showNewsletter: true,
    text: 'Aurora Supply Co. — Portland, Oregon.',
    showPaymentIcons: true,
  },
};

/** Settings for `type` with every optional field populated. */
export function maximalSettingsFor(type: SectionType): unknown {
  return settingsSchemaFor(type).parse(MAXIMAL_SETTINGS[type]);
}

/**
 * Every image setting nulled — the state the AI produces most often, and the
 * one that has to stay layout-stable rather than collapsing the section.
 */
export function imagelessSettingsFor(type: SectionType): unknown {
  const base = structuredClone(MAXIMAL_SETTINGS[type]) as Record<string, unknown>;
  if ('image' in base) base.image = null;
  if (Array.isArray(base.slides)) {
    base.slides = (base.slides as Record<string, unknown>[]).map((s) => ({ ...s, image: null }));
  }
  if (Array.isArray(base.logos)) {
    base.logos = (base.logos as Record<string, unknown>[]).map((l) => ({ ...l, image: null }));
  }
  return settingsSchemaFor(type).parse(base);
}
