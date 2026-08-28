/**
 * The transaction ledger shared by the two adapters that can run without a
 * processor behind them (`mock`, and `maverick` with no credentials).
 * Owner: WS-D.
 *
 * It exists so those adapters behave like a real processor at the one place it
 * matters to the rest of the system: you cannot capture twice, cannot refund
 * more than you captured, and cannot void a captured transaction. Without that,
 * the admin's refund UI would look correct while quietly permitting a merchant
 * to refund $200 against a $100 order.
 *
 * In memory and per-process on purpose — there is nothing here worth
 * persisting, and a restart between demo runs is a feature.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type { AuthResult, ProcessorKey, ProcessorResult } from '@merchant/contracts/pay';
import { ulid } from 'ulid';

interface SimulatedTxn {
  authorized: number;
  currencyCode: string;
  captured: number;
  refunded: number;
  voided: boolean;
}

export class SimulatedProcessor {
  private readonly txns = new Map<string, SimulatedTxn>();
  private readonly replays = new Map<string, AuthResult>();

  constructor(
    private readonly processor: ProcessorKey,
    private readonly txnPrefix: string,
  ) {}

  newTxnId(): string {
    return `${this.txnPrefix}_${ulid()}`;
  }

  recordAuthorization(txnId: string, amount: MoneyDto, captured: boolean): void {
    this.txns.set(txnId, {
      authorized: amount.amount,
      currencyCode: amount.currencyCode,
      captured: captured ? amount.amount : 0,
      refunded: 0,
      voided: false,
    });
  }

  /**
   * Idempotency replay (`AuthorizeRequest.idempotencyKey`: "replaying the same
   * key must NOT double-charge").
   *
   * Hard failures are deliberately NOT remembered: they are the outcome the
   * router retries, and a memoized outage would make the retry return the
   * outage forever.
   */
  recall(idempotencyKey: string): AuthResult | undefined {
    return this.replays.get(idempotencyKey);
  }

  remember(idempotencyKey: string, result: AuthResult): void {
    if (result.outcome === 'hard_failure') return;
    this.replays.set(idempotencyKey, result);
  }

  capture(txnId: string, amount: MoneyDto): ProcessorResult {
    const txn = this.txns.get(txnId);
    if (!txn) return this.failure(`Unknown transaction ${txnId}`);
    if (txn.voided) return this.failure('Cannot capture a voided authorization');
    if (txn.captured > 0) return this.failure('Authorization has already been captured');
    const invalid = this.checkAmount(amount, txn.currencyCode);
    if (invalid) return invalid;
    if (amount.amount > txn.authorized) {
      return this.failure('Capture exceeds the authorized amount');
    }

    txn.captured = amount.amount;
    return { outcome: 'success', processor: this.processor, processorTxnId: txnId, amount };
  }

  refund(txnId: string, amount: MoneyDto): ProcessorResult {
    const txn = this.txns.get(txnId);
    if (!txn) return this.failure(`Unknown transaction ${txnId}`);
    if (txn.captured === 0) {
      return this.failure('Cannot refund an authorization that was never captured — void it');
    }
    const invalid = this.checkAmount(amount, txn.currencyCode);
    if (invalid) return invalid;
    if (txn.refunded + amount.amount > txn.captured) {
      return this.failure('Refund exceeds the captured amount');
    }

    txn.refunded += amount.amount;
    return { outcome: 'success', processor: this.processor, processorTxnId: txnId, amount };
  }

  voidAuth(txnId: string): ProcessorResult {
    const txn = this.txns.get(txnId);
    if (!txn) return this.failure(`Unknown transaction ${txnId}`);
    if (txn.captured > 0) return this.failure('Cannot void a captured transaction — refund it');
    if (txn.voided) return this.failure('Authorization has already been voided');

    txn.voided = true;
    return { outcome: 'success', processor: this.processor, processorTxnId: txnId };
  }

  /** Test and demo-reset hook. Never called from a request path. */
  reset(): void {
    this.txns.clear();
    this.replays.clear();
  }

  private checkAmount(amount: MoneyDto, currencyCode: string): ProcessorResult | null {
    if (amount.amount <= 0) return this.failure('Amount must be positive');
    if (amount.currencyCode !== currencyCode) {
      return this.failure(`Currency mismatch: transaction is in ${currencyCode}`);
    }
    return null;
  }

  /**
   * Never retryable. These are all state errors — the same call against the same
   * processor a second later fails identically.
   */
  private failure(message: string): ProcessorResult {
    return { outcome: 'failure', processor: this.processor, message, retryable: false };
  }
}
