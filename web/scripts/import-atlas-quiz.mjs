// Imports the metabolism atlas's question bank into Postgres.
//
//   npm run db:import-atlas -- --dry        report only, write nothing
//   npm run db:import-atlas                 import
//   npm run db:import-atlas -- --include-similar
//
// The atlas (atlas/index.html) ships 67 questions across 13 topics, authored
// to the same rules as the rest of the bank. They land under MEDS2003 ->
// metabolism as one item per atlas topic, because an atlas topic is a concept
// with questions attached, which is exactly what an item is -- and because 13
// new topics would clutter the Custom Run picker for everyone.
//
// Source of truth is quiz.py in the atlas's own sources, outside this repo.
// scripts/sync-atlas.sh rebuilds the atlas; this reads a JSON dump of that
// bank. Pass --from <path> if yours is elsewhere.
//
// Re-runnable: questions upsert on qid, items on (topic_id, key).
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'node:fs';
import { loadEnv } from './env.mjs';

loadEnv();

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const includeSimilar = args.includes('--include-similar');
const fromFlag = args.indexOf('--from');
const QUIZ_JSON = fromFlag >= 0 ? args[fromFlag + 1] : '/tmp/atlas-quiz.json';
const TOPICS_JSON = QUIZ_JSON.replace(/quiz\.json$/, 'topics.json');

const COURSE = 'MEDS2003';
const TOPIC = 'metabolism';
const SIMILARITY_LIMIT = 0.7;

if (!existsSync(QUIZ_JSON)) {
  console.error(`No question bank at ${QUIZ_JSON}.`);
  console.error('Dump it from the atlas sources first — see scripts/sync-atlas.sh');
  console.error('for where those sources live.');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}
const sql = neon(url);

const Q = JSON.parse(readFileSync(QUIZ_JSON, 'utf8'));
// Topic names/descriptions, when the dump is available; otherwise the topic
// key is used as the label and the item carries no description.
const TOPIC_META = existsSync(TOPICS_JSON)
  ? Object.fromEntries(JSON.parse(readFileSync(TOPICS_JSON, 'utf8')).map((t) => [t.id, t]))
  : {};

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

const camel = (s) =>
  'atlas' + String(s).replace(/(^|[^a-z0-9])([a-z0-9])/gi, (_, __, c) => c.toUpperCase());

/** The atlas writes lectures as "L01 · L07"; this course's keys are L1..L36. */
function firstLecture(lec) {
  if (!lec) return null;
  const first = String(lec).split('·')[0].trim();
  const m = /^L0*(\d+)/.exec(first);
  return m ? `L${Number(m[1])}` : null;
}

// ---------------------------------------------------------------- overlap
// The same normalised-bigram Dice measure developer-tool.html uses for its
// duplicate warnings. MEDS2003 already has 307 metabolism questions and the
// two banks were written independently, so some ground is covered twice.
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function bigrams(s) {
  const n = normalise(s);
  const out = new Set();
  for (let i = 0; i < n.length - 1; i++) out.add(n.slice(i, i + 2));
  return out;
}
function dice(a, b) {
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return a.size + b.size === 0 ? 0 : (2 * hit) / (a.size + b.size);
}

const [{ id: topicId } = {}] = await sql`
  select id from topics where course_code = ${COURSE} and key = ${TOPIC}`;
if (!topicId) {
  console.error(`No ${COURSE} topic "${TOPIC}" in the database. Run db:import first.`);
  process.exit(1);
}

const existing = await sql`
  select q.qid, q.prompt from questions q
    join items i on i.id = q.item_id
   where i.topic_id = ${topicId} and q.qid not like 'atlas-%'`;
const existingBigrams = existing.map((e) => ({ ...e, b: bigrams(e.prompt) }));

const [{ max: itemFloor } = {}] = await sql`
  select coalesce(max(position), -1) as max from items where topic_id = ${topicId}`;

// ----------------------------------------------------------------- plan
const skipped = [];
const planned = [];

let position = Number(itemFloor) + 1;
for (const [topicKey, list] of Object.entries(Q)) {
  const meta = TOPIC_META[topicKey] ?? {};
  const questions = [];
  for (const q of list) {
    const b = bigrams(q.q);
    let best = { score: 0 };
    for (const e of existingBigrams) {
      const score = dice(b, e.b);
      if (score > best.score) best = { score, qid: e.qid, prompt: e.prompt };
    }
    const entry = {
      qid: `atlas-${slug(topicKey)}-${slug(q.n)}`,
      prompt: q.q,
      options: q.o,
      correctIndex: q.a,
      explanation: q.f ?? '',
      near: best,
    };
    if (best.score >= SIMILARITY_LIMIT && !includeSimilar) {
      skipped.push({ topicKey, ...entry });
    } else {
      questions.push(entry);
    }
  }
  if (!questions.length) continue;
  planned.push({
    topicKey,
    itemKey: camel(topicKey),
    label: meta.n ?? topicKey,
    description: meta.d ?? '',
    classKey: firstLecture(meta.lec),
    position: position++,
    questions,
  });
}

const totalQuestions = planned.reduce((n, i) => n + i.questions.length, 0);

console.log(`Atlas quiz bank: ${Object.values(Q).flat().length} questions in ${Object.keys(Q).length} topics`);
console.log(`Target: ${COURSE} -> ${TOPIC} (topic id ${topicId}), ${existing.length} questions already there\n`);

if (skipped.length) {
  console.log(`Skipping ${skipped.length} that overlap something already in the bank`);
  console.log(`(Dice similarity >= ${SIMILARITY_LIMIT} on the prompt. Pass --include-similar to take them`);
  console.log(` anyway, but then decide which of each pair to keep -- two near-identical questions`);
  console.log(` in one pool means a student can be asked the same thing twice in a session.)\n`);
  for (const s of skipped) {
    console.log(`  [${s.near.score.toFixed(2)}] ${s.topicKey}`);
    console.log(`      atlas:    ${s.prompt}`);
    console.log(`      existing: ${s.near.qid} - ${s.near.prompt}\n`);
  }
}

console.log(`Would import ${totalQuestions} questions as ${planned.length} items:`);
for (const i of planned) {
  console.log(`  ${i.itemKey.padEnd(22)} ${String(i.questions.length).padStart(2)} q  ${(i.classKey ?? '(no lecture)').padEnd(13)} ${i.label}`);
}

if (dry) {
  console.log('\n--dry: nothing written.');
  process.exit(0);
}

// ---------------------------------------------------------------- import
let items = 0;
let questions = 0;
for (const i of planned) {
  const [{ id: itemId }] = await sql`
    insert into items (topic_id, key, label, description, hashtags,
                       course_code, class_key, position)
    values (${topicId}, ${i.itemKey}, ${i.label}, ${i.description},
            ${['Metabolism atlas']}, ${COURSE}, ${i.classKey}, ${i.position})
    on conflict (topic_id, key) do update set
      label = excluded.label, description = excluded.description,
      hashtags = excluded.hashtags, course_code = excluded.course_code,
      class_key = excluded.class_key
    returning id`;
  items++;

  for (const [k, q] of i.questions.entries()) {
    await sql`
      insert into questions (item_id, qid, prompt, options, correct_index,
                             explanation, difficulty, hashtags,
                             course_code, class_key, position)
      values (${itemId}, ${q.qid}, ${q.prompt}, ${q.options}, ${q.correctIndex},
              ${q.explanation}, 'medium', ${['Metabolism atlas']},
              ${COURSE}, ${i.classKey}, ${k})
      on conflict (qid) do update set
        item_id = excluded.item_id, prompt = excluded.prompt,
        options = excluded.options, correct_index = excluded.correct_index,
        explanation = excluded.explanation, hashtags = excluded.hashtags,
        course_code = excluded.course_code, class_key = excluded.class_key,
        position = excluded.position`;
    questions++;
  }
}

console.log(`\nImported ${questions} questions across ${items} items.`);
console.log('Now regenerate the offline file:  npm run db:export');
