import type { ThemeDocInput } from './types.ts';

/**
 * "Monochrome" — stark black and white, square corners, outline buttons. The
 * proof that switching preset visibly changes the storefront (H2 flow (d)).
 * Owner: WS-F.
 */
export const monochrome: ThemeDocInput = {
  version: 1,
  tokens: {
    colorPrimary: '#111111',
    colorBackground: '#ffffff',
    colorText: '#111111',
    colorAccent: '#6f6f6f',
    fontHeading: 'archivo',
    fontBody: 'inter',
    radius: 'none',
    buttonStyle: 'outline',
  },
  navigation: {
    links: [
      // No 'Search' link — the header chrome already renders one (see aurora).
      { label: 'Shop', url: '/collections/featured' },
      { label: 'New', url: '/collections/featured?sort=created-desc' },
    ],
  },
  pages: {
    home: [
      {
        id: 'home-announcement',
        type: 'announcement-bar',
        settings: {
          text: 'Complimentary shipping and returns, everywhere.',
          dismissible: false,
        },
      },
      {
        id: 'home-hero',
        type: 'hero',
        settings: {
          heading: 'Aurora Supply Co.',
          subheading: 'Utility apparel. Nothing decorative.',
          image:
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=2400&h=1400&fit=crop&q=80&auto=format',
          imagePosition: 'background',
          alignment: 'center',
          height: 'full',
          primaryButton: { label: 'View the collection', url: '/collections/featured' },
          overlayOpacity: 25,
        },
      },
      {
        id: 'home-grid',
        type: 'product-grid',
        settings: { heading: null, productHandles: [], columns: 3, rows: 2 },
      },
      {
        id: 'home-banner',
        type: 'image-banner',
        settings: {
          image:
            'https://images.unsplash.com/photo-1544441893-675973e31985?w=2400&h=900&fit=crop&q=80&auto=format',
          heading: 'Autumn/Winter',
          body: 'Twelve pieces. One palette.',
          button: { label: 'Shop the season', url: '/collections/featured' },
          alignment: 'center',
        },
      },
      {
        id: 'home-featured',
        type: 'featured-collection',
        settings: {
          heading: 'Featured',
          collectionHandle: 'featured',
          productsToShow: 6,
          columns: 3,
          showViewAll: true,
        },
      },
      {
        id: 'home-newsletter',
        type: 'newsletter',
        settings: { heading: 'Dispatches', body: null, buttonLabel: 'Subscribe' },
      },
    ],
    product: [
      {
        id: 'product-detail',
        type: 'product-detail',
        settings: {
          galleryLayout: 'stacked',
          showVendor: false,
          showSku: true,
          showQuantitySelector: true,
          showShareButtons: false,
          relatedProducts: true,
        },
      },
    ],
    collection: [
      {
        id: 'collection-main',
        type: 'collection-page',
        settings: {
          showFilters: false,
          showSort: true,
          columns: 3,
          productsPerPage: 24,
          showDescription: false,
        },
      },
    ],
  },
  footer: {
    columns: [
      {
        heading: 'Index',
        links: [
          { label: 'Featured', url: '/collections/featured' },
          { label: 'Search', url: '/search' },
          { label: 'Cart', url: '/cart' },
        ],
      },
    ],
    showNewsletter: false,
    text: null,
    showPaymentIcons: false,
  },
};
