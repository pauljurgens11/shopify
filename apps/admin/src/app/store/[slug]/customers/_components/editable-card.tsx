'use client';

/**
 * Right-rail card that reads as a summary until the pencil is clicked (C6).
 * Owner: WS-C.
 *
 * docs/parity/customer-form.md: Notes and Tags both use the
 * "pencil-icon-in-header" pattern — a read-only body that the pencil swaps for
 * the editor — rather than an input that is always open. The editor still
 * rides the page's contextual save bar; the pencil only controls visibility.
 */
import { BlockStack, Button, Card, InlineStack, Text } from '@shopify/polaris';
import { EditIcon } from '@shopify/polaris-icons';
import { type ReactNode, useState } from 'react';

export function EditableCard({
  title,
  summary,
  children,
  startEditing = false,
}: {
  title: string;
  /** Read-only body, shown while the card is closed. */
  summary: ReactNode;
  /** The editor, shown while the card is open. */
  children: ReactNode;
  /**
   * Open on mount. A card with nothing to summarise (an unsaved customer's
   * tags) shows its input straight away, which is what the capture shows.
   */
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          {/* No `pressed`: Polaris renders a pressed button filled dark, and a
              black square in the card header is not what Shopify shows. The
              open/closed state is carried by the label instead. */}
          <Button
            variant="tertiary"
            icon={EditIcon}
            accessibilityLabel={`${editing ? 'Done editing' : 'Edit'} ${title.toLowerCase()}`}
            onClick={() => setEditing((open) => !open)}
          />
        </InlineStack>
        {editing ? children : summary}
      </BlockStack>
    </Card>
  );
}
