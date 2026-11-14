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

// Rebuilding the payload is eight queries over ~1,200 questions. Forty students
// opening the page together should not each pay for that, so the result is
// kept in memory and reused until content changes. Every admin write bumps the
// `content_version` setting in the same statement as the write itself, so one
// cheap read is enough to know whether the copy held here is still current --
// and an edit shows up on the very next page load, not after a timeout.
let cached: { version: string; data: RunnerData } | null = null;

export async function buildRunnerData(): Promise<RunnerData> {
  const rows = (await sql`select value from settings where key = 'content_version'`) as { value: unknown }[];
  const version = JSON.stringify(rows[0]?.value ?? 0);
  if (cached && cached.version === version) return cached.data;
  const data = await build(sql, { includeAnswers: false, includeContributors: false });
  cached = { version, data };
  return data;
}
