import { NextResponse, type NextRequest } from 'next/server';
import { optionalUser } from '@/lib/auth';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

// One browser may send a handful a minute. Held in memory, so it resets on a
// cold start and is per-instance: a speed bump against a stuck button or a
// bored student, not a defence against anyone determined.
const recent = new Map<string, number[]>();
function tooMany(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 6;
}

/**
 * A player reporting a question or suggesting a fact. Open to everyone,
 * signed in or not -- the report button has to work for a student who never
 * made an account. It can only ever add a row to a review queue: nothing here
 * changes content, and a lecturer reads it before anything does.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'not valid JSON' }, { status: 400 }); }

  const who = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || String(body.sessionId ?? 'anon');
  if (tooMany(who)) return NextResponse.json({ error: 'Too many reports in a minute. Try again shortly.' }, { status: 429 });

  try {
    const user = await optionalUser(request);
    return NextResponse.json(await store.addSuggestion(user, body));
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === 'ValidationError') return NextResponse.json({ error: e.message }, { status: 422 });
    console.error('[suggestions]', err);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
}
