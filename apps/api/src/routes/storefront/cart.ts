/**
 * `/storefront/api/cart` (SPEC §10). Owner: WS-E.
 *
 * The cart is a server row referenced by an httpOnly cookie, so the shopper's
 * browser never holds prices or line data — only an opaque token. Every
 * response re-reads the cart from live variants (`services/cart/cart.ts`).
 *
 * Singular `/cart`, not `/carts`: it is the singleton belonging to this
 * browser, the way Shopify's own `/cart` is. The plural-nouns rule in
 * CLAUDE.md §5 is about collection resources.
 *
 * Nothing here is ever cached — a shared cache holding one shopper's cart and
 * serving it to the next is the worst bug available on this surface.
 */
import { CART_COOKIE } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import type { Cart } from '@merchant/contracts/cart';
import { addToCartInput, cartSchema, updateCartLineInput } from '@merchant/contracts/cart';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireShop } from '../../plugins/tenancy.ts';
import { addLine, createCart, findCart, removeLine, updateLine } from '../../services/cart/cart.ts';
import { privateResponse } from '../../services/storefront/cache.ts';

const lineParam = z.object({ lineId: z.string().min(1).max(64) });

function setCartCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Host-only: the browser scopes it to `{slug}.lvh.me`, so one shop's cart
    // cookie is not even sent to another shop on the shared dev domain.
    path: '/',
    secure: env().STOREFRONT_PROTOCOL === 'https',
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * The shopper's cart, creating one if the cookie is missing, stale, or names a
 * cart belonging to a different shop. Never 404s: a shopper with a dead cookie
 * should get a working store, not an error page.
 */
async function currentCart(request: FastifyRequest, reply: FastifyReply): Promise<Cart> {
  const existing = await findCart(request.db, request.cookies[CART_COOKIE]);
  if (existing) return existing;

  const cart = await createCart(request.db, requireShop(request));
  setCartCookie(reply, cart.token);
  return cart;
}

export default async function routes(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => {
    privateResponse(reply);
  });

  app.get('/cart', async (request, reply) => cartSchema.parse(await currentCart(request, reply)));

  app.post('/cart', async (request, reply) => {
    const cart = await createCart(request.db, requireShop(request));
    setCartCookie(reply, cart.token);
    return reply.status(201).send(cartSchema.parse(cart));
  });

  app.post('/cart/lines', async (request, reply) => {
    const input = addToCartInput.parse(request.body);
    // Adding to a cart the shopper does not have yet is the common path — the
    // first "add to cart" click on a fresh visit.
    const cart = await currentCart(request, reply);
    return cartSchema.parse(await addLine(request.db, cart.token, input));
  });

  app.put('/cart/lines/:lineId', async (request, reply) => {
    const { lineId } = lineParam.parse(request.params);
    const input = updateCartLineInput.parse({ ...(request.body as object), lineId });
    const cart = await currentCart(request, reply);
    return cartSchema.parse(await updateLine(request.db, cart.token, input));
  });

  app.delete('/cart/lines/:lineId', async (request, reply) => {
    const { lineId } = lineParam.parse(request.params);
    const cart = await currentCart(request, reply);
    return cartSchema.parse(await removeLine(request.db, cart.token, lineId));
  });
}
