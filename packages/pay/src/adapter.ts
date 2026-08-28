/**
 * The processor boundary (SPEC §11). Owner: WS-D.
 *
 * Every processor implements exactly this. The router, the checkout, and the
 * admin know nothing else about payments — which is what makes adding a
 * processor a one-file change.
 *
 * Two deliberate deviations from the SPEC §11 sketch, both logged in
 * DECISIONS.md:
 *
 *   1. `creds` is passed into every method rather than bound at construction.
 *      Routing is per-merchant (SPEC §11), so one process serves many shops'
 *      credentials; a per-shop adapter instance would mean a per-shop SDK
 *      client cache — and a place for one tenant's key to be reused for
 *      another. Stateless adapters make that class of bug unrepresentable.
 *
 *   2. `authorize` takes `CardMaterial` alongside the request. The sketch
 *      passes only `cardTokenId`, but an adapter cannot charge a token — it
 *      needs the PAN, and only the vault can produce one. The router (D3)
 *      detokenizes and hands the material straight across; both ends of that
 *      call live inside `packages/pay`, so no PAN crosses the package
 *      boundary.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type {
  AuthorizeRequest,
  AuthResult,
  CardToken,
  ProcessorKey,
  ProcessorResult,
} from '@merchant/contracts/pay';

export type ProcessorCredentials = Record<string, string>;

/**
 * Decrypted card material — the ONLY type in the monorepo that carries a PAN.
 *
 * Declared here rather than in `@merchant/contracts` on purpose: contracts is
 * imported by the API, the admin and the storefront, and a PAN-bearing type
 * within reach of those apps is an accident waiting to happen. It travels
 * exactly one hop — vault → adapter — and must never reach a log line, an
 * error message, or a `raw` payload.
 */
export interface CardMaterial extends Omit<CardToken, 'cardTokenId'> {
  number: string;
  cvc: string;
  cardholderName?: string | null;
}

export interface ProcessorAdapter {
  readonly key: ProcessorKey;

  authorize(
    req: AuthorizeRequest,
    card: CardMaterial,
    creds: ProcessorCredentials,
  ): Promise<AuthResult>;
  capture(txnId: string, amount: MoneyDto, creds: ProcessorCredentials): Promise<ProcessorResult>;
  /**
   * `opts.idempotencyKey` reaches the processor (Stripe's idempotency header,
   * Maverick's `idempotency-key`), so retrying a refund whose first attempt's
   * outcome was lost REPLAYS it instead of refunding twice.
   */
  refund(
    txnId: string,
    amount: MoneyDto,
    creds: ProcessorCredentials,
    opts?: { idempotencyKey?: string },
  ): Promise<ProcessorResult>;
  voidAuth(txnId: string, creds: ProcessorCredentials): Promise<ProcessorResult>;
  verifyCredentials(creds: ProcessorCredentials): Promise<boolean>;
}
