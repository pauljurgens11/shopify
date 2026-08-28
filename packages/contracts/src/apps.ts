/** Private apps + Admin API tokens (SPEC §8, §13). Owner: WS-G. */

import { PERMISSION_AREAS } from '@merchant/config/constants';
import { z } from 'zod';
import { idSchema, paginated, paginationQuery, timestampsSchema } from './common.ts';

/** Scopes mirror the staff permission areas, read/write split like Shopify's. */
export const appScopeSchema = z.enum(
  PERMISSION_AREAS.flatMap((area) => [`read_${area}`, `write_${area}`]) as [string, ...string[]],
);

export const appSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    scopes: z.array(appScopeSchema).default([]),
    /** Only the last 4 chars — the token itself is shown exactly once, at creation. */
    tokenSuffix: z.string().length(4),
    lastUsedAt: z.string().datetime({ offset: true }).nullable().default(null),
  })
  .merge(timestampsSchema);
export type App = z.infer<typeof appSchema>;

export const createAppInput = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(appScopeSchema).min(1),
});

/** The ONLY response that ever contains the plaintext token. */
export const createAppResponse = z.object({
  app: appSchema,
  apiToken: z.string().startsWith('shpat_'),
});

export const listAppsQuery = paginationQuery;
export const appListResponse = paginated(appSchema);
