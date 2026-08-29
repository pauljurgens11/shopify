'use client';

/**
 * Global search (PARITY.md: grouped Products / Orders / Customers). Owner: WS-A.
 *
 * The three list endpoints are owned by B1, C2 and C4. Until they land, a group
 * whose endpoint 404s simply reports no results — the search box works from day
 * one and fills in as those issues merge, rather than being a stub that throws
 * (CLAUDE.md §8).
 */
import type { Paginated } from '@merchant/contracts/common';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from './api.ts';

export type SearchHit = { id: string; title: string; subtitle?: string; url: string };
export type SearchGroup = { key: string; title: string; hits: SearchHit[] };

/** Rows the list endpoints return, in the shape this file actually reads. */
type ProductRow = { id: string; title: string; status?: string };
type OrderRow = { id: string; orderNumber?: number; email?: string | null };
type CustomerRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

const LIMIT = 5;

async function fetchGroup<T>(path: string, signal: AbortSignal): Promise<T[]> {
  try {
    const page = await apiFetch<Paginated<T>>(path, { signal });
    return page?.data ?? [];
  } catch (error) {
    // A 404 means that workstream has not landed yet; a 403 means this staff
    // user cannot see that resource. Either way: no results for this group,
    // never a broken search box. Anything else — the API unreachable (status
    // 0) or a 5xx — must NOT read as "No results for …": that is a false
    // answer, so it surfaces as the query's error state instead.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return [];
    throw error;
  }
}

export async function searchAll(query: string, signal: AbortSignal): Promise<SearchGroup[]> {
  const q = `query=${encodeURIComponent(query)}&limit=${LIMIT}`;

  const [products, orders, customers] = await Promise.all([
    fetchGroup<ProductRow>(`/admin/api/products?${q}`, signal),
    fetchGroup<OrderRow>(`/admin/api/orders?${q}`, signal),
    fetchGroup<CustomerRow>(`/admin/api/customers?${q}`, signal),
  ]);

  return [
    {
      key: 'products',
      title: 'Products',
      hits: products.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.status,
        url: `/products/${p.id}`,
      })),
    },
    {
      key: 'orders',
      title: 'Orders',
      hits: orders.map((o) => ({
        id: o.id,
        title: o.orderNumber ? `#${o.orderNumber}` : o.id,
        subtitle: o.email ?? undefined,
        url: `/orders/${o.id}`,
      })),
    },
    {
      key: 'customers',
      title: 'Customers',
      hits: customers.map((c) => ({
        id: c.id,
        title: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email,
        subtitle: c.email,
        url: `/customers/${c.id}`,
      })),
    },
  ].filter((group) => group.hits.length > 0);
}

/**
 * The raw value trails the input by `delayMs`. One word typed = one search
 * request instead of one per keystroke — Shopify's admin searches the pause,
 * not the keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: ({ signal }) => searchAll(trimmed, signal),
    enabled: trimmed.length > 0,
    // Backspacing through a word replays cached keys instead of refetching.
    staleTime: 15_000,
    // A new query key keeps the previous results on screen while it loads, so
    // the panel never flashes to "Searching…" between keystrokes.
    placeholderData: keepPreviousData,
  });
}
