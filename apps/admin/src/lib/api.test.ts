/**
 * The SPEC §5 error envelope, on the client side.
 *
 * Every workstream's admin pages surface errors through this one function, so a
 * bug here shows up as an empty toast on eight different screens. The parsing
 * is pure; the fetch around it is not tested (SPEC §14 forbids mock-heavy glue
 * tests).
 */
import { describe, expect, it } from 'vitest';
import { ApiError, apiPath, toApiError } from './api.ts';

describe('toApiError', () => {
  it('reads code, message and field out of the envelope', () => {
    const error = toApiError(409, {
      errors: [
        { code: 'conflict', message: 'That store URL is already taken.', field: 'shopSlug' },
      ],
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('conflict');
    expect(error.message).toBe('That store URL is already taken.');
    expect(error.field).toBe('shopSlug');
  });

  it('keeps every issue, so a form can mark more than one field', () => {
    const error = toApiError(400, {
      errors: [
        { code: 'invalid_request', message: 'Required', field: 'email' },
        { code: 'invalid_request', message: 'Too short', field: 'password' },
      ],
    });

    expect(error.errors).toHaveLength(2);
    expect(error.fieldErrors).toEqual({ email: 'Required', password: 'Too short' });
    // The first issue is the headline, so a bare `error.message` still reads well.
    expect(error.message).toBe('Required');
  });

  it('degrades to a usable message when the body is not the envelope', () => {
    // A proxy 502, an HTML error page, a truncated response: all real, and none
    // of them may produce `undefined` in a toast.
    for (const body of [null, undefined, '<html>502</html>', {}, { errors: [] }]) {
      const error = toApiError(502, body);
      expect(error.status).toBe(502);
      expect(error.code).toBe('internal');
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.message).not.toContain('undefined');
    }
  });

  it('maps an unauthenticated response to a code callers can branch on', () => {
    // The api client redirects to /login on this, so it has to survive a body
    // that did not arrive.
    expect(toApiError(401, null).code).toBe('unauthorized');
    expect(toApiError(404, null).code).toBe('not_found');
  });

  it('does not trust a code the server did not actually send', () => {
    const error = toApiError(400, { errors: [{ code: 'made_up', message: 'nope' }] });
    expect(error.code).toBe('invalid_request');
  });
});

describe('apiPath', () => {
  it('joins onto the base url without doubling or dropping a slash', () => {
    expect(apiPath('/admin/api/products', 'http://api.lvh.me:3001')).toBe(
      'http://api.lvh.me:3001/admin/api/products',
    );
    expect(apiPath('/auth/me', 'http://api.lvh.me:3001/')).toBe('http://api.lvh.me:3001/auth/me');
  });

  it('carries a query string through untouched', () => {
    expect(apiPath('/admin/api/products?query=tee&limit=5', 'http://x')).toBe(
      'http://x/admin/api/products?query=tee&limit=5',
    );
  });
});
