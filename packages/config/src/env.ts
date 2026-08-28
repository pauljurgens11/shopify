/**
 * The one place environment variables are read (SPEC §5).
 *
 * Rules:
 *  - Add a var here and to `.env.example` in the SAME commit. CI enforces the
 *    pair via `scripts/check-env-parity.mjs`.
 *  - Server-only. Never import this from a client component; Next would inline
 *    secrets into the browser bundle.
 *  - Parsing is lazy and cached, so importing a helper from this package does
 *    not blow up a process that has no business needing DATABASE_URL.
 */
import { z } from 'zod';

const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- infrastructure ---
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // --- public URLs ---
  API_URL: z.string().url().default('http://localhost:3001'),
  ADMIN_URL: z.string().url().default('http://admin.lvh.me:3000'),
  STOREFRONT_BASE_DOMAIN: z.string().default('lvh.me:3002'),
  STOREFRONT_PROTOCOL: z.enum(['http', 'https']).default('http'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  ADMIN_PORT: z.coerce.number().int().positive().default(3000),
  STOREFRONT_PORT: z.coerce.number().int().positive().default(3002),

  // --- auth (SPEC §8) ---
  // Cookie NAME is not env-configurable — it is `SESSION_COOKIE` in
  // constants.ts, the single source of truth. Only the secret and TTL vary.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // --- Pay / vault (SPEC §11) ---
  // AES-256-GCM key: exactly 32 bytes, hex-encoded. Wrong length must fail at
  // boot, not at the first card tokenization during a demo.
  VAULT_MASTER_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'VAULT_MASTER_KEY must be 64 hex chars (32 bytes)'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  MAVERICK_API_KEY: z.string().optional().default(''),
  MAVERICK_MERCHANT_ID: z.string().optional().default(''),

  // --- object storage ---
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('merchant-assets'),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_FORCE_PATH_STYLE: booleanish.default('true'),
  S3_PUBLIC_URL: z.string().url(),

  // --- email ---
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_SECURE: booleanish.default('false'),
  EMAIL_FROM: z.string().default('Merchant <orders@example.com>'),

  // --- AI builder (SPEC §12) ---
  // Absent is a SUPPORTED state: the builder falls back to canned presets so the
  // demo never breaks. Do not make this required.
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment.\n\n${details}\n\nCopy .env.example to .env — it works with zero edits.\n`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** Test helper. Never call this from application code. */
export function resetEnvCache(): void {
  cached = undefined;
}

export const isProduction = (): boolean => env().NODE_ENV === 'production';
export const isTest = (): boolean => env().NODE_ENV === 'test';

/** Feature flags derived from optional credentials, so callers stop reading raw env. */
export const hasAnthropicKey = (): boolean => env().ANTHROPIC_API_KEY.length > 0;
export const hasStripeKey = (): boolean => env().STRIPE_SECRET_KEY.length > 0;
export const hasMaverickCreds = (): boolean =>
  env().MAVERICK_API_KEY.length > 0 && env().MAVERICK_MERCHANT_ID.length > 0;

/** `demo` → `http://demo.lvh.me:3002` (SPEC §6 tenant resolution). */
export function storefrontUrl(shopSlug: string): string {
  const { STOREFRONT_PROTOCOL, STOREFRONT_BASE_DOMAIN } = env();
  return `${STOREFRONT_PROTOCOL}://${shopSlug}.${STOREFRONT_BASE_DOMAIN}`;
}

/** `demo` → `http://admin.lvh.me:3000/store/demo` (mirrors admin.shopify.com/store/{slug}). */
export function adminUrl(shopSlug: string): string {
  return `${env().ADMIN_URL}/store/${shopSlug}`;
}
