/**
 * Settings → Payments: the routing rules (SPEC §11). Owner: WS-D.
 * Mounted at /admin/api/payments by the autoloader.
 *
 * The list is ordered and replaced wholesale rather than patched row by row.
 * Weights are a percentage split *between rules that compete for the same
 * charge*, so a partial update can leave the set summing to something that
 * means nothing; a PUT of the whole list is the only edit that can be validated
 * as a unit.
 */
import { newId } from '@merchant/config/ids';
import { routingRuleSchema, updateRoutingRulesInput } from '@merchant/contracts/pay';
import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';

interface RoutingRuleRow {
  id: string;
  processorConfigId: string;
  position: number;
  weight: number;
  conditions: unknown;
}

const toRule = (row: RoutingRuleRow) =>
  routingRuleSchema.parse({
    id: row.id,
    processorConfigId: row.processorConfigId,
    position: row.position,
    weight: row.weight,
    conditions: row.conditions ?? {},
  });

/**
 * Rules only compete when their conditions overlap, and full overlap analysis
 * is not worth building here. Identical conditions is the case a merchant
 * actually creates — "split my Visa traffic 60/40" — and it is the one where a
 * total over 100 is unambiguously a mistake.
 */
function assertWeightsSplit(rules: Array<{ weight: number; conditions: unknown }>): void {
  const totals = new Map<string, number>();
  for (const rule of rules) {
    const key = canonical(rule.conditions);
    totals.set(key, (totals.get(key) ?? 0) + rule.weight);
  }
  for (const total of totals.values()) {
    if (total > 100) {
      throw badRequest(
        'Weights for rules with the same conditions must add up to 100 or less.',
        'rules',
      );
    }
  }
}

/** Stable key for a conditions object — key order must not change the grouping. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${k}:${canonical(v)}`).join(',')}}`;
}

export default async function routes(app: FastifyInstance) {
  app.get('/routing-rules', { preHandler: requirePermission('settings') }, async (request) => {
    const rows = await request.db.routingRule.findMany({ orderBy: { position: 'asc' } });
    return { data: rows.map(toRule) };
  });

  app.put('/routing-rules', { preHandler: requirePermission('settings') }, async (request) => {
    const { rules } = updateRoutingRulesInput.parse(request.body ?? {});
    const shopId = request.shopId as string;

    // A rule pointing at a processor this shop has not connected would
    // silently never fire, which is worse than a 400.
    const configs = await request.db.processorConfig.findMany({ select: { id: true } });
    const known = new Set(configs.map((config) => config.id));
    for (const rule of rules) {
      if (!known.has(rule.processorConfigId)) {
        throw badRequest('That processor is not connected to this shop.', 'processorConfigId');
      }
    }
    assertWeightsSplit(rules);

    // Replace as one transaction: a half-applied routing table would send
    // live checkouts to a processor set the merchant never approved.
    await request.db.$transaction([
      request.db.routingRule.deleteMany({}),
      request.db.routingRule.createMany({
        data: rules.map((rule, index) => ({
          id: newId('routingRule'),
          shopId,
          processorConfigId: rule.processorConfigId,
          position: rule.position ?? index,
          weight: rule.weight,
          conditions: rule.conditions,
        })),
      }),
    ]);

    const rows = await request.db.routingRule.findMany({ orderBy: { position: 'asc' } });
    return { data: rows.map(toRule) };
  });
}
