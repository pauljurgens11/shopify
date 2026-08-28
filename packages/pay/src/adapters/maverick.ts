import type { ProcessorAdapter } from '../adapter.ts';

/** `maverick` processor adapter (SPEC §11). Owner: WS-D.
 *
 * Interface-complete against Maverick's documented request/response shapes, but
 * returns SIMULATED responses unless MAVERICK_* credentials are present
 * (SPEC §2 puts a real integration out of scope). Keep that clearly marked in
 * the admin UI so nobody mistakes a simulated approval for a real one.
 */
export const maverickAdapter: ProcessorAdapter = {
  key: 'maverick',
  // TODO(WS-D): implement.
  authorize: () => {
    throw new Error('maverick.authorize not implemented');
  },
  capture: () => {
    throw new Error('maverick.capture not implemented');
  },
  refund: () => {
    throw new Error('maverick.refund not implemented');
  },
  voidAuth: () => {
    throw new Error('maverick.voidAuth not implemented');
  },
  verifyCredentials: () => Promise.resolve(false),
};
