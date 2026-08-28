import type { ProcessorAdapter } from '../adapter.ts';

/** `mock` processor adapter (SPEC §11). Owner: WS-D.
 *
 * Always available, no credentials. Deterministic test cards (SPEC §11):
 *   4242424242424242 → approved
 *   4000000000000002 → declined
 *   4000000000009995 → insufficient_funds
 * This adapter powers the local demo and the e2e suite, so it must never
 * depend on network access.
 */
export const mockAdapter: ProcessorAdapter = {
  key: 'mock',
  // TODO(WS-D): implement.
  authorize: () => {
    throw new Error('mock.authorize not implemented');
  },
  capture: () => {
    throw new Error('mock.capture not implemented');
  },
  refund: () => {
    throw new Error('mock.refund not implemented');
  },
  voidAuth: () => {
    throw new Error('mock.voidAuth not implemented');
  },
  verifyCredentials: () => Promise.resolve(false),
};
