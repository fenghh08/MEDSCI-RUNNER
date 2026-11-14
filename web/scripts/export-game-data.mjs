// Writes ../../game-data.js from Postgres. The mirror image of
// import-game-data.mjs, and the reason the database can be the source of truth
// without the offline builds dying.
//
//   npm run db:export            # overwrite ../../game-data.js
//   npm run db:export -- --out /tmp/x.js
//   npm run db:export -- --dry   # report only, write nothing
//
// GitHub Pages and the Capacitor app both load game-data.js directly, so it
// still has to exist and still has to carry the answer key. The website build
// does not use this file at all -- it reads the same tables through
// lib/runner-data.mjs with the answers left behind.
//
// The file's hand-written parts -- the header, the banner comment above each
// const, and the inline notes inside GAME_CONFIG/LIFE_CONFIG -- are not
// regenerated. They live in db/game-data-template.json and are spliced back in
// around the generated data, the same way developer-tool.html's merge always
// carried its template through untouched.
import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildRunnerData } from '../lib/runner-data.mjs';
import { loadEnv } from './env.mjs';

loadEnv();

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const outFlag = args.indexOf('--out');
const outPath = outFlag >= 0
  ? args[outFlag + 1]
  : fileURLToPath(new URL('../../game-data.js', import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

// ---------------------------------------------------------------- serialise
// Matches the shape game-data.js has always had: quoted keys, two-space
// indent, arrays of primitives on one line, nested objects broken out. Nothing
// here has to be byte-identical to the old file -- db:verify compares the
// parsed objects, not the text -- but it does have to stay readable, because
// people still open this file.

/** Quote a string the way the file does: single quotes unless that costs more escapes. */
function quote(s) {
  const singles = (s.match(/'/g) ?? []).length;
  const doubles = (s.match(/"/g) ?? []).length;
  const q = singles > doubles ? '"' : "'";
  const body = s
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(q, 'g'), '\\' + q)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    // Built from escapes, never written literally: a raw U+2028/U+2029 in
    // source would terminate the regex literal containing it.
    .replace(new RegExp('\\u2028', 'g'), '\\\\u2028')
    .replace(new RegExp('\\u2029', 'g'), '\\\\u2029');
  return q + body + q;
}

const isPrimitive = (v) => v === null || typeof v !== 'object';

function serialize(value, indent) {
  const pad = ' '.repeat(indent);
  const padIn = ' '.repeat(indent + 2);

  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    // Arrays of primitives stay on one line, however long -- that is how the
    // file reads today, and breaking `options` across four lines would make
    // every question three times taller.
    if (value.every(isPrimitive)) return '[' + value.map((v) => serialize(v, 0)).join(', ') + ']';
    return '[\n' + value.map((v) => padIn + serialize(v, indent + 2)).join(',\n') + ',\n' + pad + ']';
  }

  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  return (
    '{\n' +
    entries.map(([k, v]) => padIn + quote(k) + ': ' + serialize(v, indent + 2)).join(',\n') +
    ',\n' + pad + '}'
  );
}

/** GAME_CONFIG / LIFE_CONFIG: flat objects whose keys carry hand-written notes. */
function serializeConfig(value, comments) {
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  const lines = [];
  for (const [k, v] of entries) {
    const note = comments[k] ?? [];
    const body = `    ${k}: ${serialize(v, 4)},`;
    lines.push(note.length ? `${body.padEnd(30)} //${note[0]}` : body);
    // A note that ran over several lines in the original keeps its extra lines,
    // aligned under the first.
    for (const extra of note.slice(1)) lines.push(' '.repeat(31) + '//' + extra);
  }
  return '{\n' + lines.join('\n') + '\n  }';
}

// -------------------------------------------------------------------- build
const sql = neon(url);
const data = await buildRunnerData(sql, { includeAnswers: true, includeContributors: true });

const tpl = JSON.parse(
  readFileSync(fileURLToPath(new URL('../db/game-data-template.json', import.meta.url)), 'utf8')
);

const ORDER = ['COURSES', 'GAME_CONFIG', 'LIFE_CONFIG', 'THEMES',
               'FUN_FACT_QUESTIONS', 'STAGES', 'COMPLETE_SCENARIO', 'RUNNABLE_THEMES'];

const chunks = [tpl.header];
for (const name of ORDER) {
  const banner = tpl.banners[name];
  if (banner) chunks.push('', banner);
  const body = (name === 'GAME_CONFIG' || name === 'LIFE_CONFIG')
    ? serializeConfig(data[name], tpl.configComments ?? {})
    : serialize(data[name], 2);
  chunks.push(`  const ${name} = ${body};`);
}
chunks.push('', tpl.footer);

const out = chunks.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';

// ------------------------------------------------------------------ verify
// Never write a file that does not parse. developer-tool.html learned this the
// hard way -- a bad merge used to corrupt game-data.js silently, and every
// player saw a blank game until someone noticed.
const scratch = join(mkdtempSync(join(tmpdir(), 'gdx-')), 'game-data.js');
writeFileSync(scratch, out);
try {
  execFileSync(process.execPath, ['--check', scratch], { stdio: 'pipe' });
} catch (err) {
  console.error('Refusing to write: the generated file is not valid JavaScript.\n');
  console.error(String(err.stderr ?? err));
  process.exit(1);
}

const counts = {
  courses: Object.keys(data.COURSES).length,
  classes: Object.values(data.COURSES).reduce((n, c) => n + Object.keys(c.classes ?? {}).length, 0),
  topics: Object.values(data.THEMES).reduce((n, t) => n + Object.keys(t.topics ?? {}).length, 0),
  items: 0,
  questions: 0,
  stages: Object.values(data.STAGES).reduce((n, s) => n + s.length, 0),
  funFacts: Object.keys(data.FUN_FACT_QUESTIONS).length,
};
for (const theme of Object.values(data.THEMES)) {
  for (const topic of Object.values(theme.topics ?? {})) {
    for (const item of Object.values(topic.items ?? {})) {
      counts.items++;
      counts.questions += (item.questions ?? []).length;
    }
  }
}

if (dry) {
  console.log(`Would write ${outPath} (${(out.length / 1024).toFixed(0)} KB). Parses cleanly.`);
} else {
  writeFileSync(outPath, out);
  console.log(`Wrote ${outPath} (${(out.length / 1024).toFixed(0)} KB).`);
}
for (const [what, n] of Object.entries(counts)) console.log(`  ${what.padEnd(10)} ${n}`);
