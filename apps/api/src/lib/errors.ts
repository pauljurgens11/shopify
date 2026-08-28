/**
 * Every non-2xx response in this API has the shape defined in SPEC §5.
 * Throw one of these; the error handler in plugins/error-handler.ts does the rest.
 */
import { ERROR_STATUS, type ErrorCode } from '@merchant/contracts/common';

export class ApiError extends Error {
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

export const badRequest = (m: string, field?: string) => new ApiError('invalid_request', m, field);
export const unauthorized = (m = 'Unauthorized') => new ApiError('unauthorized', m);
export const forbidden = (m = 'Forbidden') => new ApiError('forbidden', m);
export const notFound = (resource = 'Resource') =>
  new ApiError('not_found', `${resource} not found`);
export const conflict = (m: string, field?: string) => new ApiError('conflict', m, field);
