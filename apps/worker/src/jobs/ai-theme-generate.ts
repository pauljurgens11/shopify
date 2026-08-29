/**
 * `ai-theme-generation` — the AI storefront builder (SPEC §12). Owner: WS-F.
 *
 * One model call that must return a COMPLETE ThemeDoc through a forced tool, one
 * retry with the validation errors fed back, then an apology in the chat. No
 * patch format and no agentic loop (DECISIONS.md): the doc is small enough to
 * regenerate whole, and a half-applied patch is a broken storefront.
 *
 * This job throws only while a queue retry remains. On the FINAL attempt every
 * failure — model, DB, even a malformed payload — resolves the pending bubble
 * with an apology instead: a thrown last attempt strands the spinner forever
 * and permanently disables the chat, and an apologetic assistant message is a
 * worse theme but a working product.
 */
import Anthropic from '@anthropic-ai/sdk';
import { QUEUES } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import { newId } from '@merchant/config/ids';
import { JOB_NAMES } from '@merchant/config/queue';
import {
  type AiThemeJobPayload,
  aiThemeJobPayload,
  SECTION_TYPES,
  THEME_GENERATION_APOLOGY,
  type ThemeDoc,
  themeDocSchema,
  validateThemeDoc,
} from '@merchant/contracts/theme';
import { dbForShop } from '@merchant/db/tenant';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { JobContext, JobDefinition } from './types.ts';

/* -------------------------------------------------------------------------- */
/* Prompt assembly                                                             */
/* -------------------------------------------------------------------------- */

export type CatalogEntry = { handle: string; title: string };

export type ReferencedHandles = { products: string[]; collections: string[] };

/** Answers "which of these handles actually exist in this shop?". */
export type HandleResolver = (
  referenced: ReferencedHandles,
) => Promise<{ products: Set<string>; collections: Set<string> }>;

export type GenerationContext = {
  shopName: string;
  currentDoc: ThemeDoc;
  catalog: { products: CatalogEntry[]; collections: CatalogEntry[] };
  history: { role: 'user' | 'assistant'; content: string }[];
  prompt: string;
  /**
   * Ground truth for validating the handles the MODEL's output references. The
   * prompt catalog is truncated (60 products / 40 collections), so a real but
   * old handle would be falsely rejected against it — the handler passes a
   * DB-backed resolver instead. Absent (unit tests), the catalog is the truth.
   */
  resolveHandles?: HandleResolver;
  /** Handles the CURRENT doc references that do not exist in this shop. */
  missingHandles?: ReferencedHandles;
};

export type GenerateInput = GenerationContext & {
  /** Validation errors from the previous attempt; set only on the retry. */
  retryFeedback?: string;
};

export type ThemeGenerator = (input: GenerateInput) => Promise<{ doc: unknown; summary: string }>;

/**
 * The tool schema IS the ThemeDoc schema, so the section catalog and every
 * `.describe()` in `contracts/theme.ts` reach the model as prompt text. `$ref`
 * is inlined: a schema full of internal references confuses tool-use far more
 * than a long flat one.
 */
export function themeDocJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(themeDocSchema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, unknown>;
}

export function buildSystemPrompt(): string {
  return [
    'You are the storefront designer for an e-commerce platform. You author a ThemeDoc: a',
    'JSON document describing a complete storefront — design tokens, header navigation, the',
    'sections on the home/product/collection pages, and the footer.',
    '',
    `The available section types are exactly: ${SECTION_TYPES.join(', ')}.`,
    'Each one has its own settings schema, documented in the tool input schema. Read those',
    'descriptions — they tell you what each field does.',
    '',
    'Rules:',
    '1. Always return a COMPLETE ThemeDoc through the `set_theme` tool. Never a patch, never a',
    '   partial document. Anything you omit is deleted from the storefront.',
    '2. `pages.product` must contain a `product-detail` section and `pages.collection` must',
    '   contain a `collection-page` section. Without them those pages render empty.',
    '3. The `footer` belongs at the top level, never inside a page.',
    '4. Only reference product and collection handles from the list you are given.',
    '   DO NOT INVENT HANDLES — a handle that does not exist renders an empty block.',
    '5. Colors are hex. Ensure real contrast: body text must be readable on the background.',
    '6. Keep copy specific to this shop. No lorem ipsum, no placeholder names.',
    '7. Section ids must be unique within their page.',
    '',
    'Then write one short sentence for the merchant describing what you changed, in the',
    '`summary` field — e.g. "Warmed the palette and made the hero full-height."',
  ].join('\n');
}

export function buildUserMessage(context: GenerateInput): string {
  const list = (entries: CatalogEntry[]) =>
    entries.length === 0
      ? '  (none yet)'
      : entries.map((e) => `  - ${e.handle} — ${e.title}`).join('\n');

  const parts = [
    `Shop: ${context.shopName}`,
    '',
    'Collections that exist in this shop (use only these handles):',
    list(context.catalog.collections),
    '',
    'Products that exist in this shop (use only these handles):',
    list(context.catalog.products),
    '',
    'The current theme document:',
    '```json',
    JSON.stringify(context.currentDoc),
    '```',
  ];

  // Say which of the current doc's handles are dead, or the model faithfully
  // keeps them and validation rejects every attempt (the aurora preset on a
  // fresh shop references "featured", which the shop does not have).
  const missing = [
    ...(context.missingHandles?.collections ?? []).map((h) => `  - collection handle "${h}"`),
    ...(context.missingHandles?.products ?? []).map((h) => `  - product handle "${h}"`),
  ];
  if (missing.length > 0) {
    parts.push(
      '',
      'WARNING: the current theme references handles that DO NOT exist in this shop.',
      'Remove those sections or repoint them at handles from the lists above:',
      ...missing,
    );
  }

  if (context.history.length > 0) {
    parts.push(
      '',
      'Earlier in this conversation:',
      ...context.history.map((m) => `  ${m.role}: ${m.content}`),
    );
  }

  parts.push('', `The merchant asks: ${context.prompt}`);

  if (context.retryFeedback) {
    parts.push(
      '',
      'Your previous attempt was rejected. Fix exactly these problems and return the whole',
      'document again:',
      context.retryFeedback,
    );
  }

  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/** Every product/collection handle a doc points at, deduplicated. */
export function collectReferencedHandles(doc: ThemeDoc): ReferencedHandles {
  const products = new Set<string>();
  const collections = new Set<string>();
  for (const sections of Object.values(doc.pages)) {
    for (const section of sections) {
      if (section.type === 'featured-collection') {
        collections.add(section.settings.collectionHandle);
      }
      if (section.type === 'collection-list') {
        for (const handle of section.settings.collectionHandles) collections.add(handle);
      }
      if (section.type === 'product-grid') {
        for (const handle of section.settings.productHandles) products.add(handle);
      }
    }
  }
  return { products: [...products], collections: [...collections] };
}

/** The truncated prompt catalog, standing in as ground truth for unit tests. */
function catalogResolver(catalog: GenerationContext['catalog']): HandleResolver {
  return async () => ({
    products: new Set(catalog.products.map((p) => p.handle)),
    collections: new Set(catalog.collections.map((c) => c.handle)),
  });
}

/**
 * Structural validity is not enough: a doc that parses but points at handles the
 * shop does not have renders empty blocks, which reads as a broken store rather
 * than a mediocre theme. Both classes of problem go back to the model together.
 * Handle existence comes from `resolveHandles` so it can be the real database.
 */
export async function findProblems(doc: unknown, resolveHandles: HandleResolver) {
  const parsed = themeDocSchema.safeParse(doc);
  if (!parsed.success) {
    return parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`);
  }

  const problems = validateThemeDoc(parsed.data);
  const known = await resolveHandles(collectReferencedHandles(parsed.data));

  for (const [page, sections] of Object.entries(parsed.data.pages)) {
    for (const section of sections) {
      if (
        section.type === 'featured-collection' &&
        !known.collections.has(section.settings.collectionHandle)
      ) {
        problems.push(
          `pages.${page}.${section.id}: collection handle "${section.settings.collectionHandle}" does not exist in this shop`,
        );
      }
      if (section.type === 'collection-list') {
        for (const handle of section.settings.collectionHandles) {
          if (!known.collections.has(handle)) {
            problems.push(
              `pages.${page}.${section.id}: collection handle "${handle}" does not exist in this shop`,
            );
          }
        }
      }
      if (section.type === 'product-grid') {
        for (const handle of section.settings.productHandles) {
          if (!known.products.has(handle)) {
            problems.push(
              `pages.${page}.${section.id}: product handle "${handle}" does not exist in this shop`,
            );
          }
        }
      }
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------- */
/* The loop                                                                    */
/* -------------------------------------------------------------------------- */

export type GenerationResult =
  | { ok: true; doc: ThemeDoc; summary: string }
  | { ok: false; message: string };

/**
 * Generate, validate, retry ONCE with the errors, then apologize. `generate` is
 * injected so the loop is testable without a network mock (SPEC §14).
 */
export async function runThemeGeneration(
  context: GenerationContext,
  generate: ThemeGenerator,
): Promise<GenerationResult> {
  const resolveHandles = context.resolveHandles ?? catalogResolver(context.catalog);
  let retryFeedback: string | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let candidate: { doc: unknown; summary: string };
    try {
      candidate = await generate({ ...context, retryFeedback });
    } catch (error) {
      // Overloaded, rate-limited, network — nothing the merchant can act on.
      console.warn(`ai-theme: model call failed — ${(error as Error).message}`);
      return { ok: false, message: THEME_GENERATION_APOLOGY };
    }

    const problems = await findProblems(candidate.doc, resolveHandles);
    if (problems.length === 0) {
      return {
        ok: true,
        doc: themeDocSchema.parse(candidate.doc),
        summary: candidate.summary.trim() || 'Updated your storefront.',
      };
    }
    retryFeedback = problems.map((p) => `- ${p}`).join('\n');
  }

  return { ok: false, message: THEME_GENERATION_APOLOGY };
}

/* -------------------------------------------------------------------------- */
/* The real model call                                                         */
/* -------------------------------------------------------------------------- */

/**
 * A forced tool call is what makes the output a document rather than prose:
 * `tool_choice` pins `set_theme`, whose input schema is the ThemeDoc itself.
 */
export const anthropicGenerator: ThemeGenerator = async (input) => {
  const config = env();
  // The SDK's defaults (~10 min timeout, 2 retries) can outlive the client's
  // polling and the 5-min stale-pending sweep. runThemeGeneration already does
  // one semantic retry, so worst case here stays ≈ 2 × 2 min.
  const client = new Anthropic({
    apiKey: config.ANTHROPIC_API_KEY,
    timeout: 120_000,
    maxRetries: 0,
  });

  const response = await client.messages.create({
    model: config.ANTHROPIC_MODEL,
    max_tokens: 16000,
    system: buildSystemPrompt(),
    tools: [
      {
        name: 'set_theme',
        description: 'Replace the storefront theme with a complete new ThemeDoc.',
        input_schema: {
          type: 'object',
          properties: {
            theme: themeDocJsonSchema(),
            summary: {
              type: 'string',
              description: 'One short sentence for the merchant describing what changed.',
            },
          },
          required: ['theme', 'summary'],
        } as Anthropic.Tool['input_schema'],
      },
    ],
    tool_choice: { type: 'tool', name: 'set_theme' },
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  });

  const call = response.content.find((block) => block.type === 'tool_use');
  if (!call) throw new Error('Model returned no set_theme call');

  // Tool inputs are already parsed JSON; never string-match the serialized form.
  const args = call.input as { theme?: unknown; summary?: unknown };
  return {
    doc: args.theme,
    summary: typeof args.summary === 'string' ? args.summary : '',
  };
};

/* -------------------------------------------------------------------------- */
/* Job handler                                                                 */
/* -------------------------------------------------------------------------- */

/** Handles + titles only: the model needs to know what exists, not the catalogue. */
async function loadCatalog(db: ReturnType<typeof dbForShop>) {
  const [products, collections] = await Promise.all([
    db.product.findMany({
      where: { status: 'active' },
      select: { handle: true, title: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    db.collection.findMany({ select: { handle: true, title: true }, take: 40 }),
  ]);
  return { products, collections };
}

/**
 * The DB is the ground truth `findProblems` checks against — only the handles
 * the doc actually references are queried, so truncation cannot falsely reject
 * a real handle the way the 60/40 prompt catalog would.
 */
function dbHandleResolver(db: ReturnType<typeof dbForShop>): HandleResolver {
  return async (referenced) => {
    const [products, collections] = await Promise.all([
      referenced.products.length === 0
        ? []
        : db.product.findMany({
            where: { handle: { in: referenced.products }, status: 'active' },
            select: { handle: true },
          }),
      referenced.collections.length === 0
        ? []
        : db.collection.findMany({
            where: { handle: { in: referenced.collections } },
            select: { handle: true },
          }),
    ]);
    return {
      products: new Set(products.map((p) => p.handle)),
      collections: new Set(collections.map((c) => c.handle)),
    };
  };
}

type MessagePatch = {
  content: string;
  status: 'complete' | 'failed';
  themeVersionId: string | null;
};

/**
 * Compare-and-set patch of ONE message in the conversation blob. Mirrors the
 * CAS loop in apps/api/src/services/themes/conversation.ts — the worker cannot
 * import from apps/api, so the ~15 lines are duplicated here on purpose; keep
 * the two in step. The guard is `updatedAt` (Prisma `@updatedAt`: any
 * concurrent write changes it). The patch is computed from the FRESH row every
 * attempt, so a message appended during the 30–60s model call survives; after
 * three lost races, last-writer-wins rather than throwing.
 */
async function casResolveMessage(
  db: ReturnType<typeof dbForShop>,
  conversationId: string,
  messageId: string,
  patch: MessagePatch,
): Promise<void> {
  for (let attempt = 0; attempt <= 3; attempt += 1) {
    const row = await db.builderConversation.findFirst({ where: { id: conversationId } });
    if (!row) return;
    const stored = (Array.isArray(row.messages) ? row.messages : []) as { id?: string }[];
    const next = stored.map((m) => (m?.id === messageId ? { ...m, ...patch } : m));
    if (attempt === 3) {
      await db.builderConversation.update({
        where: { id: conversationId },
        data: { messages: next },
      });
      return;
    }
    const { count } = await db.builderConversation.updateMany({
      where: { id: conversationId, updatedAt: row.updatedAt },
      data: { messages: next },
    });
    if (count === 1) return;
  }
}

export async function handler(
  payload: AiThemeJobPayload,
  ctx: JobContext,
  generate: ThemeGenerator = anthropicGenerator,
): Promise<void> {
  try {
    const { shopId, conversationId, messageId, prompt } = aiThemeJobPayload.parse(payload);
    const db = dbForShop(shopId);

    const [shop, published, conversation, catalog] = await Promise.all([
      db.shop.findFirst(),
      db.themeVersion.findFirst({ where: { status: 'published' } }),
      db.builderConversation.findFirst({ where: { id: conversationId } }),
      loadCatalog(db),
    ]);

    const messages = Array.isArray(conversation?.messages)
      ? (conversation.messages as {
          id: string;
          role: string;
          content: string;
          status?: string;
          createdAt?: string;
        }[])
      : [];

    // Idempotency: a queue retry re-runs the whole job. If the bubble is gone
    // or already resolved, the first run finished — do not generate twice.
    const pending = messages.find((m) => m.id === messageId);
    if (pending?.status !== 'pending') {
      console.warn(`ai-theme: message ${messageId} is not pending — already handled, skipping`);
      return;
    }

    const resolveHandles = dbHandleResolver(db);

    // Create-then-die window: the previous attempt may have created the draft
    // and crashed before resolving the bubble. Link that version, skip the
    // model call.
    if (pending.createdAt) {
      const prior = await db.themeVersion.findFirst({
        where: { conversationId, createdByMessage: prompt.slice(0, 1000) },
        orderBy: { createdAt: 'desc' },
      });
      if (prior && prior.createdAt > new Date(pending.createdAt)) {
        await casResolveMessage(db, conversationId, messageId, {
          content: 'Updated your storefront.',
          status: 'complete',
          themeVersionId: prior.id,
        });
        return;
      }
    }

    const currentDoc = published
      ? themeDocSchema.parse(published.themeJson)
      : (await import('@merchant/theme-engine/presets')).presetThemeDoc('aurora');

    // Handles the current doc references that the shop does not have (a fresh
    // shop's aurora preset points at "featured"): tell the model, or it keeps
    // them and validation rejects every attempt.
    const referenced = collectReferencedHandles(currentDoc);
    const existing = await resolveHandles(referenced);
    const missingHandles = {
      products: referenced.products.filter((h) => !existing.products.has(h)),
      collections: referenced.collections.filter((h) => !existing.collections.has(h)),
    };

    const result = await runThemeGeneration(
      {
        shopName: shop?.name ?? 'this shop',
        currentDoc,
        catalog,
        // The tail only — the whole log would crowd out the catalogue.
        history: messages
          .filter((m) => m.status !== 'pending' && m.content)
          .slice(-6)
          .map((m) => ({
            role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.content,
          })),
        prompt,
        resolveHandles,
        missingHandles,
      },
      generate,
    );

    let themeVersionId: string | null = null;
    if (result.ok) {
      const created = await db.themeVersion.create({
        data: {
          id: newId('theme'),
          // Explicit for Prisma's types; dbForShop overrides it (WS-D note).
          shopId,
          themeJson: result.doc,
          tokens: result.doc.tokens,
          status: 'draft',
          createdByMessage: prompt.slice(0, 1000),
          conversationId,
        },
      });
      themeVersionId = created.id;
    }

    // Resolve the pending message in place, so the chat does not grow a stray
    // bubble every time a generation fails.
    await casResolveMessage(db, conversationId, messageId, {
      content: result.ok ? result.summary : result.message,
      status: result.ok ? 'complete' : 'failed',
      themeVersionId,
    });
  } catch (error) {
    // While a retry remains, rethrow so BullMQ retries transient failures. On
    // the FINAL attempt, swallow: a failed last attempt strands the pending
    // bubble and permanently disables the chat, so resolve it best-effort.
    if (ctx.attempt < ctx.maxAttempts) throw error;
    console.warn(
      `ai-theme: job ${ctx.jobId} failed on final attempt — ${(error as Error).message}`,
    );
    const raw = (payload ?? {}) as Record<string, unknown>;
    const { shopId, conversationId, messageId } = raw;
    if (
      typeof shopId !== 'string' ||
      typeof conversationId !== 'string' ||
      typeof messageId !== 'string'
    ) {
      return;
    }
    try {
      await casResolveMessage(dbForShop(shopId), conversationId, messageId, {
        content: THEME_GENERATION_APOLOGY,
        status: 'failed',
        themeVersionId: null,
      });
    } catch (writeError) {
      console.warn(
        `ai-theme: could not resolve pending message ${messageId} — ${(writeError as Error).message}`,
      );
    }
  }
}

export const aiThemeGenerate: JobDefinition<AiThemeJobPayload> = {
  name: JOB_NAMES.aiThemeGeneration,
  queue: QUEUES.ai,
  handler: (payload, ctx) => handler(payload, ctx),
};
