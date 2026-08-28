/**
 * Every non-2xx response in this API has the shape defined in SPEC §5.
 * Throw one of these; the error handler in plugins/error-handler.ts does the rest.
 */
import { ERROR_STATUS, type ErrorCode } from '@merchant/contracts/common';

/**
 * Cross-realm brand. `instanceof` is not reliable here: `@fastify/autoload`
 * pulls route files in with a plain dynamic import, so under Vitest the route
 * tree and the error handler can end up holding two copies of this module — and
 * every ApiError a route throws would render as a 500. A `Symbol.for` key is
 * the same symbol in both copies.
 */
const API_ERROR = Symbol.for('merchant.api-error');

export class ApiError extends Error {
  readonly [API_ERROR] = true;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get statusCode(): number {
    return ERROR_STATUS[this.code];
  }

  toJSON() {
    return { errors: [{ code: this.code, message: this.message, field: this.field }] };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<symbol, unknown>)[API_ERROR] === true
  );
}

export const badRequest = (m: string, field?: string) => new ApiError('invalid_request', m, field);
export const unauthorized = (m = 'Unauthorized') => new ApiError('unauthorized', m);
export const forbidden = (m = 'Forbidden') => new ApiError('forbidden', m);
export const notFound = (resource = 'Resource') =>
  new ApiError('not_found', `${resource} not found`);
export const conflict = (m: string, field?: string) => new ApiError('conflict', m, field);
export const rateLimited = (m = 'Too many requests. Slow down.') => new ApiError('rate_limited', m);
