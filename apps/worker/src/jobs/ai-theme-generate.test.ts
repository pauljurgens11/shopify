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
  runThemeGeneration,
  type ThemeGenerator,
} from './ai-theme-generate.ts';

const CATALOG = {
  products: [
    { handle: 'alpine-merino-crewneck', title: 'Alpine Merino Crewneck' },
    { handle: 'gale-shell-jacket', title: 'Gale Shell Jacket' },
  ],
  collections: [
    { handle: 'featured', title: 'Featured' },
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
});

describe('runThemeGeneration', () => {
  const valid = presetThemeDoc('bloom');

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
