'use client';

/**
 * Placeholder for Settings → Payments, which belongs to WS-D (D4). The settings
 * hub links here, so the route has to exist before D4 lands — a hub card that
 * 404s is the same KPI failure as a dead nav item. D4 REPLACES this file.
 */
import { ComingOnline } from '../../../../../components/shell/page-skeleton.tsx';

export default function PaymentsSettingsPage() {
  return (
    <ComingOnline
      title="Payments"
      description="Processors, payment routing and test cards land with D4."
    />
  );
}
