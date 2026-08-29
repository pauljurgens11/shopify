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
  // Mid-publish the modal must not close under the merchant — the X and the
  // backdrop go inert, matching the already-disabled Cancel.
  const close = () => {
    if (!publishing) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Publish this theme?"
      primaryAction={{ content: 'Publish', onAction: onConfirm, loading: publishing }}
      secondaryActions={[{ content: 'Cancel', onAction: close, disabled: publishing }]}
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
