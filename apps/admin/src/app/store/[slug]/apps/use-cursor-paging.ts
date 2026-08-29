'use client';

/**
 * Cursor paging state (SPEC §5). Owner: WS-G.
 *
 * Pagination is cursor-only, so "previous" cannot be an offset we decrement —
 * it is the stack of cursors already visited. Both the apps index and the
 * delivery log page the same way, and a second hand-rolled copy of this stack
 * is exactly where an off-by-one hides.
 */
import { useState } from 'react';

export type CursorPaging = {
  cursor: string | undefined;
  hasPrevious: boolean;
  previous: () => void;
  next: (cursor: string) => void;
  reset: () => void;
};

export function useCursorPaging(): CursorPaging {
  const [stack, setStack] = useState<string[]>([]);

  return {
    cursor: stack.at(-1),
    hasPrevious: stack.length > 0,
    previous: () => setStack((current) => current.slice(0, -1)),
    next: (cursor) => setStack((current) => [...current, cursor]),
    reset: () => setStack([]),
  };
}
