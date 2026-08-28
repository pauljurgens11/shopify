import { cardGridClass, productGridClass } from './grid.ts';

/**
 * What a grid renders when its handles resolve to nothing — a stale AI handle,
 * or the builder preview running ahead of the catalogue. Keeping the grid's
 * shape is the point: the page still reads as a storefront instead of jumping.
 *
 * Owner: WS-F.
 */
export function ProductSkeletonGrid({ columns, count }: { columns: number; count: number }) {
  return (
    <div className={`mt-8 grid gap-x-5 gap-y-10 ${productGridClass(columns)}`} data-empty="true">
      {Array.from({ length: Math.max(count, 1) }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder tiles have no identity
        <div key={index} className="flex flex-col gap-3">
          <div className="aspect-[4/5] w-full rounded-theme bg-text/5" />
          <div className="h-3 w-2/3 rounded-theme bg-text/5" />
          <div className="h-3 w-1/3 rounded-theme bg-text/5" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeletonGrid({ columns, count }: { columns: number; count: number }) {
  return (
    <div className={`mt-8 grid gap-5 ${cardGridClass(columns)}`} data-empty="true">
      {Array.from({ length: Math.max(count, 1) }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder tiles have no identity
        <div key={index} className="flex flex-col gap-3">
          <div className="aspect-[4/3] w-full rounded-theme bg-text/5" />
          <div className="h-3 w-1/2 rounded-theme bg-text/5" />
        </div>
      ))}
    </div>
  );
}
