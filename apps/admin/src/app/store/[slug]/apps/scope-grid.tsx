'use client';

/**
 * The access-scope grid shared by the create modal and the app detail form.
 * Owner: WS-G.
 *
 * One row per permission area with Read/Write checkboxes, so the grid reads the
 * way the merchant already thinks about staff permissions. The write-implies-
 * read rule lives in `scopes.ts`, not in the handlers below.
 */
import { BlockStack, Button, Checkbox, InlineGrid, InlineStack, Text } from '@shopify/polaris';
import {
  allScopes,
  areaLabel,
  hasScope,
  SCOPE_AREAS,
  scopeCountLabel,
  toggleScope,
} from './scopes.ts';

export function ScopeGrid({
  scopes,
  onChange,
  disabled = false,
}: {
  scopes: string[];
  onChange: (scopes: string[]) => void;
  disabled?: boolean;
}) {
  const everything = allScopes();

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="span" tone="subdued">
          {scopeCountLabel(scopes)} selected
        </Text>
        {/* Sixteen checkboxes is a long way to say "full access", which is what
            most private apps in a demo actually want. */}
        <InlineStack gap="200">
          <Button
            variant="plain"
            disabled={disabled || scopes.length === everything.length}
            onClick={() => onChange(everything)}
          >
            Select all
          </Button>
          <Button
            variant="plain"
            disabled={disabled || scopes.length === 0}
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </InlineStack>
      </InlineStack>

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        {SCOPE_AREAS.map((area) => (
          <BlockStack key={area} gap="150">
            <Text as="h4" variant="headingXs">
              {areaLabel(area)}
            </Text>
            <InlineStack gap="500">
              <Checkbox
                label="Read"
                disabled={disabled}
                checked={hasScope(scopes, 'read', area)}
                onChange={(checked) => onChange(toggleScope(scopes, 'read', area, checked))}
              />
              <Checkbox
                label="Write"
                disabled={disabled}
                checked={hasScope(scopes, 'write', area)}
                onChange={(checked) => onChange(toggleScope(scopes, 'write', area, checked))}
              />
            </InlineStack>
          </BlockStack>
        ))}
      </InlineGrid>
    </BlockStack>
  );
}
