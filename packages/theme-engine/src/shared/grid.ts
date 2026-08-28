/**
 * Column classes for the `columns` setting (2–5). Tailwind scans source for
 * literal class names, so a template string like `lg:grid-cols-${n}` produces
 * no CSS — every variant has to exist as a static string.
 * Owner: WS-F.
 */
const PRODUCT_GRID: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
};

const CARD_GRID: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
};

/** Two-up on mobile, `columns`-up from `lg`. For product cards. */
export function productGridClass(columns: number): string {
  return PRODUCT_GRID[columns] ?? PRODUCT_GRID[4] ?? 'grid-cols-2';
}

/** For wider cards (collections, logos) that need more room on small screens. */
export function cardGridClass(columns: number): string {
  return CARD_GRID[columns] ?? CARD_GRID[3] ?? 'grid-cols-1';
}
