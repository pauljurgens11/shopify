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
import { RichTextField } from '../../products/_components/rich-text-field.tsx';
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

/** `<p><br></p>` is what an emptied rich text editor leaves behind. */
const hasContent = (html: string) =>
  html.replace(/<[^>]*>/g, '').trim() !== '' || /<img\b/i.test(html);

export function CollectionHeaderCard({
  title,
  descriptionHtml,
  imageUrl,
  titleError,
  onTitle,
  onDescription,
  onImage,
}: {
  title: string;
  /** Html in and out, like the product form's — the editor owns the markup. */
  descriptionHtml: string;
  imageUrl: string | null;
  titleError?: string;
  onTitle: (title: string) => void;
  onDescription: (descriptionHtml: string) => void;
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
              // The same editor the product form uses: Shopify's collection
              // description is rich text, and a bare textarea beside a
              // toolbar'd product description is a loud "not Shopify" tell.
              // Once revealed it stays revealed for the visit — it has no blur
              // to close on, because reaching for the toolbar blurs the editor.
              <RichTextField
                label="Description"
                labelHidden
                value={descriptionHtml}
                onChange={onDescription}
              />
            ) : (
              <button
                type="button"
                style={AFFORDANCE}
                aria-label="Edit collection description"
                onClick={() => setEditingDescription(true)}
              >
                {hasContent(descriptionHtml) ? (
                  // The merchant's own markup, written by the editor above and
                  // already rendered verbatim on the storefront.
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
                  <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Add description
                  </Text>
                )}
              </button>
            )}
          </BlockStack>
        </Box>
      </InlineStack>
    </Card>
  );
}
