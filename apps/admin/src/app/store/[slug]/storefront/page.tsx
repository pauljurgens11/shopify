'use client';

/**
 * The AI storefront builder — Deviation #2's face (SPEC §12). Owner: WS-F.
 *
 * Split screen inside the admin shell: chat on the left, a live preview of the
 * real storefront on the right. The page frame stays Polaris so it feels native
 * to the admin; the two panes are our own surface, drawn with `--p-*` tokens.
 */
import { Banner, Box, Page } from '@shopify/polaris';
import { StoreOnlineIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageBreadcrumb } from '../../../../components/shell/page-breadcrumb.tsx';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import type { ApiError } from '../../../../lib/api.ts';
import { ChatPanel } from './chat-panel.tsx';
import { type Device, PreviewPane } from './preview-pane.tsx';
import type { PreviewPage } from './preview-url.ts';
import { PublishModal } from './publish-modal.tsx';
import {
  PREVIEW_TOKEN_KEY,
  useBuilderActions,
  useConversation,
  useFirstCollectionHandle,
  useFirstProductHandle,
  usePreviewToken,
  useVersions,
} from './use-builder.ts';
import { VersionHistory } from './version-history.tsx';

export default function StorefrontBuilderPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const client = useQueryClient();

  const versions = useVersions();
  const conversation = useConversation();
  const productHandle = useFirstProductHandle();
  const collectionHandle = useFirstCollectionHandle();
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
  // The toolbar's Refresh must also carry a fresh token: an expired one makes
  // the storefront silently fall back to the published theme while the toolbar
  // still says "Viewing draft". (The token refetch changes `token`, so the
  // effect below reloads a second time with the new value — a manual refresh
  // is deliberate enough that the brief double load is fine.)
  const refresh = () => {
    if (!isPublished && selectedId) {
      void client.invalidateQueries({ queryKey: PREVIEW_TOKEN_KEY });
    }
    reload();
  };
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
  // Only surface a token failure when there is no token to show — a failed
  // BACKGROUND re-mint keeps the last (still likely valid) token on screen.
  const tokenError = !isPublished && !token ? (tokenQuery.error ?? null) : null;

  if (versions.isPending || conversation.isPending) {
    return (
      <Page fullWidth>
        <PageSkeleton />
      </Page>
    );
  }

  return (
    <Page fullWidth>
      <Box paddingBlockEnd="400">
        <PageBreadcrumb
          icon={StoreOnlineIcon}
          title="Online Store"
          subtitle="Describe the storefront you want and watch it build."
        />
      </Box>

      {/* Without this a failed request is indistinguishable from "no versions yet". */}
      {versions.error ? (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Theme versions couldn’t be loaded">
            <p>{versions.error.message}</p>
          </Banner>
        </Box>
      ) : null}

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
          tokenError={tokenError}
          onRetryToken={() => void tokenQuery.refetch()}
          productHandle={productHandle}
          collectionHandle={collectionHandle}
          nonce={nonce}
          ready={previewReady}
          onRefresh={refresh}
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
