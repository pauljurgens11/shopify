/**
 * Themes & the AI builder (SPEC §12). Owner: WS-F.
 * Mounted at /admin/api/themes by the autoloader.
 *
 * The builder must stay useful with no ANTHROPIC_API_KEY (CLAUDE.md §9): every
 * route here works without one, and the chat says so rather than queueing a job
 * that can never succeed.
 */
import { hasAnthropicKey } from '@merchant/config/env';
import {
  applyPresetInput,
  builderConversationResponse,
  previewTokenResponse,
  sendBuilderMessageInput,
  THEME_PRESETS,
  type ThemePreset,
  themeVersionListResponse,
} from '@merchant/contracts/theme';
import { presetThemeDoc } from '@merchant/theme-engine/presets';
import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  appendMessages,
  getOrCreateConversation,
  makeMessage,
  parseMessages,
  replaceMessage,
} from '../../../services/themes/conversation.ts';
import { enqueueThemeGeneration } from '../../../services/themes/generation.ts';
import {
  PREVIEW_TOKEN_TTL_SECONDS,
  signPreviewToken,
} from '../../../services/themes/preview-token.ts';
import {
  createDraft,
  getVersion,
  publishVersion,
  restoreVersion,
  toDetail,
  toSummary,
} from '../../../services/themes/versions.ts';

const NO_KEY_REPLY =
  'The AI builder needs an ANTHROPIC_API_KEY on the server, and this store does not have one ' +
  'configured yet. You can still restyle the storefront right now: apply one of the built-in ' +
  'presets (Aurora, Monochrome or Bloom) and publish it.';

export default async function routes(app: FastifyInstance) {
  const builder = { preHandler: requirePermission('builder') };

  /* --------------------------------------------------------------- versions */

  app.get('/versions', builder, async (request) => {
    const rows = await request.db.themeVersion.findMany({ orderBy: { createdAt: 'desc' } });
    return themeVersionListResponse.parse({ data: rows.map(toSummary) });
  });

  app.get<{ Params: { id: string } }>('/versions/:id', builder, async (request) => {
    return toDetail(await getVersion(request.db, request.params.id));
  });

  app.post<{ Params: { id: string } }>('/versions/:id/publish', builder, async (request) =>
    toSummary(await publishVersion(request.db, request.params.id)),
  );

  app.post<{ Params: { id: string } }>('/versions/:id/restore', builder, async (request, reply) => {
    const created = await restoreVersion(request.db, request.shopId as string, request.params.id);
    return reply.status(201).send(toDetail(created));
  });

  /* ---------------------------------------------------------------- presets */

  app.post<{ Params: { name: string } }>(
    '/presets/:name/apply',
    builder,
    async (request, reply) => {
      const parsed = applyPresetInput.safeParse({ preset: request.params.name });
      if (!parsed.success) {
        throw badRequest(
          `Unknown preset "${request.params.name}". Available: ${THEME_PRESETS.join(', ')}.`,
          'preset',
        );
      }
      const preset = parsed.data.preset as ThemePreset;
      const created = await createDraft(request.db, request.shopId as string, {
        themeJson: presetThemeDoc(preset),
        createdByMessage: `Applied the ${preset} preset`,
      });
      return reply.status(201).send(toDetail(created));
    },
  );

  /* ---------------------------------------------------------- preview token */

  app.get<{ Querystring: { versionId?: string } }>('/preview-token', builder, async (request) => {
    const versionId = request.query.versionId;
    if (!versionId) throw badRequest('versionId is required.', 'versionId');
    // Prove it exists AND belongs to this shop before signing anything.
    await getVersion(request.db, versionId);
    return previewTokenResponse.parse({
      token: signPreviewToken(request.shopId as string, versionId),
      expiresAt: new Date(Date.now() + PREVIEW_TOKEN_TTL_SECONDS * 1000).toISOString(),
    });
  });

  /* ----------------------------------------------------------- conversation */

  app.get('/conversation', builder, async (request) => {
    const conversation = await getOrCreateConversation(request.db, request.shopId as string);
    return builderConversationResponse.parse({
      id: conversation.id,
      messages: parseMessages(conversation.messages),
    });
  });

  app.post('/conversation', builder, async (request, reply) => {
    const input = sendBuilderMessageInput.parse(request.body ?? {});
    const conversation = await getOrCreateConversation(request.db, request.shopId as string);
    const userMessage = makeMessage('user', input.message);

    if (!hasAnthropicKey()) {
      const assistant = makeMessage('assistant', NO_KEY_REPLY);
      await appendMessages(request.db, conversation.id, [userMessage, assistant]);
      return reply.status(202).send({ jobId: null, message: assistant });
    }

    const pending = makeMessage('assistant', '', { status: 'pending' });
    await appendMessages(request.db, conversation.id, [userMessage, pending]);

    try {
      const jobId = await enqueueThemeGeneration({
        shopId: request.shopId as string,
        conversationId: conversation.id,
        messageId: pending.id,
        prompt: input.message,
      });
      return reply.status(202).send({ jobId, message: pending });
    } catch (error) {
      // Redis is down. Resolve the bubble now — a pending message that never
      // completes leaves the builder spinning forever.
      request.log.error({ err: error }, 'ai-theme: could not queue generation');
      const failed = makeMessage(
        'assistant',
        "Sorry — I couldn't reach the design queue just now. Please try again in a moment.",
        { status: 'failed' },
      );
      await replaceMessage(request.db, conversation.id, pending.id, failed);
      return reply.status(202).send({ jobId: null, message: failed });
    }
  });
}
