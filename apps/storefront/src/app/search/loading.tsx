/** Search skeleton: the query field, then a results grid. Owner: WS-H. */
import { Bar, SkeletonPage, TileGrid } from '../../components/skeleton.tsx';

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="flex gap-2">
        <Bar className="h-12 flex-1" />
        <Bar className="h-12 w-28" />
      </div>
      <Bar className="mt-10 h-9 w-72 max-w-full" />
      <TileGrid />
    </SkeletonPage>
  );
}
