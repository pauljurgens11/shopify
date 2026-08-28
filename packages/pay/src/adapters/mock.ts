/**
 * `mock` processor adapter (SPEC §11). Owner: WS-D.
 *
 * Always available, no credentials. Deterministic test cards (SPEC §11):
 *   4242424242424242 → approved
 *   4000000000000002 → declined
 *   4000000000009995 → insufficient_funds
 *   …0119            → hard_failure (simulated outage, so failover is demoable)
 * Everything else approves — see test-cards.ts.
 *
 * This adapter powers the local demo and the e2e suite, so it must never depend
 * on network access, and it must never throw: the router reads outcomes, not
 * exceptions.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type { AuthorizeRequest, AuthResult, ProcessorResult } from '@merchant/contracts/pay';
import type { CardMaterial, ProcessorAdapter } from '../adapter.ts';
import { SimulatedProcessor, simulatedLedger } from './simulated.ts';
import { classifyTestCard } from './test-cards.ts';

const ledger = simulatedLedger('mock', 'mock');

/** Test/demo-reset hook. Never called from a request path. */
export function resetMockProcessor(): void {
  ledger.reset();
}

function authorize(
  req: AuthorizeRequest,
  card: CardMaterial,
  _creds: Record<string, string>,
): Promise<AuthResult> {
  const fingerprint = SimulatedProcessor.fingerprint(req.amount, card, req.capture);
  const replay = ledger.recall(req.idempotencyKey, fingerprint);
  if (replay) return Promise.resolve(replay);

  const result = decide(req, card);
  ledger.remember(req.idempotencyKey, fingerprint, result);
  if (result.outcome === 'approved') {
    ledger.recordAuthorization(result.processorTxnId, req.amount, result.captured);
  }
  return Promise.resolve(result);
}

function decide(req: AuthorizeRequest, card: CardMaterial): AuthResult {
  switch (classifyTestCard(card.number)) {
    case 'declined':
      return {
        outcome: 'declined',
        processor: 'mock',
        code: 'declined',
        message: 'Your card was declined.',
        processorTxnId: null,
      };
    case 'insufficient_funds':
      return {
        outcome: 'declined',
        processor: 'mock',
        code: 'insufficient_funds',
        message: 'Your card has insufficient funds.',
        processorTxnId: null,
      };
    case 'hard_failure':
      return {
        outcome: 'hard_failure',
        processor: 'mock',
        message: 'Simulated processor outage.',
        retryable: true,
      };
    case 'approved':
      return {
        outcome: 'approved',
        processor: 'mock',
        processorTxnId: ledger.newTxnId(),
        captured: req.capture,
        amount: req.amount,
      };
  }
}

export const mockAdapter: ProcessorAdapter = {
  key: 'mock',
  authorize,
  capture: (txnId: string, amount: MoneyDto): Promise<ProcessorResult> =>
    Promise.resolve(ledger.capture(txnId, amount)),
  refund: (txnId: string, amount: MoneyDto): Promise<ProcessorResult> =>
    Promise.resolve(ledger.refund(txnId, amount)),
  voidAuth: (txnId: string): Promise<ProcessorResult> => Promise.resolve(ledger.voidAuth(txnId)),
  verifyCredentials: () => Promise.resolve(true),
};
