import { describe, expect, it } from 'vitest';
import { allScopes, sameScopes, sortScopes, toggleScope } from './scopes.ts';

describe('toggleScope', () => {
  it('grants read alongside write, because write implies read', () => {
    expect(toggleScope([], 'write', 'orders', true)).toEqual(['read_orders', 'write_orders']);
  });

  it('revokes write when read is revoked, so no half-state is renderable', () => {
    expect(toggleScope(['read_orders', 'write_orders'], 'read', 'orders', false)).toEqual([]);
  });

  it('leaves read in place when only write is revoked', () => {
    expect(toggleScope(['read_orders', 'write_orders'], 'write', 'orders', false)).toEqual([
      'read_orders',
    ]);
  });

  it('does not disturb other areas', () => {
    const next = toggleScope(['read_products'], 'read', 'customers', true);
    expect(next).toContain('read_products');
    expect(next).toContain('read_customers');
  });
});

describe('sortScopes', () => {
  it('orders by area then level, and de-duplicates', () => {
    expect(sortScopes(['write_orders', 'read_products', 'read_products'])).toEqual([
      'read_products',
      'write_orders',
    ]);
  });

  it('keeps a scope it does not recognise rather than dropping the grant', () => {
    expect(sortScopes(['read_future', 'read_products'])).toEqual(['read_products', 'read_future']);
  });
});

describe('sameScopes', () => {
  it('ignores ordering', () => {
    expect(sameScopes(['write_orders', 'read_orders'], ['read_orders', 'write_orders'])).toBe(true);
  });

  it('sees a missing grant', () => {
    expect(sameScopes(['read_orders'], ['read_orders', 'write_orders'])).toBe(false);
  });
});

describe('allScopes', () => {
  it('covers every area at both levels', () => {
    expect(allScopes()).toHaveLength(16);
  });
});
