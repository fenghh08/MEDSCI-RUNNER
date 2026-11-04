// Parses ../../game-data.js and prints what an import would write, without
// touching the database. Useful for checking a game-data.js edit before
// running db:import, and for working on the web app with no Neon project yet.
import { loadGameData } from './load-game-data.mjs';

const { COURSES, THEMES, STAGES, RUNNABLE_THEMES } = await loadGameData();

let topics = 0, items = 0, questions = 0;
const seen = new Set();
const duplicates = [];

for (const [code, theme] of Object.entries(THEMES)) {
  let courseItems = 0, courseQuestions = 0;
  for (const topic of Object.values(theme.topics ?? {})) {
    topics++;
    for (const item of Object.values(topic.items ?? {})) {
      courseItems++;
      for (const q of item.questions ?? []) {
        courseQuestions++;
        if (seen.has(q.id)) duplicates.push(q.id);
        seen.add(q.id);
      }
    }
  }
  items += courseItems;
  questions += courseQuestions;
  const stages = (STAGES[code] ?? []).length;
  console.log(
    `${code.padEnd(10)} topics=${String(Object.keys(theme.topics ?? {}).length).padStart(2)}` +
    ` items=${String(courseItems).padStart(3)} questions=${String(courseQuestions).padStart(4)}` +
    ` stages=${stages}${RUNNABLE_THEMES.includes(code) ? '' : ' (study-only)'}`
  );
}

console.log(`\ncourses=${Object.keys(COURSES).length} topics=${topics} items=${items} questions=${questions}`);
if (duplicates.length) {
  console.log(`\nDuplicate question ids (the import upserts on qid, so these collapse into one row):`);
  for (const id of [...new Set(duplicates)]) console.log(`  ${id}`);
}
