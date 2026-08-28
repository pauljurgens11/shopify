/**
 * Section registry (SPEC §12). Owner: WS-F.
 *
 * ALREADY COMPLETE — all 18 section types from SPEC §12 are registered. Fill in
 * `sections/<type>.tsx`; do not edit the registry map below. That is what keeps
 * it from being a merge conflict on every theme PR (CLAUDE.md §3).
 */
import type { Section, SectionType } from '@merchant/contracts/theme';
import type { SectionDataContext } from '../context.ts';
import { AnnouncementBar } from './announcement-bar.tsx';
import { CartPage } from './cart-page.tsx';
import { CollectionList } from './collection-list.tsx';
import { CollectionPage } from './collection-page.tsx';
import { Contact } from './contact.tsx';
import { Faq } from './faq.tsx';
import { FeaturedCollection } from './featured-collection.tsx';
import { Footer } from './footer.tsx';
import { Hero } from './hero.tsx';
import { ImageBanner } from './image-banner.tsx';
import { ImageWithText } from './image-with-text.tsx';
import { LogoList } from './logo-list.tsx';
import { Newsletter } from './newsletter.tsx';
import { ProductDetail } from './product-detail.tsx';
import { ProductGrid } from './product-grid.tsx';
import { RichText } from './rich-text.tsx';
import { Slideshow } from './slideshow.tsx';
import { Testimonials } from './testimonials.tsx';

// biome-ignore lint/suspicious/noExplicitAny: the registry is heterogeneous by design
export const SECTION_COMPONENTS: Record<SectionType, (props: any) => React.ReactNode> = {
  'announcement-bar': AnnouncementBar,
  hero: Hero,
  'image-with-text': ImageWithText,
  'featured-collection': FeaturedCollection,
  'product-grid': ProductGrid,
  'collection-list': CollectionList,
  'rich-text': RichText,
  'image-banner': ImageBanner,
  slideshow: Slideshow,
  testimonials: Testimonials,
  'logo-list': LogoList,
  newsletter: Newsletter,
  faq: Faq,
  contact: Contact,
  'product-detail': ProductDetail,
  'collection-page': CollectionPage,
  'cart-page': CartPage,
  footer: Footer,
};

/**
 * Render one section. `data` carries the live storefront data (WS-E injects it,
 * see `../context.ts`); marketing sections ignore it, core sections need it.
 * An unregistered type renders nothing rather than crashing the page — the doc
 * may have been authored against an older registry.
 */
export function renderSection(section: Section, data: SectionDataContext) {
  const Component = SECTION_COMPONENTS[section.type];
  if (!Component) return null;
  return <Component key={section.id} settings={section.settings} data={data} />;
}
