/**
 * Payment router (SPEC §11). Owner: WS-D.
 *
 * Weighted selection across matching RoutingRules, then a fallback chain.
 *
 * The one rule that must never be got wrong:
 *   hard failure (network / 5xx / bad credentials) → MAY retry the next processor
 *   decline (the card was rejected)                → MUST NOT cascade
 * Cascading declines is how a platform gets flagged for card testing.
 *
 * Weighted selection, failover-on-hard-fail, no-cascade-on-decline, and
 * idempotency-key dedupe are all mandatory unit tests (SPEC §14.2).
 *
 * Everything here takes `db` — a `dbForShop(shopId)` client — so every read and
 * write is tenant-scoped by construction. A `shopId` argument appears only on
 * the functions that CREATE a row, because Prisma's generated create input
 * still requires the column even though the tenant extension overrides it (see
 * docs/AGENT-LOG.md). `capturePayment` and `voidPayment` only read and update,
 * so they take none — the scoped client is the whole tenancy story there.
 */

import { newId } from '@merchant/config/ids';
import type { MoneyDto } from '@merchant/contracts/common';
import type {
  AuthorizeRequest,
  AuthResult,
  CardBrand,
  Payment,
  ProcessorKey,
} from '@merchant/contracts/pay';
import type { TenantClient } from '@merchant/db/tenant';
import type { CardMaterial, ProcessorAdapter } from './adapter.ts';
import { credentialsFor } from './credentials.ts';
import { adapterFor } from './index.ts';
import { type RoutingCandidate, selectProcessorChain } from './routing.ts';
import { getCard } from './vault.ts';

/**
 * A payment could not be attempted, or an operation is illegal for the state
 * the payment is in. Distinct from a *decline*, which is a perfectly ordinary
 * outcome and comes back as a `Payment` row with status `failed`.
 *
 * `code` maps onto the SPEC §5 error vocabulary at the route layer.
 */
export class PaymentError extends Error {
  constructor(
    readonly code: 'not_found' | 'conflict' | 'invalid_request',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface ChargeInput {
  cardTokenId: string;
  amount: MoneyDto;
  /** false = authorize only; the admin captures later. Defaults to true. */
  capture?: boolean;
  customer?: AuthorizeRequest['customer'];
  billingAddress?: AuthorizeRequest['billingAddress'];
  /** Replaying this must never produce a second charge. */
  idempotencyKey: string;
  orderId?: string | null;
  checkoutId?: string | null;
  reference?: string;
}

/** A processor attempt, in order. Without it, debugging a failover is guesswork. */
export interface RoutingTrailEntry {
  processor: ProcessorKey;
  outcome: AuthResult['outcome'];
}

/**
 * Injection points. Defaults are the real thing; tests replace `adapters` with
 * stubs and `rng` with a sequence, and G1 will fill `onPaid` with the queue
 * producer once it lands.
 */
export interface RouterDeps {
  rng?: () => number;
  adapters?: (key: ProcessorKey) => ProcessorAdapter;
  /**
   * Fired once, after a successful charge. Awaited so ordering is predictable,
   * but its failures are swallowed: it runs after the Payment row is committed,
   * so it must never be able to fail the charge it is reporting. The handler
   * owns its own logging and retries (G1's producer does both).
   */
  onPaid?: (event: PaidEvent) => void | Promise<void>;
}

export interface PaidEvent {
  shopId: string;
  paymentId: string;
  orderId: string | null;
  checkoutId: string | null;
  amount: MoneyDto;
  processor: ProcessorKey;
}

/* -------------------------------------------------------------------------- */
/* charge                                                                      */
/* -------------------------------------------------------------------------- */

export async function charge(
  db: TenantClient,
  shopId: string,
  input: ChargeInput,
  deps: RouterDeps = {},
): Promise<Payment> {
  // Idempotency first, before anything is decrypted or any processor is told
  // about this charge. A retry after a dropped response must be free.
  const existing = await db.payment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return toPayment(existing);

  const card = await getCard(db, input.cardTokenId);
  if (!card) throw new PaymentError('not_found', 'Card token not found');

  const chain = await resolveChain(db, { amount: input.amount, brand: card.brand }, deps.rng);
  if (chain.length === 0) {
    throw new PaymentError(
      'conflict',
      'No payment processor is connected. Connect one in Settings → Payments.',
    );
  }

  const capture = input.capture ?? true;
  const request: AuthorizeRequest = {
    cardTokenId: input.cardTokenId,
    amount: input.amount,
    capture,
    idempotencyKey: input.idempotencyKey,
    ...(input.customer ? { customer: input.customer } : {}),
    ...(input.billingAddress ? { billingAddress: input.billingAddress } : {}),
    ...(input.reference ? { reference: input.reference } : {}),
  };

  const { result, trail, config } = await runChain(chain, request, card, deps);

  let payment: Payment;
  try {
    payment = await recordCharge(db, shopId, { input, card, result, trail, config, capture });
  } catch (error) {
    // A concurrent request with the same key got there first — a double-clicked
    // Pay button, or a client retrying while the first call is still open. The
    // unique index on (shopId, idempotencyKey) is what caught it; without this
    // the loser returns a 500 for a card that was charged.
    //
    // No second charge reached the processor: every adapter honours the same
    // idempotency key, so the attempt above replayed the winner's transaction
    // rather than creating one. The winner's row is the answer.
    if (!isUniqueViolation(error)) throw error;
    const winner = await db.payment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
    if (!winner) throw error;
    return toPayment(winner);
  }

  if (result.outcome === 'approved' && deps.onPaid) {
    // The money has already moved and the row is committed. A queue push that
    // fails must not turn a successful payment into an error at checkout, so
    // this is best-effort — the handler owns its own logging and retries.
    try {
      await deps.onPaid({
        shopId,
        paymentId: payment.id,
        orderId: payment.orderId,
        checkoutId: payment.checkoutId,
        amount: payment.amount,
        processor: payment.processor,
      });
    } catch {
      // Intentionally swallowed. See above.
    }
  }

  return payment;
}

interface ChainLink extends RoutingCandidate {
  credentials: Record<string, string>;
}

/**
 * The processors to try, in order. Routing rules decide it when the merchant
 * has written any; otherwise every enabled processor, in the order they were
 * connected, which is what a shop that never opened the routing UI expects.
 */
async function resolveChain(
  db: TenantClient,
  ctx: { amount: MoneyDto; brand: CardBrand },
  rng?: () => number,
): Promise<ChainLink[]> {
  const configs = await db.processorConfig.findMany({
    where: { enabled: true },
    orderBy: { createdAt: 'asc' },
  });
  if (configs.length === 0) return [];

  const byId = new Map(configs.map((config) => [config.id, config]));
  const rules = await db.routingRule.findMany({ orderBy: { position: 'asc' } });

  const candidates: RoutingCandidate[] = rules
    .filter((rule) => byId.has(rule.processorConfigId))
    .map((rule) => ({
      processorConfigId: rule.processorConfigId,
      processor: byId.get(rule.processorConfigId)?.processor as ProcessorKey,
      position: rule.position,
      weight: rule.weight,
      conditions: (rule.conditions ?? {}) as RoutingCandidate['conditions'],
    }));

  const everyEnabled = () =>
    configs.map((config, index) => ({
      processorConfigId: config.id,
      processor: config.processor as ProcessorKey,
      position: index,
      weight: 0,
      conditions: {},
    }));

  // Routing rules are a preference, not a whitelist. A merchant whose only rule
  // is "amex → Stripe" has not said "decline every Visa"; they say that by
  // disabling a processor. An incomplete routing table must never be able to
  // stop a shop taking money, so no match falls back to everything enabled.
  const byRules = candidates.length > 0 ? selectProcessorChain(candidates, ctx, rng) : [];
  const selected = byRules.length > 0 ? byRules : everyEnabled();

  return selected.map((candidate) => ({
    ...candidate,
    // Decrypted here, at the last moment, and never held longer than the call.
    credentials: credentialsFor(
      byId.get(candidate.processorConfigId) as {
        encryptedCredentials: string | null;
        credentialsIv: string | null;
        credentialsAuthTag: string | null;
      },
    ),
  }));
}

/**
 * Walk the chain until something is decided.
 *
 * Only `hard_failure` continues the loop. That single `break` on `declined` is
 * the no-cascade rule; if it ever becomes a `continue`, the platform starts
 * retrying rejected cards across processors.
 */
async function runChain(
  chain: ChainLink[],
  request: AuthorizeRequest,
  card: CardMaterial,
  deps: RouterDeps,
): Promise<{ result: AuthResult; trail: RoutingTrailEntry[]; config: ChainLink }> {
  const resolve = deps.adapters ?? adapterFor;
  const trail: RoutingTrailEntry[] = [];
  let last = chain[0] as ChainLink;
  let result: AuthResult = {
    outcome: 'hard_failure',
    processor: last.processor,
    message: 'No processor was attempted.',
    retryable: true,
  };

  for (const link of chain) {
    last = link;
    result = await resolve(link.processor).authorize(request, card, link.credentials);
    trail.push({ processor: link.processor, outcome: result.outcome });
    if (result.outcome !== 'hard_failure') break;
  }

  return { result, trail, config: last };
}

async function recordCharge(
  db: TenantClient,
  shopId: string,
  args: {
    input: ChargeInput;
    card: CardMaterial;
    result: AuthResult;
    trail: RoutingTrailEntry[];
    config: ChainLink;
    capture: boolean;
  },
): Promise<Payment> {
  const { input, card, result, trail, config } = args;
  const approved = result.outcome === 'approved';

  const row = await db.payment.create({
    data: {
      id: newId('payment'),
      shopId,
      orderId: input.orderId ?? null,
      checkoutId: input.checkoutId ?? null,
      amount: input.amount.amount,
      currencyCode: input.amount.currencyCode,
      status: approved ? (result.captured ? 'captured' : 'authorized') : 'failed',
      processor: config.processor,
      processorConfigId: config.processorConfigId,
      processorTxnId: approved ? result.processorTxnId : null,
      cardTokenId: input.cardTokenId,
      last4: card.last4,
      brand: card.brand,
      errorCode: errorCodeOf(result),
      routingTrail: trail,
      idempotencyKey: input.idempotencyKey,
    },
  });

  return toPayment(row);
}

/** Prisma P2002 — the write lost a race against a unique index. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'P2002';
}

/** `null` on success; the decline code, or `processor_error`, on failure. */
function errorCodeOf(result: AuthResult): string | null {
  if (result.outcome === 'approved') return null;
  return result.outcome === 'declined' ? result.code : 'processor_error';
}

/* -------------------------------------------------------------------------- */
/* capture / void / refund                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Capture an authorization. `amount` defaults to the full authorized amount; a
 * smaller one is a partial capture, and the Payment's amount becomes what was
 * actually taken so refunds cap against the right number.
 */
export async function capturePayment(
  db: TenantClient,
  paymentId: string,
  amount?: MoneyDto,
  deps: RouterDeps = {},
): Promise<Payment> {
  const payment = await loadPayment(db, paymentId);
  if (payment.status !== 'authorized') {
    throw new PaymentError(
      'conflict',
      `Only an authorized payment can be captured (this one is ${payment.status}).`,
    );
  }

  const money = amount ?? { amount: payment.amount, currencyCode: payment.currencyCode };
  if (money.currencyCode !== payment.currencyCode) {
    throw new PaymentError('invalid_request', 'Capture currency must match the payment.');
  }
  if (money.amount <= 0 || money.amount > payment.amount) {
    throw new PaymentError(
      'invalid_request',
      'Capture amount must be between 1 and the authorized amount.',
    );
  }

  const result = await adapterFrom(db, payment, deps).then((adapter) =>
    adapter.run((processor, credentials) =>
      processor.capture(payment.processorTxnId ?? '', money, credentials),
    ),
  );
  if (result.outcome === 'failure') throw new PaymentError('conflict', result.message);

  return toPayment(
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'captured', amount: money.amount },
    }),
  );
}

export async function voidPayment(
  db: TenantClient,
  paymentId: string,
  deps: RouterDeps = {},
): Promise<Payment> {
  const payment = await loadPayment(db, paymentId);
  if (payment.status !== 'authorized') {
    throw new PaymentError(
      'conflict',
      `Only an authorized payment can be voided (this one is ${payment.status}).`,
    );
  }

  const result = await adapterFrom(db, payment, deps).then((adapter) =>
    adapter.run((processor, credentials) =>
      processor.voidAuth(payment.processorTxnId ?? '', credentials),
    ),
  );
  if (result.outcome === 'failure') throw new PaymentError('conflict', result.message);

  return toPayment(
    await db.payment.update({ where: { id: payment.id }, data: { status: 'voided' } }),
  );
}

export interface RefundInput {
  amount: MoneyDto;
  reason?: string;
  idempotencyKey: string;
}

/**
 * Refund against the SAME processor and transaction that took the money.
 *
 * The cap comes from summing `PaymentRefund` rows rather than trusting
 * `payment.refundedAmount`: the column is a denormalisation for listing
 * screens, and a refund that is allowed because a counter drifted is money
 * leaving the merchant's account.
 *
 * Two phases, because the cap is only as good as its isolation. RESERVE takes
 * a row lock on the payment (an empty update — held to commit), re-checks the
 * cap with `pending` rows included, and writes a `pending` refund row; a
 * concurrent refund blocks on the lock and then sees that reservation in its
 * own sum, so two simultaneous refunds can never both pass the cap. Only then
 * is the processor told; SETTLE marks the row `succeeded` and recomputes the
 * counter under the same lock. No lock is ever held across a processor call.
 */
export async function refundPayment(
  db: TenantClient,
  shopId: string,
  paymentId: string,
  input: RefundInput,
  deps: RouterDeps = {},
): Promise<Payment> {
  if (input.amount.amount <= 0) {
    throw new PaymentError('invalid_request', 'Refund amount must be positive.');
  }

  const replayed = await replayRefund(db, paymentId, input.idempotencyKey);
  if (replayed) return replayed;

  let payment: PaymentRow;
  let reservationId: string;
  try {
    const reserved = await db.$transaction(async (tx) => {
      const found = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!found) throw new PaymentError('not_found', 'Payment not found');

      // The empty update is the lock: Postgres holds the row exclusively until
      // this transaction commits, serialising concurrent refunds. `row` is the
      // post-lock state, so the checks below cannot act on a stale status.
      const row = await tx.payment.update({ where: { id: paymentId }, data: {} });
      if (row.status !== 'captured' && row.status !== 'partially_refunded') {
        throw new PaymentError(
          'conflict',
          `Only a captured payment can be refunded (this one is ${row.status}). Void it instead.`,
        );
      }
      if (input.amount.currencyCode !== row.currencyCode) {
        throw new PaymentError('invalid_request', 'Refund currency must match the payment.');
      }

      const refunded = await sumRefunds(tx, row.id, ['succeeded', 'pending']);
      const refundable = row.amount - refunded;
      if (input.amount.amount > refundable) {
        throw new PaymentError('conflict', `Only ${refundable} is left to refund on this payment.`);
      }

      const reservation = await tx.paymentRefund.create({
        data: {
          id: newId('refund'),
          shopId,
          paymentId: row.id,
          amount: input.amount.amount,
          reason: input.reason ?? null,
          status: 'pending',
          idempotencyKey: input.idempotencyKey,
        },
      });
      return { row, reservationId: reservation.id };
    });
    payment = reserved.row;
    reservationId = reserved.reservationId;
  } catch (error) {
    // A concurrent request with the same key won the (shopId, idempotencyKey)
    // unique index. Its outcome is the answer, exactly as in charge().
    if (!isUniqueViolation(error)) throw error;
    const winner = await replayRefund(db, paymentId, input.idempotencyKey);
    if (!winner) throw error;
    return winner;
  }

  const result = await adapterFrom(db, payment, deps).then((adapter) =>
    adapter.run((processor, credentials) =>
      processor.refund(payment.processorTxnId ?? '', input.amount, credentials),
    ),
  );
  if (result.outcome === 'failure') {
    // No money moved: release the reservation so the counter never sees it and
    // the idempotency key stays free for the admin to simply try again.
    await db.paymentRefund.delete({ where: { id: reservationId } });
    throw new PaymentError('conflict', result.message);
  }

  return toPayment(
    await db.$transaction(async (tx) => {
      // Same lock as the reserve phase, so two settles cannot interleave their
      // counter writes — the sum below always includes every settled row.
      const locked = await tx.payment.update({ where: { id: payment.id }, data: {} });
      await tx.paymentRefund.update({
        where: { id: reservationId },
        data: { status: 'succeeded', processorTxnId: result.processorTxnId },
      });
      const total = await sumRefunds(tx, payment.id, ['succeeded']);
      return tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: total,
          status: total >= locked.amount ? 'refunded' : 'partially_refunded',
        },
      });
    }),
  );
}

/**
 * The outcome a reused idempotency key refers to, or null if the key is new.
 * A key can only ever mean one refund: a different payment behind it is a
 * client bug worth surfacing, and a still-`pending` row is a refund whose
 * processor call is in flight right now.
 */
async function replayRefund(
  db: TenantClient,
  paymentId: string,
  idempotencyKey: string,
): Promise<Payment | null> {
  const replay = await db.paymentRefund.findFirst({ where: { idempotencyKey } });
  if (!replay) return null;
  if (replay.paymentId !== paymentId) {
    throw new PaymentError(
      'conflict',
      'This idempotency key was already used to refund a different payment.',
    );
  }
  if (replay.status === 'pending') {
    throw new PaymentError('conflict', 'A refund with this idempotency key is still in progress.');
  }
  return toPayment(await loadPayment(db, replay.paymentId));
}

/** Satisfied by both `TenantClient` and its `$transaction` callback client. */
type RefundStore = Pick<TenantClient, 'paymentRefund'>;

async function sumRefunds(db: RefundStore, paymentId: string, statuses: string[]): Promise<number> {
  const rows = await db.paymentRefund.findMany({
    where: { paymentId, status: { in: statuses } },
    select: { amount: true },
  });
  return rows.reduce((total, row) => total + row.amount, 0);
}

/* -------------------------------------------------------------------------- */
/* saved cards — the repeat-billing primitive (SPEC §11)                       */
/* -------------------------------------------------------------------------- */

export interface SavedPaymentMethod {
  id: string;
  customerId: string;
  cardTokenId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export async function savePaymentMethod(
  db: TenantClient,
  shopId: string,
  customerId: string,
  cardTokenId: string,
  options: { isDefault?: boolean } = {},
): Promise<SavedPaymentMethod> {
  const card = await db.vaultCard.findUnique({ where: { id: cardTokenId } });
  if (!card) throw new PaymentError('not_found', 'Card token not found');

  // The customer's first card is their default whether they asked or not —
  // otherwise "charge saved card" has nothing to pick.
  const existing = await db.paymentMethod.count({ where: { customerId } });
  const isDefault = options.isDefault ?? existing === 0;
  if (isDefault && existing > 0) {
    await db.paymentMethod.updateMany({ where: { customerId }, data: { isDefault: false } });
  }

  const row = await db.paymentMethod.create({
    data: {
      id: newId('paymentMethod'),
      shopId,
      customerId,
      cardTokenId,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault,
    },
  });
  return row;
}

export interface ChargeSavedCardInput {
  paymentMethodId: string;
  amount: MoneyDto;
  idempotencyKey: string;
  orderId?: string | null;
  checkoutId?: string | null;
  reference?: string;
}

/**
 * The whole subscription/repeat-billing story: a stored token, charged on
 * demand. There is no scheduler here on purpose (SPEC §2).
 */
export async function chargeSavedCard(
  db: TenantClient,
  shopId: string,
  input: ChargeSavedCardInput,
  deps: RouterDeps = {},
): Promise<Payment> {
  const method = await db.paymentMethod.findUnique({ where: { id: input.paymentMethodId } });
  if (!method) throw new PaymentError('not_found', 'Payment method not found');

  return charge(
    db,
    shopId,
    {
      cardTokenId: method.cardTokenId,
      amount: input.amount,
      capture: true,
      idempotencyKey: input.idempotencyKey,
      orderId: input.orderId ?? null,
      checkoutId: input.checkoutId ?? null,
      ...(input.reference ? { reference: input.reference } : {}),
    },
    deps,
  );
}

/* -------------------------------------------------------------------------- */
/* shared plumbing                                                             */
/* -------------------------------------------------------------------------- */

interface PaymentRow {
  id: string;
  orderId: string | null;
  checkoutId: string | null;
  amount: number;
  refundedAmount: number;
  currencyCode: string;
  status: string;
  processor: string;
  processorConfigId: string | null;
  processorTxnId: string | null;
  cardTokenId: string | null;
  last4: string | null;
  brand: string | null;
  errorCode: string | null;
  routingTrail: unknown;
  createdAt: Date;
  updatedAt: Date;
}

async function loadPayment(db: TenantClient, paymentId: string): Promise<PaymentRow> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new PaymentError('not_found', 'Payment not found');
  return payment;
}

/**
 * The adapter that took the money, with its credentials — a later operation
 * must reach the same processor and the same transaction, never whatever the
 * routing rules would pick today.
 */
async function adapterFrom(
  db: TenantClient,
  payment: PaymentRow,
  deps: RouterDeps,
): Promise<{
  run<T>(
    fn: (adapter: ProcessorAdapter, credentials: Record<string, string>) => Promise<T>,
  ): Promise<T>;
}> {
  if (!payment.processorTxnId) {
    throw new PaymentError('conflict', 'This payment has no processor transaction to act on.');
  }
  const config = payment.processorConfigId
    ? await db.processorConfig.findUnique({ where: { id: payment.processorConfigId } })
    : null;

  const resolve = deps.adapters ?? adapterFor;
  const adapter = resolve(payment.processor as ProcessorKey);
  const credentials = config ? credentialsFor(config) : {};
  return { run: (fn) => fn(adapter, credentials) };
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.orderId,
    checkoutId: row.checkoutId,
    amount: { amount: row.amount, currencyCode: row.currencyCode },
    refundedAmount: { amount: row.refundedAmount, currencyCode: row.currencyCode },
    status: row.status as Payment['status'],
    processor: row.processor as ProcessorKey,
    processorTxnId: row.processorTxnId,
    cardTokenId: row.cardTokenId,
    last4: row.last4,
    brand: row.brand,
    errorCode: row.errorCode,
    routingTrail: (row.routingTrail ?? []) as Payment['routingTrail'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
