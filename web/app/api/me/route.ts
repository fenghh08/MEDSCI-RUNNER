import { NextResponse, type NextRequest } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Who am I, and what may I edit?
 *
 * The admin app calls this on load to decide what to show, and it is the
 * quickest way to check that sign-in and roles are wired up at all. It is also
 * the only route that exercises the auth gate on its own, so a 401/403/503
 * here means something specific:
 *
 *   401  no token, or one that does not verify
 *   403  verified, but the account has no email address
 *   503  the server has no FIREBASE_SERVICE_ACCOUNT_JSON, so it cannot verify
 *        anything -- it fails closed rather than trusting the client
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(user, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Anything else is the server's problem (most often the database). Say so
    // in words the admin page can show, and keep the detail in the logs.
    console.error('[me]', err);
    return NextResponse.json(
      { error: 'The server hit an error looking up your account: ' + (err instanceof Error ? err.message : String(err)).slice(0, 200) },
      { status: 500 });
  }
}
