/**
 * `/storefront/api/checkouts` (SPEC §10). Owner: WS-E.
 * Mounted at /storefront/api by the autoloader.
 *
 * Thin over `services/checkout/**`: every total on every response comes from
 * `computeCheckoutTotals`, and `complete` recomputes once more server-side
 * before it charges. Nothing here does money math.
 *
 * No auth — the token in the URL is the credential, which is why it is
 * high-entropy. Nothing is cacheable: a checkout is one shopper's.
 */
import { CART_COOKIE, RATE_LIMITS } from '@merchant/config/constants';
import {
  checkoutSchema,
  completeCheckoutInput,
  completeCheckoutResponse,
  updateCheckoutInput,
} from '@merchant/contracts/checkout';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireShop } from '../../plugins/tenancy.ts';
import {
  createCheckout,
  findCheckoutRow,
  getCheckout,
  priceCheckout,
  updateCheckout,
} from '../../services/checkout/checkout.ts';
import { completeCheckout } from '../../services/checkout/complete.ts';
import { privateResponse } from '../../services/storefront/cache.ts';

const tokenParam = z.object({ token: z.string().min(1).max(128) });

export default async function routes(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => {
    privateResponse(reply);
  });

  /* ---------------------------------------------------------------- create */
  app.post('/checkouts', async (request, reply) => {
    // The cart cookie is the shopper's identity here; E4 never passes an id.
    const cart = request.cookies[CART_COOKIE];
    const checkout = await createCheckout(request.db, requireShop(request), cart);
    return reply.status(201).send(checkoutSchema.parse(checkout));
  });

  /* ------------------------------------------------------------------- get */
  app.get('/checkouts/:token', async (request) => {
    const { token } = tokenParam.parse(request.params);
    return checkoutSchema.parse(await getCheckout(request.db, token));
  });

  /* ---------------------------------------------------------------- update */
  app.put('/checkouts/:token', async (request) => {
    const { token } = tokenParam.parse(request.params);
    const input = updateCheckoutInput.parse(request.body);
    return checkoutSchema.parse(await updateCheckout(request.db, token, input));
  });

  /* -------------------------------------------------------- shipping rates */
  app.get('/checkouts/:token/shipping-rates', async (request) => {
    const { token } = tokenParam.parse(request.params);
    // Priced through the same function as the sidebar, so the rate a shopper
    // picks is the one they were quoted.
    const priced = await priceCheckout(request.db, await findCheckoutRow(request.db, token));
    return priced.pricing.shippingOptions;
  });

  /* -------------------------------------------------------------- complete */
  app.post(
    '/checkouts/:token/complete',
    // SPEC §8: the one endpoint that moves money is rate-limited hardest.
    // `timeWindow`, not `windowMs` — the plugin ignores an unknown key and
    // silently falls back to the global 1s window, which throttles real
    // shoppers rather than attackers.
    {
      config: {
        rateLimit: {
          max: RATE_LIMITS.checkoutPayment.max,
          timeWindow: RATE_LIMITS.checkoutPayment.windowMs,
        },
      },
    },
    async (request, reply) => {
      const { token } = tokenParam.parse(request.params);
      const input = completeCheckoutInput.parse(request.body);

      const result = await completeCheckout(request.db, requireShop(request), token, input, {
        cartToken: request.cookies[CART_COOKIE],
      });

      // The cart has done its job; leaving it would show the shopper items they
      // just bought. A decline leaves it alone so they can try again.
      if (result.status === 'success') {
        reply.clearCookie(CART_COOKIE, { path: '/' });
      }
      return completeCheckoutResponse.parse(result);
    },
  );
}
