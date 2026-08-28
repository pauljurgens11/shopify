/**
 * The single place an error becomes an HTTP response, so SPEC §5's error shape
 * holds everywhere without each route remembering it.
 *
 * Owner: WS-A. Add a new error TYPE by extending ApiError, not by editing this.
 */
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.ts';

export default fp(
  async (app) => {
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof ApiError) {
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

      if ((error as { statusCode?: number }).statusCode === 429) {
        return reply.status(429).send({
          errors: [{ code: 'rate_limited', message: 'Too many requests. Slow down.' }],
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
