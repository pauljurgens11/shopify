'use server';

/**
 * Checkout mutations as Server Actions (SPEC §10). Owner: WS-E.
 *
 * **No card data passes through here, ever.** The browser posts the PAN
 * straight to `/vault/tokenize` and only the resulting `card_tok_…` reaches
 * these functions — that separation is the entire point of the vault
 * (SPEC §11, CLAUDE.md §9). If you find yourself adding a `number` or `cvc`
 * parameter below, stop.
 *
 * Actions rather than browser fetches because `complete` has to forward and
 * then clear the cart cookie, which is httpOnly and scoped to the storefront
 * origin — a cross-origin call from the browser would never send it.
 */
import { CART_COOKIE } from '@merchant/config/constants';
import type { Checkout, CompleteCheckoutResponse } from '@merchant/contracts/checkout';
import { cookies } from 'next/headers';
import { customerCookieHeader } from '../app/account/session.ts';
import { storefrontApiUrl } from './api.ts';
import { resolveShopSlug } from './tenant.ts';

export interface CheckoutUpdateResult {
  ok: boolean;
  checkout?: Checkout;
  /** Field-level message from E3, for the inline error under the input. */
  message?: string;
  field?: string;
}

async function shopOrThrow(): Promise<string> {
  const slug = await resolveShopSlug();
  if (!slug) throw new Error('No shop for this host');
  return slug;
}

/**
 * Save one section and get the repriced checkout back.
 *
 * Every section save returns fresh totals, which is what keeps the sidebar and
 * the eventual charge in agreement — E3 recomputes on every PUT and once more
 * at completion.
 */
export async function updateCheckout(
  token: string,
  patch: Record<string, unknown>,
): Promise<CheckoutUpdateResult> {
  const slug = await shopOrThrow();
  const response = await fetch(storefrontApiUrl(slug, `/checkouts/${token}`), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      errors?: Array<{ message?: string; field?: string }>;
    } | null;
    const error = body?.errors?.[0];
    return { ok: false, message: error?.message ?? 'We could not save that.', field: error?.field };
  }
  return { ok: true, checkout: (await response.json()) as Checkout };
}

export interface PayResult {
  outcome: 'success' | 'declined' | 'error';
  /** Shopper-facing. Never processor internals. */
  message?: string;
  orderNumber?: number;
  confirmationUrl?: string;
}

/**
 * "Pay now". Takes a vault token — never a card.
 *
 * A decline comes back from E3 as a 200 with `status: 'failed'` (SPEC §5 has no
 * error code meaning "the bank said no"), and the checkout stays open so the
 * shopper can try another card. `idempotencyKey` is generated per click by the
 * caller: the same key makes a double-submit charge once, a new key is what
 * lets a retry after a decline reach the processor at all.
 *
 * The customer session cookie rides along because `saveCard` is only honoured
 * for a signed-in shopper (E6) — it is httpOnly and belongs to the storefront
 * origin, so only this server hop can forward it.
 */
export async function payForCheckout(
  token: string,
  cardTokenId: string,
  idempotencyKey: string,
  saveCard = false,
): Promise<PayResult> {
  const slug = await shopOrThrow();
  const jar = await cookies();
  const cart = jar.get(CART_COOKIE)?.value;
  const customer = await customerCookieHeader();
  const cookie = [cart ? `${CART_COOKIE}=${cart}` : null, customer ?? null]
    .filter(Boolean)
    .join('; ');

  const response = await fetch(storefrontApiUrl(slug, `/checkouts/${token}/complete`), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ cardTokenId, idempotencyKey, saveCard }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      errors?: Array<{ message?: string }>;
    } | null;
    return {
      outcome: 'error',
      message: body?.errors?.[0]?.message ?? 'We could not complete your order.',
    };
  }

  const result = (await response.json()) as CompleteCheckoutResponse;
  if (result.status === 'failed') {
    return { outcome: 'declined', message: result.message };
  }

  // The order is placed; the cart it came from is spent.
  jar.delete(CART_COOKIE);
  return {
    outcome: 'success',
    orderNumber: result.orderNumber,
    confirmationUrl: result.confirmationUrl,
  };
}
