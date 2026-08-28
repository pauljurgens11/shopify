'use client';

/**
 * The frame every settings detail page sits in (PARITY.md: "narrow
 * single-column with section cards and the save bar"). Owner: WS-A.
 */
import { Page } from '@shopify/polaris';
import { useParams, useRouter } from 'next/navigation';
import { PageSkeleton } from '../shell/page-skeleton.tsx';
import { SaveBar } from '../shell/save-bar.tsx';

export function SettingsPage({
  title,
  loading = false,
  form,
  children,
}: {
  title: string;
  loading?: boolean;
  /** Omit on read-only pages (Plan); they get no save bar. */
  form?: { dirty: boolean; saving: boolean; save: () => void; discard: () => void };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  if (loading) return <PageSkeleton />;

  return (
    <Page
      title={title}
      backAction={{ content: 'Settings', onAction: () => router.push(`/store/${slug}/settings`) }}
      narrowWidth
    >
      {form ? (
        <SaveBar
          dirty={form.dirty}
          saving={form.saving}
          onSave={form.save}
          onDiscard={form.discard}
        />
      ) : null}
      {children}
    </Page>
  );
}
