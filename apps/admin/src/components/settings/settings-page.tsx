'use client';

/**
 * The frame every settings detail page sits in (PARITY.md: "narrow
 * single-column with section cards and the save bar"). Owner: WS-A.
 */
import { BlockStack, Page } from '@shopify/polaris';
import { SettingsIcon } from '@shopify/polaris-icons';
import { useParams } from 'next/navigation';
import { PageBreadcrumb } from '../shell/page-breadcrumb.tsx';
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
  const { slug } = useParams<{ slug: string }>();

  if (loading) return <PageSkeleton />;

  return (
    <Page narrowWidth>
      {form ? (
        <SaveBar
          dirty={form.dirty}
          saving={form.saving}
          onSave={form.save}
          onDiscard={form.discard}
        />
      ) : null}
      <BlockStack gap="400">
        <PageBreadcrumb
          icon={SettingsIcon}
          title={title}
          backUrl={`/store/${slug}/settings`}
          backLabel={'Settings'}
        />
        {children}
      </BlockStack>
    </Page>
  );
}
