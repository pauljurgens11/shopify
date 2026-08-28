'use client';

/**
 * Placeholder for the Product detail page (B5). Global search links straight
 * here, so the route has to exist before B5 lands — a search result that 404s
 * is the same KPI failure as a dead nav item (CLAUDE.md §8).
 */
import { ComingOnline } from '../../../../../components/shell/page-skeleton.tsx';

export default function ProductDetailPage() {
  return (
    <ComingOnline
      title="Product"
      description="The product form lands with B5. Search and links already point here."
    />
  );
}
