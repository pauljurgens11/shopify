'use client';

/**
 * Placeholder for the Customer detail page (C6). Global search links straight
 * here, so the route has to exist before C6 lands — a search result that 404s
 * is the same KPI failure as a dead nav item (CLAUDE.md §8).
 */
import { ComingOnline } from '../../../../../components/shell/page-skeleton.tsx';

export default function CustomerDetailPage() {
  return (
    <ComingOnline
      title="Customer"
      description="Customer detail lands with C6. Search and links already point here."
    />
  );
}
