/**
 * Settings → Staff (SPEC §8). Owner: WS-A.
 *
 * There is no email flow in this build, so "invite" creates the user with a
 * password the owner sets and hands over. Roles: owner/admin bypass the
 * permission map, `staff` is gated per area — see lib/permissions.ts.
 */

import type { StaffRole } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import type { Permissions, StaffUser } from '@merchant/contracts/auth';
import { staffUserSchema } from '@merchant/contracts/auth';
import type { TenantClient } from '@merchant/db/tenant';
import { hash } from '@node-rs/argon2';
import { conflict, forbidden, notFound } from '../../lib/errors.ts';
import { destroySessionsForUser } from '../../lib/sessions.ts';

type StaffRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  permissions: unknown;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Prisma hands back Date objects; the contract is ISO-8601 UTC (SPEC §5). */
const serialize = (row: StaffRow): StaffUser =>
  staffUserSchema.parse({
    ...row,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export async function listStaff(db: TenantClient): Promise<StaffUser[]> {
  const rows = await db.staffUser.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map(serialize);
}

export async function createStaff(
  db: TenantClient,
  shopId: string,
  input: {
    email: string;
    password: string;
    role: StaffRole;
    permissions?: Permissions;
    firstName?: string;
    lastName?: string;
  },
): Promise<StaffUser> {
  // Same invariant updateStaff enforces on promotion: a shop has exactly one
  // owner, and a second one could never be demoted or removed again.
  if (input.role === 'owner') {
    throw forbidden('A store has one owner, and ownership cannot be transferred.');
  }
  if (await db.staffUser.findFirst({ where: { email: input.email } })) {
    throw conflict('That email already has access to this store.', 'email');
  }

  const row = await db.staffUser.create({
    data: {
      id: newId('user'),
      shopId,
      email: input.email,
      passwordHash: await hash(input.password),
      role: input.role,
      permissions: input.permissions ?? {},
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    },
  });
  return serialize(row as StaffRow);
}

async function requireStaff(db: TenantClient, id: string): Promise<StaffRow> {
  const row = await db.staffUser.findFirst({ where: { id } });
  if (!row) throw notFound('Staff member not found.');
  return row as StaffRow;
}

/**
 * Sessions snapshot role and permissions at login (A1), so a change here is
 * invisible until the user signs in again — unless we end their sessions.
 * Otherwise revoking access leaves the open tab still holding it.
 */
export async function updateStaff(
  db: TenantClient,
  id: string,
  input: {
    role?: StaffRole;
    permissions?: Permissions;
    firstName?: string | null;
    lastName?: string | null;
  },
): Promise<StaffUser> {
  const existing = await requireStaff(db, id);
  if (existing.role === 'owner' && input.role && input.role !== 'owner') {
    throw forbidden('The store owner cannot be demoted.');
  }
  // Ownership transfer is not in scope, and a second owner is a state nothing
  // else handles: neither could be removed, and "the owner" stops being one row.
  if (existing.role !== 'owner' && input.role === 'owner') {
    throw forbidden('A store has one owner, and ownership cannot be transferred.');
  }
  // The owner bypasses the permission map entirely (lib/permissions.ts), so a
  // permissions write here changes nothing except destroying the owner's
  // sessions below — which makes it a repeatable force-logout, not an edit.
  if (existing.role === 'owner' && input.permissions !== undefined) {
    throw forbidden("The store owner's permissions cannot be changed.");
  }

  const row = await db.staffUser.update({ where: { id }, data: input });
  if (input.role !== undefined || input.permissions !== undefined) {
    await destroySessionsForUser(id);
  }
  return serialize(row as StaffRow);
}

export async function deleteStaff(db: TenantClient, id: string): Promise<void> {
  const existing = await requireStaff(db, id);
  // Deleting the owner would strand the shop with no one who can grant access.
  if (existing.role === 'owner') throw forbidden('The store owner cannot be removed.');

  await db.staffUser.delete({ where: { id } });
  await destroySessionsForUser(id);
}
