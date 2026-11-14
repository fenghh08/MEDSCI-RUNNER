import { sql } from '@/lib/db';
import { buildRunnerData as build } from '@/lib/runner-data.mjs';

/**
 * The website's copy of the object that game-data.js assigns to
 * window.RUNNER_DATA — with two deliberate differences:
 *
 *   - no `correctIndex` and no `explanation` on any question. Both arrive
 *     from /api/answer, one question at a time, after the player commits.
 *   - no `contributorName` / `contributorEmail`. Those are real email
 *     addresses and this payload is inlined into a public page.
 *
 * The assembly itself lives in lib/runner-data.mjs, shared with
 * scripts/export-game-data.mjs so the website and the offline export can
 * never drift apart. Everything specific to the website is the two flags
 * below.
 */
export type RunnerData = Record<string, unknown>;

export async function buildRunnerData(): Promise<RunnerData> {
  return build(sql, { includeAnswers: false, includeContributors: false });
}
