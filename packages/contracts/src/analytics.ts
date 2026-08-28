/** Analytics ingestion + dashboard (SPEC §13). Owner: WS-G. */
import { z } from 'zod';
import { idSchema, moneySchema } from './common.ts';

export const analyticsEventTypeSchema = z.enum([
  'page_view',
  'product_view',
  'add_to_cart',
  'begin_checkout',
  'purchase',
]);
export type AnalyticsEventType = z.infer<typeof analyticsEventTypeSchema>;

export const analyticsEventInput = z.object({
  type: analyticsEventTypeSchema,
  sessionId: z.string().min(1).max(64),
  path: z.string().max(1024),
  productId: idSchema.optional(),
  orderId: idSchema.optional(),
  value: moneySchema.optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

/**
 * Beacon endpoint takes a batch — a storefront page emits several events and one
 * request on unload is cheaper and more reliable than one request per event.
 * `purchase` is recorded SERVER-side at order creation, never trusted from here.
 */
export const ingestEventsInput = z.object({
  events: z.array(analyticsEventInput).min(1).max(50),
});

export const analyticsRangeQuery = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export const analyticsSummarySchema = z.object({
  totalSales: moneySchema,
  orderCount: z.number().int().nonnegative(),
  averageOrderValue: moneySchema,
  sessionCount: z.number().int().nonnegative(),
  /** purchases / sessions, as a percentage. */
  conversionRate: z.number().min(0).max(100),
  /** Same metrics for the immediately preceding period, for the delta chips. */
  comparison: z
    .object({
      totalSales: moneySchema,
      orderCount: z.number().int().nonnegative(),
      sessionCount: z.number().int().nonnegative(),
    })
    .nullable()
    .default(null),
});

export const timeSeriesPointSchema = z.object({
  bucket: z.string().datetime({ offset: true }),
  value: z.number(),
});

export const analyticsDashboardResponse = z.object({
  summary: analyticsSummarySchema,
  salesOverTime: z.array(timeSeriesPointSchema),
  ordersOverTime: z.array(timeSeriesPointSchema),
  sessionsOverTime: z.array(timeSeriesPointSchema),
  topProducts: z.array(
    z.object({
      productId: idSchema,
      title: z.string(),
      imageUrl: z.string().url().nullable(),
      unitsSold: z.number().int().nonnegative(),
      revenue: moneySchema,
    }),
  ),
  /** SPEC §13: static "Online Store" for now, shaped for more channels later. */
  salesByChannel: z.array(z.object({ channel: z.string(), revenue: moneySchema })),
  funnel: z.object({
    sessions: z.number().int().nonnegative(),
    productViews: z.number().int().nonnegative(),
    addedToCart: z.number().int().nonnegative(),
    reachedCheckout: z.number().int().nonnegative(),
    purchased: z.number().int().nonnegative(),
  }),
});
export type AnalyticsDashboard = z.infer<typeof analyticsDashboardResponse>;
