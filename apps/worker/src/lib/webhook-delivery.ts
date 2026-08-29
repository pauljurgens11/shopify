/**
 * One webhook delivery attempt, and what it means for the delivery row.
 *
 * Deliberately free of Prisma and BullMQ: the parts that break in production
 * are HTTP-shaped (timeouts, redirects, signing the wrong bytes), and keeping
 * them behind a plain function is what lets the tests drive a real server
 * instead of a mock. `jobs/webhook-deliver.ts` is the thin wiring on top.
 */
import {
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_HMAC_HEADER,
  WEBHOOK_SHOP_HEADER,
  WEBHOOK_TIMEOUT_MS,
  WEBHOOK_TOPIC_HEADER,
} from '@merchant/config/constants';
import type { WebhookEnvelope } from '@merchant/contracts/webhooks';
import { signWebhookBody } from './hmac.ts';

export type WebhookAttempt =
  | { ok: true; status: number }
  | { ok: false; status: number | null; error: string };

export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'exhausted';

export type DeliveryState = {
  status: DeliveryStatus;
  attempts: number;
  responseStatus: number | null;
  lastError: string | null;
  deliveredAt: Date | null;
};

/** `webhookDeliverySchema.lastError` is `.max(2000)` — truncate, don't reject. */
const MAX_ERROR_CHARS = 2000;
/** Enough of a failing response to debug with; not enough to fill Postgres. */
const ERROR_BODY_CHARS = 500;

export async function postWebhook(params: {
  url: string;
  secret: string;
  envelope: WebhookEnvelope;
  timeoutMs?: number;
}): Promise<WebhookAttempt> {
  const { url, secret, envelope, timeoutMs = WEBHOOK_TIMEOUT_MS } = params;
  const body = JSON.stringify(envelope);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Shopify-Webhooks/1.0',
        [WEBHOOK_HMAC_HEADER]: signWebhookBody(body, secret),
        [WEBHOOK_TOPIC_HEADER]: envelope.topic,
        [WEBHOOK_SHOP_HEADER]: envelope.shopId,
        [WEBHOOK_EVENT_HEADER]: envelope.id,
      },
      // The whole SSRF budget (SPEC §15): a redirect to 169.254.169.254 is not
      // followed, and a hung endpoint releases the worker slot after 5s.
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.ok) {
      await response.body?.cancel();
      return { ok: true, status: response.status };
    }

    const detail = (await response.text().catch(() => '')).slice(0, ERROR_BODY_CHARS).trim();
    return {
      ok: false,
      status: response.status,
      error: detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`,
    };
  } catch (err) {
    // Network refusal, DNS failure, TLS error, or our own abort.
    return { ok: false, status: null, error: describeError(err) };
  }
}

/**
 * undici reports every network failure as the string "fetch failed" and hides
 * the real reason on `cause`. A delivery log that only ever says "fetch failed"
 * tells the merchant nothing.
 */
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = err.cause;
  return cause instanceof Error ? `${err.message}: ${cause.message}` : err.message;
}

/**
 * What the `WebhookDelivery` row should say after `attemptNumber` (1-based).
 * `exhausted` is reserved for the last attempt BullMQ will make, so the UI can
 * tell "will retry" from "gave up".
 */
export function nextDeliveryState(
  attempt: WebhookAttempt,
  attemptNumber: number,
  maxAttempts: number,
  now: Date = new Date(),
): DeliveryState {
  if (attempt.ok) {
    return {
      status: 'success',
      attempts: attemptNumber,
      responseStatus: attempt.status,
      lastError: null,
      deliveredAt: now,
    };
  }

  return {
    status: attemptNumber >= maxAttempts ? 'exhausted' : 'failed',
    attempts: attemptNumber,
    responseStatus: attempt.status,
    lastError: attempt.error.slice(0, MAX_ERROR_CHARS),
    deliveredAt: null,
  };
}
