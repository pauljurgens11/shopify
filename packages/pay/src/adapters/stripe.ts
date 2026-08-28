import type { ProcessorAdapter } from '../adapter.ts';

/** `stripe` processor adapter (SPEC §11). Owner: WS-D.
 *
 * Real implementation: vault decrypts the PAN → Stripe PaymentMethod →
 * PaymentIntent, using the merchant's own key from ProcessorConfig. Not
 * connected unless the merchant pastes a key.
 */
export const stripeAdapter: ProcessorAdapter = {
  key: 'stripe',
  // TODO(WS-D): implement.
  authorize: () => {
    throw new Error('stripe.authorize not implemented');
  },
  capture: () => {
    throw new Error('stripe.capture not implemented');
  },
  refund: () => {
    throw new Error('stripe.refund not implemented');
  },
  voidAuth: () => {
    throw new Error('stripe.voidAuth not implemented');
  },
  verifyCredentials: () => Promise.resolve(false),
};
