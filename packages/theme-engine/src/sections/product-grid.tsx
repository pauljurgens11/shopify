import type { SectionProps } from '../context.ts';
import { productGridClass } from '../shared/grid.ts';
import { ProductCard } from '../shared/product-card.tsx';
import { SectionShell } from '../shared/section-shell.tsx';
import { ProductSkeletonGrid } from '../shared/skeleton.tsx';

/**
 * `product-grid` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type ProductGridSettings = SectionProps<'product-grid'>['settings'];

export function ProductGrid({ settings, data }: SectionProps<'product-grid'>) {
  const { heading, productHandles, columns, rows } = settings;
  const limit = columns * rows;

  // An empty handle list means "newest products" (the schema says so); named
  // handles that no longer resolve are dropped rather than rendered blank.
  const products =
    productHandles.length > 0
      ? productHandles
          .map((handle) => data.productsByHandle?.[handle])
          .filter((product) => product !== undefined)
      : (data.newestProducts ?? []);

  const shown = products.slice(0, limit);

  return (
    <SectionShell type="product-grid" width="wide" padding="lg">
      {heading ? <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2> : null}
      {shown.length === 0 ? (
        <ProductSkeletonGrid columns={columns} count={Math.min(limit, columns)} />
      ) : (
        <div className={`mt-8 grid gap-x-5 gap-y-10 ${productGridClass(columns)}`}>
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}
