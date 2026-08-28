import type { SectionProps } from '../context.ts';
import { cardGridClass } from '../shared/grid.ts';
import { SectionShell } from '../shared/section-shell.tsx';
import { CardSkeletonGrid } from '../shared/skeleton.tsx';
import { ThemeImage } from '../shared/theme-image.tsx';
import { collectionPath } from '../shared/urls.ts';

/**
 * `collection-list` section.
 *
 * Server component, Tailwind only, driven entirely by `settings`. Colours and
 * fonts come from CSS custom properties set by the theme renderer — never
 * hardcode a colour here, or the section will ignore the shop's tokens.
 *
 * Owner: WS-F.
 */
export type CollectionListSettings = SectionProps<'collection-list'>['settings'];

export function CollectionList({ settings, data }: SectionProps<'collection-list'>) {
  const { heading, collectionHandles, columns } = settings;

  const collections = collectionHandles
    .map((handle) => data.collectionsByHandle?.[handle]?.collection)
    .filter((collection) => collection !== undefined);

  return (
    <SectionShell type="collection-list" width="wide" padding="lg">
      <h2 className="font-heading text-2xl text-text sm:text-3xl">{heading}</h2>
      {collections.length === 0 ? (
        <CardSkeletonGrid columns={columns} count={Math.min(collectionHandles.length, columns)} />
      ) : (
        <div className={`mt-8 grid gap-5 ${cardGridClass(columns)}`}>
          {collections.map((collection) => (
            <a
              key={collection.id}
              href={collectionPath(collection.handle)}
              data-collection-handle={collection.handle}
              className="group flex flex-col gap-3"
            >
              <ThemeImage
                src={collection.imageUrl}
                alt={collection.title}
                className="aspect-[4/3] w-full overflow-hidden rounded-theme transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div>
                <h3 className="font-medium text-sm text-text">{collection.title}</h3>
                <p className="text-text/60 text-xs">
                  {collection.productCount} {collection.productCount === 1 ? 'product' : 'products'}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
