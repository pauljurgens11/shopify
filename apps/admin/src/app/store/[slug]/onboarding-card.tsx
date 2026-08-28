'use client';

/**
 * Home's onboarding guide (SPEC §8; PARITY.md §Home & Analytics). Owner: WS-G.
 *
 * Every task is checked from REAL state, not from a flag someone remembered to
 * set: a checklist that says "Add your first product" is done when there are no
 * products is worse than no checklist. Each check is its own query so one that
 * the viewer lacks permission for degrades to "not done" rather than blanking
 * the card.
 */
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineStack,
  ProgressBar,
  Text,
} from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useApiQuery } from '../../../lib/api.ts';

type ListResponse = { data: unknown[] };
type ThemeVersions = { data: { status: string }[] };
type Processors = { data: { enabled: boolean }[] };

export type OnboardingTask = {
  title: string;
  description: string;
  href: string;
  action: string;
  done: boolean;
};

export function OnboardingCard({ slug }: { slug: string }) {
  const products = useApiQuery<ListResponse>(
    ['onboarding', 'products'],
    '/admin/api/products?limit=1',
  );
  const orders = useApiQuery<ListResponse>(['onboarding', 'orders'], '/admin/api/orders?limit=1');
  const themes = useApiQuery<ThemeVersions>(['onboarding', 'themes'], '/admin/api/themes/versions');
  const processors = useApiQuery<Processors>(
    ['onboarding', 'processors'],
    '/admin/api/payments/processors',
  );

  const tasks: OnboardingTask[] = [
    {
      title: 'Add your first product',
      description: 'Products are what your customers browse and buy.',
      href: `/store/${slug}/products`,
      action: 'Add product',
      done: (products.data?.data.length ?? 0) > 0,
    },
    {
      title: 'Customize your storefront',
      description: 'Describe the store you want and publish the theme.',
      href: `/store/${slug}/storefront`,
      action: 'Customize',
      done: (themes.data?.data ?? []).some((version) => version.status === 'published'),
    },
    {
      title: 'Connect a payment processor',
      description: 'Take real payments at checkout.',
      href: `/store/${slug}/settings`,
      action: 'Connect',
      done: (processors.data?.data ?? []).some((processor) => processor.enabled),
    },
    {
      title: 'Place a test order',
      description: 'Walk your own checkout end to end before your customers do.',
      href: `/store/${slug}/orders`,
      action: 'View orders',
      done: (orders.data?.data.length ?? 0) > 0,
    },
  ];

  const complete = tasks.filter((task) => task.done).length;

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Setup guide
            </Text>
            <Badge tone={complete === tasks.length ? 'success' : undefined}>
              {`${complete} of ${tasks.length} tasks complete`}
            </Badge>
          </InlineStack>
          <ProgressBar progress={(complete / tasks.length) * 100} size="small" tone="primary" />
        </BlockStack>

        <BlockStack gap="300">
          {tasks.map((task) => (
            <InlineStack key={task.title} gap="300" blockAlign="center" wrap={false}>
              <Box>
                <Icon source={CheckCircleIcon} tone={task.done ? 'success' : 'subdued'} />
              </Box>
              <div style={{ flex: 1, minWidth: 0 }}>
                <BlockStack gap="050">
                  <Text
                    as="span"
                    variant="bodyMd"
                    fontWeight={task.done ? 'regular' : 'semibold'}
                    tone={task.done ? 'subdued' : undefined}
                  >
                    {task.title}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {task.description}
                  </Text>
                </BlockStack>
              </div>
              {!task.done && (
                <Button url={task.href} variant="secondary">
                  {task.action}
                </Button>
              )}
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
