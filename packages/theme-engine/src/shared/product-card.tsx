import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { compareAtFor, Price } from './price.tsx';
import { cx } from './section-shell.tsx';
import { productPath } from './urls.ts';

/**
 * One product tile — the unit every grid on the storefront is built from
 * (featured-collection, product-grid, collection-page, related products).
 * Owner: WS-F.
 */
export function ProductCard({
  product,
  className,
}: {
  product: StorefrontProduct;
  className?: string;
}) {
  const image = product.images[0] ?? null;
  const compareAt = compareAtFor(product);
  const isRange = product.priceRange.min.amount !== product.priceRange.max.amount;

  return (
    <a
      href={productPath(product.handle)}
      className={cx('group flex flex-col gap-3', className)}
      data-product-handle={product.handle}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-theme bg-text/5">
        {image ? (
          // Theme images are arbitrary remote URLs (picsum, MinIO, whatever the
          // model emitted); next/image would need a per-shop remotePatterns
          // allowlist, so sections use a plain <img>.
          <img
            src={image.url}
            alt={image.altText ?? product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text/30 text-xs">
            {product.title}
          </div>
        )}
        {!product.available ? (
          <span className="absolute top-3 left-3 rounded-theme bg-background/90 px-2 py-1 font-medium text-[11px] text-text uppercase tracking-wide">
            Sold out
          </span>
        ) : compareAt ? (
          <span className="absolute top-3 left-3 rounded-theme bg-accent px-2 py-1 font-medium text-[11px] text-background uppercase tracking-wide">
            Sale
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium text-sm text-text leading-snug">{product.title}</h3>
        <Price
          price={product.priceRange.min}
          compareAt={compareAt}
          fromPrefix={isRange}
          className="text-sm"
        />
      </div>
    </a>
  );
}
