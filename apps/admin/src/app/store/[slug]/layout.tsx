'use client';

/**
 * Every page under `/store/{slug}` renders inside the admin shell (SPEC §6, §9).
 * Owner: WS-A — leaf issues add pages under this, not around it.
 */
import { useParams } from 'next/navigation';
import { AdminFrame } from '../../../components/shell/admin-frame.tsx';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug: string }>();
  return <AdminFrame shopSlug={params.slug}>{children}</AdminFrame>;
}
