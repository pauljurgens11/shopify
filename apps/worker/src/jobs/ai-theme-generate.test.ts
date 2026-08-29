/**
 * The AI builder loop (SPEC §12). Owner: WS-F.
 *
 * The model call itself is not tested — that would be a network mock, which
 * SPEC §14 forbids. What IS tested is everything around it: the prompt the
 * model receives, and the retry-then-apologize behaviour that decides whether a
 * bad generation shows the merchant an apology or throws a job into the DLQ.
 */
import { presetThemeDoc } from '@merchant/theme-engine/presets';
import { describe, expect, it, vi } from 'vitest';
import {
  buildSystemPrompt,
  buildUserMessage,
  collectReferencedHandles,
  runThemeGeneration,
  type ThemeGenerator,
} from './ai-theme-generate.ts';

const CATALOG = {
  products: [
    {
      handle: 'alpine-merino-crewneck',
      title: 'Alpine Merino Crewneck',
      imageUrl: 'https://assets.example.dev/alpine-merino-crewneck.jpg',
    },
    { handle: 'gale-shell-jacket', title: 'Gale Shell Jacket' },
  ],
  collections: [
    {
      handle: 'featured',
      title: 'Featured',
      imageUrl: 'https://assets.example.dev/featured.jpg',
    },
    { handle: 'outerwear', title: 'Outerwear' },
  ],
};

const CONTEXT = {
  shopName: 'Aurora Supply Co.',
  currentDoc: presetThemeDoc('aurora'),
  catalog: CATALOG,
  history: [
    { role: 'user' as const, content: 'Warm it up' },
    { role: 'assistant' as const, content: 'Warmed the palette.' },
  ],
  prompt: 'Make it feel like a Kyoto coffee shop',
};

describe('prompt assembly', () => {
  it('names every section type, so the model builds from the real registry', () => {
    const system = buildSystemPrompt();
    for (const type of ['hero', 'product-detail', 'collection-page', 'cart-page', 'footer']) {
      expect(system).toContain(type);
    }
  });

  it('carries the shop’s real handles, which is what stops invented ones', () => {
    const message = buildUserMessage(CONTEXT);
    expect(message).toContain('alpine-merino-crewneck');
    expect(message).toContain('featured');
    expect(message).toContain('outerwear');
  });

  it('includes the current document and the conversation so far', () => {
    const message = buildUserMessage(CONTEXT);
    expect(message).toContain('Make it feel like a Kyoto coffee shop');
    expect(message).toContain('Warm it up');
    expect(message).toContain(CONTEXT.currentDoc.tokens.colorPrimary);
  });

  it('states the handle rule explicitly rather than hoping', () => {
    expect(buildSystemPrompt().toLowerCase()).toContain('do not invent');
  });

  /**
   * A fresh shop's current doc references handles it does not have (the aurora
   * preset points at "featured"). Unless the prompt says so, the model keeps
   * them and validation rejects every attempt.
   */
  it('warns about current-doc handles that do not exist in this shop', () => {
    const message = buildUserMessage({
      ...CONTEXT,
      missingHandles: { products: ['ghost-product'], collections: ['featured'] },
    });
    expect(message).toContain('DO NOT exist');
    expect(message).toContain('collection handle "featured"');
    expect(message).toContain('product handle "ghost-product"');
  });

  it('omits the missing-handle warning when nothing is missing', () => {
    expect(buildUserMessage(CONTEXT)).not.toContain('DO NOT exist');
  });
});

describe('collectReferencedHandles', () => {
  it('gathers every product and collection handle the doc points at', () => {
    const referenced = collectReferencedHandles(presetThemeDoc('aurora'));
    expect(referenced.collections).toContain('featured');
    expect(Array.isArray(referenced.products)).toBe(true);
  });
});

describe('image rules', () => {
  it('puts the shop’s real photography in the prompt as the only legal inventory', () => {
    const message = buildUserMessage(CONTEXT);
    expect(message).toContain('Image library');
    expect(message).toContain('https://assets.example.dev/alpine-merino-crewneck.jpg');
    expect(message).toContain('https://assets.example.dev/featured.jpg');
  });

  it('rejects an invented image URL the way it rejects an invented handle', async () => {
    const hallucinated = presetThemeDoc('aurora');
    const hero = hallucinated.pages.home.find((s) => s.type === 'hero');
    if (hero?.type === 'hero') {
      hero.settings.image = 'https://images.unsplash.com/photo-not-a-real-id?w=2400';
    }

    const generate = vi
      .fn<ThemeGenerator>()
      .mockResolvedValueOnce({ doc: hallucinated, summary: 'first' })
      .mockResolvedValueOnce({ doc: presetThemeDoc('aurora'), summary: 'second' });

    const result = await runThemeGeneration(CONTEXT, generate);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0]?.retryFeedback).toContain('photo-not-a-real-id');
    expect(result.ok).toBe(true);
  });

  it('accepts a URL the merchant pasted into the chat', async () => {
    const doc = presetThemeDoc('aurora');
    const hero = doc.pages.home.find((s) => s.type === 'hero');
    if (hero?.type === 'hero') hero.settings.image = 'https://cdn.example.dev/my-banner.jpg';

    const generate = vi.fn<ThemeGenerator>().mockResolvedValue({ doc, summary: 'Done.' });
    const result = await runThemeGeneration(
      { ...CONTEXT, prompt: 'Use my banner https://cdn.example.dev/my-banner.jpg as the hero' },
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });
});

describe('runThemeGeneration', () => {
  // The current doc's own preset: its images are already on screen, so they are
  // in the allowed set — a candidate carrying another preset's photography
  // would now (correctly) be rejected as images from nowhere.
  const valid = presetThemeDoc('aurora');

  it('accepts a valid document on the first attempt', async () => {
    const generate = vi.fn<ThemeGenerator>().mockResolvedValue({ doc: valid, summary: 'Done.' });
    const result = await runThemeGeneration(CONTEXT, generate);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.tokens).toEqual(valid.tokens);
  });

  /**
   * One retry, with the validation errors fed back — the single most valuable
   * thing in this file, because a model that omits `product-detail` produces a
   * document that parses and then renders an empty product page.
   */
  it('retries once with the validation errors when the document is invalid', async () => {
    // A product page with no `product-detail` parses fine and renders empty —
    // exactly the failure the retry exists to catch.
    const missingCore = presetThemeDoc('aurora');
    missingCore.pages.product = missingCore.pages.product.filter(
      (section) => section.type !== 'product-detail',
    );

    const generate = vi
      .fn<ThemeGenerator>()
      .mockResolvedValueOnce({ doc: missingCore, summary: 'first' })
      .mockResolvedValueOnce({ doc: valid, summary: 'second' });

    const result = await runThemeGeneration(CONTEXT, generate);

    expect(generate).toHaveBeenCalledTimes(2);
    const retryInput = generate.mock.calls[1]?.[0];
    expect(retryInput?.retryFeedback).toContain('product-detail');
    expect(result.ok).toBe(true);
  });

  it('apologizes after a second failure instead of throwing', async () => {
    const broken = { version: 1, nope: true } as unknown as typeof valid;
    const generate = vi.fn<ThemeGenerator>().mockResolvedValue({ doc: broken, summary: 'x' });

    const result = await runThemeGeneration(CONTEXT, generate);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.toLowerCase()).toContain('sorry');
  });

  it('apologizes rather than throwing when the model call itself fails', async () => {
    const generate = vi.fn<ThemeGenerator>().mockRejectedValue(new Error('529 overloaded'));
    const result = await runThemeGeneration(CONTEXT, generate);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.toLowerCase()).toContain('sorry');
  });

  /**
   * The prompt catalog is truncated (60/40); the injected resolver is the DB.
   * A real-but-old handle outside the catalog must NOT burn the retry.
   */
  it('trusts the injected handle resolver over the prompt catalog', async () => {
    const doc = presetThemeDoc('aurora');
    const hero = doc.pages.home.find((s) => s.type === 'featured-collection');
    if (hero?.type === 'featured-collection') hero.settings.collectionHandle = 'archive-classics';

    const generate = vi.fn<ThemeGenerator>().mockResolvedValue({ doc, summary: 'Done.' });
    const result = await runThemeGeneration(
      {
        ...CONTEXT,
        // Every referenced handle "exists", catalog notwithstanding.
        resolveHandles: async (referenced) => ({
          products: new Set(referenced.products),
          collections: new Set(referenced.collections),
        }),
      },
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it('rejects a document that references a collection the shop does not have', async () => {
    const invented = presetThemeDoc('aurora');
    const hero = invented.pages.home.find((s) => s.type === 'featured-collection');
    if (hero?.type === 'featured-collection') hero.settings.collectionHandle = 'kyoto-exclusives';

    const generate = vi
      .fn<ThemeGenerator>()
      .mockResolvedValueOnce({ doc: invented, summary: 'first' })
      .mockResolvedValueOnce({ doc: valid, summary: 'second' });

    await runThemeGeneration(CONTEXT, generate);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0]?.retryFeedback).toContain('kyoto-exclusives');
  });
});
