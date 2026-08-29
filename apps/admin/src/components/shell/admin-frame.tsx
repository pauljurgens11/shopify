'use client';

/**
 * The admin shell: Frame + TopBar + Navigation (SPEC §9, PARITY.md).
 * Owner: WS-A — leaf pages render inside this, they do not replace it.
 *
 * Also the auth gate. Every `/store/{slug}` page is behind it, so an expired
 * session anywhere lands on /login with a `next` param and comes back to the
 * page it was aimed at.
 */
import { BRAND_NAME } from '@merchant/config/constants';
import { Banner, Button, Frame, Loading, Page } from '@shopify/polaris';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { setUnauthorizedHandler, useApiQuery } from '../../lib/api.ts';
import { useSession } from '../../lib/session.ts';
import { AdminNavigation } from './admin-navigation.tsx';
import { AdminTopBar } from './admin-top-bar.tsx';
import { PageSkeleton } from './page-skeleton.tsx';
import { ToastProvider } from './toast-provider.tsx';

/**
 * The bag mark at the left of the top bar. `Frame` hands this to `TopBar`,
 * which is where the real admin puts it — rendering it inside `AdminTopBar`
 * ourselves would land it after the nav toggle instead of before it.
 *
 * BOTH sources are required even though the asset is the same file. `Frame`
 * also feeds this logo to the contextual save bar, which renders
 * `<img src={contextualSaveBarSource || ''}>` unconditionally — omitting it
 * puts an `src=""` on every page, which React warns about and the browser
 * answers by re-downloading the page itself (PARITY.md: no console warnings).
 */
const BRAND_LOGO = {
  topBarSource: '/shopify-bag.svg',
  contextualSaveBarSource: '/shopify-bag.svg',
  accessibilityLabel: BRAND_NAME,
  width: 32,
} as const;

export function loginHref(next?: string): string {
  return next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login';
}

export function AdminFrame({
  shopSlug,
  children,
}: {
  shopSlug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, error, refetch } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Shopify shows the open-order count beside Orders. The list endpoint is
  // cursor-paginated with no total (SPEC §5), so this counts a page and says
  // "50+" beyond it rather than inventing a number. Owner: WS-C (C5).
  const openOrders = useApiQuery<{ data: unknown[] }>(
    ['open-orders-count'],
    '/admin/api/orders?tab=open&limit=50',
    { enabled: Boolean(session) },
  );

  // `usePathname` drops the query string, and `useSearchParams` would demand a
  // Suspense boundary around the whole shell — so the redirects append
  // `window.location.search` at event time instead. They only ever run in
  // effects/handlers, where `window` exists. Without it, expiring on
  // /orders?tab=unfulfilled came back on tab "All".

  // Any 401 from any page, not just this query — a session can expire between
  // two clicks and the resulting failure should not be a silent empty table.
  useEffect(() => {
    setUnauthorizedHandler(() => router.replace(loginHref(`${pathname}${window.location.search}`)));
    return () => setUnauthorizedHandler(undefined);
  }, [router, pathname]);

  useEffect(() => {
    if (error?.status === 401) {
      router.replace(loginHref(`${pathname}${window.location.search}`));
    }
  }, [error, router, pathname]);

  // The URL names a shop; the session decides which one you actually have.
  // Editing the slug by hand must not show another merchant's chrome — but the
  // rest of the path is yours, so /store/other/orders lands on YOUR orders.
  useEffect(() => {
    if (session && session.shop.slug !== shopSlug) {
      const prefix = `/store/${shopSlug}`;
      const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
      router.replace(`/store/${session.shop.slug}${rest}${window.location.search}`);
    }
  }, [session, shopSlug, router, pathname]);

  // A 401 is on its way to /login, so keep the bar. Anything else — the API is
  // down, a 500 — has to say so: an endless progress bar is the spinner-only
  // screen PARITY.md rules out.
  if (error && error.status !== 401) {
    return (
      <Frame>
        {/* No page title: the brand as an H1 reads like a page someone forgot
            to name. The banner is the whole screen here. */}
        <Page>
          <Banner tone="critical" title="Can’t reach your store">
            <p>{error.message}</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </Banner>
        </Page>
      </Frame>
    );
  }

  // PARITY.md: "Skeleton page on load, never a spinner-only screen" — the very
  // first paint of the admin is the one most likely to be seen.
  if (isPending || !session) {
    return (
      <Frame>
        <Loading />
        <PageSkeleton />
      </Frame>
    );
  }

  return (
    <Frame
      logo={{ ...BRAND_LOGO, url: `/store/${shopSlug}` }}
      topBar={
        <AdminTopBar session={session} onNavigationToggle={() => setMobileNavOpen((o) => !o)} />
      }
      navigation={<AdminNavigation session={session} openOrders={openOrders.data?.data.length} />}
      showMobileNavigation={mobileNavOpen}
      onNavigationDismiss={() => setMobileNavOpen(false)}
    >
      <ToastProvider>{children}</ToastProvider>
    </Frame>
  );
}
