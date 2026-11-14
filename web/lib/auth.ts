import type { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * The one place an identity is established. No route handler reads a token
 * itself, and no role ever comes from the client.
 *
 * Firebase Auth stays the identity provider -- the game already signs people
 * in with Google, on the web and natively in the phone app. The browser sends
 * that ID token as `Authorization: Bearer <token>`; this verifies it against
 * Google's public keys with the Admin SDK, then looks the uid up in `users`
 * for a role. A token proves who someone is. It never says what they may do.
 *
 * Replaces the dev tool's plaintext DEVELOPER_CODE / ADMIN_CODE and the
 * Firebase RTDB nodes they gated, both of which were readable by anyone who
 * opened the page source and were documented as "a deterrent, not security".
 */

export type Role = 'student' | 'lecturer' | 'admin';

export type AuthedUser = {
  uid: string;
  email: string;
  displayName: string | null;
  role: Role;
  /** Course codes a lecturer may edit. Empty for admins, who are unscoped. */
  courses: string[];
};

/** Thrown with the status a route should return. */
export class AuthError extends Error {
  constructor(readonly status: 401 | 403 | 503, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const RANK: Record<Role, number> = { student: 0, lecturer: 1, admin: 2 };

// --------------------------------------------------------------- admin SDK
// Loaded lazily and only once. Without a service account the app still runs --
// everything a player does is unauthenticated by design -- but every
// authenticated route fails closed with 503 rather than waving people through.
let verifier: Promise<(token: string) => Promise<{ uid: string; email?: string; name?: string }>> | null = null;

function getVerifier() {
  verifier ??= (async () => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      throw new AuthError(503, 'FIREBASE_SERVICE_ACCOUNT_JSON is not set, so no token can be verified');
    }
    let credentials: Record<string, string>;
    try {
      // Accept both the raw JSON and a base64 copy of it: a private key full
      // of newlines is awkward to paste into some dashboards.
      const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      credentials = JSON.parse(text);
    } catch {
      throw new AuthError(503, 'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (or base64 of it)');
    }

    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(credentials as never) });
    const auth = getAuth(app);
    return (token: string) => auth.verifyIdToken(token, true);
  })();
  return verifier;
}

function bearer(request: NextRequest): string {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) throw new AuthError(401, 'sign in first: no bearer token');
  return match[1];
}

// ----------------------------------------------------------------- the gate

/**
 * Verifies the token and returns who it belongs to. A verified person with no
 * `users` row is a student: signing in is not a request for permission, and
 * the game signs everyone in for cross-device sync.
 */
export async function requireUser(request: NextRequest): Promise<AuthedUser> {
  const verify = await getVerifier();

  let decoded: { uid: string; email?: string; name?: string };
  try {
    decoded = await verify(bearer(request));
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(401, 'that sign-in has expired or is not valid');
  }

  const email = decoded.email?.toLowerCase();
  if (!email) throw new AuthError(403, 'that account has no email address');

  // Claim a row the access migration created before this person had ever
  // signed in. Those carry a placeholder uid of `email:<address>`, because a
  // Firebase uid does not exist until the first sign-in -- and granting
  // someone access should not require them to log in first. The real uid
  // replaces the placeholder here, keeping the role and any course grants.
  await sql`
    update users set uid = ${decoded.uid}, last_seen_at = now()
     where email = ${email} and uid = ${'email:' + email}`;

  // Then the ordinary upsert. Roles are never written here: a role is granted
  // deliberately, through the admin tooling, not by signing in.
  const rows = (await sql`
    insert into users (uid, email, display_name, last_seen_at)
    values (${decoded.uid}, ${email}, ${decoded.name ?? null}, now())
    on conflict (uid) do update set
      email = excluded.email,
      display_name = coalesce(excluded.display_name, users.display_name),
      last_seen_at = now()
    returning uid, email, display_name, role`) as
    { uid: string; email: string; display_name: string | null; role: Role }[];

  const user = rows[0];
  const courses = user.role === 'lecturer'
    ? ((await sql`select course_code from user_courses where uid = ${user.uid}`) as { course_code: string }[])
        .map((r) => r.course_code)
    : [];

  return { uid: user.uid, email: user.email, displayName: user.display_name, role: user.role, courses };
}

/** requireUser, plus a minimum role. */
export async function requireRole(request: NextRequest, minimum: Role): Promise<AuthedUser> {
  const user = await requireUser(request);
  if (RANK[user.role] < RANK[minimum]) {
    throw new AuthError(403, `this needs ${minimum} access; you have ${user.role}`);
  }
  return user;
}

/** requireRole('lecturer'), plus the right to touch this particular course. */
export async function requireCourse(request: NextRequest, courseCode: string): Promise<AuthedUser> {
  const user = await requireRole(request, 'lecturer');
  if (user.role === 'admin') return user;          // unscoped on purpose
  if (!user.courses.includes(courseCode)) {
    throw new AuthError(403, `you are not assigned to ${courseCode}`);
  }
  return user;
}

/** Who this is, or null -- for routes that behave differently when signed in. */
export async function optionalUser(request: NextRequest): Promise<AuthedUser | null> {
  try {
    return await requireUser(request);
  } catch {
    return null;
  }
}
