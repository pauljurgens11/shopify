/**
 * The published test-card matrix (SPEC §11). Owner: WS-D.
 *
 * These numbers are a contract with the demo, the seed and the Playwright smoke
 * suite — somebody types them into a checkout by hand. They are Stripe's own
 * test numbers, so the same card behaves the same way whether the merchant is
 * on `mock` or on Stripe test keys.
 *
 * `hard_failure` is the one we invented. The router's failover is only
 * demonstrable if some card can make a processor fall over without the card
 * itself being at fault, and `4000000000000119` (Stripe's "processing error"
 * card) is the natural home for it.
 */
export const TEST_CARDS = {
  approved: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  /** Simulates a processor outage — the router MAY fail over to the next one. */
  hardFailure: '4000000000000119',
} as const;

export type TestCardOutcome = 'approved' | 'declined' | 'insufficient_funds' | 'hard_failure';

/**
 * Anything not in the matrix approves. The seed and the demo store are full of
 * hand-written card numbers, and a demo that declines by default is a dead
 * demo.
 */
export function classifyTestCard(number: string): TestCardOutcome {
  const digits = number.replace(/\D/g, '');
  if (digits === TEST_CARDS.declined) return 'declined';
  if (digits === TEST_CARDS.insufficientFunds) return 'insufficient_funds';
  if (digits.endsWith('0119')) return 'hard_failure';
  return 'approved';
}
