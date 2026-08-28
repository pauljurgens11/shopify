'use client';

/**
 * `/` → the signed-in shop's admin, or the login page. Owner: WS-A.
 *
 * Shopify's admin has no content at the root either; it resolves to
 * `/store/{slug}` (SPEC §6).
 */
import { Frame, Loading } from '@shopify/polaris';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '../lib/session.ts';

export default function RootPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    router.replace(session ? `/store/${session.shop.slug}` : '/login');
  }, [session, isPending, router]);

  return (
    <Frame>
      <Loading />
    </Frame>
  );
}
