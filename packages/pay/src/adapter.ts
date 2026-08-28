/**
 * The processor boundary (SPEC §11). Owner: WS-D.
 *
 * Every processor implements exactly this. The router, the checkout, and the
 * admin know nothing else about payments — which is what makes adding a
 * processor a one-file change.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type {
  AuthorizeRequest,
  AuthResult,
  ProcessorKey,
  ProcessorResult,
} from '@merchant/contracts/pay';

export type ProcessorCredentials = Record<string, string>;

export interface ProcessorAdapter {
  readonly key: ProcessorKey;

  authorize(req: AuthorizeRequest, creds: ProcessorCredentials): Promise<AuthResult>;
  capture(txnId: string, amount: MoneyDto, creds: ProcessorCredentials): Promise<ProcessorResult>;
  refund(txnId: string, amount: MoneyDto, creds: ProcessorCredentials): Promise<ProcessorResult>;
  voidAuth(txnId: string, creds: ProcessorCredentials): Promise<ProcessorResult>;
  verifyCredentials(creds: ProcessorCredentials): Promise<boolean>;
}
