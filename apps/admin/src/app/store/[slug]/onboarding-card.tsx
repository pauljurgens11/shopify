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
  Collapsible,
  Icon,
  InlineStack,
  ProgressBar,
  Text,
} from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
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
  // `undefined` = the viewer has not chosen yet, so the guide opens on the
  // first unfinished task the way Shopify's does; `null` = they collapsed it.
  const [openTitle, setOpenTitle] = useState<string | null | undefined>(undefined);

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
  const expanded =
    openTitle === undefined ? (tasks.find((task) => !task.done)?.title ?? null) : openTitle;

  // Every check is a separate request, so the count is wrong until all four
  // answer — and "0 of 4 tasks complete" flashing on the first screen of the
  // demo is a wrong number, not a loading state. Nothing renders until they do:
  // a skeleton here would reserve space that a finished store then gives back.
  if (products.isPending || orders.isPending || themes.isPending || processors.isPending) {
    return null;
  }

  // A setup guide that is permanently 4 of 4 is not guidance, it is furniture —
  // Shopify retires it once a store is set up, and on our seeded demo it would
  // otherwise sit at 100% above the dashboard forever. A new tenant (signup,
  // DEMO.md §"New store") still gets it, at 1 of 4.
  if (complete === tasks.length) return null;

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

        <BlockStack gap="100">
          {tasks.map((task, index) => {
            const panelId = `setup-task-${index}`;
            const open = expanded === task.title;
            return (
              <BlockStack key={task.title} gap="100">
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                  <Box>
                    <Icon source={CheckCircleIcon} tone={task.done ? 'success' : 'subdued'} />
                  </Box>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Button
                      variant="monochromePlain"
                      textAlign="left"
                      fullWidth
                      ariaExpanded={open}
                      ariaControls={panelId}
                      onClick={() => setOpenTitle(open ? null : task.title)}
                    >
                      {task.title}
                    </Button>
                  </div>
                </InlineStack>
                <Collapsible id={panelId} open={open}>
                  <Box paddingInlineStart="800" paddingBlockEnd="300">
                    <BlockStack gap="200" inlineAlign="start">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {task.description}
                      </Text>
                      {!task.done && (
                        <Button url={task.href} variant="secondary">
                          {task.action}
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                </Collapsible>
              </BlockStack>
            );
          })}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
