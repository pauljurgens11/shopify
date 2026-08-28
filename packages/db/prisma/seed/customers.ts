/**
 * The 25 demo customers and their addresses (H1).
 *
 * `ordersCount` and `totalSpent` are written later, by `orders.ts`, once the
 * orders they summarize exist — they are denormalized columns the customers
 * IndexTable sorts on, and a wrong value there is a visible bug.
 */
import { newId } from '@merchant/config/ids';
import { hash } from '@node-rs/argon2';
import type { PrismaClient } from '@prisma/client';
import { daysAgo, type SeedContext } from './context.ts';
import { SEED_PEOPLE, type SeedPerson } from './data/people.ts';
import { DEMO_PASSWORD } from './shop.ts';

export interface SeededCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  person: SeedPerson;
  createdAt: Date;
}

export function shippingAddressFor(customer: SeededCustomer): Record<string, string | null> {
  const p = customer.person;
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    company: null,
    address1: p.address1,
    address2: null,
    city: p.city,
    province: p.province,
    provinceCode: p.provinceCode,
    country: 'United States',
    countryCode: 'US',
    zip: p.zip,
    phone: p.phone,
  };
}

export async function createCustomers(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<SeededCustomer[]> {
  // One hash for every account-holder: argon2id is intentionally slow and the
  // seed runs constantly. They all share `password123` anyway (SPEC §7).
  const passwordHash = await hash(DEMO_PASSWORD);

  const customers: SeededCustomer[] = SEED_PEOPLE.map((person, index) => ({
    id: newId('customer'),
    email: person.email,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: person.phone,
    person,
    // Spread signups back over two years so the customers index has a real
    // "customer since" spread rather than 25 identical dates.
    createdAt: daysAgo(ctx, 700 - index * 26, 9, index),
  }));

  await db.customer.createMany({
    data: customers.map((c) => ({
      id: c.id,
      shopId: ctx.shopId,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      acceptsMarketing: c.person.acceptsMarketing,
      note: c.person.note ?? null,
      tags: c.person.tags ?? [],
      passwordHash: c.person.hasAccount ? passwordHash : null,
      ordersCount: 0,
      totalSpent: 0,
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    })),
  });

  await db.customerAddress.createMany({
    data: customers.map((c) => ({
      id: newId('address'),
      shopId: ctx.shopId,
      customerId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      company: null,
      address1: c.person.address1,
      address2: null,
      city: c.person.city,
      province: c.person.province,
      provinceCode: c.person.provinceCode,
      country: 'United States',
      countryCode: 'US',
      zip: c.person.zip,
      phone: c.person.phone,
      isDefault: true,
      createdAt: c.createdAt,
    })),
  });

  return customers;
}
