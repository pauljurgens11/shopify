'use client';

/**
 * The title / description card (docs/parity/collection-detail.md → Left column 1).
 * Owner: WS-B (B6).
 *
 * The distinctive thing about Shopify's collection page: this card has NO
 * heading and no labelled form inputs. It is a ~145px image drop zone on the
 * left, the title beside it as large heading TEXT, and a subdued
 * `"Add description"` placeholder under it — both click-to-edit, swapping to a
 * field in place.
 *
 * Hand-built rather than a Polaris component (CLAUDE.md §7 escape hatch):
 * Polaris ships no inline-edit primitive, so the not-editing state is an
 * unstyled button carrying `Text`, and only the editing state is a `TextField`.
 * Everything visual comes from `--p-*` tokens.
 */
import { BlockStack, Box, Card, InlineError, InlineStack, Text, TextField } from '@shopify/polaris';
import { useState } from 'react';
import { CollectionImage } from './collection-image.tsx';

/** An unstyled, full-width, left-aligned click target for the read state. */
const AFFORDANCE: React.CSSProperties = {
  appearance: 'none',
  background: 'none',
  border: 0,
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  width: '100%',
  cursor: 'text',
  display: 'block',
};

export function CollectionHeaderCard({
  title,
  description,
  descriptionIsRich,
  imageUrl,
  titleError,
  onTitle,
  onDescription,
  onImage,
}: {
  title: string;
  description: string;
  /** The description is raw HTML we could not safely unwrap, so it is shown as-is. */
  descriptionIsRich: boolean;
  imageUrl: string | null;
  titleError?: string;
  onTitle: (title: string) => void;
  onDescription: (description: string) => void;
  onImage: (imageUrl: string | null) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  return (
    <Card>
      <InlineStack gap="400" blockAlign="start" wrap={false}>
        <CollectionImage imageUrl={imageUrl} onChange={onImage} />

        <Box width="100%">
          <BlockStack gap="200">
            {editingTitle ? (
              // A form, purely so Enter commits the way it does in Shopify's
              // inline title: Polaris's TextField forwards no `onKeyDown`, and
              // an implicit submit needs no key handling. The page itself saves
              // through the contextual save bar, so there is nothing to submit.
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setEditingTitle(false);
                }}
                // Polaris's TextField swallows Enter rather than letting the
                // form submit implicitly, so the form listens for it as it
                // bubbles. `onSubmit` stays for anything that does submit.
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    setEditingTitle(false);
                  }
                }}
              >
                <TextField
                  label="Title"
                  labelHidden
                  name="title"
                  autoComplete="off"
                  autoFocus
                  placeholder="Summer collection"
                  value={title}
                  onChange={onTitle}
                  onBlur={() => setEditingTitle(false)}
                />
              </form>
            ) : (
              <button
                type="button"
                style={AFFORDANCE}
                aria-label="Edit collection title"
                onClick={() => setEditingTitle(true)}
              >
                <Text as="h2" variant="headingLg" tone={title ? undefined : 'subdued'}>
                  {title || 'Add title'}
                </Text>
              </button>
            )}

            {titleError ? <InlineError message={titleError} fieldID="title" /> : null}

            {editingDescription ? (
              <TextField
                label="Description"
                labelHidden
                autoComplete="off"
                autoFocus
                multiline={4}
                placeholder="Add description"
                value={description}
                helpText={
                  descriptionIsRich
                    ? 'This description uses formatting, so it is shown as HTML.'
                    : undefined
                }
                onChange={onDescription}
                onBlur={() => setEditingDescription(false)}
              />
            ) : (
              <button
                type="button"
                style={AFFORDANCE}
                aria-label="Edit collection description"
                onClick={() => setEditingDescription(true)}
              >
                {/* `pre-wrap` so a multi-line description reads back the way it
                    was typed rather than collapsing to one paragraph. */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  <Text as="p" variant="bodyMd" tone={description ? undefined : 'subdued'}>
                    {description || 'Add description'}
                  </Text>
                </div>
              </button>
            )}
          </BlockStack>
        </Box>
      </InlineStack>
    </Card>
  );
}
