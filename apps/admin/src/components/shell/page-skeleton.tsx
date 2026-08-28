'use client';

/**
 * The loading skeleton every admin page shares. Owner: WS-A.
 *
 * PARITY.md: "Skeleton page on load, never a spinner-only screen." Leaf pages
 * should render `<PageSkeleton />` while their query is pending rather than
 * inventing their own.
 */
import { Card, SkeletonBodyText, SkeletonPage } from '@shopify/polaris';

export function PageSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <SkeletonPage primaryAction>
      <Card>
        <SkeletonBodyText lines={lines} />
      </Card>
    </SkeletonPage>
  );
}
