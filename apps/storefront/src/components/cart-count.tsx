'use client';

/**
 * The number on the header's Cart link. Owner: WS-E.
 *
 * `initial` is what the layout fetched for this request; anything a cart action
 * has published since wins over it.
 */
import { useSyncExternalStore } from 'react';
import {
  cartCountServerSnapshot,
  cartCountSnapshot,
  subscribeCartCount,
} from '../lib/cart-count.ts';

export function CartCount({ initial }: { initial: number }) {
  const published = useSyncExternalStore(
    subscribeCartCount,
    cartCountSnapshot,
    cartCountServerSnapshot,
  );
  const count = published ?? initial;
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 py-0.5 text-background text-xs tabular-nums">
      {count}
    </span>
  );
}
