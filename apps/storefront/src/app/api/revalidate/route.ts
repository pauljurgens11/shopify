/**
 * `POST /api/revalidate` — bust this shop's cached theme fetch (issue E7).
 *
 * The API pings this after a theme is published, so shoppers see the new
 * theme immediately instead of riding out the 60s data-cache window. The
 * token is an HMAC minted with SESSION_SECRET and bound to this Host's slug
 * (packages/config/revalidate-token.ts) — an unauthenticated cache-buster
 * would be a free DB-load amplifier, so a bad or stale token is a 403 and
 * nothing is invalidated.
 */
import { verifyRevalidateToken } from '@merchant/config/revalidate-token';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { themeCacheTag } from '../../../lib/shop.ts';
import { resolveShopSlug } from '../../../lib/tenant.ts';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const slug = await resolveShopSlug();
  if (!slug) return NextResponse.json({ revalidated: false }, { status: 404 });

  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!verifyRevalidateToken(slug, token)) {
    return NextResponse.json({ revalidated: false }, { status: 403 });
  }

  revalidateTag(themeCacheTag(slug));
  return NextResponse.json({ revalidated: true });
}
