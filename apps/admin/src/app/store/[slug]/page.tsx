'use client';

/**
 * Home — the first screen after login, and the first screen of the demo
 * walkthrough (SPEC §8, §9). Owner: WS-G.
 *
 * Shopify serves Home in two forms, and picks between them from the state of
 * the store rather than from a setting (docs/parity/home.md §"Two variants"):
 *
 * - **Onboarding Home** for a new or empty store — welcome heading, AI prompt,
 *   dismissible setup cards, no page header. `onboarding-home.tsx`.
 * - **Dashboard Home** for an established one — date range, metric tiles,
 *   charts. `dashboard-home.tsx`.
 *
 * "Established" is read as *has ever taken an order*. It is the line the parity
 * files themselves draw ("Served to established stores"), it is the one signal
 * that cannot be true of a store that has not started, and it keeps the seeded
 * demo (Aurora, 40 orders) on the dashboard while a shop created at signup
 * lands on onboarding.
 *
 * The probe fails toward the dashboard: if the orders call errors — a viewer
 * without the orders permission, an API blip — an established store must not be
 * dropped onto a welcome page. The dashboard states its own failure instead.
 */
import { PageSkeleton } from '../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../lib/api.ts';
import { useSession } from '../../../lib/session.ts';
import { DashboardHome } from './dashboard-home.tsx';
import { OnboardingHome } from './onboarding-home.tsx';

type OrderProbe = { data: unknown[] };

export default function HomePage() {
  const { data: session } = useSession();

  // Deliberately NOT gated on the session: Home is behind the shell, so the
  // cookie is already there, and `enabled: Boolean(session)` would put this
  // round trip strictly AFTER /auth/me — an extra serial hop in front of the
  // first screen after login. Unauthenticated it 401s and the shell redirects,
  // which is what /auth/me would have done anyway.
  const orders = useApiQuery<OrderProbe>(['home', 'order-probe'], '/admin/api/orders?limit=1');

  // Both variants are full pages; flipping from one to the other after paint
  // would be the worst first frame in the app. Wait for the probe instead.
  if (!session || orders.isPending) return <PageSkeleton />;

  const established = orders.isError || (orders.data?.data.length ?? 0) > 0;

  return established ? <DashboardHome session={session} /> : <OnboardingHome session={session} />;
}
