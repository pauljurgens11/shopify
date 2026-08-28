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
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api.ts';

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
  } catch {
    // A 404 means that workstream has not landed yet; a 403 means this staff
    // user cannot see that resource. Either way: no results for this group,
    // never a broken search box.
    return [];
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

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: ({ signal }) => searchAll(trimmed, signal),
    enabled: trimmed.length > 0,
    // Typing a word fires several of these; a short cache keeps backspacing snappy.
    staleTime: 15_000,
  });
}
