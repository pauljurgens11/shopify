/** Staff + customer auth (SPEC §8). Owner: WS-A. */

import { PERMISSION_AREAS, RESERVED_SHOP_SLUGS, STAFF_ROLES } from '@merchant/config/constants';
import { z } from 'zod';
import { idSchema, timestampsSchema } from './common.ts';

export const staffRoleSchema = z.enum(STAFF_ROLES);
export const permissionAreaSchema = z.enum(PERMISSION_AREAS);

/**
 * Staff email INPUT: stored and matched case-folded, the same rule customers
 * already follow (see the WSC decision). Postgres compares are case-sensitive,
 * so without this `Paul@x.dev` at signup and `paul@x.dev` at login are two
 * different people — and there is no password reset to recover with.
 */
const emailInput = z
  .string()
  .email()
  .transform((value) => value.toLowerCase());

/** `staff` role only: per-area booleans. owner/admin bypass this map entirely. */
export const permissionsSchema = z.record(permissionAreaSchema, z.boolean()).default({});
export type Permissions = z.infer<typeof permissionsSchema>;

export const staffUserSchema = z
  .object({
    id: idSchema,
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    role: staffRoleSchema,
    permissions: permissionsSchema,
    lastLoginAt: z.string().datetime({ offset: true }).nullable(),
  })
  .merge(timestampsSchema);
export type StaffUser = z.infer<typeof staffUserSchema>;

export const loginInput = z.object({
  email: emailInput,
  password: z.string().min(1),
  shopSlug: z.string().optional(),
});

/**
 * Shop + owner created in one transaction (SPEC §8).
 *
 * `shopSlug` is optional: Shopify's signup asks only for a store name and
 * derives the URL from it. Supplying one explicitly is still honoured, and then
 * a collision is a 409 rather than a silent rename.
 */
export const signupInput = z.object({
  shopName: z.string().min(1).max(255),
  shopSlug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only')
    // `www` never resolves a storefront (lib/host.ts) and prod Caddy owns
    // `admin.*`/`api.*` — a shop on these slugs would sign up fine and then
    // simply not exist on the web.
    .refine((slug) => !RESERVED_SHOP_SLUGS.has(slug), 'That store URL is reserved')
    .optional(),
  email: emailInput,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
});

/** What every admin page needs on load: who am I, which shop, what may I see. */
export const sessionResponse = z.object({
  user: staffUserSchema,
  shop: z.object({
    id: idSchema,
    slug: z.string(),
    name: z.string(),
    currencyCode: z.string().length(3),
    timezone: z.string(),
  }),
});
export type SessionResponse = z.infer<typeof sessionResponse>;

export const inviteStaffInput = z.object({
  email: emailInput,
  role: staffRoleSchema,
  permissions: permissionsSchema.optional(),
});

/** Settings → Staff (A4). Role and permissions are the only editable fields. */
export const updateStaffInput = z.object({
  role: staffRoleSchema.optional(),
  permissions: permissionsSchema.optional(),
  firstName: z.string().max(255).nullable().optional(),
  lastName: z.string().max(255).nullable().optional(),
});

/** Invite creates the user with a password, since there is no email flow yet. */
export const createStaffInput = inviteStaffInput.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
});

export const staffListResponse = z.object({ data: z.array(staffUserSchema) });
