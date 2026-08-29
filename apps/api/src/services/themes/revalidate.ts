/**
 * Best-effort storefront cache bust after a theme publish (issue E7).
 *
 * The storefront caches the published theme for 60s; without this ping the
 * builder's Publish — which promises "right now" — looks broken for up to two
 * minutes. Fire-and-forget with a short timeout: a down storefront must never
 * fail or slow a publish (same rule as services/orders/notify.ts).
 */
import { storefrontUrl } from '@merchant/config/env';
import { signRevalidateToken } from '@merchant/config/revalidate-token';
import type { FastifyBaseLogger } from 'fastify';

export function revalidateStorefrontTheme(slug: string, log: FastifyBaseLogger): void {
  const token = encodeURIComponent(signRevalidateToken(slug));
  fetch(`${storefrontUrl(slug)}/api/revalidate?token=${token}`, {
    method: 'POST',
    signal: AbortSignal.timeout(3000),
  })
    .then((response) => {
      if (!response.ok) log.warn({ slug, status: response.status }, 'theme revalidate refused');
    })
    .catch((error: unknown) => {
      log.warn({ slug, err: error }, 'theme revalidate ping failed');
    });
}
