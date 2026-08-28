/**
 * Themes API + preview tokens (SPEC §12). Owner: WS-F.
 *
 * The invariants worth a test here are the ones a mistake makes invisible: a
 * shop must have exactly one published version, a preview token must not open a
 * draft to the public storefront, and the builder must stay usable with no
 * ANTHROPIC_API_KEY (CLAUDE.md §9 — the demo never breaks).
 */

import { themeDocSchema, validateThemeDoc } from '@merchant/contracts/theme';
import { dbAdmin } from '@merchant/db/client';
import { presetThemeDoc } from '@merchant/theme-engine/presets';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signPreviewToken, verifyPreviewToken } from '../src/services/themes/preview-token.ts';
import {
  buildTestApp,
  createTestShop,
  deleteTestShops,
  sessionCookie,
  type TestShop,
} from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let other: TestShop;
let cookie: string;

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  other = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
});

afterAll(async () => {
  // ThemeVersion/BuilderConversation carry a shopId but no FK, so nothing
  // cascades them — a leaked row would make the next run's "exactly one
  // published version" assertion fail for the wrong reason.
  const where = { shopId: { in: [shop.shopId, other.shopId] } };
  await dbAdmin.themeVersion.deleteMany({ where });
  await dbAdmin.builderConversation.deleteMany({ where });
  await deleteTestShops([shop.shopId, other.shopId]);
  await app.close();
});

const admin = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
  app.inject({
    method,
    url,
    headers: { cookie, 'x-requested-with': 'fetch' },
    ...(payload === undefined ? {} : { payload }),
  });

describe('preview tokens', () => {
  it('round-trips the shop and version it was signed for', () => {
    const token = signPreviewToken(shop.shopId, 'thm_test', 300);
    expect(verifyPreviewToken(token)).toEqual({
      shopId: shop.shopId,
      themeVersionId: 'thm_test',
    });
  });

  it('rejects a tampered payload', () => {
    const token = signPreviewToken(shop.shopId, 'thm_test', 300);
    const [payload, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ s: shop.shopId, v: 'thm_someone_elses', e: Date.now() + 60_000 }),
    ).toString('base64url');
    expect(payload).toBeDefined();
    expect(verifyPreviewToken(`${forged}.${signature}`)).toBeNull();
  });

  it('rejects an expired token', () => {
    expect(verifyPreviewToken(signPreviewToken(shop.shopId, 'thm_test', -1))).toBeNull();
  });

  it('rejects garbage instead of throwing', () => {
    expect(verifyPreviewToken('not-a-token')).toBeNull();
    expect(verifyPreviewToken('')).toBeNull();
  });
});

describe('presets', () => {
  it('applies a preset as a new draft', async () => {
    const response = await admin('POST', '/admin/api/themes/presets/aurora/apply');
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.status).toBe('draft');
    // Whatever we store, the storefront renderer trusts completely.
    expect(validateThemeDoc(themeDocSchema.parse(body.themeJson))).toEqual([]);
  });

  it('refuses a preset name that does not exist', async () => {
    const response = await admin('POST', '/admin/api/themes/presets/kyoto/apply');
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].code).toBe('invalid_request');
  });
});

describe('publish', () => {
  it('leaves exactly one published version, whatever the history looks like', async () => {
    const first = (await admin('POST', '/admin/api/themes/presets/aurora/apply')).json();
    const second = (await admin('POST', '/admin/api/themes/presets/bloom/apply')).json();

    expect((await admin('POST', `/admin/api/themes/versions/${first.id}/publish`)).statusCode).toBe(
      200,
    );
    expect(
      (await admin('POST', `/admin/api/themes/versions/${second.id}/publish`)).statusCode,
    ).toBe(200);

    const published = await dbAdmin.themeVersion.findMany({
      where: { shopId: shop.shopId, status: 'published' },
    });
    expect(published).toHaveLength(1);
    expect(published[0]?.id).toBe(second.id);
    expect(published[0]?.publishedAt).not.toBeNull();
  });

  /**
   * The publish transaction demotes "every other published version" — if the
   * tenant extension did not reach inside `$transaction`, that updateMany would
   * unpublish every other SHOP's live theme. CLAUDE.md §6: the unforgivable bug.
   */
  it('never touches another shop’s published version', async () => {
    const theirs = await dbAdmin.themeVersion.create({
      data: {
        id: `thm_${'1'.repeat(26)}`,
        shopId: other.shopId,
        themeJson: presetThemeDoc('monochrome'),
        status: 'published',
        publishedAt: new Date(),
      },
    });

    const mine = (await admin('POST', '/admin/api/themes/presets/aurora/apply')).json();
    expect((await admin('POST', `/admin/api/themes/versions/${mine.id}/publish`)).statusCode).toBe(
      200,
    );

    const after = await dbAdmin.themeVersion.findUnique({ where: { id: theirs.id } });
    expect(after?.status).toBe('published');
    expect(after?.publishedAt).not.toBeNull();
  });

  it('404s on a version belonging to another shop', async () => {
    const theirs = await dbAdmin.themeVersion.create({
      data: {
        id: `thm_${'0'.repeat(26)}`,
        shopId: other.shopId,
        themeJson: presetThemeDoc('monochrome'),
      },
    });
    const response = await admin('POST', `/admin/api/themes/versions/${theirs.id}/publish`);
    expect(response.statusCode).toBe(404);
  });
});

describe('versions', () => {
  it('lists this shop only, newest first, without the document', async () => {
    const response = await admin('GET', '/admin/api/themes/versions');
    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).not.toHaveProperty('themeJson');

    const ids = new Set(data.map((v: { id: string }) => v.id));
    const theirs = await dbAdmin.themeVersion.findFirst({ where: { shopId: other.shopId } });
    if (theirs) expect(ids.has(theirs.id)).toBe(false);
  });

  it('restores an old version as a new draft, leaving the original alone', async () => {
    const source = (await admin('POST', '/admin/api/themes/presets/monochrome/apply')).json();
    const response = await admin('POST', `/admin/api/themes/versions/${source.id}/restore`);
    expect(response.statusCode).toBe(201);

    const restored = response.json();
    expect(restored.id).not.toBe(source.id);
    expect(restored.status).toBe('draft');
    expect(restored.themeJson).toEqual(source.themeJson);

    const original = await dbAdmin.themeVersion.findUnique({ where: { id: source.id } });
    expect(original?.status).toBe('draft');
  });

  it('issues a preview token bound to the version', async () => {
    const version = (await admin('POST', '/admin/api/themes/presets/aurora/apply')).json();
    const response = await admin('GET', `/admin/api/themes/preview-token?versionId=${version.id}`);
    expect(response.statusCode).toBe(200);

    const { token, expiresAt } = response.json();
    expect(verifyPreviewToken(token)).toEqual({
      shopId: shop.shopId,
      themeVersionId: version.id,
    });
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('builder conversation', () => {
  it('starts empty and appends the user message', async () => {
    const before = await admin('GET', '/admin/api/themes/conversation');
    expect(before.statusCode).toBe(200);
    expect(before.json().messages).toEqual([]);

    const response = await admin('POST', '/admin/api/themes/conversation', {
      message: 'Make it feel like a Kyoto coffee shop',
    });
    expect(response.statusCode).toBe(202);

    const after = (await admin('GET', '/admin/api/themes/conversation')).json();
    expect(after.messages[0]).toMatchObject({
      role: 'user',
      content: 'Make it feel like a Kyoto coffee shop',
    });
  });

  /**
   * The no-key path is the one the demo actually runs on. It must answer in the
   * chat and point at presets rather than queue a job that can never succeed.
   */
  it('explains itself instead of queueing when ANTHROPIC_API_KEY is unset', async () => {
    expect(process.env.ANTHROPIC_API_KEY ?? '').toBe('');

    const response = await admin('POST', '/admin/api/themes/conversation', {
      message: 'Warm it up',
    });
    expect(response.statusCode).toBe(202);
    expect(response.json().jobId).toBeNull();

    const { messages } = (await admin('GET', '/admin/api/themes/conversation')).json();
    const assistant = messages.filter((m: { role: string }) => m.role === 'assistant').at(-1);
    expect(assistant.status).toBe('complete');
    expect(assistant.content).toMatch(/ANTHROPIC_API_KEY/);
    expect(assistant.content.toLowerCase()).toContain('preset');
  });

  it('rejects an empty message', async () => {
    const response = await admin('POST', '/admin/api/themes/conversation', { message: '' });
    expect(response.statusCode).toBe(400);
  });
});
