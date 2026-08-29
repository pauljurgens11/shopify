/**
 * The collection detail page's two pieces of load-bearing pure logic.
 * Owner: WS-B (B6).
 *
 * Both are here rather than inline in the form because both have a "do not"
 * attached, and the wrong behaviour is the plausible one:
 *
 *   - POSITIONS ARE ONLY MEANINGFUL UNDER `manual` SORT. Under any other sort
 *     the items grid is showing the collection's own ordering, not the
 *     merchant's stored positions — writing that listing back would silently
 *     replace the order they see again the moment they switch to "Manually".
 *   - THE STATUS CHIP TAKES A SERIAL COMMA ONLY AT THREE. Shopify's chip reads
 *     `Status: Active, Draft, and Archived` and `Status: Draft and Archived`.
 */
import type { Product } from '@merchant/contracts/products';

export type ProductStatus = Product['status'];

/** The filter's own order, which is also the order the chip lists them in. */
export const STATUS_CHOICES: { label: string; value: ProductStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

export const ALL_STATUSES: ProductStatus[] = STATUS_CHOICES.map((choice) => choice.value);

export function statusChipLabel(statuses: ProductStatus[]): string {
  const labels = STATUS_CHOICES.filter((choice) => statuses.includes(choice.value)).map(
    (choice) => choice.label,
  );
  const last = labels.at(-1) ?? '';
  const head = labels.slice(0, -1);
  const list =
    head.length === 0 ? last : `${head.join(', ')}${head.length > 1 ? ',' : ''} and ${last}`;
  return `Status: ${list}`;
}

/** The body of `POST /admin/api/collections/:id/products`. */
export type MembershipEdit = {
  add: string[];
  remove: string[];
  reorder: { productId: string; position: number }[];
};

/**
 * What one save of the items grid should send, or `null` when it should send
 * nothing at all.
 *
 * `ordered` is whether the collection sorts `manual` — see the file comment.
 */
export function membershipEdit(
  before: string[],
  after: string[],
  ordered: boolean,
): MembershipEdit | null {
  const add = after.filter((id) => !before.includes(id));
  const remove = before.filter((id) => !after.includes(id));
  const moved = ordered && before.join() !== after.join();
  if (add.length === 0 && remove.length === 0 && !moved) return null;
  return {
    add,
    remove,
    reorder: ordered ? after.map((productId, position) => ({ productId, position })) : [],
  };
}
