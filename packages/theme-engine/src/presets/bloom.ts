import type { ThemeDocInput } from './types.ts';

/**
 * "Bloom" — soft pastel, rounded, serif display headings and soft buttons.
 * Owner: WS-F.
 */
export const bloom: ThemeDocInput = {
  version: 1,
  tokens: {
    colorPrimary: '#c4638a',
    colorBackground: '#fffaf8',
    colorText: '#3d2b34',
    colorAccent: '#7cbfae',
    fontHeading: 'playfair',
    fontBody: 'dm-sans',
    radius: 'lg',
    buttonStyle: 'soft',
  },
  navigation: {
    links: [
      { label: 'Shop', url: '/collections/featured' },
      { label: 'New in', url: '/collections/featured?sort=created-desc' },
      { label: 'Search', url: '/search' },
    ],
  },
  pages: {
    home: [
      {
        id: 'home-announcement',
        type: 'announcement-bar',
        settings: {
          text: 'Spring restock is here.',
          link: { label: 'See what landed', url: '/collections/featured?sort=created-desc' },
          dismissible: true,
        },
      },
      {
        id: 'home-slideshow',
        type: 'slideshow',
        settings: {
          autoplay: true,
          intervalSeconds: 6,
          slides: [
            {
              image:
                'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=2400&h=1200&fit=crop&q=80&auto=format',
              heading: 'Soft season',
              body: 'Washed linen and brushed cotton, cut loose.',
              button: { label: 'Shop new in', url: '/collections/featured?sort=created-desc' },
            },
            {
              image:
                'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=2400&h=1200&fit=crop&q=80&auto=format',
              heading: 'Made in daylight',
              body: 'Dyed in small lots, so no two runs match exactly.',
              button: { label: 'Browse the collection', url: '/collections/featured' },
            },
          ],
        },
      },
      {
        id: 'home-featured',
        type: 'featured-collection',
        settings: {
          heading: 'Loved this week',
          collectionHandle: 'featured',
          productsToShow: 4,
          columns: 4,
          showViewAll: true,
        },
      },
      {
        id: 'home-story',
        type: 'rich-text',
        settings: {
          heading: 'A note on how we make things',
          body: '<p>We dye in <strong>small lots</strong>, which means colour shifts a little from run to run. We think that is the good part.</p><p>Everything is finished by hand in Portland, and everything can be sent back to us for repair.</p>',
          alignment: 'center',
          width: 'narrow',
        },
      },
      {
        id: 'home-grid',
        type: 'product-grid',
        settings: { heading: 'Just in', productHandles: [], columns: 4, rows: 1 },
      },
      {
        id: 'home-newsletter',
        type: 'newsletter',
        settings: {
          heading: 'Letters from the studio',
          body: 'Restocks, seconds sales, and the occasional recipe.',
          buttonLabel: 'Join',
        },
      },
    ],
    product: [
      {
        id: 'product-detail',
        type: 'product-detail',
        settings: {
          galleryLayout: 'grid',
          showVendor: true,
          showSku: false,
          showQuantitySelector: true,
          showShareButtons: true,
          relatedProducts: true,
        },
      },
      {
        id: 'product-contact',
        type: 'contact',
        settings: {
          heading: 'Not sure about the fit?',
          body: 'Tell us your usual size and we will tell you what to order.',
          email: 'hello@aurorasupply.example',
          showForm: false,
        },
      },
    ],
    collection: [
      {
        id: 'collection-main',
        type: 'collection-page',
        settings: {
          showFilters: true,
          showSort: true,
          columns: 4,
          productsPerPage: 24,
          showDescription: true,
        },
      },
    ],
  },
  footer: {
    columns: [
      {
        heading: 'Shop',
        links: [
          { label: 'Featured', url: '/collections/featured' },
          { label: 'New in', url: '/collections/featured?sort=created-desc' },
        ],
      },
      {
        heading: 'Help',
        links: [
          { label: 'Search', url: '/search' },
          { label: 'Cart', url: '/cart' },
          { label: 'Account', url: '/account' },
        ],
      },
    ],
    showNewsletter: true,
    text: 'Aurora Supply Co. Made slowly in Portland, Oregon.',
    showPaymentIcons: true,
  },
};
