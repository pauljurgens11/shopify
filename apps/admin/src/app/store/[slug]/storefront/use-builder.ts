'use client';

/**
 * Data for the AI builder (SPEC §12). Owner: WS-F.
 *
 * Everything goes through WS-A's `apiFetch`, so the CSRF header and credentials
 * are handled once. The conversation and the preview token use `useQuery`
 * directly rather than `useApiQuery` for one reason: they need
 * `refetchInterval` (polling a generation job; re-minting an expiring token),
 * and the shared helper deliberately exposes no options.
 */
import type { builderMessageSchema, ThemeVersionSummary } from '@merchant/contracts/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';

export type BuilderMessage = z.infer<typeof builderMessageSchema>;
export type Conversation = { id: string; messages: BuilderMessage[] };
export type ThemeVersionDetail = ThemeVersionSummary & { themeJson: unknown };

export const VERSIONS_KEY = ['theme-versions'] as const;
export const CONVERSATION_KEY = ['theme-conversation'] as const;

/** ≥1.5s and only while something is pending — see F4's landmines. */
const POLL_MS = 2_000;
/**
 * The server sweeps stale `pending` conversation messages to `failed` after
 * STALE_PENDING_MS (nine minutes). Poll one minute past that so the sweep's
 * verdict reaches an open tab: the bubble flips to Failed and the composer
 * unlocks (`busy` only counts `pending`), instead of the chat sitting
 * "thinking" forever in a tab that has stopped asking.
 */
const POLL_GIVE_UP_MS = 10 * 60_000;

export function useVersions() {
  return useApiQuery<{ data: ThemeVersionSummary[]; nextCursor: string | null }>(
    VERSIONS_KEY,
    '/admin/api/themes/versions',
  );
}

export function useConversation() {
  return useQuery<Conversation, ApiError>({
    queryKey: CONVERSATION_KEY,
    queryFn: ({ signal }) => apiFetch<Conversation>('/admin/api/themes/conversation', { signal }),
    // Poll only while a job is running, and only for as long as one plausibly
    // could be. A finished chat costs nothing.
    refetchInterval: (query) => {
      const pending = query.state.data?.messages.filter((m) => m.status === 'pending') ?? [];
      if (pending.length === 0) return false;
      const freshest = Math.max(...pending.map((m) => new Date(m.createdAt).getTime()));
      return Date.now() - freshest < POLL_GIVE_UP_MS ? POLL_MS : false;
    },
  });
}

export const PREVIEW_TOKEN_KEY = ['theme-preview-token'] as const;

/**
 * A preview token is version-scoped and short-lived (15-minute TTL), so it is
 * fetched per version rather than once for the page. `useQuery` directly for
 * the same reason as the conversation: it needs `refetchInterval` — the token
 * is re-minted every ten minutes so a tab left open never outlives its token
 * and silently falls back to the published theme mid-"Viewing draft".
 */
export function usePreviewToken(versionId: string | null) {
  return useQuery<{ token: string; expiresAt: string }, ApiError>({
    queryKey: [...PREVIEW_TOKEN_KEY, versionId ?? 'none'],
    queryFn: ({ signal }) =>
      apiFetch(`/admin/api/themes/preview-token?versionId=${versionId ?? ''}`, { signal }),
    enabled: Boolean(versionId),
    refetchInterval: 10 * 60_000,
  });
}

/** First active product, for the preview's Product tab — drafts 404 on the storefront. Absent is fine. */
export function useFirstProductHandle() {
  const query = useApiQuery<{ data: { handle: string }[] }>(
    ['builder-first-product'],
    '/admin/api/products?limit=1&status=active',
  );
  return query.data?.data[0]?.handle ?? null;
}

/** First collection, for the preview's Collection tab. Absent is fine. */
export function useFirstCollectionHandle() {
  const query = useApiQuery<{ data: { handle: string }[] }>(
    ['builder-first-collection'],
    '/admin/api/collections?limit=1',
  );
  return query.data?.data[0]?.handle ?? null;
}

export function useBuilderActions() {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: VERSIONS_KEY });
    void client.invalidateQueries({ queryKey: CONVERSATION_KEY });
  };

  const sendMessage = useMutation<{ jobId: string | null }, ApiError, string>({
    mutationFn: (message) =>
      apiFetch('/admin/api/themes/conversation', { method: 'POST', body: { message } }),
    onSuccess: refresh,
  });

  const applyPreset = useMutation<ThemeVersionDetail, ApiError, string>({
    mutationFn: (preset) =>
      apiFetch(`/admin/api/themes/presets/${preset}/apply`, { method: 'POST' }),
    onSuccess: refresh,
  });

  const publish = useMutation<ThemeVersionSummary, ApiError, string>({
    mutationFn: (versionId) =>
      apiFetch(`/admin/api/themes/versions/${versionId}/publish`, { method: 'POST' }),
    onSuccess: refresh,
  });

  const restore = useMutation<ThemeVersionDetail, ApiError, string>({
    mutationFn: (versionId) =>
      apiFetch(`/admin/api/themes/versions/${versionId}/restore`, { method: 'POST' }),
    onSuccess: refresh,
  });

  return { sendMessage, applyPreset, publish, restore };
}
