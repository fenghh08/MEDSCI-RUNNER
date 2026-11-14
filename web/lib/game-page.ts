import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildRunnerData } from '@/lib/game-data';
import { DATA_SLOT, PATCHES } from '@/lib/game-patches.mjs';

/**
 * Serves ../medsci-runner.html as the website's game — the real file, not a
 * reimplementation, so every feature and every pixel is whatever that file
 * says it is.
 *
 * Three things are rewritten on the way out, and nothing else:
 *
 *   1. the <script src="game-data.js"> tag, replaced by the same object
 *      inlined, minus every correctIndex and explanation;
 *   2. the body of gradeAnswer(), which now asks the server whether the
 *      answer was right before the caller reads q.correctIndex;
 *   3. the body of gradeFunFact(), same reason.
 *
 * 2 and 3 are one-line functions in medsci-runner.html that exist only to be
 * patched here — the "grading seam". Earlier versions reached into the first
 * five lines of answerMCQ() and into the grenade mini-game's click handler
 * instead, which meant any edit anywhere near either took the live site down
 * with an anchor mismatch. The seam gives the patch somewhere small and
 * stable to land, and any new mode gets server grading just by calling the
 * same two functions.
 *
 * The file on disk is never modified. If any anchor below stops matching
 * exactly once — because the game changed — this throws instead of serving a
 * half-patched page, since the failure mode of guessing is shipping the
 * answer key to the browser. web/scripts/check-anchors.mjs runs the same
 * check from the command line, so a broken anchor shows up before deploy.
 */

const GAME_HTML = path.join(process.cwd(), '..', 'medsci-runner.html');

// The anchors themselves live in lib/game-patches.mjs, shared with
// scripts/check-anchors.mjs so the check and the deploy agree.

/** Safe to drop inside a <script> block: no `</script>`, no U+2028/2029. */
function inlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

let bridgeSource: string | null = null;
async function bridge(): Promise<string> {
  if (bridgeSource && process.env.NODE_ENV === 'production') return bridgeSource;
  bridgeSource = await readFile(path.join(process.cwd(), 'lib', 'runner-bridge.js'), 'utf8');
  return bridgeSource;
}

export async function renderGamePage(): Promise<string> {
  const [html, data, bridgeJs] = await Promise.all([
    readFile(GAME_HTML, 'utf8'),
    buildRunnerData(),
    bridge(),
  ]);

  const failures: string[] = [];
  const check = (name: string, find: string) => {
    const hits = html.split(find).length - 1;
    if (hits !== 1) failures.push(`${name}: expected 1 match, found ${hits}`);
  };

  check('game-data.js script tag', DATA_SLOT);
  for (const patch of PATCHES) check(patch.name, patch.find);

  if (failures.length) {
    throw new Error(
      'medsci-runner.html no longer matches what the web build expects, so it ' +
      'was not served. Fix the anchors in web/lib/game-page.ts:\n  - ' +
      failures.join('\n  - ')
    );
  }

  let out = html.replace(
    DATA_SLOT,
    `<script>window.RUNNER_DATA = ${inlineJson(data)};</script>\n<script>${bridgeJs}</script>`
  );
  for (const patch of PATCHES) out = out.replace(patch.find, patch.replace);
  return out;
}
