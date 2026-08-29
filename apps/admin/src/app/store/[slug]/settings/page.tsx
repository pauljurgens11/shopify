'use client';

/**
 * Settings hub (PARITY.md: "a two-column grid of icon cards"). Owner: WS-A.
 *
 * Locations belongs to B6 and Payments to D4 — the hub links to their pages
 * rather than owning them, which is why those two entries point outside
 * `/settings`.
 */
import { BlockStack, Box, Card, Grid, Icon, InlineStack, Page, Text } from '@shopify/polaris';
import {
  CashDollarIcon,
  CreditCardIcon,
  DeliveryIcon,
  LocationIcon,
  NotificationIcon,
  PersonIcon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
} from '@shopify/polaris-icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/shell/page-header.tsx';

type IconSource = typeof StoreIcon;

const CARDS: Array<{ title: string; description: string; href: string; icon: IconSource }> = [
  {
    title: 'General',
    description: 'Store details and contact email',
    href: '/settings/general',
    icon: StoreIcon,
  },
  {
    title: 'Plan',
    description: 'Your plan and what it includes',
    href: '/settings/plan',
    icon: CashDollarIcon,
  },
  {
    title: 'Users and permissions',
    description: 'Staff access to this store',
    href: '/settings/staff',
    icon: PersonIcon,
  },
  {
    title: 'Payments',
    description: 'Processors and payment routing',
    href: '/settings/payments',
    icon: CreditCardIcon,
  },
  {
    title: 'Checkout',
    description: 'How checkout behaves',
    href: '/settings/checkout',
    icon: SettingsIcon,
  },
  {
    title: 'Shipping and delivery',
    description: 'Rates customers see at checkout',
    href: '/settings/shipping',
    icon: DeliveryIcon,
  },
  {
    title: 'Taxes',
    description: 'How much tax you charge',
    href: '/settings/taxes',
    icon: ReceiptIcon,
  },
  {
    title: 'Locations',
    description: 'Where you stock and ship from',
    href: '/locations',
    icon: LocationIcon,
  },
  {
    title: 'Notifications',
    description: 'Emails sent to customers',
    href: '/settings/notifications',
    icon: NotificationIcon,
  },
];

export default function SettingsHubPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <Page>
      <BlockStack gap="400">
        <PageHeader icon={SettingsIcon} title="Settings" />

        <Grid>
          {CARDS.map((card) => (
            <Grid.Cell key={card.href} columnSpan={{ xs: 6, sm: 6, md: 3, lg: 6, xl: 6 }}>
              {/* The whole card is the target, the way Shopify's settings grid works. */}
              {/* `color: inherit` matters: a bare anchor paints its children
                link-blue, and Shopify's settings cards use normal heading text. */}
              <Link
                href={`/store/${slug}${card.href}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  height: '100%',
                }}
              >
                <Card>
                  <InlineStack gap="300" blockAlign="start" wrap={false}>
                    <Box paddingBlockStart="050">
                      <Icon source={card.icon} tone="base" />
                    </Box>
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingSm">
                        {card.title}
                      </Text>
                      <Text as="p" tone="subdued">
                        {card.description}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Card>
              </Link>
            </Grid.Cell>
          ))}
        </Grid>
      </BlockStack>
    </Page>
  );
}
