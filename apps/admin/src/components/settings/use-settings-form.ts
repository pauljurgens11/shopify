'use client';

import { useQueryClient } from '@tanstack/react-query';
/**
 * Load → edit → save for a settings section (A4). Owner: WS-A.
 *
 * Every settings form is the same shape: fetch the section, track a draft,
 * show the contextual save bar while it differs, PUT it, toast. Written once
 * so the five pages cannot drift from one another.
 */
import { useCallback, useMemo, useState } from 'react';
import { type ApiError, apiFetch, useApiQuery } from '../../lib/api.ts';
import { useToast } from '../shell/toast-provider.tsx';

export type SettingsForm<T> = {
  value: T | undefined;
  loading: boolean;
  dirty: boolean;
  saving: boolean;
  error: ApiError | null;
  /** Patch one or more fields of the draft. */
  set: (patch: Partial<T>) => void;
  save: () => void;
  discard: () => void;
};

export function useSettingsForm<T extends object>(
  key: readonly unknown[],
  path: string,
  savedMessage: string,
): SettingsForm<T> {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isPending } = useApiQuery<T>(key, path);

  const [draft, setDraft] = useState<Partial<T> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const value = useMemo(
    () => (data === undefined ? undefined : ({ ...data, ...(draft ?? {}) } as T)),
    [data, draft],
  );

  // Structural, not reference: re-typing a field back to its saved value should
  // put the save bar away, the way Shopify's does.
  const dirty =
    draft !== null && data !== undefined && JSON.stringify(value) !== JSON.stringify(data);

  const set = useCallback((patch: Partial<T>) => {
    setError(null);
    setDraft((current) => ({ ...(current ?? {}), ...patch }));
  }, []);

  const discard = useCallback(() => {
    setDraft(null);
    setError(null);
  }, []);

  const save = useCallback(() => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    apiFetch<T>(path, { method: 'PUT', body: draft })
      .then((saved) => {
        queryClient.setQueryData(key, saved);
        setDraft(null);
        toast.show(savedMessage);
      })
      .catch((cause: ApiError) => {
        setError(cause);
        toast.error(cause.message);
      })
      .finally(() => setSaving(false));
  }, [draft, path, key, queryClient, toast, savedMessage]);

  return { value, loading: isPending, dirty, saving, error, set, save, discard };
}
