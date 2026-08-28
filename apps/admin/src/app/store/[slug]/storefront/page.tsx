'use client';

/**
 * The AI storefront builder — Deviation #2's face (SPEC §12). Owner: WS-F.
 *
 * Split screen inside the admin shell: chat on the left, a live preview of the
 * real storefront on the right. The page frame stays Polaris so it feels native
 * to the admin; the two panes are our own surface, drawn with `--p-*` tokens.
 */
import { Page } from '@shopify/polaris';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import type { ApiError } from '../../../../lib/api.ts';
import { ChatPanel } from './chat-panel.tsx';
import { type Device, PreviewPane } from './preview-pane.tsx';
import type { PreviewPage } from './preview-url.ts';
import { PublishModal } from './publish-modal.tsx';
import {
  useBuilderActions,
  useConversation,
  useFirstProductHandle,
  usePreviewToken,
  useVersions,
} from './use-builder.ts';
import { VersionHistory } from './version-history.tsx';

/** H1 seeds a collection with this handle, and every preset references it. */
const SEEDED_COLLECTION = 'featured';

export default function StorefrontBuilderPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();

  const versions = useVersions();
  const conversation = useConversation();
  const productHandle = useFirstProductHandle();
  const { sendMessage, applyPreset, publish, restore } = useBuilderActions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState<PreviewPage>('home');
  const [device, setDevice] = useState<Device>('desktop');
  const [nonce, setNonce] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const list = useMemo(() => versions.data?.data ?? [], [versions.data]);

  // Follow the newest version — a generation or a preset produces one, and the
  // preview should be showing it without the merchant hunting for it.
  const newestId = list[0]?.id ?? null;
  useEffect(() => {
    setSelectedId((current) =>
      current && list.some((v) => v.id === current) ? current : newestId,
    );
  }, [newestId, list]);

  const selected = list.find((version) => version.id === selectedId) ?? null;
  const isPublished = selected?.status === 'published';

  // A published theme needs no token: show it exactly as a shopper would.
  const tokenQuery = usePreviewToken(isPublished ? null : selectedId);
  const token = isPublished ? null : (tokenQuery.data?.token ?? null);

  const reload = () => setNonce((value) => value + 1);
  const view = (versionId: string) => {
    setSelectedId(versionId);
    setHistoryOpen(false);
    // No reload here: switching versions changes the token, and the effect
    // below reloads once. Doing both reloads the iframe twice and it flickers.
  };

  // Reload whenever the previewed document changes underneath the iframe.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloading is the effect
  useEffect(() => {
    reload();
  }, [token, selectedId]);

  /**
   * A draft is only previewable once its token has arrived. Rendering the
   * iframe before then would point it at the published storefront for a beat —
   * the merchant would see the OLD theme flash while switching versions.
   */
  const previewReady = !selected || isPublished || Boolean(token);

  if (versions.isPending && conversation.isPending) {
    return (
      <Page title="Storefront">
        <PageSkeleton />
      </Page>
    );
  }

  return (
    <Page
      fullWidth
      title="Storefront"
      subtitle="Describe the storefront you want and watch it build."
    >
      <div
        style={{
          display: 'grid',
          // Left column is a fixed reading width; the preview takes the rest.
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          height: 'calc(100vh - var(--p-space-1600) - var(--p-space-1200))',
          minHeight: 480,
          borderWidth: 'var(--p-border-width-025)',
          borderStyle: 'solid',
          borderColor: 'var(--p-color-border)',
          borderRadius: 'var(--p-border-radius-300)',
          overflow: 'hidden',
          background: 'var(--p-color-bg-surface)',
        }}
      >
        <ChatPanel
          messages={conversation.data?.messages ?? []}
          isLoading={conversation.isPending}
          error={conversation.error ?? null}
          sending={sendMessage.isPending}
          onSend={(message) =>
            sendMessage.mutateAsync(message).catch((error: ApiError) => {
              toast.error(error.message);
              throw error;
            })
          }
          applyingPreset={applyPreset.isPending ? applyPreset.variables : null}
          onApplyPreset={(preset) =>
            applyPreset.mutate(preset, {
              onSuccess: (version) => {
                view(version.id);
                toast.show(`${preset.charAt(0).toUpperCase()}${preset.slice(1)} applied`);
              },
              onError: (error) => toast.error(error.message),
            })
          }
          onViewVersion={view}
        />

        <PreviewPane
          shopSlug={slug}
          page={page}
          onPageChange={setPage}
          device={device}
          onDeviceChange={setDevice}
          token={token}
          productHandle={productHandle}
          collectionHandle={SEEDED_COLLECTION}
          nonce={nonce}
          ready={previewReady}
          onRefresh={reload}
          isPublished={isPublished}
          hasVersion={Boolean(selected)}
          publishing={publish.isPending}
          onPublish={() => setPublishOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      </div>

      <VersionHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        versions={list}
        selectedId={selectedId}
        onPreview={view}
        restoringId={restore.isPending ? (restore.variables ?? null) : null}
        onRestore={(versionId) =>
          restore.mutate(versionId, {
            onSuccess: (created) => {
              view(created.id);
              toast.show('Version restored as a draft');
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />

      <PublishModal
        open={publishOpen}
        publishing={publish.isPending}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => {
          if (!selectedId) return;
          publish.mutate(selectedId, {
            onSuccess: () => {
              setPublishOpen(false);
              toast.show('Theme published');
            },
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </Page>
  );
}
