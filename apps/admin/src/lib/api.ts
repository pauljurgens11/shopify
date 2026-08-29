/**
 * The admin's one HTTP client (SPEC §5, §8). Owner: WS-A.
 *
 * Every admin page in every workstream goes through this — importing `fetch`
 * directly in a page is how the CSRF header or `credentials` gets forgotten on
 * one screen and nowhere else. Changing a signature here is a breaking change
 * for eight workstreams: log it in DECISIONS.md first (CLAUDE.md §3).
 *
 *   const { data } = useApiQuery<Paginated<Product>>(['products'], '/admin/api/products');
 *   const save = useApiMutation<Product, ProductInput>('POST', '/admin/api/products');
 */
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@merchant/config/constants';
import { ERROR_CODES, type ErrorCode } from '@merchant/contracts/common';
import {
  keepPreviousData,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query';

/**
 * Inlined by next.config.ts from the root .env, because `@merchant/config/env`
 * is server-only and this module runs in the browser.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://api.lvh.me:3001';

export type ApiErrorItem = { code: ErrorCode; message: string; field?: string };

/** A non-2xx response, already parsed into the SPEC §5 envelope. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly errors: ApiErrorItem[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The first issue's field, for the common single-field case. */
  get field(): string | undefined {
    return this.errors[0]?.field;
  }

  /** `{ email: 'Required' }` — ready for Polaris `error` props on a form. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of this.errors) {
      if (issue.field && !(issue.field in out)) out[issue.field] = issue.message;
    }
    return out;
  }
}

/** Status → code, for responses that never reached our error handler at all. */
const STATUS_FALLBACK: Record<number, ErrorCode> = {
  400: 'invalid_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

function isErrorItem(value: unknown): value is ApiErrorItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.message === 'string' && item.message.length > 0;
}

/**
 * Parse a failed response body into an ApiError.
 *
 * Deliberately forgiving: a proxy 502, an HTML error page or a connection cut
 * mid-body all reach here, and none of them may put "undefined" in a toast.
 */
export function toApiError(status: number, body: unknown): ApiError {
  const raw = (body as { errors?: unknown })?.errors;
  const errors: ApiErrorItem[] = (Array.isArray(raw) ? raw : [])
    .filter(isErrorItem)
    .map((item) => ({
      // Never surface a code the contract does not define — callers branch on it.
      code: ERROR_CODES.includes(item.code) ? item.code : (STATUS_FALLBACK[status] ?? 'internal'),
      message: item.message,
      ...(item.field ? { field: item.field } : {}),
    }));

  const first = errors[0];
  return new ApiError(
    status,
    first?.code ?? STATUS_FALLBACK[status] ?? 'internal',
    first?.message ?? GENERIC_MESSAGE,
    errors,
  );
}

/** `('/auth/me', 'http://api.lvh.me:3001/')` → `http://api.lvh.me:3001/auth/me`. */
export function apiPath(path: string, baseUrl: string = API_BASE_URL): string {
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

const SAFE_METHODS = new Set(['GET', 'HEAD']);

/** Set by the shell so a 401 anywhere bounces to the login page exactly once. */
let onUnauthorized: (() => void) | undefined;
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler;
}

export type ApiRequest = { method?: string; body?: unknown; signal?: AbortSignal };

export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const method = request.method ?? 'GET';
  const headers: Record<string, string> = {};

  // The session cookie is SameSite=Lax on api.lvh.me; without `include` the
  // browser has it and still does not send it (SPEC §8).
  if (!SAFE_METHODS.has(method)) {
    headers[CSRF_HEADER] = CSRF_HEADER_VALUE;
    if (request.body !== undefined) headers['content-type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(apiPath(path), {
      method,
      credentials: 'include',
      headers,
      signal: request.signal,
      ...(request.body !== undefined ? { body: JSON.stringify(request.body) } : {}),
    });
  } catch (cause) {
    // The API is unreachable, so there is no status and no envelope. Callers
    // branch on ApiError, and "Failed to fetch" in a banner tells a merchant
    // nothing, so give it the same shape and a message worth reading.
    if ((cause as { name?: string }).name === 'AbortError') throw cause;
    throw new ApiError(0, 'internal', 'Could not reach the server. Check your connection.');
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = toApiError(response.status, body);
    if (error.status === 401) onUnauthorized?.();
    throw error;
  }

  return body as T;
}

/** React Query over `apiFetch`, so every page caches and retries alike. */
export function useApiQuery<T>(
  key: QueryKey,
  path: string,
  /**
   * `refetchInterval` is for genuinely live cards only (G3's "Right now").
   * `keepPreviousData` is for index pages whose query key changes with a
   * tab/filter/sort/cursor: it keeps the previous page's rows on screen while
   * the next page loads (`isPending` stays false), so a tab change updates the
   * table in place instead of flashing the whole page back to its skeleton —
   * Shopify's admin never re-skeletons an index it has already painted (H4).
   */
  options: { enabled?: boolean; refetchInterval?: number; keepPreviousData?: boolean } = {},
): UseQueryResult<T, ApiError> {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: ({ signal }) => apiFetch<T>(path, { signal }),
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
    ...(options.keepPreviousData ? { placeholderData: keepPreviousData } : {}),
    // Re-authenticating is the shell's job; retrying a 401 just delays it.
    retry: (count, error) => error.status >= 500 && count < 1,
  });
}

export function useApiMutation<TResult, TInput = void>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string | ((input: TInput) => string),
): UseMutationResult<TResult, ApiError, TInput> {
  return useMutation<TResult, ApiError, TInput>({
    mutationFn: (input: TInput) =>
      apiFetch<TResult>(typeof path === 'function' ? path(input) : path, {
        method,
        ...(input === undefined ? {} : { body: input }),
      }),
  });
}
