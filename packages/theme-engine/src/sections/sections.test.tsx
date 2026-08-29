import {
  SECTION_TYPES,
  type Section,
  type SectionType,
  settingsSchemaFor,
} from '@merchant/contracts/theme';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  defaultSettingsFor,
  demoCollectionData,
  demoContext,
  imagelessSettingsFor,
  maximalSettingsFor,
} from '../test/fixtures.ts';
import { renderSection } from './index.tsx';

const markup = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node));

function render(type: SectionType, settings: unknown, ctx = demoContext()): string {
  return markup(renderSection({ id: `s-${type}`, type, settings } as Section, ctx));
}

/**
 * The AI emits both extremes — a doc with nothing but required fields, and one
 * with every optional field filled. A section that only survives its defaults
 * breaks the first time a model gets creative.
 */
describe.each(SECTION_TYPES)('%s', (type) => {
  it('renders with only its schema defaults', () => {
    expect(() => render(type, defaultSettingsFor(type))).not.toThrow();
  });

  it('renders with every optional setting populated', () => {
    const html = render(type, maximalSettingsFor(type));
    expect(html).toContain(`data-section="${type}"`);
  });

  it('keeps its layout when every image is null', () => {
    const html = render(type, imagelessSettingsFor(type));
    expect(html).not.toContain('src=""');
    expect(html).not.toContain('src="null"');
  });
});

/** Sections that carry images must reserve the space rather than collapse. */
describe.each(['hero', 'image-with-text', 'image-banner', 'slideshow', 'logo-list'] as const)(
  '%s',
  (type) => {
    it('renders a layout-stable placeholder when the image is null', () => {
      const html = render(type, imagelessSettingsFor(type));
      expect(html).toContain('data-placeholder="image"');
      expect(html).not.toContain('<img');
    });
  },
);

describe.each(['hero', 'image-with-text', 'image-banner'] as const)('%s', (type) => {
  it('renders the image instead of the placeholder when one is set', () => {
    const html = render(type, maximalSettingsFor(type));
    expect(html).toContain('<img');
    expect(html).not.toContain('data-placeholder="image"');
  });
});

/**
 * Repeating collections: the model routinely fills some entries and leaves the
 * rest null, so image and placeholder have to coexist in one section.
 */
describe.each(['slideshow', 'logo-list'] as const)('%s', (type) => {
  it('mixes real images and placeholders without collapsing either', () => {
    const html = render(type, maximalSettingsFor(type));
    expect(html).toContain('<img');
    expect(html).toContain('data-placeholder="image"');
  });
});

/**
 * Handles are model-authored and go stale the moment a merchant renames a
 * collection. A stale handle must degrade to an empty block, never a crash.
 */
describe('unresolved handles', () => {
  const empty = demoContext({
    collectionsByHandle: {},
    productsByHandle: {},
    newestProducts: [],
  });

  it('featured-collection keeps its heading and falls back to a skeleton grid', () => {
    const html = render('featured-collection', maximalSettingsFor('featured-collection'), empty);
    expect(html).toContain('edit</h2>');
    expect(html).toContain('data-empty="true"');
    expect(html).not.toContain('data-product-handle');
    // A dead "View all" link to a collection that does not resolve is worse
    // than no link at all.
    expect(html).not.toContain('View all');
  });

  it('product-grid falls back to newest products, then to an empty block', () => {
    const withNewest = demoContext({ productsByHandle: {} });
    const settings = settingsSchemaFor('product-grid').parse({ productHandles: [], columns: 4 });
    expect(render('product-grid', settings, withNewest)).toContain('data-product-handle');
    expect(render('product-grid', settings, empty)).not.toContain('data-product-handle');
  });

  it('collection-list drops handles that resolve to nothing', () => {
    // The maximal fixture asks for `featured` (resolvable) and one that is not.
    const html = render('collection-list', maximalSettingsFor('collection-list'));
    expect(html.match(/data-collection-handle/g)).toHaveLength(1);
  });
});

/**
 * The other side of the stale-handle coin: a handle that RESOLVED to a real
 * collection with zero products — every brand-new shop's homepage. That is a
 * real state, not a loading one, so it must never shimmer forever.
 */
describe('resolved but empty', () => {
  it('featured-collection shows an empty state and a working View all link', () => {
    const ctx = demoContext({
      collectionsByHandle: { featured: demoCollectionData({ products: [] }) },
    });
    const html = render('featured-collection', maximalSettingsFor('featured-collection'), ctx);
    expect(html).toContain('No products here yet');
    expect(html).not.toContain('data-empty="true"');
    // The collection exists, so the link goes somewhere — keep it.
    expect(html).toContain('View all');
  });

  it('product-grid tells an empty catalogue apart from a context still loading', () => {
    const settings = settingsSchemaFor('product-grid').parse({ productHandles: [], columns: 4 });
    const resolvedEmpty = render('product-grid', settings, demoContext({ newestProducts: [] }));
    expect(resolvedEmpty).toContain('No products here yet');
    expect(resolvedEmpty).not.toContain('data-empty="true"');
    // No `newestProducts` at all = the builder preview mid-load → skeleton.
    const midLoad = render('product-grid', settings, demoContext({ newestProducts: undefined }));
    expect(midLoad).toContain('data-empty="true"');
    expect(midLoad).not.toContain('No products here yet');
  });
});

describe('rich-text', () => {
  it('sanitizes the model-authored body', () => {
    const html = render('rich-text', maximalSettingsFor('rich-text'));
    expect(html).toContain('<strong>small lots</strong>');
    expect(html).not.toContain('<script>');
  });
});

describe('faq', () => {
  it('uses native disclosure elements, so it works without JavaScript', () => {
    const html = render('faq', maximalSettingsFor('faq'));
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html).toContain('<summary');
  });
});

describe('contact', () => {
  it('links the email and phone it was given', () => {
    const html = render('contact', maximalSettingsFor('contact'));
    expect(html).toContain('href="mailto:hello@aurorasupply.example"');
    expect(html).toContain('href="tel:+15035550142"');
  });

  it('renders a phone with no digits as text, never a dead tel: link', () => {
    const settings = settingsSchemaFor('contact').parse({ phone: 'Mon-Fri, ask for Sam' });
    const html = render('contact', settings);
    expect(html).not.toContain('href="tel:');
    expect(html).toContain('Mon-Fri, ask for Sam');
  });

  it('honors showForm', () => {
    const withoutForm = settingsSchemaFor('contact').parse({ showForm: false });
    expect(render('contact', withoutForm)).not.toContain('<form');
  });
});

describe('testimonials', () => {
  it('renders the rating it was given, accessibly', () => {
    const html = render('testimonials', maximalSettingsFor('testimonials'));
    expect(html).toContain('5 out of 5');
    expect(html).toContain('1 out of 5');
  });
});

describe('footer', () => {
  /**
   * The newsletter fallback used to render a bare <button>Subscribe</button>
   * outside any form and with no handler, so clicking it did nothing at all —
   * a dead control on every themed page. It must submit into `InertForm` like
   * the `newsletter` section does.
   */
  it('submits its newsletter fallback instead of rendering a dead button', () => {
    const html = render('footer', settingsSchemaFor('footer').parse({ showNewsletter: true }));
    expect(html).toContain('<form');
    expect(html).toContain('type="submit"');
    expect(html).toContain('required');
  });

  it('omits the newsletter entirely when the setting is off', () => {
    const html = render('footer', settingsSchemaFor('footer').parse({ showNewsletter: false }));
    expect(html).not.toContain('footer-newsletter-email');
  });
});
