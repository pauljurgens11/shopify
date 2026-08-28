/**
 * Which processors get tried, and in what order (SPEC §11). Owner: WS-D.
 *
 * Pure on purpose — no database, no adapters, no clock. Everything that decides
 * where a charge goes lives here so it can be reasoned about and tested without
 * a processor in the loop; `router.ts` does the executing and the persisting.
 *
 * The model, from SPEC §11: a merchant orders `RoutingRule`s, each pointing at
 * a connected processor with a percentage `weight` and optional `conditions`.
 * For a given charge, the rules whose conditions match are the candidates; one
 * is picked by weight, and the rest become the fallback chain for hard
 * failures. Declines never reach the chain — that decision belongs to
 * `router.ts`, which stops the loop.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type { CardBrand, ProcessorKey } from '@merchant/contracts/pay';

export interface RoutingConditions {
  cardBrands?: CardBrand[];
  minAmount?: MoneyDto;
  maxAmount?: MoneyDto;
}

/** A connected processor plus the rule that points at it. */
export interface RoutingCandidate {
  processorConfigId: string;
  processor: ProcessorKey;
  position: number;
  /** Percentage split across the rules that match a given charge. */
  weight: number;
  conditions: RoutingConditions;
}

export interface ChargeContext {
  amount: MoneyDto;
  brand: CardBrand;
}

export function ruleMatches(candidate: RoutingCandidate, ctx: ChargeContext): boolean {
  const { cardBrands, minAmount, maxAmount } = candidate.conditions;

  // An empty list is what an untouched multi-select sends. Reading it as "no
  // brand is allowed" would silently disable the rule the merchant just made.
  if (cardBrands && cardBrands.length > 0 && !cardBrands.includes(ctx.brand)) return false;

  // Comparing amounts across currencies compares meaningless integers (¥1000
  // vs $10.00). Shops are single-currency (SPEC §2), so this only fires on a
  // misconfigured rule — and not matching is the safe reading of one.
  if (minAmount) {
    if (minAmount.currencyCode !== ctx.amount.currencyCode) return false;
    if (ctx.amount.amount < minAmount.amount) return false;
  }
  if (maxAmount) {
    if (maxAmount.currencyCode !== ctx.amount.currencyCode) return false;
    if (ctx.amount.amount > maxAmount.amount) return false;
  }

  return true;
}

/**
 * The ordered list of processors to attempt: the weighted pick first, then
 * every other matching processor in the merchant's own order.
 *
 * `rng` is a parameter rather than a call to `Math.random` so that a weighted
 * split is testable and a production failover is reproducible from its
 * `routingTrail` (CLAUDE.md — inject randomness).
 *
 * Returns `[]` when nothing matches; the caller decides what the fallback is,
 * because "no rules at all" and "rules that exclude this card" want the same
 * answer here but different handling there.
 */
export function selectProcessorChain(
  candidates: RoutingCandidate[],
  ctx: ChargeContext,
  rng: () => number = Math.random,
): RoutingCandidate[] {
  const matches = candidates
    .filter((candidate) => ruleMatches(candidate, ctx))
    .sort(
      (a, b) => a.position - b.position || a.processorConfigId.localeCompare(b.processorConfigId),
    );

  if (matches.length === 0) return [];

  const first = weightedPick(matches, rng);
  const chain = [first, ...matches.filter((candidate) => candidate !== first)];

  // Two rules may point at one processor (different conditions, or a merchant
  // mid-edit). Attempting it twice would burn a failover slot on a processor
  // that just failed.
  const seen = new Set<string>();
  return chain.filter((candidate) => {
    if (seen.has(candidate.processorConfigId)) return false;
    seen.add(candidate.processorConfigId);
    return true;
  });
}

/** `matches` must be non-empty and already in position order. */
function weightedPick(matches: RoutingCandidate[], rng: () => number): RoutingCandidate {
  const first = matches[0] as RoutingCandidate;

  const total = matches.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  // All-zero weights is a merchant who never touched the sliders, not an
  // instruction to route nowhere. Their explicit ordering is the better guess.
  if (total <= 0) return first;

  let ticket = rng() * total;
  for (const candidate of matches) {
    ticket -= Math.max(0, candidate.weight);
    if (ticket < 0) return candidate;
  }
  // Only reachable if rng() returns exactly 1 (Math.random never does).
  return matches[matches.length - 1] as RoutingCandidate;
}
