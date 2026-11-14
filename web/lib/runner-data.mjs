// The one place the RUNNER_DATA object graph is rebuilt from Postgres.
//
// Two callers need the same shape and must never drift apart:
//
//   lib/game-data.ts              the website -- answers stripped, no
//                                 contributor emails, served to every
//                                 player's browser
//   scripts/export-game-data.mjs  the offline export -- everything, written
//                                 back out as game-data.js for GitHub Pages
//                                 and the Capacitor app
//
// So it lives here, in plain JS with the query function passed in, rather than
// in either caller. It imports nothing: no Next, no `@/` alias, no database
// client. `sql` is a tagged-template function -- the Neon client in both
// cases, but this module does not care.
//
// The shape is the contract. medsci-runner.html destructures this object at
// boot and reads it everywhere, so a renamed key shows up as a broken game,
// never as a type error.

/**
 * @param {any} sql tagged-template query function (Neon's `sql`)
 * @param {{ includeAnswers?: boolean, includeContributors?: boolean }} [opts]
 *   includeAnswers       correctIndex + explanation. False for anything the
 *                        browser receives -- that is the entire point of the
 *                        website build.
 *   includeContributors  contributorName + contributorEmail. False for the
 *                        website: they are real email addresses and the page
 *                        source is public.
 */
export async function buildRunnerData(sql, opts = {}) {
  const includeAnswers = opts.includeAnswers === true;
  const includeContributors = opts.includeContributors === true;

  const [courseRows, classRows, topicRows, itemRows, questionRows, stageRows, funFactRows, settingRows, mediaRows] =
    await Promise.all([
      sql`select code, label, theme_label, icon, blurb, is_theme, runnable,
                 runnable_position
            from courses order by position`,
      sql`select course_code, key, label, intro, outcomes from classes order by course_code, position`,
      sql`select id, course_code, key, label, icon, color from topics order by course_code, position`,
      sql`select id, topic_id, key, label, description, mechanism, fun_facts, notes,
                 active_recall, hashtags, saq, refs, images, course_code, class_key,
                 related_course, contributor_name, contributor_email
            from items order by topic_id, position`,
      // correct_index and explanation are selected only when the caller asked
      // for them. Keeping the two column lists apart means a website response
      // cannot leak the key through a careless edit here.
      includeAnswers
        ? sql`select qid, prompt, options, difficulty, hashtags, course_code, class_key,
                     related_course, contributor_name, contributor_email,
                     correct_index, explanation, item_id, position, media_id, allow_in_timed
                from questions order by item_id, position`
        : sql`select qid, prompt, options, difficulty, hashtags, course_code, class_key,
                     related_course, contributor_name, contributor_email,
                     item_id, position, media_id, allow_in_timed
                from questions order by item_id, position`,
      sql`select course_code, n, roman, difficulty, scenario, requirements
            from stages order by course_code, n`,
      includeAnswers
        ? sql`select qid, prompt, options, correct_index, explanation
                from fun_fact_questions order by position`
        : sql`select qid, prompt, options from public_fun_fact_questions order by position`,
      sql`select key, value from settings`,
      // Only media a question actually uses.
      sql`select id, kind, source, url, bytes, title, attribution, poster_url
            from media where id in (select media_id from questions where media_id is not null)`,
    ]);

  const mediaById = new Map(mediaRows.map((m) => [m.id, {
    kind: m.kind, source: m.source, url: m.url, title: m.title,
    ...(m.attribution ? { attribution: m.attribution } : {}),
    ...(m.poster_url ? { poster: m.poster_url } : {}),
    ...(m.bytes ? { bytes: Number(m.bytes) } : {}),
  }]));

  // ---- COURSES -----------------------------------------------------------
  const COURSES = {};
  for (const c of courseRows) COURSES[c.code] = { code: c.code, label: c.label, classes: {} };
  for (const k of classRows) {
    const course = COURSES[k.course_code];
    if (!course) continue;
    const entry = { label: k.label };
    if (k.outcomes?.length) entry.outcomes = k.outcomes;
    if (k.intro) entry.intro = k.intro;
    course.classes[k.key] = entry;
  }

  // ---- THEMES ------------------------------------------------------------
  const questionsByItem = new Map();
  for (const q of questionRows) {
    const key = String(q.item_id);
    const list = questionsByItem.get(key) ?? [];
    list.push(q);
    questionsByItem.set(key, list);
  }

  const itemsByTopic = new Map();
  for (const i of itemRows) {
    const key = String(i.topic_id);
    const list = itemsByTopic.get(key) ?? [];
    list.push(i);
    itemsByTopic.set(key, list);
  }

  const credit = (name, email) =>
    includeContributors
      ? { contributorName: name ?? null, contributorEmail: email ?? null }
      : {};

  const THEMES = {};
  for (const c of courseRows) {
    // A course with no topics yet is still a theme if it was authored as one
    // (PCOL3011). Skipping it on topic count alone silently dropped it.
    if (!c.is_theme) continue;
    const topics = topicRows.filter((t) => t.course_code === c.code);
    THEMES[c.code] = {
      label: c.theme_label ?? c.label ?? c.code,
      icon: c.icon ?? '',
      blurb: c.blurb ?? '',
      topics: {},
    };
    for (const t of topics) {
      const items = {};
      for (const i of itemsByTopic.get(String(t.id)) ?? []) {
        items[i.key] = {
          label: i.label,
          images: i.images ?? [],
          description: i.description ?? '',
          ...(i.mechanism ? { mechanism: i.mechanism } : {}),
          funFacts: i.fun_facts ?? [],
          ...(i.notes?.length ? { notes: i.notes } : {}),
          activeRecall: i.active_recall ?? [],
          ...(Array.isArray(i.saq) && i.saq.length ? { saq: i.saq } : {}),
          refs: i.refs ?? [],
          hashtags: i.hashtags ?? [],
          ...(i.related_course ? { relatedCourse: i.related_course } : {}),
          ...(i.course_code ? { course: i.course_code } : {}),
          ...(i.class_key ? { class: i.class_key } : {}),
          ...credit(i.contributor_name, i.contributor_email),
          questions: (questionsByItem.get(String(i.id)) ?? []).map((q) => ({
            id: q.qid,
            prompt: q.prompt,
            options: q.options,
            // Absent on the website build. Both arrive from /api/answer, one
            // question at a time, after the player has committed.
            ...(includeAnswers
              ? { correctIndex: q.correct_index, explanation: q.explanation ?? '' }
              : {}),
            difficulty: q.difficulty,
            hashtags: q.hashtags ?? [],
            ...(q.related_course ? { relatedCourse: q.related_course } : {}),
            ...(q.course_code ? { course: q.course_code } : {}),
            ...(q.class_key ? { class: q.class_key } : {}),
            // Both absent on an ordinary question, so the offline file is
            // unchanged for everything that has no media.
            ...(q.media_id && mediaById.has(q.media_id) ? { media: mediaById.get(q.media_id) } : {}),
            ...(q.allow_in_timed === false ? { allowInTimed: false } : {}),
            ...credit(q.contributor_name, q.contributor_email),
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
  const STAGES = {};
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
  const FUN_FACT_QUESTIONS = {};
  for (const f of funFactRows) {
    FUN_FACT_QUESTIONS[f.qid] = includeAnswers
      ? {
          prompt: f.prompt,
          options: f.options,
          correctIndex: f.correct_index,
          explanation: f.explanation ?? '',
        }
      // `id` is additive on the website build only: the game picks these with
      // Object.values(), which drops the key, and the bridge needs the qid to
      // ask the server to grade. The offline file has no such need, and adding
      // it there would make the export differ from the original for no reason.
      : { id: f.qid, prompt: f.prompt, options: f.options };
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
    // Authored order, which is not the order the courses are listed in.
    RUNNABLE_THEMES: courseRows
      .filter((c) => c.runnable && STAGES[c.code])
      .sort((a, b) => (a.runnable_position ?? 1e9) - (b.runnable_position ?? 1e9))
      .map((c) => c.code),
    FUN_FACT_QUESTIONS,
  };
}
