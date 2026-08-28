/**
 * Card vault (SPEC §11). Owner: WS-D.
 *
 * The ONLY module permitted to decrypt a card blob. AES-256-GCM under a single
 * VAULT_MASTER_KEY — deliberately simple, with no rotation machinery.
 *
 * Two rules, and they are the whole security model here:
 *   1. A PAN never leaves this module except into a processor adapter.
 *   2. A PAN never reaches a log line, an error message, or an exception.
 *
 * Everything outside `packages/pay` speaks `CardToken` — id, brand, last4,
 * expiry — and nothing more. If another package imports `getCard`, that import
 * is the bug (CLAUDE.md §9).
 */
import { env } from '@merchant/config/env';
import { newId } from '@merchant/config/ids';
import type { CardBrand, CardToken, TokenizeCardInput } from '@merchant/contracts/pay';
import type { TenantClient } from '@merchant/db/tenant';
import { decrypt, encrypt, keyFromHex, type SealedBlob } from './crypto.ts';

/** Card metadata the rest of the system is allowed to see. */
export interface CardMetadata {
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
}

/**
 * A validation failure the caller may show to the customer. The `field` maps
 * onto the checkout's inline errors (E4); the message never contains card data.
 */
export class VaultValidationError extends Error {
  constructor(
    readonly field: 'number' | 'expMonth' | 'expYear' | 'cvc',
    message: string,
  ) {
    super(message);
    this.name = 'VaultValidationError';
  }
}

/** Card fields arrive formatted from a browser input: `4242 4242 4242 4242`. */
export function normalizeCardNumber(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/** Luhn check digit, plus the 12–19 digit length every card network fits in. */
export function luhnValid(input: string): boolean {
  const digits = normalizeCardNumber(input);
  if (!/^\d{12,19}$/.test(digits)) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Issuer prefix ranges (IIN). Order matters: the 2-series Mastercard range
 * (2221–2720) and the JCB range (3528–3589) overlap prefixes that a naive
 * first-digit check would misfile.
 */
export function detectBrand(input: string): CardBrand {
  const n = normalizeCardNumber(input);
  const prefix = (length: number) => Number(n.slice(0, length));

  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  if (n.length >= 4 && prefix(4) >= 2221 && prefix(4) <= 2720) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(n)) return 'discover';
  if (n.length >= 4 && prefix(4) >= 3528 && prefix(4) <= 3589) return 'jcb';
  if (/^(30[0-5]|36|38|39)/.test(n)) return 'diners';
  return 'unknown';
}

/** A card is good through the END of its expiry month, the way terminals treat it. */
export function validateExpiry(month: number, year: number, now = new Date()): boolean {
  if (year < now.getUTCFullYear()) return false;
  if (year > now.getUTCFullYear()) return true;
  return month >= now.getUTCMonth() + 1;
}

/**
 * Validate a card and reduce it to safe metadata. Returns no PAN on purpose —
 * a caller that spreads the result into a response cannot leak one.
 */
export function validateCard(card: {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}): CardMetadata {
  const number = normalizeCardNumber(card.number);

  if (!luhnValid(number)) {
    throw new VaultValidationError('number', 'That card number is not valid.');
  }
  if (!/^\d{3,4}$/.test(card.cvc)) {
    throw new VaultValidationError('cvc', 'Security code must be 3 or 4 digits.');
  }
  if (card.expMonth < 1 || card.expMonth > 12) {
    throw new VaultValidationError('expMonth', 'Expiry month must be between 1 and 12.');
  }
  if (!validateExpiry(card.expMonth, card.expYear)) {
    throw new VaultValidationError('expYear', 'That card has expired.');
  }

  return {
    brand: detectBrand(number),
    last4: number.slice(-4),
    expMonth: card.expMonth,
    expYear: card.expYear,
  };
}

let cachedKey: Buffer | undefined;
function vaultKey(): Buffer {
  cachedKey ??= keyFromHex(env().VAULT_MASTER_KEY);
  return cachedKey;
}

/** Seal `{ number, cvc }` for storage. The only writer of PAN ciphertext. */
export function sealCardBlob(number: string, cvc: string): SealedBlob {
  return encrypt(JSON.stringify({ number, cvc }), vaultKey());
}

/** Open a sealed card blob. Throws if the blob was tampered with. */
export function openCardBlob(sealed: SealedBlob): { number: string; cvc: string } {
  return JSON.parse(decrypt(sealed, vaultKey())) as { number: string; cvc: string };
}

/**
 * Validate → encrypt → store. `db` must be `dbForShop(shopId)` for the same
 * shop; the extension is what actually stamps the row, and it overrides
 * whatever `shopId` is passed here. It is passed anyway because Prisma's
 * generated create input still requires the column at the type level.
 *
 * Throws `VaultValidationError` — the route turns it into the SPEC §5 error
 * shape with `field` set.
 */
export async function tokenizeCard(
  db: TenantClient,
  shopId: string,
  card: TokenizeCardInput,
): Promise<CardToken> {
  const metadata = validateCard(card);
  const sealed = sealCardBlob(normalizeCardNumber(card.number), card.cvc);
  const cardTokenId = newId('cardToken');

  await db.vaultCard.create({
    data: {
      id: cardTokenId,
      shopId,
      encryptedBlob: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
      ...metadata,
    },
  });

  return { cardTokenId, ...metadata };
}

/** The PAN, for a processor adapter. */
export interface VaultedCard extends CardMetadata {
  number: string;
  cvc: string;
}

/**
 * DECRYPTS A CARD. Callable only from inside `packages/pay` — an adapter needs
 * the PAN to reach a processor, and nothing else in this repo has any business
 * holding one. Never log, serialise, or return the result of this function.
 */
export async function getCard(db: TenantClient, cardTokenId: string): Promise<VaultedCard | null> {
  const row = await db.vaultCard.findUnique({ where: { id: cardTokenId } });
  if (!row) return null;

  const { number, cvc } = openCardBlob({
    ciphertext: row.encryptedBlob,
    iv: row.iv,
    authTag: row.authTag,
  });

  return {
    number,
    cvc,
    brand: row.brand as CardBrand,
    last4: row.last4,
    expMonth: row.expMonth,
    expYear: row.expYear,
  };
}
