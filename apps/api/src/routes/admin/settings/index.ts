/**
 * `/admin/api/settings` (SPEC §9, §10). Owner: WS-A.
 *
 * General, taxes, checkout, shipping rates and staff. Locations live under
 * `/admin/api/locations` (WS-B) and payments under `/admin/api/payments`
 * (WS-D); the settings hub links to those rather than proxying them.
 *
 * E3 reads `GET /shipping-and-tax?subtotal=…` for the checkout's shipping step.
 */

import { createStaffInput, staffListResponse, updateStaffInput } from '@merchant/contracts/auth';
import { idParam, moneySchema } from '@merchant/contracts/common';
import {
  shippingRateListResponse,
  updateCheckoutSettingsInput,
  updateShopInput,
  updateTaxSettingsInput,
  upsertShippingRateInput,
} from '@merchant/contracts/shops';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { forbidden } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  createShippingRate,
  deleteShippingRate,
  eligibleShippingRates,
  listShippingRates,
  updateShippingRate,
} from '../../../services/settings/shipping.ts';
import {
  getCheckoutSettings,
  getGeneralSettings,
  getTaxSettings,
  updateCheckoutSettings,
  updateGeneralSettings,
  updateTaxSettings,
} from '../../../services/settings/shop.ts';
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
} from '../../../services/settings/staff.ts';

const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('settings'));

  /* ----- general ----- */
  app.get('/general', async (request) => getGeneralSettings(request.db));
  app.put('/general', async (request) =>
    updateGeneralSettings(request.db, shopIdOf(request), updateShopInput.parse(request.body)),
  );

  /* ----- taxes ----- */
  app.get('/taxes', async (request) => getTaxSettings(request.db));
  app.put('/taxes', async (request) =>
    updateTaxSettings(request.db, shopIdOf(request), updateTaxSettingsInput.parse(request.body)),
  );

  /* ----- checkout ----- */
  app.get('/checkout', async (request) => getCheckoutSettings(request.db));
  app.put('/checkout', async (request) =>
    updateCheckoutSettings(
      request.db,
      shopIdOf(request),
      updateCheckoutSettingsInput.parse(request.body),
    ),
  );

  /* ----- shipping rates ----- */
  app.get('/shipping-rates', async (request) =>
    shippingRateListResponse.parse({ data: await listShippingRates(request.db) }),
  );

  app.post('/shipping-rates', async (request, reply) => {
    const input = upsertShippingRateInput.parse(request.body);
    const rate = await createShippingRate(request.db, shopIdOf(request), input);
    return reply.status(201).send(rate);
  });

  app.put('/shipping-rates/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const input = upsertShippingRateInput.parse(request.body);
    return updateShippingRate(request.db, shopIdOf(request), id, input);
  });

  app.delete('/shipping-rates/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteShippingRate(request.db, shopIdOf(request), id);
    return { id, deleted: true as const };
  });

  /**
   * What checkout needs to price shipping and tax, narrowed to the rates that
   * apply to this cart. E3 calls this instead of reimplementing the bounds.
   */
  app.get('/shipping-and-tax', async (request) => {
    const query = z
      .object({ subtotal: z.coerce.number().int().nonnegative() })
      .parse(request.query);
    const [rates, tax, general] = await Promise.all([
      listShippingRates(request.db),
      getTaxSettings(request.db),
      getGeneralSettings(request.db),
    ]);
    const subtotal = moneySchema.parse({
      amount: query.subtotal,
      currencyCode: general.currencyCode,
    });
    return { rates: eligibleShippingRates(rates, subtotal), tax };
  });

  /* ----- staff ----- */

  /**
   * Staff MUTATIONS need more than the `settings` area: SPEC §8's per-area
   * model is only real if no single area can mint roles or permissions. A
   * `staff` user holding `settings` could otherwise create/promote their way
   * to `admin` in one request and bypass every other area.
   */
  const requireStaffManager = async (request: FastifyRequest) => {
    if (request.staffRole === 'staff') {
      throw forbidden('Only the store owner or an admin can manage staff.');
    }
  };

  app.get('/staff', async (request) =>
    staffListResponse.parse({ data: await listStaff(request.db) }),
  );

  app.post('/staff', { preHandler: requireStaffManager }, async (request, reply) => {
    const input = createStaffInput.parse(request.body);
    const staff = await createStaff(request.db, shopIdOf(request), input);
    return reply.status(201).send(staff);
  });

  app.put('/staff/:id', { preHandler: requireStaffManager }, async (request) => {
    const { id } = idParam.parse(request.params);
    return updateStaff(request.db, id, updateStaffInput.parse(request.body));
  });

  app.delete('/staff/:id', { preHandler: requireStaffManager }, async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteStaff(request.db, id);
    return { id, deleted: true as const };
  });
}
