import type { SectionProps } from '../context.ts';
import { productGridClass } from '../shared/grid.ts';
import { ProductCard } from '../shared/product-card.tsx';
import { RichHtml } from '../shared/rich-html.tsx';
import { SectionShell } from '../shared/section-shell.tsx';
import { ThemeButton } from '../shared/theme-button.tsx';

/**
 * `collection-page` section.
 * Core section: required on its page (SPEC §12).
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type CollectionPageSettings = SectionProps<'collection-page'>['settings'];

/** Mirrors `listStorefrontProductsQuery.sort` — the options E1 actually accepts. */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'manual', label: 'Featured' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'title-asc', label: 'Alphabetically, A–Z' },
  { value: 'title-desc', label: 'Alphabetically, Z–A' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'created-desc', label: 'Date, new to old' },
];

export function CollectionPage({ settings, data }: SectionProps<'collection-page'>) {
  const { showFilters, showSort, columns, productsPerPage, showDescription } = settings;
  const collectionData = data.collection ?? null;
  if (!collectionData) return null;

  const { collection, products, pagination, sort } = collectionData;
  const shown = products.slice(0, productsPerPage);

  return (
    <SectionShell type="collection-page" padding="lg" width="wide">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">{collection.title}</h1>
        {showDescription ? (
          <RichHtml html={collection.descriptionHtml} className="max-w-2xl text-sm" />
        ) : null}
      </header>

      {showFilters || showSort ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-text/10 border-y py-3">
          <div className="flex items-center gap-4">
            {showFilters ? (
              (data.slots?.collectionFilters?.() ?? <AvailabilityFilterFallback />)
            ) : (
              <span />
            )}
            <p className="text-text/60 text-xs">
              {collection.productCount} {collection.productCount === 1 ? 'product' : 'products'}
            </p>
          </div>
          {showSort
            ? (data.slots?.collectionSort?.(sort ?? 'manual') ?? (
                <SortFallback current={sort ?? 'manual'} />
              ))
            : null}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-text/60">
          No products here yet. Check back soon.
        </p>
      ) : (
        <div className={`mt-8 grid gap-x-5 gap-y-10 ${productGridClass(columns)}`}>
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {pagination && (pagination.prevUrl || pagination.nextUrl) ? (
        <nav className="mt-12 flex items-center justify-center gap-3">
          {pagination.prevUrl ? (
            <ThemeButton href={pagination.prevUrl} variant="secondary" size="sm">
              Previous
            </ThemeButton>
          ) : null}
          {pagination.nextUrl ? (
            <ThemeButton href={pagination.nextUrl} variant="secondary" size="sm">
              Next
            </ThemeButton>
          ) : null}
        </nav>
      ) : null}
    </SectionShell>
  );
}

/**
 * Plain GET forms, so both controls work before E2's islands mount (and with
 * JS off). E1 reads `?sort=` and `?available=`.
 */
function SortFallback({ current }: { current: string }) {
  return (
    <form method="get" className="flex items-center gap-2">
      <label htmlFor="collection-sort" className="text-text/60 text-xs">
        Sort by
      </label>
      <select
        id="collection-sort"
        name="sort"
        defaultValue={current}
        className="rounded-theme border border-text/20 bg-transparent px-2 py-1.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ThemeButton type="submit" variant="secondary" size="sm">
        Apply
      </ThemeButton>
    </form>
  );
}

function AvailabilityFilterFallback() {
  return (
    <form method="get" className="flex items-center gap-2">
      <input
        id="collection-available"
        type="checkbox"
        name="available"
        value="1"
        className="size-4 accent-[var(--theme-color-primary)]"
      />
      <label htmlFor="collection-available" className="text-sm text-text/70">
        In stock only
      </label>
      <ThemeButton type="submit" variant="secondary" size="sm">
        Filter
      </ThemeButton>
    </form>
  );
}
