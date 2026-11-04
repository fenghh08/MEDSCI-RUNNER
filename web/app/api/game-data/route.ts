import { NextResponse } from 'next/server';
import { buildRunnerData } from '@/lib/game-data';

export const dynamic = 'force-dynamic';

/**
 * The whole content payload, in the shape medsci-runner.html expects, minus
 * every correctIndex and explanation. Served here as JSON for anything that
 * wants it; the game page itself gets the same object inlined, so the game's
 * synchronous `window.RUNNER_DATA` read at boot still works unchanged.
 */
export async function GET() {
  return NextResponse.json(await buildRunnerData());
}
