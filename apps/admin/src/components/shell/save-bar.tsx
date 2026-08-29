'use client';

/**
 * The contextual save bar (PARITY.md: dark bar over the TopBar, "Unsaved
 * changes" left, Discard / Save right). Owner: WS-A.
 *
 * Every form page in every workstream shows this the moment it is dirty, so the
 * copy lives here once instead of being retyped eight times:
 *
 *   <SaveBar dirty={isDirty} saving={save.isPending} onSave={...} onDiscard={...} />
 *
 * Renders through the Frame's portal, so it must be used inside `AdminFrame`.
 */
import { ContextualSaveBar } from '@shopify/polaris';

export function SaveBar({
  dirty,
  saving = false,
  message = 'Unsaved changes',
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving?: boolean;
  /**
   * Shopify says "Unsaved changes" on a record that exists and names the thing
   * being created otherwise — "Unsaved product" on `/products/new`
   * (docs/parity/product-form.md).
   */
  message?: string;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!dirty) return null;

  return (
    <ContextualSaveBar
      message={message}
      saveAction={{ onAction: onSave, loading: saving, disabled: saving }}
      discardAction={{ onAction: onDiscard, disabled: saving }}
    />
  );
}
