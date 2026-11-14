import { NextResponse, type NextRequest } from 'next/server';
import { requireRole, AuthError, type AuthedUser, type Role } from '@/lib/auth';

/**
 * Wraps an admin handler so that every route does the same three things in
 * the same order: establish who is asking, run, and turn a known failure into
 * the right status. No admin route reads a token or builds an error response
 * itself, so there is no route that can forget to check.
 *
 *   401  not signed in            403  signed in, not allowed
 *   404  the thing is gone        422  the content failed validation
 *   503  the server cannot verify sign-ins (no service account configured)
 */
export function adminRoute(
  minimum: Role,
  handler: (user: AuthedUser, request: NextRequest, body: Record<string, unknown>) => Promise<unknown>
) {
  return async (request: NextRequest) => {
    try {
      const user = await requireRole(request, minimum);
      let body: Record<string, unknown> = {};
      if (request.method !== 'GET') {
        try { body = (await request.json()) as Record<string, unknown>; }
        catch { return NextResponse.json({ error: 'The request was not valid JSON.' }, { status: 400 }); }
      }
      const result = await handler(user, request, body);
      return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
    } catch (err) {
      const e = err as { name?: string; status?: number; message?: string; errors?: string[] };
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (e.name === 'ValidationError') return NextResponse.json({ error: e.message, errors: e.errors ?? [] }, { status: 422 });
      if (e.name === 'ForbiddenError' || e.name === 'NotFoundError') {
        return NextResponse.json({ error: e.message }, { status: e.status ?? 400 });
      }
      console.error('[admin]', request.nextUrl.pathname, err);
      return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 });
    }
  };
}

export const param = (request: NextRequest, name: string) => request.nextUrl.searchParams.get(name);
