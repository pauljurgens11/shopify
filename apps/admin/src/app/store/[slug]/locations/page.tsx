'use client';

/**
 * Placeholder for Locations, which belongs to WS-B (B6). The settings hub links
 * here, so the route has to exist before B6 lands — a hub card that 404s is the
 * same KPI failure as a dead nav item. B6 REPLACES this file.
 */
import { ComingOnline } from '../../../../components/shell/page-skeleton.tsx';

export default function LocationsPage() {
  return (
    <ComingOnline title="Locations" description="Where you stock and ship from lands with B6." />
  );
}
