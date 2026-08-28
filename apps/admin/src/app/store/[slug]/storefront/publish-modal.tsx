'use client';

/**
 * Publishing is the one irreversible-feeling action here — it changes what
 * every shopper sees — so it confirms first (SPEC §12). Owner: WS-F.
 */
import { Modal, Text } from '@shopify/polaris';

export function PublishModal({
  open,
  publishing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  publishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish this theme?"
      primaryAction={{ content: 'Publish', onAction: onConfirm, loading: publishing }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose, disabled: publishing }]}
    >
      <Modal.Section>
        <Text as="p">
          This replaces what shoppers see on your storefront right now. Your other versions stay in
          the history, so you can restore one at any time.
        </Text>
      </Modal.Section>
    </Modal>
  );
}
