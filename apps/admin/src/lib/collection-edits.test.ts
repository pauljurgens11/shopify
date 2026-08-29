import { describe, expect, it } from 'vitest';
import { membershipEdit, statusChipLabel } from './collection-edits.ts';

describe('membershipEdit', () => {
  it('sends nothing when the membership is untouched', () => {
    expect(membershipEdit(['a', 'b'], ['a', 'b'], true)).toBeNull();
  });

  it('sends the dragged order when the collection sorts manually', () => {
    expect(membershipEdit(['a', 'b', 'c'], ['c', 'a', 'b'], true)).toEqual({
      add: [],
      remove: [],
      reorder: [
        { productId: 'c', position: 0 },
        { productId: 'a', position: 1 },
        { productId: 'b', position: 2 },
      ],
    });
  });

  // The grid is showing the collection's own sort, not the merchant's stored
  // positions. Writing that listing back as positions would silently replace
  // the order they see again the moment they switch to "Manually".
  it('sends nothing for a pure reorder under any other sort', () => {
    expect(membershipEdit(['a', 'b', 'c'], ['c', 'a', 'b'], false)).toBeNull();
  });

  it('adds and removes without touching positions under any other sort', () => {
    expect(membershipEdit(['a', 'b'], ['b', 'c'], false)).toEqual({
      add: ['c'],
      remove: ['a'],
      reorder: [],
    });
  });

  it('carries positions alongside an add when sorting manually', () => {
    expect(membershipEdit(['a'], ['b', 'a'], true)).toEqual({
      add: ['b'],
      remove: [],
      reorder: [
        { productId: 'b', position: 0 },
        { productId: 'a', position: 1 },
      ],
    });
  });

  it('empties a collection', () => {
    expect(membershipEdit(['a', 'b'], [], true)).toEqual({
      add: [],
      remove: ['a', 'b'],
      reorder: [],
    });
  });
});

describe('statusChipLabel', () => {
  it('names one status', () => {
    expect(statusChipLabel(['active'])).toBe('Status: Active');
  });

  // Two statuses take no serial comma; three do. Shopify's chip reads
  // "Status: Active, Draft, and Archived", and "Draft, and Archived" is wrong.
  it('joins two statuses with "and" alone', () => {
    expect(statusChipLabel(['draft', 'archived'])).toBe('Status: Draft and Archived');
  });

  it('joins three statuses with a serial comma', () => {
    expect(statusChipLabel(['active', 'draft', 'archived'])).toBe(
      'Status: Active, Draft, and Archived',
    );
  });

  it('lists statuses in the filter’s own order, not the order they were picked', () => {
    expect(statusChipLabel(['archived', 'active'])).toBe('Status: Active and Archived');
  });
});
