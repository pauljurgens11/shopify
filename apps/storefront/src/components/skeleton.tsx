/**
 * Page-shaped loading skeletons. Owner: WS-H (H3 polish licence).
 *
 * Every storefront route below is server-rendered against the API, so a cold
 * fetch used to hold a blank page. These are the `loading.tsx` bodies: the
 * layout's header stays up and the content area keeps its shape, which is what
 * a first-class store does instead of flashing a spinner.
 *
 * Token-driven like the sections (`bg-text/10`, `rounded-theme`) so a skeleton
 * never shows a colour the shop's theme does not use.
 */

/** One grey placeholder. `className` carries the size, always. */
export function Bar({ className }: { className: string }) {
  return <div className={`rounded-theme bg-text/10 ${className}`} />;
}

/** The shared wrapper: pulses, announces itself once, keeps the page width. */
export function SkeletonPage({
  children,
  width = 'wide',
}: {
  children: React.ReactNode;
  width?: 'wide' | 'narrow';
}) {
  return (
    <main
      aria-busy="true"
      className={`mx-auto w-full animate-pulse px-6 py-12 ${
        width === 'wide' ? 'max-w-6xl' : 'max-w-3xl'
      }`}
    >
      <span className="sr-only">Loading…</span>
      {children}
    </main>
  );
}

/** The narrow centered auth pages (`/account/login`, `/account/register`). */
export function AuthSkeleton({ fields }: { fields: number }) {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-md animate-pulse px-6 py-16">
      <span className="sr-only">Loading…</span>
      <Bar className="h-9 w-48" />
      <Bar className="mt-3 h-3 w-64 max-w-full" />
      <div className="mt-8 flex flex-col gap-4">
        {Array.from({ length: fields }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder fields have no identity
          <div key={index} className="flex flex-col gap-1.5">
            <Bar className="h-3 w-20" />
            <Bar className="h-9 w-full" />
          </div>
        ))}
        <Bar className="mt-2 h-12 w-full" />
      </div>
    </main>
  );
}

/** Product tiles at the theme's default four-up. */
export function TileGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder tiles have no identity
        <div key={index} className="flex flex-col gap-3">
          <Bar className="aspect-[4/5] w-full" />
          <Bar className="h-3 w-2/3" />
          <Bar className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
