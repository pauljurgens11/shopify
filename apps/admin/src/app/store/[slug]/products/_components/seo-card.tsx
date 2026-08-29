'use client';

/**
 * The Search engine listing card (docs/parity/product-form.md → left column
 * card 9). Owner: WS-B (B5).
 *
 * Collapsed it is a Google-shaped preview of the product; the pencil opens the
 * three fields behind it. The URL handle is edited here and nowhere else, which
 * is what keeps "renaming a product does not move its storefront URL" true
 * (DECISIONS, WS-B) — `draftToInput` only sends `handle` when this field holds
 * something.
 */
import { BlockStack, Box, Button, Card, InlineStack, Text, TextField } from '@shopify/polaris';
import { EditIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import {
  handleFromTitle,
  handleWhileTyping,
  normalizeHandle,
  type ProductDraft,
} from '../../../../../lib/product-draft.ts';
import { storefrontOrigin } from '../../storefront/preview-url.ts';

/** Shopify's own truncation points, so the preview lies the same way Google does. */
const TITLE_LIMIT = 70;
const DESCRIPTION_LIMIT = 160;

const clamp = (value: string, limit: number) =>
  value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;

export function SeoCard({
  slug,
  draft,
  onChange,
}: {
  slug: string;
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}) {
  const [editing, setEditing] = useState(false);

  const title = draft.seoTitle.trim() || draft.title.trim();
  const description = draft.seoDescription.trim();
  const handle = normalizeHandle(draft.handle) || handleFromTitle(draft.title);
  const url = `${storefrontOrigin(slug)}/products/${handle}`;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingSm">
            Search engine listing
          </Text>
          <Button
            variant="tertiary"
            icon={EditIcon}
            accessibilityLabel={
              editing ? 'Done editing search engine listing' : 'Edit search engine listing'
            }
            pressed={editing}
            onClick={() => setEditing((current) => !current)}
          />
        </InlineStack>

        {title === '' && description === '' ? (
          <Text as="p" tone="subdued">
            Add a title and description to see how this product might appear in a search engine
            listing
          </Text>
        ) : (
          <BlockStack gap="050">
            <Text as="p" variant="bodySm" tone="subdued">
              {url}
            </Text>
            <Box>
              <span
                style={{
                  color: 'var(--p-color-text-emphasis)',
                  fontSize: 'var(--p-font-size-400)',
                }}
              >
                {clamp(title, TITLE_LIMIT)}
              </span>
            </Box>
            {description === '' ? null : (
              <Text as="p" variant="bodySm">
                {clamp(description, DESCRIPTION_LIMIT)}
              </Text>
            )}
          </BlockStack>
        )}

        {editing ? (
          <BlockStack gap="300">
            <TextField
              label="Page title"
              autoComplete="off"
              maxLength={TITLE_LIMIT}
              showCharacterCount
              value={draft.seoTitle}
              onChange={(seoTitle) => onChange({ seoTitle })}
            />
            <TextField
              label="Meta description"
              autoComplete="off"
              multiline={3}
              maxLength={DESCRIPTION_LIMIT}
              showCharacterCount
              value={draft.seoDescription}
              onChange={(seoDescription) => onChange({ seoDescription })}
            />
            <TextField
              label="URL handle"
              autoComplete="off"
              prefix={`${storefrontOrigin(slug)}/products/`}
              placeholder={handleFromTitle(draft.title)}
              helpText="Changing this breaks any link that already points at the product."
              value={draft.handle}
              onChange={(next) => onChange({ handle: handleWhileTyping(next) })}
            />
          </BlockStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}
