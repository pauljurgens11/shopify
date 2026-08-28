/**
 * ThemeDoc — the contract between the AI builder (WS-F), the storefront
 * renderer (WS-E), and Claude itself (SPEC §12).
 *
 * This schema is handed to the model as a tool-call schema, so every field needs
 * a `.describe()`: that text IS the prompt. A vague description here produces a
 * bad storefront, and no amount of prompt engineering elsewhere fixes it.
 *
 * Safety by construction: a section is data, never code. No HTML is rendered
 * unsanitized, no URL is fetched at render time, no arbitrary CSS is injected.
 *
 * Owner: WS-F.
 */
import { z } from 'zod';
import { idSchema, timestampsSchema } from './common.ts';

/* -------------------------------------------------------------------------- */
/* Design tokens                                                               */
/* -------------------------------------------------------------------------- */

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color like #1a1a1a');

export const themeTokensSchema = z.object({
  colorPrimary: hexColor.describe('Primary brand color. Buttons and links use this.'),
  colorBackground: hexColor.describe('Page background. Usually near-white or near-black.'),
  colorText: hexColor.describe('Body text color. Must have strong contrast on colorBackground.'),
  colorAccent: hexColor.describe('Secondary accent for badges, sale tags, highlights.'),
  fontHeading: z
    .enum(['inter', 'playfair', 'dm-sans', 'space-grotesk', 'lora', 'archivo', 'fraunces'])
    .describe('Heading typeface.'),
  fontBody: z
    .enum(['inter', 'dm-sans', 'source-sans', 'lora', 'work-sans'])
    .describe('Body typeface. Prefer a highly legible sans for long text.'),
  radius: z
    .enum(['none', 'sm', 'md', 'lg', 'full'])
    .describe('Corner rounding across the whole storefront.'),
  buttonStyle: z.enum(['solid', 'outline', 'soft']).describe('Primary button treatment.'),
});
export type ThemeTokens = z.infer<typeof themeTokensSchema>;

/* -------------------------------------------------------------------------- */
/* Section settings — one schema per registered section type                    */
/* -------------------------------------------------------------------------- */

const imageSetting = z
  .string()
  .url()
  .nullable()
  .default(null)
  .describe('Absolute image URL, or null to omit the image.');

const alignment = z.enum(['left', 'center', 'right']).default('center');

const linkSetting = z.object({
  label: z.string().max(64),
  url: z
    .string()
    .max(512)
    .describe('Storefront-relative path like /collections/new, or an absolute https URL.'),
});

const sectionSettings = {
  'announcement-bar': z.object({
    text: z.string().max(200),
    link: linkSetting.nullable().default(null),
    dismissible: z.boolean().default(true),
  }),

  hero: z.object({
    heading: z.string().max(120),
    subheading: z.string().max(300).nullable().default(null),
    image: imageSetting,
    imagePosition: z.enum(['background', 'left', 'right']).default('background'),
    alignment,
    height: z.enum(['small', 'medium', 'large', 'full']).default('large'),
    primaryButton: linkSetting.nullable().default(null),
    secondaryButton: linkSetting.nullable().default(null),
    overlayOpacity: z.number().min(0).max(100).default(30),
  }),

  'image-with-text': z.object({
    heading: z.string().max(120),
    body: z.string().max(1000),
    image: imageSetting,
    imageSide: z.enum(['left', 'right']).default('left'),
    button: linkSetting.nullable().default(null),
  }),

  'featured-collection': z.object({
    heading: z.string().max(120),
    collectionHandle: z
      .string()
      .describe('Handle of a collection that EXISTS in this shop. Do not invent handles.'),
    productsToShow: z.number().int().min(2).max(12).default(4),
    columns: z.number().int().min(2).max(5).default(4),
    showViewAll: z.boolean().default(true),
  }),

  'product-grid': z.object({
    heading: z.string().max(120).nullable().default(null),
    productHandles: z
      .array(z.string())
      .max(24)
      .default([])
      .describe('Specific product handles. Empty means newest products.'),
    columns: z.number().int().min(2).max(5).default(4),
    rows: z.number().int().min(1).max(4).default(2),
  }),

  'collection-list': z.object({
    heading: z.string().max(120),
    collectionHandles: z.array(z.string()).min(1).max(12),
    columns: z.number().int().min(2).max(4).default(3),
  }),

  'rich-text': z.object({
    heading: z.string().max(120).nullable().default(null),
    body: z.string().max(4000).describe('Plain text or minimal HTML. Sanitized before render.'),
    alignment,
    width: z.enum(['narrow', 'wide']).default('narrow'),
  }),

  'image-banner': z.object({
    image: imageSetting,
    heading: z.string().max(120).nullable().default(null),
    body: z.string().max(500).nullable().default(null),
    button: linkSetting.nullable().default(null),
    alignment,
  }),

  slideshow: z.object({
    autoplay: z.boolean().default(true),
    intervalSeconds: z.number().int().min(3).max(15).default(6),
    slides: z
      .array(
        z.object({
          image: imageSetting,
          heading: z.string().max(120).nullable().default(null),
          body: z.string().max(300).nullable().default(null),
          button: linkSetting.nullable().default(null),
        }),
      )
      .min(1)
      .max(6),
  }),

  testimonials: z.object({
    heading: z.string().max(120).default('What our customers say'),
    items: z
      .array(
        z.object({
          quote: z.string().max(400),
          author: z.string().max(80),
          role: z.string().max(80).nullable().default(null),
          rating: z.number().int().min(1).max(5).default(5),
        }),
      )
      .min(1)
      .max(9),
  }),

  'logo-list': z.object({
    heading: z.string().max(120).nullable().default(null),
    logos: z
      .array(z.object({ image: imageSetting, alt: z.string().max(80) }))
      .min(1)
      .max(12),
  }),

  newsletter: z.object({
    heading: z.string().max(120).default('Stay in the loop'),
    body: z.string().max(300).nullable().default(null),
    buttonLabel: z.string().max(40).default('Subscribe'),
  }),

  faq: z.object({
    heading: z.string().max(120).default('Frequently asked questions'),
    items: z
      .array(z.object({ question: z.string().max(200), answer: z.string().max(1500) }))
      .min(1)
      .max(15),
  }),

  contact: z.object({
    heading: z.string().max(120).default('Get in touch'),
    body: z.string().max(500).nullable().default(null),
    email: z.string().email().nullable().default(null),
    phone: z.string().max(40).nullable().default(null),
    showForm: z.boolean().default(true),
  }),

  /* --- core sections: required on their page, layout-only settings --------- */

  'product-detail': z.object({
    galleryLayout: z.enum(['carousel', 'stacked', 'grid']).default('carousel'),
    showVendor: z.boolean().default(true),
    showSku: z.boolean().default(false),
    showQuantitySelector: z.boolean().default(true),
    showShareButtons: z.boolean().default(false),
    relatedProducts: z.boolean().default(true),
  }),

  'collection-page': z.object({
    showFilters: z.boolean().default(true),
    showSort: z.boolean().default(true),
    columns: z.number().int().min(2).max(5).default(4),
    productsPerPage: z.number().int().min(8).max(48).default(24),
    showDescription: z.boolean().default(true),
  }),

  'cart-page': z.object({
    showNoteField: z.boolean().default(true),
    showShippingEstimate: z.boolean().default(false),
    checkoutButtonLabel: z.string().max(40).default('Check out'),
  }),

  footer: z.object({
    columns: z
      .array(z.object({ heading: z.string().max(60), links: z.array(linkSetting).max(8) }))
      .max(4)
      .default([]),
    showNewsletter: z.boolean().default(false),
    text: z.string().max(300).nullable().default(null),
    showPaymentIcons: z.boolean().default(true),
  }),
} as const;

/** The registry (SPEC §12: ~18 sections). Order here = order in the builder UI. */
export const SECTION_TYPES = [
  'announcement-bar',
  'hero',
  'image-with-text',
  'featured-collection',
  'product-grid',
  'collection-list',
  'rich-text',
  'image-banner',
  'slideshow',
  'testimonials',
  'logo-list',
  'newsletter',
  'faq',
  'contact',
  'product-detail',
  'collection-page',
  'cart-page',
  'footer',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** Sections a page MUST contain for the storefront to function (SPEC §12). */
export const REQUIRED_SECTIONS = {
  home: [] as SectionType[],
  product: ['product-detail'] as SectionType[],
  collection: ['collection-page'] as SectionType[],
} as const;

/** One section = { id, type, settings }. Enumerated explicitly so the discriminated
 * union stays fully typed — `zod` needs a literal tuple, not a mapped record. */
const sec = <T extends SectionType>(type: T) =>
  z.object({
    id: z.string().min(1).max(64).describe('Stable unique id within the page.'),
    type: z.literal(type),
    settings: sectionSettings[type],
  });

export const sectionSchema = z.discriminatedUnion('type', [
  sec('announcement-bar'),
  sec('hero'),
  sec('image-with-text'),
  sec('featured-collection'),
  sec('product-grid'),
  sec('collection-list'),
  sec('rich-text'),
  sec('image-banner'),
  sec('slideshow'),
  sec('testimonials'),
  sec('logo-list'),
  sec('newsletter'),
  sec('faq'),
  sec('contact'),
  sec('product-detail'),
  sec('collection-page'),
  sec('cart-page'),
  sec('footer'),
]);
export type Section = z.infer<typeof sectionSchema>;

/** Per-type settings schema, for validating one section in isolation. */
export function settingsSchemaFor(type: SectionType) {
  return sectionSettings[type];
}

/* -------------------------------------------------------------------------- */
/* The document                                                                 */
/* -------------------------------------------------------------------------- */

export const themeDocSchema = z.object({
  version: z.literal(1),
  tokens: themeTokensSchema,
  navigation: z.object({
    links: z.array(linkSetting).max(8).describe('Header navigation, left to right.'),
  }),
  pages: z.object({
    home: z.array(sectionSchema).min(1).max(20),
    product: z.array(sectionSchema).min(1).max(10),
    collection: z.array(sectionSchema).min(1).max(10),
  }),
  footer: sectionSettings.footer,
});
export type ThemeDoc = z.infer<typeof themeDocSchema>;

/**
 * Structural checks zod can't express: each page carries its core section.
 * Run this after `themeDocSchema.parse` on anything the model produced.
 */
export function validateThemeDoc(doc: ThemeDoc): string[] {
  const problems: string[] = [];
  for (const [page, required] of Object.entries(REQUIRED_SECTIONS) as [
    keyof typeof REQUIRED_SECTIONS,
    SectionType[],
  ][]) {
    const present = new Set(doc.pages[page].map((s) => s.type));
    for (const type of required) {
      if (!present.has(type)) problems.push(`pages.${page} is missing required section "${type}"`);
    }
  }
  const ids = new Set<string>();
  for (const [page, sections] of Object.entries(doc.pages)) {
    for (const section of sections as Section[]) {
      const key = `${page}:${section.id}`;
      if (ids.has(key)) problems.push(`Duplicate section id "${section.id}" on page ${page}`);
      ids.add(key);
      // The footer lives at doc level (`doc.footer`) and renders on every page;
      // one placed inside a page would render twice.
      if (section.type === 'footer') {
        problems.push(
          `pages.${page} contains a "footer" section — the footer belongs at doc.footer`,
        );
      }
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------- */
/* Versions, builder conversation                                               */
/* -------------------------------------------------------------------------- */

export const themeVersionSchema = z
  .object({
    id: idSchema,
    status: z.enum(['draft', 'published']),
    themeJson: themeDocSchema,
    publishedAt: z.string().datetime({ offset: true }).nullable().default(null),
    /** The chat message that produced this version — the version-history label. */
    createdByMessage: z.string().max(1000).nullable().default(null),
  })
  .merge(timestampsSchema);
export type ThemeVersion = z.infer<typeof themeVersionSchema>;

export const builderMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  /** Set on assistant messages that produced a theme, so chat links to a version. */
  themeVersionId: idSchema.nullable().default(null),
  status: z.enum(['pending', 'complete', 'failed']).default('complete'),
  createdAt: z.string().datetime({ offset: true }),
});

export const sendBuilderMessageInput = z.object({ message: z.string().min(1).max(4000) });

export const sendBuilderMessageResponse = z.object({
  jobId: z.string(),
  message: builderMessageSchema,
});

export const publishThemeInput = z.object({ themeVersionId: idSchema });

/** 3 canned presets so the demo works with no ANTHROPIC_API_KEY (SPEC §12). */
export const THEME_PRESETS = ['aurora', 'monochrome', 'bloom'] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];

export const applyPresetInput = z.object({ preset: z.enum(THEME_PRESETS) });
