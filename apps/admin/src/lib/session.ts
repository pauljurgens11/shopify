'use client';

/**
 * Who is signed in (SPEC §8). Owner: WS-A.
 *
 * One React Query entry holds the session for the whole admin, so the shell,
 * the nav and any page that needs the shop id all read the same object and a
 * logout invalidates every one of them at once.
 */
import type { SessionResponse } from '@merchant/contracts/auth';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ApiError, apiFetch, useApiQuery } from './api.ts';
import type { Viewer } from './nav.ts';

export const SESSION_KEY = ['session'] as const;

export type { SessionResponse };

export function useSession() {
  return useApiQuery<SessionResponse>(SESSION_KEY, '/auth/me');
}

/** The session narrowed to what nav visibility needs. */
export function viewerOf(session: SessionResponse): Viewer {
  return { role: session.user.role, permissions: session.user.permissions };
}

export type LoginInput = { email: string; password: string; shopSlug?: string };
export type SignupInput = {
  shopName: string;
  email: string;
  password: string;
  firstName?: string;
};

/**
 * Seeds the session cache from the login/signup response, so the redirect that
 * follows lands on a shell that already knows who you are instead of flashing
 * a skeleton while it asks again.
 */
function useAuthMutation<TInput>(
  path: string,
): UseMutationResult<SessionResponse, ApiError, TInput> {
  const queryClient = useQueryClient();
  return useMutation<SessionResponse, ApiError, TInput>({
    mutationFn: (input) => apiFetch<SessionResponse>(path, { method: 'POST', body: input }),
    onSuccess: (session) => queryClient.setQueryData(SESSION_KEY, session),
  });
}

export const useLogin = () => useAuthMutation<LoginInput>('/auth/login');
export const useSignup = () => useAuthMutation<SignupInput>('/auth/signup');

export function useLogout(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    // Everything in the cache belongs to the shop that just signed out.
    onSettled: () => queryClient.clear(),
  });
}
