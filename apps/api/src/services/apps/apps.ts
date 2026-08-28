/**
 * Private apps and their Admin API tokens (SPEC §8, §13). Owner: WS-G.
 *
 * The security property this file exists to hold: a token or a webhook secret
 * is generated here, returned to the caller ONCE, and never stored in a form
 * anyone can read back. The row keeps a SHA-256 hash (tokens) or the secret the
 * worker needs to sign with (webhooks), plus a 4-char suffix so the UI can say
 * which credential it is talking about without being able to show it.
 */
import { createHash } from 'node:crypto';
import type { WebhookTopic } from '@merchant/config/constants';
import { newApiToken, newId, newSecret } from '@merchant/config/ids';
import type { TenantClient } from '@merchant/db/tenant';
import { conflict, notFound } from '../../lib/errors.ts';

/** Tokens are looked up by hash on every Bearer request (plugins/tenancy.ts). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type AppRow = {
  id: string;
  name: string;
  scopes: string[];
  tokenSuffix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toApp(row: AppRow) {
  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    tokenSuffix: row.tokenSuffix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const APP_SELECT = {
  id: true,
  name: true,
  scopes: true,
  tokenSuffix: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Uninstalled apps stay in the table so their delivery history survives. */
const INSTALLED = { uninstalledAt: null };

export async function listApps(db: TenantClient, limit: number, cursor?: string) {
  const rows = await db.app.findMany({
    where: INSTALLED,
    select: APP_SELECT,
    orderBy: { id: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, limit);
  return {
    data: page.map(toApp),
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getApp(db: TenantClient, id: string) {
  const row = await db.app.findFirst({ where: { id, ...INSTALLED }, select: APP_SELECT });
  if (!row) throw notFound('App');
  return toApp(row);
}

/**
 * Returns the plaintext token alongside the app. This is the only moment it
 * exists outside the caller's memory — `createAppResponse` is the only contract
 * that carries it.
 */
export async function createApp(
  db: TenantClient,
  shopId: string,
  input: { name: string; scopes: string[] },
) {
  const apiToken = newApiToken();

  const row = await db.app.create({
    data: {
      id: newId('app'),
      // Redundant at runtime — the tenant client stamps it — but Prisma's
      // generated create input still requires it (docs/AGENT-LOG.md).
      shopId,
      name: input.name,
      scopes: input.scopes,
      apiTokenHash: hashToken(apiToken),
      tokenSuffix: apiToken.slice(-4),
    },
    select: APP_SELECT,
  });

  return { app: toApp(row), apiToken };
}

export async function updateApp(
  db: TenantClient,
  id: string,
  input: { name?: string; scopes?: string[] },
) {
  await getApp(db, id); // 404s before the update, so a bad id is not a 500
  const row = await db.app.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.scopes === undefined ? {} : { scopes: input.scopes }),
    },
    select: APP_SELECT,
  });
  return toApp(row);
}

/**
 * A new token, and the old one dead the moment this returns — the hash column
 * is unique and is what `resolveFromBearer` looks up, so overwriting it is the
 * revocation.
 */
export async function rotateToken(db: TenantClient, id: string) {
  await getApp(db, id);
  const apiToken = newApiToken();

  const row = await db.app.update({
    where: { id },
    data: { apiTokenHash: hashToken(apiToken), tokenSuffix: apiToken.slice(-4) },
    select: APP_SELECT,
  });

  return { app: toApp(row), apiToken };
}

/**
 * Uninstall. The row is kept (delivery history outlives the app) but the token
 * stops authenticating, because `resolveFromBearer` rejects a non-null
 * `uninstalledAt`.
 */
export async function uninstallApp(db: TenantClient, id: string): Promise<void> {
  await getApp(db, id);
  await db.app.update({ where: { id }, data: { uninstalledAt: new Date() } });
}

/* --- webhook subscriptions -------------------------------------------------- */

const WEBHOOK_SELECT = {
  id: true,
  appId: true,
  topic: true,
  url: true,
  secretSuffix: true,
  isActive: true,
  createdAt: true,
} as const;

type WebhookRow = {
  id: string;
  appId: string;
  topic: string;
  url: string;
  secretSuffix: string;
  isActive: boolean;
  createdAt: Date;
};

function toWebhook(row: WebhookRow) {
  return {
    id: row.id,
    appId: row.appId,
    topic: row.topic as WebhookTopic,
    url: row.url,
    secretSuffix: row.secretSuffix,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAppWebhooks(db: TenantClient, appId: string) {
  await getApp(db, appId);
  const rows = await db.webhookSubscription.findMany({
    where: { appId, deletedAt: null },
    select: WEBHOOK_SELECT,
    orderBy: { id: 'desc' },
  });
  return rows.map(toWebhook);
}

/** Like the token: the signing secret is returned once and then only by suffix. */
export async function createAppWebhook(
  db: TenantClient,
  shopId: string,
  appId: string,
  input: { topic: WebhookTopic; url: string },
) {
  await getApp(db, appId);
  const secret = `whsec_${newSecret(24)}`;

  // Live rows only: after a soft delete the same topic + URL may come back.
  const existing = await db.webhookSubscription.findFirst({
    where: { appId, topic: input.topic, url: input.url, deletedAt: null },
    select: { id: true },
  });
  if (existing) throw conflict('That app already subscribes to this topic at this URL.', 'url');

  const row = await db.webhookSubscription.create({
    data: {
      id: newId('webhook'),
      shopId,
      appId,
      topic: input.topic,
      url: input.url,
      secret,
      secretSuffix: secret.slice(-4),
    },
    select: WEBHOOK_SELECT,
  });

  return { subscription: toWebhook(row), secret };
}

/**
 * Soft delete: `WebhookDelivery` cascades on a hard delete, and the delete
 * dialog promises "Past deliveries stay in the log" — so the row is kept and
 * only stops matching (worker and lists both filter on `deletedAt`).
 */
export async function deleteAppWebhook(
  db: TenantClient,
  appId: string,
  webhookId: string,
): Promise<void> {
  const row = await db.webhookSubscription.findFirst({
    where: { id: webhookId, appId, deletedAt: null },
    select: { id: true },
  });
  if (!row) throw notFound('Webhook subscription');
  await db.webhookSubscription.updateMany({
    where: { id: webhookId },
    data: { deletedAt: new Date() },
  });
}

/* --- delivery log ----------------------------------------------------------- */

export async function listAppDeliveries(
  db: TenantClient,
  appId: string,
  limit: number,
  cursor?: string,
) {
  await getApp(db, appId);
  // Deliberately includes soft-deleted subscriptions: their history is the
  // whole reason the delete is soft.
  const subscriptions = await db.webhookSubscription.findMany({
    where: { appId },
    select: { id: true },
  });
  const subscriptionIds = subscriptions.map((s) => s.id);
  if (subscriptionIds.length === 0) return { data: [], nextCursor: null };

  const rows = await db.webhookDelivery.findMany({
    where: { subscriptionId: { in: subscriptionIds } },
    // Delivery ids are ULIDs, so id-descending IS newest-first and needs no
    // secondary sort key (SPEC §5).
    orderBy: { id: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, limit);
  return {
    data: page.map((row) => ({
      id: row.id,
      subscriptionId: row.subscriptionId,
      eventId: row.eventId,
      topic: row.topic as WebhookTopic,
      status: row.status as 'pending' | 'success' | 'failed' | 'exhausted',
      attempts: row.attempts,
      responseStatus: row.responseStatus,
      lastError: row.lastError,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
  };
}
