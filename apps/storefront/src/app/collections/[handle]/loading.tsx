/** Collection skeleton: title, filter/sort row, product grid. Owner: WS-H. */
import { Bar, SkeletonPage, TileGrid } from '../../../components/skeleton.tsx';

export default function Loading() {
  return (
    <SkeletonPage>
      <Bar className="h-9 w-64" />
      <Bar className="mt-3 h-3 w-96 max-w-full" />
      <div className="mt-6 flex items-center justify-between border-text/10 border-y py-3">
        <Bar className="h-3 w-40" />
        <Bar className="h-3 w-28" />
      </div>
      <TileGrid />
    </SkeletonPage>
  );
}
