import type { StorefrontProduct } from '@merchant/contracts/storefront';
import type { SectionProps } from '../context.ts';
import { compareAtFor, Price } from '../shared/price.tsx';
import { ProductCard } from '../shared/product-card.tsx';
import { RichHtml } from '../shared/rich-html.tsx';
import { cx, SectionShell } from '../shared/section-shell.tsx';

/**
 * `product-detail` section.
 * Core section: required on its page (SPEC §12).
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ProductDetailSettings = SectionProps<'product-detail'>['settings'];

export function ProductDetail({ settings, data }: SectionProps<'product-detail'>) {
  const product = data.product ?? null;
  if (!product) return null;

  const compareAt = compareAtFor(product);
  const firstVariant = product.variants[0] ?? null;
  const related = settings.relatedProducts ? (data.relatedProducts ?? []) : [];

  return (
    <SectionShell type="product-detail" padding="lg" width="wide">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Gallery product={product} layout={settings.galleryLayout} />

        <div className="flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
          <div className="flex flex-col gap-2">
            {settings.showVendor && product.vendor ? (
              <p className="text-text/50 text-xs uppercase tracking-widest">{product.vendor}</p>
            ) : null}
            <h1 className="font-heading text-2xl text-text sm:text-3xl">{product.title}</h1>
            <Price
              price={product.priceRange.min}
              compareAt={compareAt}
              fromPrefix={product.priceRange.min.amount !== product.priceRange.max.amount}
              className="text-lg"
            />
            {settings.showSku && firstVariant?.sku ? (
              <p className="text-text/50 text-xs">SKU {firstVariant.sku}</p>
            ) : null}
            {!product.available ? <p className="text-sm text-text/60">Sold out</p> : null}
          </div>

          {/*
            Option pickers, quantity and add-to-cart are one stateful unit, so
            they arrive as E2's client island. No slot means no buy box —
            better than a control that looks live and isn't.
          */}
          {data.slots?.productForm?.(product, settings) ?? null}

          <RichHtml html={product.descriptionHtml} className="text-sm" />

          {settings.showShareButtons && data.pageUrl ? (
            <ShareLinks url={data.pageUrl} title={product.title} />
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16 border-text/10 border-t pt-12">
          <h2 className="font-heading text-xl text-text">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </SectionShell>
  );
}

/**
 * All three layouts are CSS-only: `carousel` is a scroll-snap strip (swipeable
 * on touch, scrollable on desktop), so the gallery works without a client
 * island. Sections are Server Components — there is no state to switch images.
 */
function Gallery({
  product,
  layout,
}: {
  product: StorefrontProduct;
  layout: ProductDetailSettings['galleryLayout'];
}) {
  const images = product.images;

  if (images.length === 0) {
    return <div className="aspect-[4/5] w-full rounded-theme bg-text/5" />;
  }

  if (layout === 'carousel') {
    return (
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        data-gallery="carousel"
      >
        {images.map((image, index) => (
          <img
            // biome-ignore lint/suspicious/noArrayIndexKey: a product may repeat an image URL; the list is static settings data that never reorders
            key={`${index}-${image.url}`}
            src={image.url}
            alt={image.altText ?? product.title}
            loading={index === 0 ? 'eager' : 'lazy'}
            className="aspect-[4/5] w-full shrink-0 snap-center rounded-theme bg-text/5 object-cover"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cx('grid gap-3', layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}
      data-gallery={layout}
    >
      {images.map((image, index) => (
        <img
          // biome-ignore lint/suspicious/noArrayIndexKey: a product may repeat an image URL; the list is static settings data that never reorders
          key={`${index}-${image.url}`}
          src={image.url}
          alt={image.altText ?? product.title}
          loading={index === 0 ? 'eager' : 'lazy'}
          className={cx(
            'w-full rounded-theme bg-text/5 object-cover',
            layout === 'grid' && index === 0
              ? 'aspect-[4/5] sm:col-span-2 sm:aspect-[4/3]'
              : 'aspect-[4/5]',
          )}
        />
      ))}
    </div>
  );
}

function ShareLinks({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: 'Share', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    {
      label: 'Post',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    { label: 'Email', href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ];
  return (
    <ul className="flex items-center gap-4 pt-2">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
            className="text-text/60 text-xs underline underline-offset-4 transition-colors hover:text-text"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
