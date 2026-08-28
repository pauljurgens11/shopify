/** Cart skeleton: line rows left, summary card right. Owner: WS-H. */
import { Bar, SkeletonPage } from '../../components/skeleton.tsx';

export default function Loading() {
  return (
    <SkeletonPage>
      <Bar className="h-9 w-48" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ul className="divide-y divide-text/10 border-text/10 border-y">
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex gap-4 py-5">
              <Bar className="h-24 w-20 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <Bar className="h-3 w-1/2" />
                <Bar className="h-3 w-1/4" />
                <Bar className="mt-3 h-8 w-32" />
              </div>
              <Bar className="h-3 w-14 shrink-0" />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4 rounded-theme border border-text/10 p-5">
          <div className="flex items-center justify-between">
            <Bar className="h-3 w-16" />
            <Bar className="h-3 w-14" />
          </div>
          <Bar className="h-11 w-full" />
        </div>
      </div>
    </SkeletonPage>
  );
}
