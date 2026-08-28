/** PDP skeleton: gallery left, title/price/variant/buy column right. Owner: WS-H. */
import { Bar, SkeletonPage } from '../../../components/skeleton.tsx';

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="grid gap-10 lg:grid-cols-2">
        <Bar className="aspect-square w-full" />
        <div className="flex flex-col gap-4">
          <Bar className="h-8 w-3/4" />
          <Bar className="h-5 w-24" />
          <Bar className="mt-4 h-3 w-16" />
          <div className="flex gap-2">
            <Bar className="h-10 w-16" />
            <Bar className="h-10 w-16" />
            <Bar className="h-10 w-16" />
          </div>
          <Bar className="mt-2 h-12 w-full" />
          <Bar className="mt-4 h-3 w-full" />
          <Bar className="h-3 w-5/6" />
          <Bar className="h-3 w-2/3" />
        </div>
      </div>
    </SkeletonPage>
  );
}
