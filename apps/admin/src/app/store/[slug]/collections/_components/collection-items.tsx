'use client';

/**
 * The `Collection items` grid and its skeleton
 * (docs/parity/collection-detail.md → Left column 2, Skeletons).
 * Owner: WS-B (B6).
 *
 * Shopify renders a collection's members as a 4-up grid of picture tiles, not
 * as a list: image, then a short caption under it. The skeleton is the same
 * grid with the image swapped for a grey rounded rectangle and the caption for
 * a shorter grey bar — the page chrome around it stays fully rendered, which is
 * the whole point of the capture (chrome first, skeleton the data).
 */
import type { Product } from '@merchant/contracts/products';
import { Badge, BlockStack, Box, Button, Icon, InlineStack, Text } from '@shopify/polaris';
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, XIcon } from '@shopify/polaris-icons';

/** Just enough of a product to render a tile; the collection never edits one. */
export type CollectionItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  status: Product['status'];
};

export const toCollectionItem = (product: Product): CollectionItem => ({
  id: product.id,
  title: product.title,
  imageUrl: product.images[0]?.url ?? null,
  status: product.status,
});

/**
 * Four tiles across at the form's default width, fewer as the column narrows.
 * `auto-fill` rather than a fixed `repeat(4, …)`: the left column is ~570px
 * inside its card padding, so a 120px minimum lands on exactly four and still
 * reflows instead of overflowing on a small viewport.
 */
const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: 'var(--p-space-400)',
};

/** Mirrors the products index; a non-active member is worth calling out. */
function ItemStatusBadge({ status }: { status: Product['status'] }) {
  if (status === 'draft') return <Badge tone="info">Draft</Badge>;
  return <Badge>Archived</Badge>;
}

function Tile({
  item,
  index,
  count,
  onMove,
  onRemove,
}: {
  item: CollectionItem;
  index: number;
  count: number;
  /** Absent unless the merchant's own positions are what the storefront uses. */
  onMove?: (from: number, to: number) => void;
  /** Absent on a smart collection — its members come from the conditions. */
  onRemove?: (id: string) => void;
}) {
  return (
    <BlockStack gap="150">
      <Box
        background="bg-surface-secondary"
        borderRadius="300"
        borderWidth="025"
        borderColor="border"
        overflowX="hidden"
        overflowY="hidden"
      >
        <div
          style={{
            aspectRatio: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.imageUrl ? (
            // Plain img: an arbitrary bucket URL, and the admin has no image
            // performance budget (SPEC §10 is the storefront).
            // biome-ignore lint/performance/noImgElement: see above
            <img
              src={item.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Icon source={ImageIcon} tone="subdued" />
          )}
        </div>
      </Box>

      <BlockStack gap="100">
        <Text as="span" variant="bodySm" truncate>
          {item.title}
        </Text>
        {item.status === 'active' ? null : (
          <InlineStack>
            <ItemStatusBadge status={item.status} />
          </InlineStack>
        )}
        {onMove || onRemove ? (
          <InlineStack gap="100">
            {/* Reordering by buttons, not drag: the locked stack has no DnD
                library and adding one is a substitution (SPEC §3). */}
            {onMove ? (
              <>
                <Button
                  size="micro"
                  variant="tertiary"
                  icon={ArrowUpIcon}
                  accessibilityLabel={`Move ${item.title} up`}
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                />
                <Button
                  size="micro"
                  variant="tertiary"
                  icon={ArrowDownIcon}
                  accessibilityLabel={`Move ${item.title} down`}
                  disabled={index === count - 1}
                  onClick={() => onMove(index, index + 1)}
                />
              </>
            ) : null}
            {onRemove ? (
              <Button
                size="micro"
                variant="tertiary"
                icon={XIcon}
                accessibilityLabel={`Remove ${item.title}`}
                onClick={() => onRemove(item.id)}
              />
            ) : null}
          </InlineStack>
        ) : null}
      </BlockStack>
    </BlockStack>
  );
}

/** The grey rounded rectangle + shorter caption bar the capture shows. */
export function CollectionItemGridSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div style={GRID}>
      {Array.from({ length: tiles }, (_, index) => (
        // Placeholders have no identity and never reorder; the position is the
        // only key there is.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <BlockStack key={`skeleton-${index}`} gap="150">
          <Box background="bg-fill-tertiary" borderRadius="300">
            <div style={{ aspectRatio: '1 / 1' }} />
          </Box>
          <Box background="bg-fill-tertiary" borderRadius="100" width="60%">
            <div style={{ height: 'var(--p-space-300)' }} />
          </Box>
        </BlockStack>
      ))}
    </div>
  );
}

export function CollectionItemGrid({
  items,
  onMove,
  onRemove,
}: {
  items: CollectionItem[];
  onMove?: (from: number, to: number) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <div style={GRID}>
      {items.map((item, index) => (
        <Tile
          key={item.id}
          item={item}
          index={index}
          count={items.length}
          onMove={onMove}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
