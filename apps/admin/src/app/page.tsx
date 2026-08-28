'use client';

import { Card, Layout, Page, Text } from '@shopify/polaris';

/**
 * Placeholder root. WS-A replaces this with the login redirect and the
 * /store/{shopSlug} shell (Frame + TopBar + Navigation).
 *
 * NOTE the 'use client' above — it is not optional. Polaris components use React
 * context, so any file importing one must be a Client Component. See README.
 */
export default function HomePage() {
  return (
    <Page title="Merchant">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              Skeleton is up. WS-A: replace with the Frame shell and auth redirect.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
