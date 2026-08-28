'use client';

/**
 * The centred card the login and signup pages sit in (PARITY.md).
 * Owner: WS-A.
 *
 * These two pages are outside the Frame, so they are the one place in the admin
 * with layout of its own. It is built from Polaris primitives and `--p-*`
 * tokens only — no stylesheet (CLAUDE.md §7).
 */
import { BlockStack, Box, Card, InlineStack, Text } from '@shopify/polaris';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Box background="bg-surface-secondary" minHeight="100vh" padding="800">
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <BlockStack gap="400">
          <InlineStack align="center">
            {/* SPEC §1: the brand is "Merchant". Never the Shopify name or logo. */}
            <Text as="h1" variant="headingLg">
              Merchant
            </Text>
          </InlineStack>

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  {title}
                </Text>
                {subtitle ? (
                  <Text as="p" tone="subdued">
                    {subtitle}
                  </Text>
                ) : null}
              </BlockStack>
              {children}
            </BlockStack>
          </Card>

          {footer ? <InlineStack align="center">{footer}</InlineStack> : null}
        </BlockStack>
      </div>
    </Box>
  );
}
