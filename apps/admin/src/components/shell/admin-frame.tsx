'use client';

/**
 * The admin shell: Frame + TopBar + Navigation (SPEC §9, PARITY.md).
 * Owner: WS-A — leaf pages render inside this, they do not replace it.
 *
 * Also the auth gate. Every `/store/{slug}` page is behind it, so an expired
 * session anywhere lands on /login with a `next` param and comes back to the
 * page it was aimed at.
 */
import { Banner, Button, Frame, Loading, Page } from '@shopify/polaris';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { setUnauthorizedHandler } from '../../lib/api.ts';
import { useSession } from '../../lib/session.ts';
import { AdminNavigation } from './admin-navigation.tsx';
import { AdminTopBar } from './admin-top-bar.tsx';
import { ToastProvider } from './toast-provider.tsx';

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

  // Any 401 from any page, not just this query — a session can expire between
  // two clicks and the resulting failure should not be a silent empty table.
  useEffect(() => {
    setUnauthorizedHandler(() => router.replace(loginHref(pathname)));
    return () => setUnauthorizedHandler(undefined);
  }, [router, pathname]);

  useEffect(() => {
    if (error?.status === 401) router.replace(loginHref(pathname));
  }, [error, router, pathname]);

  // The URL names a shop; the session decides which one you actually have.
  // Editing the slug by hand must not show another merchant's chrome.
  useEffect(() => {
    if (session && session.shop.slug !== shopSlug) {
      router.replace(`/store/${session.shop.slug}`);
    }
  }, [session, shopSlug, router]);

  // A 401 is on its way to /login, so keep the bar. Anything else — the API is
  // down, a 500 — has to say so: an endless progress bar is the spinner-only
  // screen PARITY.md rules out.
  if (error && error.status !== 401) {
    return (
      <Frame>
        <Page title="Merchant">
          <Banner tone="critical" title="Can’t reach your store">
            <p>{error.message}</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </Banner>
        </Page>
      </Frame>
    );
  }

  if (isPending || !session) {
    return (
      <Frame>
        <Loading />
      </Frame>
    );
  }

  return (
    <Frame
      topBar={
        <AdminTopBar session={session} onNavigationToggle={() => setMobileNavOpen((o) => !o)} />
      }
      navigation={<AdminNavigation session={session} />}
      showMobileNavigation={mobileNavOpen}
      onNavigationDismiss={() => setMobileNavOpen(false)}
    >
      <ToastProvider>{children}</ToastProvider>
    </Frame>
  );
}
