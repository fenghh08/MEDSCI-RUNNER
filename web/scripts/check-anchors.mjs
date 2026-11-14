// Fails if the website build could no longer patch ../../medsci-runner.html.
//
//   npm run check:anchors      (also runs automatically before dev and build)
//
// lib/game-page.ts rewrites three exact strings in the game file on its way to
// the browser, and refuses to serve a half-patched page if any of them stops
// matching exactly once. That refusal is correct but late: it surfaces as a
// 500 on the live site. This is the same check, early enough to fix.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ALL_ANCHORS } from '../lib/game-patches.mjs';

const GAME_HTML = fileURLToPath(new URL('../../medsci-runner.html', import.meta.url));
const html = await readFile(GAME_HTML, 'utf8');

const failures = [];
for (const { name, find } of ALL_ANCHORS) {
  const hits = html.split(find).length - 1;
  if (hits !== 1) failures.push({ name, hits, find });
}

if (!failures.length) {
  console.log(`medsci-runner.html: all ${ALL_ANCHORS.length} web-build anchors match exactly once.`);
  process.exit(0);
}

console.error('medsci-runner.html no longer matches what the web build expects.\n');
for (const { name, hits, find } of failures) {
  console.error(`  ${name}`);
  console.error(`    expected 1 match, found ${hits}`);
  console.error(`    looking for: ${find.trim().slice(0, 90)}${find.trim().length > 90 ? '…' : ''}\n`);
}
console.error('Either restore the line in medsci-runner.html or update the anchor in');
console.error('web/lib/game-patches.mjs. Do not leave it broken: the website serves an');
console.error('error page rather than risk shipping the answer key.\n');
process.exit(1);
