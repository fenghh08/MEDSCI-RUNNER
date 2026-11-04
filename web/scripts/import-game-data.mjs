// Imports everything in ../../game-data.js into Neon.
//
// Idempotent: every row is upserted on its natural key (course code, course +
// class key, course + topic key, topic + item key, question qid), so running
// it again after editing game-data.js updates in place rather than duplicating.
// Rows that have disappeared from game-data.js are deleted, so the database
// stays a faithful mirror of the file.
//
//   npm run db:schema   # once, to create the tables
//   npm run db:import   # after any game-data.js change
import { neon } from '@neondatabase/serverless';
import { loadGameData } from './load-game-data.mjs';
import { loadEnv } from './env.mjs';

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}
const sql = neon(url);

const data = await loadGameData();
const { COURSES, THEMES, STAGES, RUNNABLE_THEMES } = data;

const str = (v) => (typeof v === 'string' && v.length ? v : null);
const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const json = (v) => JSON.stringify(Array.isArray(v) ? v : []);

const counts = { courses: 0, classes: 0, topics: 0, items: 0, questions: 0, stages: 0 };

// ---------------------------------------------------------------- courses
// A course can appear in COURSES (as a lecture citation), in THEMES (as a
// playable group), or both. Union them so neither side is lost.
const courseCodes = [...new Set([...Object.keys(COURSES), ...Object.keys(THEMES)])];

for (const [i, code] of courseCodes.entries()) {
  const course = COURSES[code] ?? {};
  const theme = THEMES[code] ?? {};
  await sql`
    insert into courses (code, label, icon, blurb, runnable, position)
    values (${code}, ${course.label ?? theme.label ?? code}, ${str(theme.icon)},
            ${str(theme.blurb)}, ${RUNNABLE_THEMES.includes(code)}, ${i})
    on conflict (code) do update set
      label = excluded.label, icon = excluded.icon, blurb = excluded.blurb,
      runnable = excluded.runnable, position = excluded.position`;
  counts.courses++;

  // ------------------------------------------------------------- classes
  const classes = Object.entries(course.classes ?? {});
  for (const [j, [key, cls]] of classes.entries()) {
    await sql`
      insert into classes (course_code, key, label, intro, outcomes, position)
      values (${code}, ${key}, ${cls.label ?? key}, ${str(cls.intro)},
              ${list(cls.outcomes)}, ${j})
      on conflict (course_code, key) do update set
        label = excluded.label, intro = excluded.intro,
        outcomes = excluded.outcomes, position = excluded.position`;
    counts.classes++;
  }
  const classKeys = classes.map(([key]) => key);
  await sql`delete from classes where course_code = ${code} and not (key = any(${classKeys}))`;
}

await sql`delete from courses where not (code = any(${courseCodes}))`;

// ----------------------------------------------------------------- topics
for (const [code, theme] of Object.entries(THEMES)) {
  const topics = Object.entries(theme.topics ?? {});

  for (const [t, [topicKey, topic]] of topics.entries()) {
    const [{ id: topicId }] = await sql`
      insert into topics (course_code, key, label, icon, color, position)
      values (${code}, ${topicKey}, ${topic.label ?? topicKey}, ${str(topic.icon)},
              ${str(topic.color)}, ${t})
      on conflict (course_code, key) do update set
        label = excluded.label, icon = excluded.icon,
        color = excluded.color, position = excluded.position
      returning id`;
    counts.topics++;

    // ------------------------------------------------------------- items
    const items = Object.entries(topic.items ?? {});
    for (const [n, [itemKey, item]] of items.entries()) {
      const [{ id: itemId }] = await sql`
        insert into items (topic_id, key, label, description, mechanism, fun_facts,
                           active_recall, hashtags, saq, refs, images,
                           course_code, class_key, position)
        values (${topicId}, ${itemKey}, ${item.label ?? itemKey}, ${str(item.description)},
                ${str(item.mechanism)}, ${list(item.funFacts)}, ${list(item.activeRecall)},
                ${list(item.hashtags)}, ${json(item.saq)}, ${json(item.refs)},
                ${json(item.images)}, ${str(item.course) ?? code}, ${str(item.class)}, ${n})
        on conflict (topic_id, key) do update set
          label = excluded.label, description = excluded.description,
          mechanism = excluded.mechanism, fun_facts = excluded.fun_facts,
          active_recall = excluded.active_recall, hashtags = excluded.hashtags,
          saq = excluded.saq, refs = excluded.refs, images = excluded.images,
          course_code = excluded.course_code, class_key = excluded.class_key,
          position = excluded.position
        returning id`;
      counts.items++;

      // --------------------------------------------------------- questions
      const questions = (item.questions ?? []).filter(
        (q) => q && q.id && q.prompt && Array.isArray(q.options) && q.options.length
      );
      for (const [k, q] of questions.entries()) {
        await sql`
          insert into questions (item_id, qid, prompt, options, correct_index,
                                 explanation, difficulty, hashtags,
                                 course_code, class_key, position)
          values (${itemId}, ${q.id}, ${q.prompt}, ${q.options}, ${q.correctIndex ?? 0},
                  ${str(q.explanation)}, ${q.difficulty ?? 'medium'}, ${list(q.hashtags)},
                  ${str(q.course)}, ${str(q.class)}, ${k})
          on conflict (qid) do update set
            item_id = excluded.item_id, prompt = excluded.prompt,
            options = excluded.options, correct_index = excluded.correct_index,
            explanation = excluded.explanation, difficulty = excluded.difficulty,
            hashtags = excluded.hashtags, course_code = excluded.course_code,
            class_key = excluded.class_key, position = excluded.position`;
        counts.questions++;
      }

      const qids = questions.map((q) => q.id);
      await sql`delete from questions where item_id = ${itemId} and not (qid = any(${qids}))`;
    }

    const itemKeys = items.map(([key]) => key);
    await sql`delete from items where topic_id = ${topicId} and not (key = any(${itemKeys}))`;
  }

  const topicKeys = topics.map(([key]) => key);
  await sql`delete from topics where course_code = ${code} and not (key = any(${topicKeys}))`;
}

// ----------------------------------------------------------------- stages
for (const [code, stageList] of Object.entries(STAGES)) {
  for (const stage of stageList) {
    await sql`
      insert into stages (course_code, n, roman, difficulty, scenario, requirements)
      values (${code}, ${stage.n}, ${stage.roman}, ${stage.difficulty},
              ${str(stage.scenario)}, ${JSON.stringify(stage.requirements ?? {})})
      on conflict (course_code, n) do update set
        roman = excluded.roman, difficulty = excluded.difficulty,
        scenario = excluded.scenario, requirements = excluded.requirements`;
    counts.stages++;
  }
  const ns = stageList.map((s) => s.n);
  await sql`delete from stages where course_code = ${code} and not (n = any(${ns}))`;
}

console.log('Imported from game-data.js:');
for (const [what, n] of Object.entries(counts)) {
  console.log(`  ${what.padEnd(10)} ${n}`);
}
