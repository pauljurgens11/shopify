/** Values SPEC fixes and more than one workstream needs. Additive only. */

/**
 * The product name, wherever a brand string is unavoidable (SPEC §1).
 * Page titles, the login wordmark, the webhook user-agent and the transactional
 * `From` name all read from here, so the brand is one edit, not thirty.
 */
export const BRAND_NAME = 'Shopify';

/** SPEC §5 — cursor pagination. */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 250;

/** SPEC §5 — per-shop order numbers start here, like Shopify. */
export const ORDER_NUMBER_START = 1001;

/** SPEC §8 */
export const SESSION_COOKIE = '_shopify_session';
/** Storefront customer login (SPEC §8, optional path) — never grants admin access. */
export const CUSTOMER_SESSION_COOKIE = '_shopify_customer';
export const CART_COOKIE = '_shopify_cart';
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'shopify-admin';

/** SPEC §13 — webhook topics. Adding one is additive; deleting one is not. */
export const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/paid',
  'orders/fulfilled',
  'orders/cancelled',
  'products/create',
  'products/update',
  'products/delete',
  'customers/create',
  'refunds/create',
  'app/uninstalled',
] as const;
export type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];

export const WEBHOOK_HMAC_HEADER = 'x-shopify-hmac-sha256';
export const WEBHOOK_TOPIC_HEADER = 'x-shopify-topic';
export const WEBHOOK_SHOP_HEADER = 'x-shopify-shop-id';
/** Stable across retries — receivers de-duplicate on it (SPEC §13 idempotency). */
export const WEBHOOK_EVENT_HEADER = 'x-shopify-event-id';
export const WEBHOOK_MAX_ATTEMPTS = 5;
/** Merchant-supplied URLs. A hung endpoint must not pin a worker slot. */
export const WEBHOOK_TIMEOUT_MS = 5_000;

/** SPEC §8 — staff permission areas. `owner`/`admin` bypass these. */
export const PERMISSION_AREAS = [
  'products',
  'orders',
  'customers',
  'discounts',
  'analytics',
  'settings',
  'apps',
  'builder',
] as const;
export type PermissionArea = (typeof PERMISSION_AREAS)[number];

export const STAFF_ROLES = ['owner', 'admin', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Subdomains the platform itself answers on. A shop with one of these slugs
 * could never be served: the Host parser refuses `www` outright, and in the
 * prod topology (SPEC §17) Caddy routes `admin.*`/`api.*` to the apps before
 * the storefront ever sees them.
 */
export const RESERVED_SHOP_SLUGS = new Set(['www', 'admin', 'api']);

/** SPEC §8 — rate limits. */
export const RATE_LIMITS = {
  login: { max: 10, windowMs: 60_000 },
  adminApi: { max: 40, windowMs: 1_000, burst: 80 },
  checkoutPayment: { max: 5, windowMs: 60_000 },
} as const;

/** SPEC §10 — storefront cache policy. */
export const STOREFRONT_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

/** BullMQ queue names (SPEC §13). One queue per concern. */
export const QUEUES = {
  webhooks: 'webhooks',
  email: 'email',
  analytics: 'analytics',
  ai: 'ai',
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
