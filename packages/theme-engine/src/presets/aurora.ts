import type { ThemeDocInput } from './types.ts';

/**
 * "Aurora" — warm, serif-headed, the shop's default and the seed's published
 * theme (H1). Copy is written for Aurora Supply Co., the demo store.
 * Owner: WS-F.
 */
export const aurora: ThemeDocInput = {
  version: 1,
  tokens: {
    colorPrimary: '#8a5a3b',
    colorBackground: '#fbf7f0',
    colorText: '#2b2118',
    colorAccent: '#c2703d',
    fontHeading: 'fraunces',
    fontBody: 'work-sans',
    radius: 'md',
    buttonStyle: 'solid',
  },
  navigation: {
    links: [
      { label: 'Shop', url: '/collections/featured' },
      { label: 'New arrivals', url: '/collections/featured?sort=created-desc' },
      { label: 'Search', url: '/search' },
    ],
  },
  pages: {
    home: [
      {
        id: 'home-announcement',
        type: 'announcement-bar',
        settings: { text: 'Free carbon-neutral shipping on orders over $75.', dismissible: true },
      },
      {
        id: 'home-hero',
        type: 'hero',
        settings: {
          heading: 'Made for the long way round',
          subheading:
            'Merino, waxed canvas and honest hardware, cut in small runs in Portland, Oregon.',
          image: 'https://picsum.photos/seed/aurora-hero/2400/1200',
          imagePosition: 'background',
          alignment: 'left',
          height: 'large',
          primaryButton: { label: 'Shop the collection', url: '/collections/featured' },
          overlayOpacity: 40,
        },
      },
      {
        id: 'home-featured',
        type: 'featured-collection',
        settings: {
          heading: "This week's edit",
          collectionHandle: 'featured',
          productsToShow: 4,
          columns: 4,
          showViewAll: true,
        },
      },
      {
        id: 'home-story',
        type: 'image-with-text',
        settings: {
          heading: 'Small batches, built to outlast us',
          body: 'Every run is capped at 300 pieces so we can keep the mills close and the seams honest. What we make is meant to be repaired, not replaced.',
          image: 'https://picsum.photos/seed/aurora-workshop/1400/1400',
          imageSide: 'left',
        },
      },
      {
        id: 'home-new',
        type: 'product-grid',
        settings: { heading: 'Just landed', productHandles: [], columns: 4, rows: 1 },
      },
      {
        id: 'home-testimonials',
        type: 'testimonials',
        settings: {
          heading: 'Worn and reported back on',
          items: [
            {
              quote:
                'Three winters on the Cascade crest and the crewneck still looks better than the day it arrived.',
              author: 'Marta O.',
              role: 'Bend, OR',
              rating: 5,
            },
            {
              quote:
                'The fit notes were exact. First time I have ordered a jacket online and kept it.',
              author: 'Dev P.',
              role: 'Chicago, IL',
              rating: 5,
            },
            {
              quote:
                'Repaired a pocket seam for free two years in. That is the whole pitch, really.',
              author: 'Ingrid S.',
              role: 'Vancouver, BC',
              rating: 5,
            },
          ],
        },
      },
      {
        id: 'home-newsletter',
        type: 'newsletter',
        settings: {
          heading: 'Field notes, once a month',
          body: 'Restock alerts, repair guides, and nothing else.',
          buttonLabel: 'Sign up',
        },
      },
    ],
    product: [
      {
        id: 'product-detail',
        type: 'product-detail',
        settings: {
          galleryLayout: 'carousel',
          showVendor: true,
          showSku: false,
          showQuantitySelector: true,
          showShareButtons: false,
          relatedProducts: true,
        },
      },
      {
        id: 'product-faq',
        type: 'faq',
        settings: {
          heading: 'Shipping & returns',
          items: [
            {
              question: 'How long does delivery take?',
              answer:
                'Orders leave Portland within two business days. Domestic delivery is three to five days after that.',
            },
            {
              question: 'What is your returns policy?',
              answer:
                'Unworn pieces can be returned within 30 days for a full refund. We pay the return label.',
            },
            {
              question: 'Do you repair what you sell?',
              answer:
                'Yes. Send anything back with a note and we will repair seams, zips and hardware at no charge.',
            },
          ],
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
      {
        id: 'collection-newsletter',
        type: 'newsletter',
        settings: {
          heading: 'Told when it restocks',
          body: 'Small runs sell out. We will let you know before they do.',
          buttonLabel: 'Notify me',
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
          { label: 'New arrivals', url: '/collections/featured?sort=created-desc' },
          { label: 'Search', url: '/search' },
        ],
      },
      {
        heading: 'Your order',
        links: [
          { label: 'Cart', url: '/cart' },
          { label: 'Account', url: '/account' },
        ],
      },
    ],
    showNewsletter: true,
    text: 'Aurora Supply Co. — outdoor apparel made in Portland, Oregon since 2014.',
    showPaymentIcons: true,
  },
};
