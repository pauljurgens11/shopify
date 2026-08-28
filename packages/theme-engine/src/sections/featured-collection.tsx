import type { SectionProps } from '../context.ts';
import { productGridClass } from '../shared/grid.ts';
import { ProductCard } from '../shared/product-card.tsx';
import { SectionShell } from '../shared/section-shell.tsx';
import { ProductSkeletonGrid } from '../shared/skeleton.tsx';
import { collectionPath } from '../shared/urls.ts';

/**
 * `featured-collection` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type FeaturedCollectionSettings = SectionProps<'featured-collection'>['settings'];

export function FeaturedCollection({ settings, data }: SectionProps<'featured-collection'>) {
  const { heading, collectionHandle, productsToShow, columns, showViewAll } = settings;
  // Handles are model-authored and go stale when a merchant renames a
  // collection — resolving to nothing must degrade, never crash.
  const resolved = data.collectionsByHandle?.[collectionHandle];
  const products = resolved?.products.slice(0, productsToShow) ?? [];

  return (
    <SectionShell type="featured-collection" width="wide" padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
        {showViewAll && resolved ? (
          <a
            href={collectionPath(collectionHandle)}
            className="text-sm text-text/60 underline underline-offset-4 transition-colors hover:text-text"
          >
            View all
          </a>
        ) : null}
      </div>

      {products.length === 0 ? (
        <ProductSkeletonGrid columns={columns} count={Math.min(productsToShow, columns)} />
      ) : (
        <div className={`mt-8 grid gap-x-5 gap-y-10 ${productGridClass(columns)}`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}
