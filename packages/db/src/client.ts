/**
 * Raw, UNSCOPED Prisma client.
 *
 * Importing this outside the four sanctioned cases is the one unforgivable bug
 * in this codebase (SPEC §6). Sanctioned: shop signup, platform-level auth
 * lookup, migrations, seed. Everywhere else: `dbForShop(shopId)`.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { dbAdmin?: PrismaClient };

export const dbAdmin: PrismaClient =
  globalForPrisma.dbAdmin ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Next.js dev hot-reload otherwise opens a new pool on every edit until Postgres
// refuses connections.
if (process.env.NODE_ENV !== 'production') globalForPrisma.dbAdmin = dbAdmin;

export * from '@prisma/client';
export type { PrismaClient };
