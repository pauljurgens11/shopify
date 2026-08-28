/**
 * Settings → Payments: connecting processors (SPEC §11). Owner: WS-D.
 * Mounted at /admin/api/payments by the autoloader.
 *
 * The invariant this file exists to hold: credentials go IN and never come
 * back out. `processorConfigSchema` has a `connected` boolean and no credential
 * field, and every response here is parsed through it, so a future edit that
 * spreads a raw row into a reply still cannot leak a secret key.
 */

import { newId } from '@merchant/config/ids';
import {
  connectProcessorInput,
  processorConfigSchema,
  updateProcessorInput,
} from '@merchant/contracts/pay';
import { credentialColumns } from '@merchant/pay/credentials';
import { adapterFor } from '@merchant/pay/index';
import type { FastifyInstance } from 'fastify';
import { badRequest, notFound } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';

interface ProcessorConfigRow {
  id: string;
  processor: string;
  displayName: string;
  enabled: boolean;
  testMode: boolean;
  encryptedCredentials: string | null;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `connected` is derived, not stored: a config with no credential blob is a row
 * the merchant started and abandoned. `mock` is the exception — it needs no
 * credentials and is connected the moment it exists.
 */
function toConfig(row: ProcessorConfigRow) {
  return processorConfigSchema.parse({
    id: row.id,
    processor: row.processor,
    displayName: row.displayName,
    enabled: row.enabled,
    testMode: row.testMode,
    connected: row.processor === 'mock' || row.encryptedCredentials !== null,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export default async function routes(app: FastifyInstance) {
  app.get('/processors', { preHandler: requirePermission('settings') }, async (request) => {
    const rows = await request.db.processorConfig.findMany({ orderBy: { createdAt: 'asc' } });
    return { data: rows.map(toConfig) };
  });

  /**
   * Connect or re-connect. Credentials are verified against the processor
   * BEFORE anything is stored: saving a key that does not work would show the
   * merchant a connected badge and then decline every customer at checkout.
   */
  app.post('/processors', { preHandler: requirePermission('settings') }, async (request, reply) => {
    const input = connectProcessorInput.parse(request.body ?? {});
    const shopId = request.shopId as string;

    const ok = await adapterFor(input.processor).verifyCredentials(input.credentials);
    if (!ok) {
      throw badRequest(`Those credentials were rejected by ${input.processor}.`, 'credentials');
    }

    const columns = credentialColumns(input.credentials);
    const row = await request.db.processorConfig.upsert({
      where: { shopId_processor: { shopId, processor: input.processor } },
      create: {
        id: newId('processor'),
        shopId,
        processor: input.processor,
        displayName: input.displayName ?? input.processor,
        testMode: input.testMode,
        ...columns,
        lastVerifiedAt: new Date(),
      },
      update: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        testMode: input.testMode,
        enabled: true,
        ...columns,
        lastVerifiedAt: new Date(),
      },
    });

    return reply.status(201).send(toConfig(row));
  });

  app.patch('/processors/:id', { preHandler: requirePermission('settings') }, async (request) => {
    const { id } = request.params as { id: string };
    const input = updateProcessorInput.parse(request.body ?? {});

    const existing = await request.db.processorConfig.findUnique({ where: { id } });
    if (!existing) throw notFound('Processor');

    return toConfig(await request.db.processorConfig.update({ where: { id }, data: input }));
  });

  /**
   * Disconnect. The row and its routing rules go, and past `Payment`s lose the
   * foreign key — but they keep `processor`, `processorTxnId` and the routing
   * trail, so the order page still shows what happened. A refund after a
   * disconnect reaches the adapter with no credentials and comes back as a
   * failure, which is the honest answer: you cannot refund through a processor
   * you are no longer connected to.
   */
  app.delete(
    '/processors/:id',
    { preHandler: requirePermission('settings') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await request.db.processorConfig.findUnique({ where: { id } });
      if (!existing) throw notFound('Processor');

      await request.db.routingRule.deleteMany({ where: { processorConfigId: id } });
      await request.db.payment.updateMany({
        where: { processorConfigId: id },
        data: { processorConfigId: null },
      });
      await request.db.processorConfig.delete({ where: { id } });

      return reply.status(204).send();
    },
  );
}
