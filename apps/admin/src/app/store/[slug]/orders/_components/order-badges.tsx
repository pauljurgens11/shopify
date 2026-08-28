'use client';

/** The badge pair Shopify shows on every order row and header. Owner: WS-C. */
import type { Order } from '@merchant/contracts/orders';
import { Badge } from '@shopify/polaris';
import { type BadgeSpec, cancelledBadge, financialBadge, fulfillmentBadge } from './status.ts';

function toBadge(spec: BadgeSpec) {
  return (
    <Badge tone={spec.tone} progress={spec.progress}>
      {spec.label}
    </Badge>
  );
}

export function FinancialBadge({ order }: { order: Pick<Order, 'financialStatus'> }) {
  return toBadge(financialBadge(order.financialStatus));
}

export function FulfillmentBadge({ order }: { order: Pick<Order, 'fulfillmentStatus'> }) {
  return toBadge(fulfillmentBadge(order.fulfillmentStatus));
}

export function CancelledBadge() {
  return toBadge(cancelledBadge());
}
