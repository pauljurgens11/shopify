/**
 * Draft state for the routing rules card (D4). Owner: WS-D.
 *
 * Money crosses this boundary as integer minor units (SPEC §5); the drafts
 * hold decimal *strings* only because that is what a text input is.
 *
 * The ≤100 validation mirrors the server's grouping (routing-rules.ts): rules
 * compete only when their conditions are identical, and only then is a total
 * over 100 unambiguously a mistake. Brands are sorted before grouping AND
 * before sending, so two rules that match the same charges cannot dodge the
 * server's check by listing brands in a different order.
 */
import { fromDecimal, type Money, minorUnitFactor, toDecimal } from '@merchant/config/money';
import type { RoutingRule } from '@merchant/contracts/pay';

type CardBrand = NonNullable<RoutingRule['conditions']['cardBrands']>[number];

export interface RuleDraft {
  /** Stable render key; not the rule id — the PUT replaces the list wholesale. */
  key: string;
  processorConfigId: string;
  weight: string;
  /** Empty = any brand. */
  cardBrands: CardBrand[];
  minAmount: string;
  maxAmount: string;
}

export interface RuleInput {
  processorConfigId: string;
  position: number;
  weight: number;
  conditions: {
    cardBrands?: CardBrand[];
    minAmount?: Money;
    maxAmount?: Money;
  };
}

let keyCounter = 0;
const nextKey = () => `rule-${++keyCounter}`;

export function newRuleDraft(processorConfigId: string): RuleDraft {
  return {
    key: nextKey(),
    processorConfigId,
    weight: '100',
    cardBrands: [],
    minAmount: '',
    maxAmount: '',
  };
}

/** `{amount: 1050}` → `"10.50"` — the string a money text field edits. */
function toAmountString(money: Money): string {
  return toDecimal(money).toFixed(minorUnitFactor(money.currencyCode) === 1 ? 0 : 2);
}

export function toDrafts(rules: RoutingRule[]): RuleDraft[] {
  return [...rules]
    .sort((a, b) => a.position - b.position)
    .map((rule) => ({
      key: nextKey(),
      processorConfigId: rule.processorConfigId,
      weight: String(rule.weight),
      cardBrands: [...(rule.conditions.cardBrands ?? [])].sort(),
      minAmount: rule.conditions.minAmount ? toAmountString(rule.conditions.minAmount) : '',
      maxAmount: rule.conditions.maxAmount ? toAmountString(rule.conditions.maxAmount) : '',
    }));
}

function parseConditions(draft: RuleDraft, currencyCode: string): RuleInput['conditions'] {
  return {
    ...(draft.cardBrands.length > 0 ? { cardBrands: [...draft.cardBrands].sort() } : {}),
    ...(draft.minAmount.trim() ? { minAmount: fromDecimal(draft.minAmount, currencyCode) } : {}),
    ...(draft.maxAmount.trim() ? { maxAmount: fromDecimal(draft.maxAmount, currencyCode) } : {}),
  };
}

/** Drafts → the PUT body's `rules`. Call only after `validateDrafts` passes. */
export function toRulesInput(drafts: RuleDraft[], currencyCode: string): RuleInput[] {
  return drafts.map((draft, index) => ({
    processorConfigId: draft.processorConfigId,
    position: index,
    weight: Number(draft.weight),
    conditions: parseConditions(draft, currencyCode),
  }));
}

export interface ValidationResult {
  valid: boolean;
  /** First problem per rule, keyed by draft key — feeds Polaris `error` props. */
  byKey: Record<string, string>;
}

export function validateDrafts(drafts: RuleDraft[], currencyCode: string): ValidationResult {
  const byKey: Record<string, string> = {};

  for (const draft of drafts) {
    if (!draft.processorConfigId) {
      byKey[draft.key] = 'Choose a payment provider for this rule.';
      continue;
    }

    // Blank is a missing answer, not a weight — Number('') is 0, which would
    // silently save a rule that receives no traffic.
    const weight = draft.weight.trim() === '' ? Number.NaN : Number(draft.weight);
    if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
      byKey[draft.key] = 'Weight must be a whole number between 0 and 100.';
      continue;
    }

    let min: Money | undefined;
    let max: Money | undefined;
    try {
      min = draft.minAmount.trim() ? fromDecimal(draft.minAmount, currencyCode) : undefined;
      max = draft.maxAmount.trim() ? fromDecimal(draft.maxAmount, currencyCode) : undefined;
    } catch {
      byKey[draft.key] = 'Enter amounts as numbers, for example 25.00.';
      continue;
    }
    // Both bounds: a negative amount can never match a charge, and the server
    // schema (positiveMoneySchema) now refuses it too.
    if ((min && min.amount < 0) || (max && max.amount < 0)) {
      byKey[draft.key] = 'Amounts can’t be negative.';
      continue;
    }
    if (min && max && min.amount > max.amount) {
      byKey[draft.key] = 'The minimum can’t be above the maximum.';
    }
  }

  // Group like the server does — identical (normalized) conditions compete for
  // the same charge, and their weights are a percentage split of it.
  const groups = new Map<string, { total: number; keys: string[] }>();
  for (const draft of drafts) {
    if (byKey[draft.key]) continue;
    let conditionsKey: string;
    try {
      conditionsKey = JSON.stringify(parseConditions(draft, currencyCode));
    } catch {
      continue; // already reported above
    }
    const group = groups.get(conditionsKey) ?? { total: 0, keys: [] };
    group.total += Number(draft.weight);
    group.keys.push(draft.key);
    groups.set(conditionsKey, group);
  }
  for (const group of groups.values()) {
    if (group.total > 100) {
      for (const key of group.keys) {
        byKey[key] = 'Weights for rules with the same conditions can’t exceed 100%.';
      }
    }
  }

  return { valid: Object.keys(byKey).length === 0, byKey };
}

/** Reorder by the up/down arrows; out-of-range moves are a no-op. */
export function moveRule(drafts: RuleDraft[], index: number, direction: -1 | 1): RuleDraft[] {
  const target = index + direction;
  if (index < 0 || index >= drafts.length || target < 0 || target >= drafts.length) return drafts;
  const next = [...drafts];
  const moved = next[index];
  const displaced = next[target];
  if (!moved || !displaced) return drafts;
  next[target] = moved;
  next[index] = displaced;
  return next;
}
