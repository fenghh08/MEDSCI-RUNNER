import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Opens the connection to Postgres before anyone needs it.
 *
 * The Neon HTTP driver makes a fresh HTTPS request per query, and the first
 * one from a cold process pays the whole TLS handshake — measured at ~3.8s
 * against this project in ap-southeast-2, versus 10–18ms once warm. Neon also
 * suspends an idle compute after five minutes, which costs a wake on top.
 *
 * The player spends several seconds reading a question before they answer, so
 * the bridge calls this the moment a question card opens. By the time they
 * click, the handshake is already done and /api/answer is a single warm round
 * trip. Nothing is returned that matters — this exists for its side effect.
 */
export async function GET() {
  const started = Date.now();
  try {
    await sql`select 1 as warm`;
  } catch {
    // A failed warm-up is not an error the player should ever see: the real
    // request will surface the problem if there is one.
    return NextResponse.json({ warm: false }, { headers: { 'cache-control': 'no-store' } });
  }
  return NextResponse.json(
    { warm: true, ms: Date.now() - started },
    { headers: { 'cache-control': 'no-store' } }
  );
}
