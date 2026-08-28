'use client';

/**
 * The smart-collection condition builder (PARITY.md → Collection form).
 * Owner: WS-B (B6).
 *
 * Shopify's shape: an any/all radio pair, then a row per condition — column,
 * relation, value — and a live list of what currently matches.
 *
 * The preview comes from the API (`POST /admin/api/collections/preview`), never
 * from re-running the rules in the browser: the translator is subtle (a negated
 * text rule has to include NULLs, a tag is a whole-array match) and two
 * implementations would drift the first time a relation was added.
 */
import type { CollectionRule, CollectionRuleSet } from '@merchant/contracts/collections';
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import {
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  RadioButton,
  Select,
  Spinner,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../../../../../lib/api.ts';
import {
  columnOptions,
  columnSpec,
  completeRules,
  conditionToInput,
  inputToCondition,
  newRule,
  type RuleColumn,
  relationOptions,
  withColumn,
} from '../../../../../lib/collection-rules.ts';

/** What the merchant should be typing, per column kind. */
const PLACEHOLDERS: Record<string, string> = {
  text: 'Jacket',
  tag: 'new',
  money: '20.00',
  number: '10',
};

/** Enough for the currencies the demo ships; falls back to the code itself. */
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

/**
 * The condition value input.
 *
 * The field holds what the merchant TYPED; the canonical form (minor units for
 * money, trimmed for text) lives only on the rule. Feeding the canonical form
 * back as the controlled `value` on every keystroke made the field rewrite
 * itself mid-edit — "2" became "2.00", the next digit landed after the cents
 * and rounded, and "$25" was unreachable by typing (a trailing space vanished
 * the same way on text columns). The text resyncs from the rule only when the
 * rule changed underneath it (column switch, discard).
 */
function RuleValueField({
  rule,
  currencyCode,
  onCondition,
}: {
  rule: CollectionRule;
  currencyCode: string;
  onCondition: (condition: string) => void;
}) {
  const kind = columnSpec(rule.column).kind;
  const [text, setText] = useState(() =>
    conditionToInput(rule.column, rule.condition, currencyCode),
  );
  const [synced, setSynced] = useState(rule.condition);
  if (rule.condition !== synced) {
    setSynced(rule.condition);
    setText(conditionToInput(rule.column, rule.condition, currencyCode));
  }

  return (
    <TextField
      label="Value"
      labelHidden
      autoComplete="off"
      prefix={kind === 'money' ? (CURRENCY_SYMBOLS[currencyCode] ?? currencyCode) : undefined}
      placeholder={PLACEHOLDERS[kind]}
      value={text}
      onChange={(value) => {
        setText(value);
        const condition = inputToCondition(rule.column, value, currencyCode);
        setSynced(condition);
        onCondition(condition);
      }}
    />
  );
}

function MatchingProducts({ ruleSet }: { ruleSet: CollectionRuleSet }) {
  const rules = completeRules(ruleSet.rules);
  const key = JSON.stringify({ d: ruleSet.appliedDisjunctively, rules });

  const preview = useQuery<Paginated<Product>>({
    queryKey: ['collection-preview', key],
    queryFn: () =>
      apiFetch<Paginated<Product>>('/admin/api/collections/preview', {
        method: 'POST',
        body: { ruleSet: { appliedDisjunctively: ruleSet.appliedDisjunctively, rules }, limit: 10 },
      }),
    // An incomplete condition matches nothing worth showing, and the API
    // refuses an empty rule set outright.
    enabled: rules.length > 0,
    retry: false,
  });

  if (rules.length === 0) {
    return (
      <Text as="p" tone="subdued">
        Add a condition to see which products match.
      </Text>
    );
  }

  if (preview.isPending) {
    return (
      <InlineStack gap="200" blockAlign="center">
        <Spinner size="small" accessibilityLabel="Finding matching products" />
        <Text as="span" tone="subdued">
          Finding products…
        </Text>
      </InlineStack>
    );
  }

  if (preview.error) {
    return (
      <Text as="p" tone="critical">
        {preview.error.message}
      </Text>
    );
  }

  const products = preview.data?.data ?? [];
  if (products.length === 0) {
    return (
      <Text as="p" tone="subdued">
        No products match these conditions yet.
      </Text>
    );
  }

  return (
    <BlockStack gap="200">
      {products.map((product) => (
        <InlineStack key={product.id} gap="300" blockAlign="center" wrap={false}>
          <Thumbnail source={product.images[0]?.url ?? ImageIcon} alt="" size="small" />
          <Text as="span" variant="bodyMd">
            {product.title}
          </Text>
        </InlineStack>
      ))}
    </BlockStack>
  );
}

export function RulesBuilder({
  ruleSet,
  currencyCode,
  onChange,
}: {
  ruleSet: CollectionRuleSet;
  currencyCode: string;
  onChange: (ruleSet: CollectionRuleSet) => void;
}) {
  const setRule = (index: number, rule: CollectionRule) =>
    onChange({ ...ruleSet, rules: ruleSet.rules.map((r, i) => (i === index ? rule : r)) });

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Conditions
        </Text>

        <InlineStack gap="400">
          <RadioButton
            label="Products must match all conditions"
            checked={!ruleSet.appliedDisjunctively}
            id="match-all"
            name="match-mode"
            onChange={() => onChange({ ...ruleSet, appliedDisjunctively: false })}
          />
          <RadioButton
            label="Products can match any condition"
            checked={ruleSet.appliedDisjunctively}
            id="match-any"
            name="match-mode"
            onChange={() => onChange({ ...ruleSet, appliedDisjunctively: true })}
          />
        </InlineStack>

        <BlockStack gap="300">
          {ruleSet.rules.map((rule, index) => (
            <InlineStack
              // Rules have no identity of their own and two can be identical
              // while being edited, so the position is the key.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={`rule-${index}`}
              gap="200"
              blockAlign="end"
              wrap
            >
              <Box minWidth="180px">
                <Select
                  label={index === 0 ? 'Condition' : ''}
                  labelHidden={index > 0}
                  options={columnOptions}
                  value={rule.column}
                  onChange={(column) => setRule(index, withColumn(rule, column as RuleColumn))}
                />
              </Box>
              <Box minWidth="180px">
                <Select
                  label="Relation"
                  labelHidden
                  options={relationOptions(rule.column)}
                  value={rule.relation}
                  onChange={(relation) =>
                    setRule(index, { ...rule, relation: relation as CollectionRule['relation'] })
                  }
                />
              </Box>
              <Box minWidth="180px">
                <RuleValueField
                  // Remount on a column change, so the text restarts from the
                  // (possibly cleared) condition rather than the old column's.
                  // Sole child of its Box, so the key exists only for that.
                  key={rule.column}
                  rule={rule}
                  currencyCode={currencyCode}
                  onCondition={(condition) => setRule(index, { ...rule, condition })}
                />
              </Box>
              <Button
                variant="tertiary"
                tone="critical"
                accessibilityLabel={`Remove condition ${index + 1}`}
                disabled={ruleSet.rules.length === 1}
                onClick={() =>
                  onChange({ ...ruleSet, rules: ruleSet.rules.filter((_, i) => i !== index) })
                }
              >
                Remove
              </Button>
            </InlineStack>
          ))}
        </BlockStack>

        <InlineStack>
          <Button
            variant="plain"
            onClick={() => onChange({ ...ruleSet, rules: [...ruleSet.rules, newRule()] })}
          >
            + Add another condition
          </Button>
        </InlineStack>

        <Box borderBlockStartWidth="025" borderColor="border" paddingBlockStart="400">
          <BlockStack gap="300">
            <Text as="h3" variant="headingXs">
              Matching products
            </Text>
            <MatchingProducts ruleSet={ruleSet} />
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
