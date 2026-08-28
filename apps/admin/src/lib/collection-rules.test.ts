/**
 * Two ways the condition builder can quietly produce a collection that is wrong
 * rather than obviously broken.
 *
 * Illegal pairs: the API refuses `tag contains` instead of matching nothing, so
 * a builder that offers it hands the merchant a 400 on save with no
 * explanation. The table here is the same one `collectionRuleSchema` documents.
 *
 * Price: the rule carries INTEGER MINOR UNITS and the field shows decimals.
 * Convert the wrong way and "under $20.00" becomes "under $0.20" — a
 * collection that looks plausible and contains the wrong products.
 */
import { describe, expect, it } from 'vitest';
import {
  conditionToInput,
  inputToCondition,
  isRuleComplete,
  newRule,
  relationsFor,
  withColumn,
} from './collection-rules.ts';

describe('legal relations', () => {
  it('offers every text relation on a text column', () => {
    expect(relationsFor('title')).toEqual([
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
    ]);
    expect(relationsFor('vendor')).toEqual(relationsFor('title'));
  });

  it('offers only equality on a tag, which is an array column', () => {
    expect(relationsFor('tag')).toEqual(['equals', 'not_equals']);
    expect(relationsFor('tag')).not.toContain('contains');
  });

  it('offers comparisons, not substrings, on the numeric columns', () => {
    for (const column of ['price', 'inventory_quantity'] as const) {
      expect(relationsFor(column)).toEqual(['equals', 'not_equals', 'greater_than', 'less_than']);
      expect(relationsFor(column)).not.toContain('starts_with');
    }
  });
});

describe('changing a rule’s column', () => {
  it('drops a relation the new column cannot answer', () => {
    const rule = { column: 'title', relation: 'contains', condition: 'Rain' } as const;
    // `tag contains` is exactly the pair the API refuses.
    expect(withColumn(rule, 'tag')).toEqual({
      column: 'tag',
      relation: 'equals',
      condition: '',
    });
  });

  it('keeps a relation the new column still supports', () => {
    const rule = { column: 'title', relation: 'equals', condition: 'Rain Jacket' } as const;
    expect(withColumn(rule, 'vendor')).toEqual({
      column: 'vendor',
      relation: 'equals',
      condition: 'Rain Jacket',
    });
  });

  it('clears a value that would mean something else on the new column', () => {
    const rule = { column: 'vendor', relation: 'equals', condition: 'Northwind' } as const;
    // "Northwind" is not a price.
    expect(withColumn(rule, 'price').condition).toBe('');
  });
});

describe('price is minor units on the wire', () => {
  it('shows a decimal and sends an integer', () => {
    expect(conditionToInput('price', '2000')).toBe('20.00');
    expect(inputToCondition('price', '20.00')).toBe('2000');
    expect(inputToCondition('price', '19.99')).toBe('1999');
  });

  it('round-trips without drifting', () => {
    for (const minor of ['1', '999', '2000', '123456']) {
      expect(inputToCondition('price', conditionToInput('price', minor))).toBe(minor);
    }
  });

  it('leaves the other columns’ values alone', () => {
    expect(conditionToInput('vendor', 'Northwind')).toBe('Northwind');
    expect(inputToCondition('vendor', ' Northwind ')).toBe('Northwind');
    expect(inputToCondition('inventory_quantity', '5')).toBe('5');
  });

  it('refuses garbage instead of sending it as a condition', () => {
    expect(inputToCondition('price', 'abc')).toBe('');
    expect(inputToCondition('price', '')).toBe('');
    expect(inputToCondition('price', '1.2.3')).toBe('');
    expect(isRuleComplete({ column: 'price', relation: 'less_than', condition: '' })).toBe(false);
  });

  it('accepts a trailing dot mid-typing, so the preview keeps up', () => {
    // "20." is $20.00 to `fromDecimal`; the preview updating on it is better
    // than the list going blank between keystrokes.
    expect(inputToCondition('price', '20.')).toBe('2000');
  });
});

describe('a new rule', () => {
  it('starts incomplete, so the preview does not run on an empty condition', () => {
    expect(isRuleComplete(newRule())).toBe(false);
    expect(relationsFor(newRule().column)).toContain(newRule().relation);
  });
});
