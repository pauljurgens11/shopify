/**
 * POST /vault/tokenize (SPEC §11). Owner: WS-D.
 *
 * The checkout page posts card fields here DIRECTLY from the browser, so the
 * checkout server never sees a PAN — that separation is the entire point of the
 * vault, and the reason this endpoint is unauthenticated: at this moment in the
 * flow there is no session, only a storefront origin.
 *
 * The shop therefore comes from the `Origin` header (the same
 * `{slug}.{STOREFRONT_BASE_DOMAIN}` parsing the storefront uses), and abuse is
 * bounded by RATE_LIMITS.checkoutPayment rather than by auth. A token is
 * useless on its own: charging it needs an authenticated checkout or admin
 * request, scoped to the same shop.
 */
import { RATE_LIMITS } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import { cardTokenSchema, tokenizeCardInput } from '@merchant/contracts/pay';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop } from '@merchant/db/tenant';
import { normalizeCardNumber, tokenizeCard, VaultValidationError } from '@merchant/pay/vault';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { badRequest, notFound } from '../../lib/errors.ts';

export default async function routes(app: FastifyInstance) {
  app.post(
    '/tokenize',
    {
      config: {
        rateLimit: {
          max: RATE_LIMITS.checkoutPayment.max,
          timeWindow: RATE_LIMITS.checkoutPayment.windowMs,
        },
      },
    },
    async (request, reply) => {
      const shop = await shopFromOrigin(request);
      if (!shop) throw notFound('Shop');

      // Card fields arrive formatted (`4242 4242 4242 4242`); normalise before
      // the contract's digits-only check so a formatted field is not a 400.
      const body = (request.body ?? {}) as Record<string, unknown>;
      const card = tokenizeCardInput.parse({
        ...body,
        number: typeof body.number === 'string' ? normalizeCardNumber(body.number) : body.number,
      });

      try {
        const token = await tokenizeCard(dbForShop(shop.id), shop.id, card);
        // Parse on the way out too: zod strips unknown keys, so no field that
        // is not in `cardTokenSchema` can ever ride along in this response.
        return reply.status(201).send(cardTokenSchema.parse(token));
      } catch (error) {
        if (error instanceof VaultValidationError) {
          throw badRequest(error.message, error.field);
        }
        throw error;
      }
    },
  );
}

/**
 * `http://demo.lvh.me:3002` → the `demo` shop. Mirrors
 * `apps/storefront/src/lib/tenant.ts`; kept local because WS-A owns the
 * tenancy plugin and /vault/* deliberately resolves nothing there.
 */
async function shopFromOrigin(request: FastifyRequest): Promise<{ id: string } | null> {
  const origin = request.headers.origin;
  if (!origin) return null;

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return null;
  }

  const baseDomain = env().STOREFRONT_BASE_DOMAIN.split(':')[0];
  if (!baseDomain || !hostname.endsWith(`.${baseDomain}`)) return null;

  const slug = hostname.slice(0, -(baseDomain.length + 1));
  if (!slug || slug.includes('.') || slug === 'www') return null;

  // Platform-level lookup before a tenant exists — one of the sanctioned
  // dbAdmin uses (SPEC §6), same as storefront Host resolution.
  return dbAdmin.shop.findUnique({ where: { slug }, select: { id: true } });
}
