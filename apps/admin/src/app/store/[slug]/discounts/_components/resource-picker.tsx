'use client';

/**
 * Pick products or collections for a discount's "Applies to" (C6).
 *
 * Reads B1's and B3's index endpoints rather than keeping its own copy of the
 * catalogue, so a product renamed elsewhere is renamed here too.
 */
import type { Paginated } from '@merchant/contracts/common';
import { Modal, ResourceItem, ResourceList, Text, TextField } from '@shopify/polaris';
import { useEffect, useState } from 'react';
import { useApiQuery } from '../../../../../lib/api.ts';

type Pickable = { id: string; title: string };

export function ResourcePickerModal({
  open,
  kind,
  selectedIds,
  onClose,
  onSave,
}: {
  open: boolean;
  kind: 'products' | 'collections';
  selectedIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setSelected(selectedIds);
  }, [open, selectedIds]);

  const path = `/admin/api/${kind}?limit=50${query.trim() === '' ? '' : `&query=${encodeURIComponent(query.trim())}`}`;
  const results = useApiQuery<Paginated<Pickable>>([kind, path], path, { enabled: open });
  const items = results.data?.data ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'products' ? 'Add products' : 'Add collections'}
      primaryAction={{ content: 'Add', onAction: () => onSave(selected) }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <TextField
          label="Search"
          labelHidden
          autoComplete="off"
          placeholder={kind === 'products' ? 'Search products' : 'Search collections'}
          value={query}
          onChange={setQuery}
          clearButton
          onClearButtonClick={() => setQuery('')}
        />
      </Modal.Section>
      <Modal.Section flush>
        {/*
          ResourceList owns the checkboxes. Rendering our own inside a
          ResourceItem meant a click fired both handlers and cancelled itself
          out, so nothing could be selected (CLAUDE.md §7 — use the Polaris
          pattern rather than rebuilding it).
        */}
        <ResourceList
          resourceName={{ singular: kind.slice(0, -1), plural: kind }}
          loading={results.isFetching}
          items={items}
          selectable
          selectedItems={selected}
          onSelectionChange={(value) =>
            setSelected(value === 'All' ? items.map((item) => item.id) : value)
          }
          renderItem={(item) => (
            <ResourceItem key={item.id} id={item.id} onClick={() => undefined}>
              <Text as="span" variant="bodyMd">
                {item.title}
              </Text>
            </ResourceItem>
          )}
        />
      </Modal.Section>
    </Modal>
  );
}
