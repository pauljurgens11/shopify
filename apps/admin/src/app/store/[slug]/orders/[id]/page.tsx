'use client';

/**
 * Placeholder for the Order detail page (C5). Global search links straight
 * here, so the route has to exist before C5 lands — a search result that 404s
 * is the same KPI failure as a dead nav item (CLAUDE.md §8).
 */
import { ComingOnline } from '../../../../../components/shell/page-skeleton.tsx';

export default function OrderDetailPage() {
  return (
    <ComingOnline
      title="Order"
      description="Order detail lands with C5. Search and links already point here."
    />
  );
}
