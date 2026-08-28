/**
 * `ai-theme-generation` — the AI storefront builder (SPEC §12). Owner: WS-F.
 *
 * One model call that must return a COMPLETE ThemeDoc through a forced tool, one
 * retry with the validation errors fed back, then an apology in the chat. No
 * patch format and no agentic loop (DECISIONS.md): the doc is small enough to
 * regenerate whole, and a half-applied patch is a broken storefront.
 *
 * This job never throws. A thrown job retries on the queue and the merchant
 * watches a spinner forever; an apologetic assistant message is a worse theme
 * but a working product.
 */
import Anthropic from '@anthropic-ai/sdk';
import { QUEUES } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import { newId } from '@merchant/config/ids';
import {
  type AiThemeJobPayload,
  aiThemeJobPayload,
  SECTION_TYPES,
  type ThemeDoc,
  themeDocSchema,
  validateThemeDoc,
} from '@merchant/contracts/theme';
import { dbForShop } from '@merchant/db/tenant';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { JobDefinition } from './types.ts';

/** Must equal WS-G's `JOB_NAMES.aiThemeGeneration` in `@merchant/config/queue`. */
export const AI_THEME_JOB_NAME = 'ai-theme-generation';

/* -------------------------------------------------------------------------- */
/* Prompt assembly                                                             */
/* -------------------------------------------------------------------------- */

export type CatalogEntry = { handle: string; title: string };

export type GenerationContext = {
  shopName: string;
  currentDoc: ThemeDoc;
  catalog: { products: CatalogEntry[]; collections: CatalogEntry[] };
  history: { role: 'user' | 'assistant'; content: string }[];
  prompt: string;
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

/**
 * Structural validity is not enough: a doc that parses but points at handles the
 * shop does not have renders empty blocks, which reads as a broken store rather
 * than a mediocre theme. Both classes of problem go back to the model together.
 */
export function findProblems(doc: unknown, catalog: GenerationContext['catalog']): string[] {
  const parsed = themeDocSchema.safeParse(doc);
  if (!parsed.success) {
    return parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`);
  }

  const problems = validateThemeDoc(parsed.data);
  const known = new Set(catalog.collections.map((c) => c.handle));
  const knownProducts = new Set(catalog.products.map((p) => p.handle));

  for (const [page, sections] of Object.entries(parsed.data.pages)) {
    for (const section of sections) {
      if (section.type === 'featured-collection' && !known.has(section.settings.collectionHandle)) {
        problems.push(
          `pages.${page}.${section.id}: collection handle "${section.settings.collectionHandle}" does not exist in this shop`,
        );
      }
      if (section.type === 'collection-list') {
        for (const handle of section.settings.collectionHandles) {
          if (!known.has(handle)) {
            problems.push(
              `pages.${page}.${section.id}: collection handle "${handle}" does not exist in this shop`,
            );
          }
        }
      }
      if (section.type === 'product-grid') {
        for (const handle of section.settings.productHandles) {
          if (!knownProducts.has(handle)) {
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

const APOLOGY =
  "Sorry — I couldn't put together a valid theme for that. Try describing the look you want " +
  'in a different way, or apply one of the built-in presets and tweak it from there.';

/**
 * Generate, validate, retry ONCE with the errors, then apologize. `generate` is
 * injected so the loop is testable without a network mock (SPEC §14).
 */
export async function runThemeGeneration(
  context: GenerationContext,
  generate: ThemeGenerator,
): Promise<GenerationResult> {
  let retryFeedback: string | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let candidate: { doc: unknown; summary: string };
    try {
      candidate = await generate({ ...context, retryFeedback });
    } catch (error) {
      // Overloaded, rate-limited, network — nothing the merchant can act on.
      console.warn(`ai-theme: model call failed — ${(error as Error).message}`);
      return { ok: false, message: APOLOGY };
    }

    const problems = findProblems(candidate.doc, context.catalog);
    if (problems.length === 0) {
      return {
        ok: true,
        doc: themeDocSchema.parse(candidate.doc),
        summary: candidate.summary.trim() || 'Updated your storefront.',
      };
    }
    retryFeedback = problems.map((p) => `- ${p}`).join('\n');
  }

  return { ok: false, message: APOLOGY };
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
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

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

export async function handler(
  payload: AiThemeJobPayload,
  generate: ThemeGenerator = anthropicGenerator,
): Promise<void> {
  const { shopId, conversationId, messageId, prompt } = aiThemeJobPayload.parse(payload);
  const db = dbForShop(shopId);

  const [shop, published, conversation, catalog] = await Promise.all([
    db.shop.findFirst(),
    db.themeVersion.findFirst({ where: { status: 'published' } }),
    db.builderConversation.findFirst({ where: { id: conversationId } }),
    loadCatalog(db),
  ]);

  const messages = Array.isArray(conversation?.messages)
    ? (conversation.messages as { id: string; role: string; content: string; status?: string }[])
    : [];

  const currentDoc = published
    ? themeDocSchema.parse(published.themeJson)
    : (await import('@merchant/theme-engine/presets')).presetThemeDoc('aurora');

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
  const next = messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          content: result.ok ? result.summary : result.message,
          status: result.ok ? 'complete' : 'failed',
          themeVersionId,
        }
      : message,
  );

  await db.builderConversation.update({
    where: { id: conversationId },
    data: { messages: next },
  });
}

export const aiThemeGenerate: JobDefinition<AiThemeJobPayload> = {
  name: AI_THEME_JOB_NAME,
  queue: QUEUES.ai,
  handler: (payload) => handler(payload),
};
