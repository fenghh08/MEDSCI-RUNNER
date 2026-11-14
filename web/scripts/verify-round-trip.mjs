// Proves the database can rebuild game-data.js without losing anything.
//
//   npm run db:verify
//
// Exports the database to a scratch file, loads both it and the committed
// ../../game-data.js, and deep-compares the parsed objects -- not the text,
// because key order and formatting differ and neither matters to the game.
//
// This is the test that makes the Postgres-as-source-of-truth switch
// reversible. If it passes, the file can be regenerated at any time; if it
// fails, something in game-data.js has no home in the schema and would be
// erased the first time anyone ran db:export.
//
// Three differences are expected, and the script says so rather than hiding
// them. Everything else is a real failure.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadGameData } from './load-game-data.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// ------------------------------------------------------- expected differences
//
// 1. game-data.js defines q-metabolism-3jk7 twice, in two different MEDS3002
//    items. `questions.qid` is unique, so the import keeps one. The file has
//    1175 questions; the database has 1174.
//
// 2. Defaults the import applies and the export writes back explicitly. The
//    game already treats the absent and present forms identically -- an item
//    with no `course` is shown under its theme's course, and
//    SCORING_AND_LIFE.md records that an untagged question counts as medium --
//    so these are normalisations, not changes. Both sides get them before the
//    comparison, so a real divergence still shows up.
const DUPLICATE_QID = 'q-metabolism-3jk7';

/** Apply the import's defaults to a RUNNER_DATA graph, in place. */
function normalise(data) {
  for (const [code, theme] of Object.entries(data.THEMES ?? {})) {
    for (const topic of Object.values(theme.topics ?? {})) {
      for (const item of Object.values(topic.items ?? {})) {
        item.course ??= code;                 // items default to their theme's course
        item.images ??= [];
        item.funFacts ??= [];
        item.activeRecall ??= [];
        item.refs ??= [];
        item.hashtags ??= [];
        item.description ??= '';
        item.contributorName ??= null;
        item.contributorEmail ??= null;
        if (Array.isArray(item.notes) && !item.notes.length) delete item.notes;
        if (Array.isArray(item.saq) && !item.saq.length) delete item.saq;
        item.questions ??= [];
        for (const q of item.questions) {
          q.difficulty ??= 'medium';          // untagged questions count as medium
          q.hashtags ??= [];
          q.explanation ??= '';
          q.contributorName ??= null;
          q.contributorEmail ??= null;
        }
      }
    }
  }
  return data;
}

/** Every difference between two values, as `path: a != b` lines. */
function diff(a, b, path = '', out = [], limit = 40) {
  if (out.length >= limit) return out;
  if (a === b) return out;

  const aObj = a && typeof a === 'object';
  const bObj = b && typeof b === 'object';
  if (!aObj || !bObj) {
    out.push(`${path || '(root)'}\n    file: ${JSON.stringify(a)}\n    db:   ${JSON.stringify(b)}`);
    return out;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    out.push(`${path}: array/object mismatch`);
    return out;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push(`${path}.length  file: ${a.length}  db: ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i}]`, out, limit);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in a)) { out.push(`${path}.${k}  missing in file, db has ${JSON.stringify(b[k])?.slice(0, 80)}`); continue; }
    if (!(k in b)) { out.push(`${path}.${k}  missing in db, file has ${JSON.stringify(a[k])?.slice(0, 80)}`); continue; }
    diff(a[k], b[k], `${path}.${k}`, out, limit);
  }
  return out;
}

/** Drop every copy of the known duplicate qid, from both sides. */
function dropDuplicate(data) {
  let dropped = 0;
  for (const theme of Object.values(data.THEMES ?? {})) {
    for (const topic of Object.values(theme.topics ?? {})) {
      for (const item of Object.values(topic.items ?? {})) {
        const before = item.questions?.length ?? 0;
        if (before) item.questions = item.questions.filter((q) => q.id !== DUPLICATE_QID);
        dropped += before - item.questions.length;
      }
    }
  }
  return dropped;
}

// --------------------------------------------------------------------- run
const scratch = join(mkdtempSync(join(tmpdir(), 'gdverify-')), 'game-data.js');
execFileSync(process.execPath, [here('export-game-data.mjs'), '--out', scratch], { stdio: 'pipe' });

const fromFile = normalise(await loadGameData());
const fromDb = normalise(await loadGameData(scratch));

const droppedFile = dropDuplicate(fromFile);
const droppedDb = dropDuplicate(fromDb);

const differences = diff(fromFile, fromDb);

console.log('Round trip: committed game-data.js  vs  export from Postgres\n');
console.log(`  ${DUPLICATE_QID} copies removed from both sides: file ${droppedFile}, db ${droppedDb}`);

if (!differences.length) {
  console.log('\n  No differences. The database can rebuild game-data.js losslessly.\n');
  process.exit(0);
}

console.log(`\n  ${differences.length} difference(s)${differences.length >= 40 ? ' (first 40)' : ''}:\n`);
for (const d of differences) console.log('  - ' + d);
console.log('\n  Each one is content the schema has no home for. Fix the schema and the');
console.log('  importer, re-run db:import, then run this again.\n');
process.exit(1);
