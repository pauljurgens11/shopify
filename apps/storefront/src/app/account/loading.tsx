/** Account skeleton: order history table left, details form right. Owner: WS-H. */
import { Bar, SkeletonPage } from '../../components/skeleton.tsx';

export default function Loading() {
  return (
    <SkeletonPage>
      <Bar className="h-9 w-56" />
      <Bar className="mt-2 h-3 w-64" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <Bar className="h-6 w-40" />
          <div className="mt-4 rounded-theme border border-text/10 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between py-3">
                <Bar className="h-3 w-16" />
                <Bar className="h-3 w-28" />
                <Bar className="h-3 w-20" />
                <Bar className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Bar className="h-6 w-36" />
          <div className="mt-4 flex flex-col gap-4 rounded-theme border border-text/10 p-5">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <Bar className="h-3 w-20" />
                <Bar className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
