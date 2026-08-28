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
 */

// TODO(WS-D): PaymentRouter.charge(shopId, cardTokenId, amount, ctx)
export {};
