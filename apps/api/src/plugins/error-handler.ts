/**
 * The single place an error becomes an HTTP response, so SPEC §5's error shape
 * holds everywhere without each route remembering it.
 *
 * Owner: WS-A. Add a new error TYPE by extending ApiError, not by editing this.
 */
import type { ErrorCode } from '@merchant/contracts/common';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { isApiError } from '../lib/errors.ts';

/** The SPEC §5 code that fits each status Fastify raises on its own. */
const STATUS_CODE: Record<number, ErrorCode> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

export default fp(
  async (app) => {
    app.setErrorHandler((error, request, reply) => {
      if (isApiError(error)) {
        return reply.status(error.statusCode).send(error.toJSON());
      }

      // Zod failures become field-level validation errors, one per issue.
      const zodError =
        error instanceof ZodError
          ? error
          : (error as { cause?: unknown }).cause instanceof ZodError
            ? (error as { cause: ZodError }).cause
            : null;

      if (zodError) {
        return reply.status(400).send({
          errors: zodError.issues.map((issue) => ({
            code: 'invalid_request' as const,
            message: issue.message,
            field: issue.path.join('.') || undefined,
          })),
        });
      }

      // Fastify's own client errors — unsupported media type, body too large,
      // malformed JSON — carry a 4xx statusCode but are not ApiErrors. Without
      // this they would render as 500 `internal` and send the caller hunting
      // for a server bug that is actually a bad request.
      const status = (error as { statusCode?: number }).statusCode;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        const message = error instanceof Error ? error.message : 'Bad request.';
        return reply.status(status).send({
          errors: [{ code: STATUS_CODE[status] ?? 'invalid_request', message }],
        });
      }

      // Anything unrecognized is a bug. Log it fully, tell the client nothing.
      request.log.error({ err: error }, 'unhandled error');
      return reply.status(500).send({
        errors: [{ code: 'internal', message: 'Something went wrong.' }],
      });
    });

    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({
        errors: [{ code: 'not_found', message: 'Endpoint not found.' }],
      });
    });
  },
  { name: 'error-handler' },
);
