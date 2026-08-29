/** Display helpers shared by the apps index and detail pages. Owner: WS-G. */
import type { WebhookTopic } from '@merchant/config/constants';

/**
 * Event names as a merchant reads them. The raw topic still appears next to the
 * label wherever a developer needs the literal string to configure a receiver.
 */
const TOPIC_LABELS: Record<WebhookTopic, string> = {
  'orders/create': 'Order creation',
  'orders/paid': 'Order payment',
  'orders/fulfilled': 'Order fulfillment',
  'orders/cancelled': 'Order cancellation',
  'products/create': 'Product creation',
  'products/update': 'Product update',
  'products/delete': 'Product deletion',
  'customers/create': 'Customer creation',
  'refunds/create': 'Refund creation',
  'app/uninstalled': 'App uninstalled',
};

export function topicLabel(topic: WebhookTopic): string {
  return TOPIC_LABELS[topic];
}

/** `••••7f2a` — all the UI ever knows about a stored token or signing secret. */
export function mask(suffix: string): string {
  return `••••${suffix}`;
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(iso: string | null): string {
  return iso ? DATE.format(new Date(iso)) : '—';
}

/** "Aug 28 at 2:14 PM" — Shopify's phrasing in activity and delivery logs. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const [day, time] = DATE_TIME.format(new Date(iso)).split(', ');
  return time ? `${day} at ${time}` : (day ?? '—');
}
