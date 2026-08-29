/**
 * Saved cards for a few repeat customers — what D4's "charge saved card" block
 * on the order page demos (SPEC §11: the repeat-billing primitive).
 *
 * The vault blob is sealed HERE, duplicating the AES-256-GCM shape from
 * `packages/pay/src/crypto.ts` + `vault.ts` (JSON `{number, cvc}` under
 * `VAULT_MASTER_KEY`; ciphertext/iv/authTag as three base64 columns), because
 * `packages/db` cannot import `packages/pay` — pay depends on db and turbo
 * rejects the cycle (DECISIONS.md, WS-H). The format is deliberately frozen:
 * SPEC §11 rules out envelope encryption and key rotation, so there is nothing
 * here to drift. If `crypto.ts` ever does change, `pnpm db:reset` + one charge
 * in the admin is the check.
 */
import { createCipheriv, randomBytes } from 'node:crypto';
import { env } from '@merchant/config/env';
import { newId } from '@merchant/config/ids';
import type { PrismaClient } from '@prisma/client';
import { daysAgo, type SeedContext } from './context.ts';
import type { SeededCustomer } from './customers.ts';
import type { SeededOrder } from './orders.ts';

interface DemoCard {
  /** Mock test PAN (Luhn-valid). 4242… approves; that is the demo. */
  number: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

/**
 * The first repeat buyer gets two cards so the order-page card list actually
 * looks like a list; everyone else gets one.
 */
const TWO_CARDS: DemoCard[] = [
  { number: '4242424242424242', brand: 'visa', expMonth: 11, expYear: 2028, isDefault: true },
  { number: '5555555555554444', brand: 'mastercard', expMonth: 4, expYear: 2027, isDefault: false },
];

const ONE_CARD: DemoCard = {
  number: '4242424242424242',
  brand: 'visa',
  expMonth: 7,
  expYear: 2029,
  isDefault: true,
};

function seal(plaintext: string): { encryptedBlob: string; iv: string; authTag: string } {
  const key = Buffer.from(env().VAULT_MASTER_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedBlob: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

async function saveCard(
  db: PrismaClient,
  ctx: SeedContext,
  customerId: string,
  card: DemoCard,
  createdAt: Date,
): Promise<void> {
  const cardTokenId = newId('cardToken');
  const metadata = {
    brand: card.brand,
    last4: card.number.slice(-4),
    expMonth: card.expMonth,
    expYear: card.expYear,
  };

  await db.vaultCard.create({
    data: {
      id: cardTokenId,
      shopId: ctx.shopId,
      ...seal(JSON.stringify({ number: card.number, cvc: '123' })),
      ...metadata,
      createdAt,
    },
  });
  await db.paymentMethod.create({
    data: {
      id: newId('paymentMethod'),
      shopId: ctx.shopId,
      customerId,
      cardTokenId,
      ...metadata,
      isDefault: card.isDefault,
      createdAt,
    },
  });
}

export async function createSavedCards(
  db: PrismaClient,
  ctx: SeedContext,
  input: { customers: SeededCustomer[]; orders: SeededOrder[] },
): Promise<void> {
  const withOrders = new Set(input.orders.map((order) => order.customerId));

  // Repeat buyers, deterministically: the first three customers (in seed
  // order) who actually placed an order, so the order pages a reviewer opens
  // show the charge block. Jane gets a card too — she is the demo login (E5)
  // even though the seed gives her no orders.
  const buyers = input.customers.filter((customer) => withOrders.has(customer.id)).slice(0, 3);
  for (const [index, customer] of buyers.entries()) {
    if (index === 0) {
      for (const [cardIndex, card] of TWO_CARDS.entries()) {
        await saveCard(
          db,
          ctx,
          customer.id,
          card,
          daysAgo(ctx, 45 - cardIndex * 20, 10, cardIndex),
        );
      }
    } else {
      await saveCard(db, ctx, customer.id, ONE_CARD, daysAgo(ctx, 30 + index * 7, 15, index));
    }
  }

  const jane = input.customers.find((customer) => customer.email === 'jane@example.com');
  if (jane && !buyers.some((buyer) => buyer.id === jane.id)) {
    await saveCard(db, ctx, jane.id, ONE_CARD, daysAgo(ctx, 21, 11, 0));
  }
}
