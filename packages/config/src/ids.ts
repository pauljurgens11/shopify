/**
 * Prefixed ULIDs (SPEC §5). Every public identifier in the system comes from here.
 *
 * Why ULID over UUID: lexicographically sortable by creation time, so
 * `ORDER BY id` is chronological and cursor pagination (SPEC §5) needs no
 * secondary sort key. The prefix makes IDs self-describing in logs and URLs —
 * the same trick Stripe and Shopify use.
 */
import { ulid } from 'ulid';

export const ID_PREFIXES = {
  shop: 'shop',
  user: 'usr',
  product: 'prod',
  variant: 'var',
  collection: 'col',
  location: 'loc',
  inventory: 'inv',
  order: 'ord',
  lineItem: 'li',
  customer: 'cus',
  address: 'addr',
  discount: 'dis',
  checkout: 'chk',
  cart: 'cart',
  payment: 'pay',
  cardToken: 'card_tok',
  processor: 'proc',
  routingRule: 'rule',
  app: 'app',
  webhook: 'wh',
  theme: 'thm',
  event: 'evt',
  fulfillment: 'ful',
  refund: 'ref',
  image: 'img',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;
export type PrefixedId<K extends IdKind> = `${(typeof ID_PREFIXES)[K]}_${string}`;

/** `newId('product')` → `prod_01J8ZC...` */
export function newId<K extends IdKind>(kind: K): PrefixedId<K> {
  return `${ID_PREFIXES[kind]}_${ulid()}` as PrefixedId<K>;
}

/** Cheap shape check — use at API boundaries so a bad id 404s instead of 500s. */
export function isId<K extends IdKind>(kind: K, value: unknown): value is PrefixedId<K> {
  return typeof value === 'string' && value.startsWith(`${ID_PREFIXES[kind]}_`);
}

export function assertId<K extends IdKind>(kind: K, value: unknown): PrefixedId<K> {
  if (!isId(kind, value)) {
    throw new Error(`Expected a ${kind} id (${ID_PREFIXES[kind]}_…), got: ${String(value)}`);
  }
  return value;
}

/** Opaque, high-entropy secret for API tokens / webhook secrets / session ids. */
export function newSecret(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Admin API token, Shopify-shaped (SPEC §8). Shown once, stored hashed. */
export function newApiToken(): string {
  return `shpat_${newSecret(32)}`;
}
