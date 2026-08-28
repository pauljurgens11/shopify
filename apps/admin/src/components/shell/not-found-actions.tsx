'use client';

/**
 * The 404 page's action. Owner: WS-H (H3).
 *
 * Split out because `not-found.tsx` is a server component (it exports
 * `metadata`) and Polaris `Button` needs the client. `/` resolves to the
 * signed-in shop's admin or to `/login`, so this is the one destination that is
 * correct whether or not there is a session — a 404 can be hit either way.
 */
import { Button, InlineStack } from '@shopify/polaris';

export function NotFoundActions() {
  return (
    <InlineStack align="center">
      <Button variant="primary" url="/">
        Back to admin
      </Button>
    </InlineStack>
  );
}
