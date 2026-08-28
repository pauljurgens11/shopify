/**
 * `/admin/api/files` (SPEC §16 row B). Owner: WS-B.
 *
 * Deliberately product-agnostic: B5 attaches the result to a ProductImage, F3
 * uses it for theme assets, A4 for a shop logo. One endpoint, one key layout.
 */
import { presignUploadInput, presignUploadResponse } from '@merchant/contracts/files';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../../../lib/permissions.ts';
import { presignUpload } from '../../../services/files/presign.ts';

const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  // Uploads are staff-only. `products` is the area every current caller already
  // holds; a dedicated "files" permission would be a fifth thing A4's staff
  // form has to explain for no gain.
  app.addHook('preHandler', requirePermission('products'));

  app.post('/presign', async (request) => {
    const input = presignUploadInput.parse(request.body);
    return presignUploadResponse.parse(await presignUpload(shopIdOf(request), input));
  });
}
