import { sql } from '@/lib/db';

/**
 * Rebuilds the exact object that game-data.js assigns to window.RUNNER_DATA,
 * from the database — with one difference: every question is missing its
 * `correctIndex` and `explanation`.
 *
 * The shape has to match game-data.js key for key, because medsci-runner.html
 * destructures it at boot and reads it everywhere. Anything renamed here shows
 * up as a broken game, not a type error, so the shape is the contract.
 */
export type RunnerData = Record<string, unknown>;

type Row = Record<string, any>;

export async function buildRunnerData(): Promise<RunnerData> {
  const [courseRows, classRows, topicRows, itemRows, questionRows, stageRows, funFactRows, settingRows] =
    await Promise.all([
      sql`select code, label, icon, blurb, runnable from courses order by position` as Promise<Row[]>,
      sql`select course_code, key, label, intro, outcomes from classes order by course_code, position` as Promise<Row[]>,
      sql`select id, course_code, key, label, icon, color from topics order by course_code, position` as Promise<Row[]>,
      sql`select id, topic_id, key, label, description, mechanism, fun_facts, active_recall,
                 hashtags, saq, refs, images, course_code, class_key
            from items order by topic_id, position` as Promise<Row[]>,
      // public_questions has no correct_index column, so this cannot leak the key.
      sql`select q.qid, q.prompt, q.options, q.difficulty, q.hashtags,
                 q.course_code, q.class_key, q.item_id, q.position
            from questions q
           order by q.item_id, q.position` as Promise<Row[]>,
      sql`select course_code, n, roman, difficulty, scenario, requirements
            from stages order by course_code, n` as Promise<Row[]>,
      sql`select qid, prompt, options from public_fun_fact_questions order by position` as Promise<Row[]>,
      sql`select key, value from settings` as Promise<Row[]>,
    ]);

  // ---- COURSES -----------------------------------------------------------
  const COURSES: Record<string, any> = {};
  for (const c of courseRows) {
    COURSES[c.code] = { code: c.code, label: c.label, classes: {} };
  }
  for (const k of classRows) {
    const course = COURSES[k.course_code];
    if (!course) continue;
    const entry: Record<string, unknown> = { label: k.label };
    if (k.outcomes?.length) entry.outcomes = k.outcomes;
    if (k.intro) entry.intro = k.intro;
    course.classes[k.key] = entry;
  }

  // ---- THEMES ------------------------------------------------------------
  const questionsByItem = new Map<string, Row[]>();
  for (const q of questionRows) {
    const list = questionsByItem.get(String(q.item_id)) ?? [];
    list.push(q);
    questionsByItem.set(String(q.item_id), list);
  }

  const itemsByTopic = new Map<string, Row[]>();
  for (const i of itemRows) {
    const list = itemsByTopic.get(String(i.topic_id)) ?? [];
    list.push(i);
    itemsByTopic.set(String(i.topic_id), list);
  }

  const THEMES: Record<string, any> = {};
  for (const c of courseRows) {
    const topics = topicRows.filter((t) => t.course_code === c.code);
    if (!topics.length) continue;
    THEMES[c.code] = {
      label: c.label ?? c.code,
      icon: c.icon ?? '',
      blurb: c.blurb ?? '',
      topics: {},
    };
    for (const t of topics) {
      const items: Record<string, any> = {};
      for (const i of itemsByTopic.get(String(t.id)) ?? []) {
        items[i.key] = {
          label: i.label,
          images: i.images ?? [],
          description: i.description ?? '',
          ...(i.mechanism ? { mechanism: i.mechanism } : {}),
          funFacts: i.fun_facts ?? [],
          activeRecall: i.active_recall ?? [],
          ...(Array.isArray(i.saq) && i.saq.length ? { saq: i.saq } : {}),
          refs: i.refs ?? [],
          hashtags: i.hashtags ?? [],
          ...(i.course_code ? { course: i.course_code } : {}),
          ...(i.class_key ? { class: i.class_key } : {}),
          questions: (questionsByItem.get(String(i.id)) ?? []).map((q) => ({
            // No correctIndex. No explanation. Both arrive from /api/answer,
            // one question at a time, after the player has committed.
            id: q.qid,
            prompt: q.prompt,
            options: q.options,
            difficulty: q.difficulty,
            hashtags: q.hashtags ?? [],
            ...(q.course_code ? { course: q.course_code } : {}),
            ...(q.class_key ? { class: q.class_key } : {}),
          })),
        };
      }
      THEMES[c.code].topics[t.key] = {
        label: t.label,
        icon: t.icon ?? '',
        color: t.color ?? '',
        items,
      };
    }
  }

  // ---- STAGES ------------------------------------------------------------
  const STAGES: Record<string, any[]> = {};
  for (const s of stageRows) {
    (STAGES[s.course_code] ??= []).push({
      n: s.n,
      roman: s.roman,
      difficulty: s.difficulty,
      requirements: s.requirements ?? {},
      scenario: s.scenario ?? '',
    });
  }

  // ---- FUN_FACT_QUESTIONS ------------------------------------------------
  const FUN_FACT_QUESTIONS: Record<string, any> = {};
  for (const f of funFactRows) {
    // `id` is additive: the game picks these with Object.values(), which
    // drops the key, and the bridge needs it to ask the server to grade.
    FUN_FACT_QUESTIONS[f.qid] = { id: f.qid, prompt: f.prompt, options: f.options };
  }

  // ---- settings ----------------------------------------------------------
  const settings = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  return {
    COURSES,
    GAME_CONFIG: settings.GAME_CONFIG ?? {},
    LIFE_CONFIG: settings.LIFE_CONFIG ?? {},
    THEMES,
    STAGES,
    COMPLETE_SCENARIO: settings.COMPLETE_SCENARIO ?? '',
    RUNNABLE_THEMES: courseRows.filter((c) => c.runnable && STAGES[c.code]).map((c) => c.code),
    FUN_FACT_QUESTIONS,
  };
}
