'use client';

/**
 * Version history with restore (SPEC §12). Owner: WS-F.
 *
 * Restore copies a version forward as a new draft rather than mutating history
 * — matching F3 — so the list only ever grows and a merchant can always get
 * back to what they had.
 */
import type { ThemeVersionSummary } from '@merchant/contracts/theme';
import { Badge, BlockStack, Box, Button, InlineStack, Modal, Text } from '@shopify/polaris';

function when(iso: string): string {
  // en-US pinned — `undefined` renders the host's locale and the admin's other
  // dates (Apps, orders) are en-US, so this list drifted on non-US machines.
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VersionHistory({
  open,
  onClose,
  versions,
  selectedId,
  onPreview,
  onRestore,
  restoringId,
}: {
  open: boolean;
  onClose: () => void;
  versions: ThemeVersionSummary[];
  selectedId: string | null;
  onPreview: (versionId: string) => void;
  onRestore: (versionId: string) => void;
  restoringId: string | null;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Version history">
      <Modal.Section>
        {versions.length === 0 ? (
          <Text as="p" tone="subdued">
            No versions yet. Apply a preset or describe the storefront you want.
          </Text>
        ) : (
          <BlockStack gap="200">
            {versions.map((version) => (
              <Box
                key={version.id}
                padding="300"
                borderWidth="025"
                borderRadius="200"
                borderColor={version.id === selectedId ? 'border-emphasis' : 'border'}
                background={version.id === selectedId ? 'bg-surface-selected' : 'bg-surface'}
              >
                <InlineStack align="space-between" blockAlign="center" gap="300">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {version.createdByMessage ?? 'Untitled version'}
                      </Text>
                      {version.status === 'published' ? <Badge tone="success">Live</Badge> : null}
                    </InlineStack>
                    <Text as="span" variant="bodyXs" tone="subdued">
                      {when(version.createdAt)}
                    </Text>
                  </BlockStack>

                  <InlineStack gap="200">
                    <Button
                      size="slim"
                      onClick={() => onPreview(version.id)}
                      disabled={version.id === selectedId}
                    >
                      {version.id === selectedId ? 'Previewing' : 'Preview'}
                    </Button>
                    <Button
                      size="slim"
                      loading={restoringId === version.id}
                      onClick={() => onRestore(version.id)}
                    >
                      Restore
                    </Button>
                  </InlineStack>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        )}
      </Modal.Section>
    </Modal>
  );
}
