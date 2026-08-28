/**
 * Adapter registry (SPEC §11). Owner: WS-D.
 * Complete by construction: SPEC locks the processor set to these three.
 */
import type { ProcessorKey } from '@merchant/contracts/pay';
import type { ProcessorAdapter } from './adapter.ts';
import { maverickAdapter } from './adapters/maverick.ts';
import { mockAdapter } from './adapters/mock.ts';
import { stripeAdapter } from './adapters/stripe.ts';

export const ADAPTERS: Record<ProcessorKey, ProcessorAdapter> = {
  mock: mockAdapter,
  stripe: stripeAdapter,
  maverick: maverickAdapter,
};

export function adapterFor(key: ProcessorKey): ProcessorAdapter {
  const adapter = ADAPTERS[key];
  if (!adapter) throw new Error(`Unknown processor: ${key}`);
  return adapter;
}

export type { CardMaterial, ProcessorAdapter, ProcessorCredentials } from './adapter.ts';
/** Whether `maverick` is talking to Maverick or simulating — the admin renders a badge from this. */
export { maverickMode } from './adapters/maverick.ts';
/**
 * The published test cards. The seed, the checkout demo and the smoke suite all
 * need them; the admin's Payments screen shows them next to the mock processor.
 */
export { TEST_CARDS } from './adapters/test-cards.ts';
