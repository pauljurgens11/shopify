'use client';

/**
 * Data for the AI builder (SPEC §12). Owner: WS-F.
 *
 * Everything goes through WS-A's `apiFetch`, so the CSRF header and credentials
 * are handled once. The conversation uses `useQuery` directly rather than
 * `useApiQuery` for one reason: it needs `refetchInterval` while a generation
 * job is in flight, and the shared helper deliberately exposes no options.
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
 * A generation that has not resolved in this long is not coming back — the
 * worker is down, or its job died. Stop polling rather than leave an open admin
 * tab hitting the API every two seconds forever.
 */
const POLL_GIVE_UP_MS = 3 * 60_000;

export function useVersions() {
  return useApiQuery<{ data: ThemeVersionSummary[] }>(VERSIONS_KEY, '/admin/api/themes/versions');
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

/**
 * A preview token is version-scoped and short-lived, so it is fetched per
 * version rather than once for the page.
 */
export function usePreviewToken(versionId: string | null) {
  return useApiQuery<{ token: string; expiresAt: string }>(
    ['theme-preview-token', versionId ?? 'none'],
    `/admin/api/themes/preview-token?versionId=${versionId ?? ''}`,
    { enabled: Boolean(versionId) },
  );
}

/** First active product, for the preview's Product tab. Absent is fine. */
export function useFirstProductHandle() {
  const query = useApiQuery<{ data: { handle: string }[] }>(
    ['builder-first-product'],
    '/admin/api/products?limit=1',
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
