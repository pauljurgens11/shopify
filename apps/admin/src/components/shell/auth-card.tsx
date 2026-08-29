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
import { BrandLogo } from './brand-logo.tsx';

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
      {/* `margin: auto` on a flex item centres it on both axes, and — unlike
          `align-items: center` — a form taller than the viewport still starts
          at the top instead of having its head clipped off. */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 2 * var(--p-space-800))' }}>
        <div style={{ width: '100%', maxWidth: '400px', margin: 'auto' }}>
          <BlockStack gap="400">
            <InlineStack align="center">
              {/* SPEC §1: the brand mark, exactly as the real admin's login. */}
              <h1 style={{ margin: 0 }}>
                <BrandLogo />
              </h1>
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
      </div>
    </Box>
  );
}
