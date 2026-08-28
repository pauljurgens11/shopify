/**
 * The smart-collection condition builder's rules about its own rules.
 * Owner: WS-B (B6).
 *
 * Pure, so the two things that silently produce a broken collection can be
 * tested without rendering anything:
 *
 *   - NOT EVERY (column, relation) PAIR IS LEGAL. The API refuses the rest
 *     rather than matching nothing, so the builder must only ever offer the
 *     pairs it will accept — otherwise the merchant picks "tag contains" and
 *     gets a 400 on save with no idea why.
 *   - PRICE IS INTEGER MINOR UNITS on the wire (SPEC §5). The field shows
 *     "20.00" and the rule carries "2000". Converting in the wrong direction
 *     silently builds a collection for products under $20.00 instead of $20.
 */
import { fromDecimal, toDecimal } from '@merchant/config/money';
import type { CollectionRule } from '@merchant/contracts/collections';

export type RuleColumn = CollectionRule['column'];
export type RuleRelation = CollectionRule['relation'];

/** What kind of value the column compares, which decides its relations and its input. */
type ColumnKind = 'text' | 'tag' | 'money' | 'number';

type ColumnSpec = { value: RuleColumn; label: string; kind: ColumnKind };

/** Shopify's condition list, in Shopify's order. */
export const RULE_COLUMNS: readonly ColumnSpec[] = [
  { value: 'title', label: 'Product title', kind: 'text' },
  { value: 'type', label: 'Product type', kind: 'text' },
  { value: 'vendor', label: 'Product vendor', kind: 'text' },
  { value: 'tag', label: 'Product tag', kind: 'tag' },
  { value: 'price', label: 'Product price', kind: 'money' },
  { value: 'inventory_quantity', label: 'Inventory stock', kind: 'number' },
];

const RELATION_LABELS: Record<RuleRelation, string> = {
  equals: 'is equal to',
  not_equals: 'is not equal to',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  greater_than: 'is greater than',
  less_than: 'is less than',
};

/**
 * Mirrors the constraint table documented on `collectionRuleSchema`: text
 * columns take every text relation, a tag is equality-only (it is an array
 * column, so there is no substring of one), and the numeric columns compare.
 */
const RELATIONS_BY_KIND: Record<ColumnKind, readonly RuleRelation[]> = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'],
  tag: ['equals', 'not_equals'],
  money: ['equals', 'not_equals', 'greater_than', 'less_than'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than'],
};

export const columnSpec = (column: RuleColumn): ColumnSpec =>
  RULE_COLUMNS.find((spec) => spec.value === column) ?? (RULE_COLUMNS[0] as ColumnSpec);

export const relationsFor = (column: RuleColumn): readonly RuleRelation[] =>
  RELATIONS_BY_KIND[columnSpec(column).kind];

export const relationOptions = (column: RuleColumn) =>
  relationsFor(column).map((relation) => ({ value: relation, label: RELATION_LABELS[relation] }));

export const columnOptions = RULE_COLUMNS.map((spec) => ({
  value: spec.value,
  label: spec.label,
}));

/**
 * Keep a rule legal when its column changes: "tag contains" is not a rule the
 * API accepts, so switching from title to tag has to drop the relation to one
 * that is.
 */
export function withColumn(rule: CollectionRule, column: RuleColumn): CollectionRule {
  const allowed = relationsFor(column);
  const relation = allowed.includes(rule.relation) ? rule.relation : (allowed[0] as RuleRelation);
  // The value means something different per kind — a price is not a vendor
  // name — so it is cleared rather than reinterpreted.
  const keepsValue = columnSpec(column).kind === columnSpec(rule.column).kind;
  return { column, relation, condition: keepsValue ? rule.condition : '' };
}

/* -------------------------------------------------------------------------- */
/* The condition value                                                          */
/* -------------------------------------------------------------------------- */

/** What the merchant types. Price is decimal in the field, minor units on the wire. */
export function conditionToInput(column: RuleColumn, condition: string): string {
  if (columnSpec(column).kind !== 'money' || condition === '') return condition;
  const amount = Number.parseInt(condition, 10);
  return Number.isFinite(amount) ? toDecimal({ amount, currencyCode: 'USD' }).toFixed(2) : '';
}

export function inputToCondition(column: RuleColumn, input: string, currencyCode = 'USD'): string {
  const value = input.trim();
  if (columnSpec(column).kind !== 'money' || value === '') return value;
  try {
    return String(fromDecimal(value, currencyCode).amount);
  } catch {
    // Mid-edit ("20.") is not a number yet; the rule stays incomplete rather
    // than being sent as garbage.
    return '';
  }
}

/** A rule with no value matches nothing, so the preview waits for it. */
export const isRuleComplete = (rule: CollectionRule): boolean => rule.condition.trim() !== '';

export const completeRules = (rules: CollectionRule[]): CollectionRule[] =>
  rules.filter(isRuleComplete);

export const newRule = (): CollectionRule => ({
  column: 'title',
  relation: 'contains',
  condition: '',
});
