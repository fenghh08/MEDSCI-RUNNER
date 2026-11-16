// After `npm run build`: proves the files that live outside this app were
// traced into the routes that read them. A deployment missing one of these
// builds fine and then serves a 500, so this is checked rather than assumed.
//
//   npm run build && npm run check:trace
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = fileURLToPath(new URL('../.next/server/app/', import.meta.url));
const NEEDS = [
  ['route.js.nft.json', ['medsci-runner.html', 'lib/runner-bridge.js']],
  ['battle3d.js/route.js.nft.json', ['battle3d.js']],
  ['feedback.html/route.js.nft.json', ['feedback.html']],
  ['feedback-questions.js/route.js.nft.json', ['feedback-questions.js']],
  ['icons/[...path]/route.js.nft.json', ['icons/app-icon-512.png']],
  ['atlas/[...path]/route.js.nft.json', ['atlas/index.html']],
  ['vendor/[...path]/route.js.nft.json', ['vendor/three.module.min.js']],
  ['maps/[...path]/route.js.nft.json', ['maps/townhall.json', 'maps/usyd.json']],
];
let failed = 0;
for (const [manifest, wanted] of NEEDS) {
  const file = path.join(app, manifest);
  if (!existsSync(file)) { console.error(`missing trace manifest: ${manifest} (run npm run build first)`); failed++; continue; }
  const traced = JSON.parse(readFileSync(file, 'utf8')).files.map((f) => path.normalize(f));
  for (const w of wanted) {
    const ok = traced.some((f) => f.endsWith(path.normalize(w)));
    if (!ok) { console.error(`NOT TRACED  ${w}  into  ${manifest}`); failed++; }
  }
}
if (failed) { console.error(`\n${failed} file(s) would be missing from a deployment. Fix outputFileTracingIncludes in next.config.ts.`); process.exit(1); }
console.log('trace: every file the routes read from outside web/ is included in the build.');
