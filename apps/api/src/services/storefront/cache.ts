/**
 * Cache headers for the storefront surface (SPEC §10). Owner: WS-E.
 *
 * The performance budget (TTFB < 300ms) assumes the read endpoints sit behind a
 * shared cache, so they carry `s-maxage` + `stale-while-revalidate`. The cart
 * and any signed theme preview are per-shopper and must never enter one — this
 * file exists so that distinction is made in one place rather than remembered
 * at each route.
 *
 * Lives in `services/` rather than beside the routes because `@fastify/autoload`
 * registers every file under `routes/` as a plugin.
 */
import { STOREFRONT_CACHE_CONTROL } from '@merchant/config/constants';
import type { FastifyReply } from 'fastify';

export function cacheable(reply: FastifyReply): void {
  reply.header('cache-control', STOREFRONT_CACHE_CONTROL);
}

export function privateResponse(reply: FastifyReply): void {
  reply.header('cache-control', 'no-store');
}
