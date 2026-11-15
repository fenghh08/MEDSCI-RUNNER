// Every write the admin app can make, and the reads that back its pages.
//
// Plain JS with the query function passed in -- the same arrangement as
// runner-data.mjs -- so scripts/test-store.mjs can run the real code against
// a scratch database branch instead of the live one.
//
// Three rules hold for every write here:
//
//   1. Scope is checked first. A lecturer may only touch courses they were
//      granted; the course is always read from the database, never taken from
//      the request.
//   2. Validation runs on the server (lib/validate.mjs). The page runs the
//      same rules while someone types, but only this copy counts.
//   3. The write, its content_revisions row and the content_version bump are
//      ONE statement (data-modifying CTEs) or one transaction, so they commit
//      or fail together. There is no way to change content without leaving a
//      record of it.
import { validateQuestion, validateItem, nearDuplicates, auditSet, ValidationError } from './validate.mjs';

export class ForbiddenError extends Error { constructor(m) { super(m); this.name = 'ForbiddenError'; this.status = 403; } }
export class NotFoundError extends Error { constructor(m) { super(m); this.name = 'NotFoundError'; this.status = 404; } }

const text = (v) => String(v ?? '').trim();
const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const orNull = (v) => (text(v) ? text(v) : null);
const json = (v) => (v === null || v === undefined ? null : JSON.stringify(v));

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6).padEnd(4, '0');
}
function camelKey(label) {
  const words = text(label).replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 6);
  const k = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('');
  return /^[a-z]/.test(k) ? k.slice(0, 48) : 'item' + k.slice(0, 44);
}

const questionOut = (r) => r && ({
  qid: r.qid, itemId: Number(r.item_id), prompt: r.prompt, options: r.options,
  correctIndex: r.correct_index, explanation: r.explanation ?? '', difficulty: r.difficulty,
  hashtags: r.hashtags ?? [], classKey: r.class_key ?? null, position: r.position,
  mediaId: r.media_id ?? null, allowInTimed: r.allow_in_timed !== false,
});
const itemOut = (r) => r && ({
  id: Number(r.id), topicId: Number(r.topic_id), key: r.key, label: r.label,
  description: r.description ?? '', mechanism: r.mechanism ?? '', funFacts: r.fun_facts ?? [],
  activeRecall: r.active_recall ?? [], hashtags: r.hashtags ?? [], classKey: r.class_key ?? null,
  position: r.position, mediaId: r.media_id ?? null,
});

export function makeStore(sql) {
  const canEdit = (actor, course) => actor.role === 'admin' || (actor.role === 'lecturer' && actor.courses.includes(course));
  function assertCourse(actor, course) {
    if (!course) throw new NotFoundError('That does not belong to any course.');
    if (!canEdit(actor, course)) throw new ForbiddenError(`You are not assigned to ${course}.`);
  }
  const assertAdmin = (actor) => { if (actor.role !== 'admin') throw new ForbiddenError('This needs admin access.'); };

  // Every content write bumps this, and lib/game-data.ts caches on it.
  const bump = () => sql`
    insert into settings (key, value) values ('content_version', to_jsonb(extract(epoch from clock_timestamp())))
    on conflict (key) do update set value = excluded.value`;
  const log = (entity, key, course, action, before, after, actor) => sql`
    insert into content_revisions (entity, entity_key, course_code, action, before, after, actor_uid)
    values (${entity}, ${String(key)}, ${course}, ${action}, ${json(before)}::jsonb, ${json(after)}::jsonb, ${actor.uid})`;

  async function itemContext(itemId) {
    const [row] = await sql`
      select i.id, i.key as item_key, t.id as topic_id, t.key as topic_key, t.course_code
        from items i join topics t on t.id = i.topic_id where i.id = ${itemId}`;
    if (!row) throw new NotFoundError('That item no longer exists.');
    return row;
  }
  async function questionContext(qid) {
    const [row] = await sql`
      select q.*, t.course_code as theme_course, t.key as topic_key
        from questions q join items i on i.id = q.item_id join topics t on t.id = i.topic_id
       where q.qid = ${qid}`;
    if (!row) throw new NotFoundError('That question no longer exists.');
    return row;
  }
  const questionRow = async (qid) => (await sql`select to_jsonb(q) as row from questions q where qid = ${qid}`)[0]?.row ?? null;
  const itemRow = async (id) => (await sql`select to_jsonb(i) as row from items i where id = ${id}`)[0]?.row ?? null;

  // Answer counts for one question. The game's all-time Firebase totals cover
  // every build; the Postgres log covers the website only. Website answers
  // are in both, so the two are never added: the larger one is the fuller
  // picture of the same history.
  const merged = (qid, n, c, gameStats) => {
    const g = gameStats && gameStats.get(qid);
    return g && g.n >= n ? { n: g.n, c: g.c } : { n, c };
  };

  // ------------------------------------------------------------------ reads
  async function tree(actor) {
    const [courses, topics, items, classes] = await Promise.all([
      sql`select code, label, is_theme from courses order by position`,
      sql`select id, course_code, key, label, icon from topics order by course_code, position`,
      sql`select i.id, i.topic_id, i.key, i.label, i.class_key,
                 (select count(*)::int from questions q where q.item_id = i.id) as questions,
                 (coalesce(i.description, '') = '') as no_description
            from items i order by i.topic_id, i.position`,
      sql`select course_code, key, label, intro, outcomes from classes order by course_code, position`,
    ]);
    return courses.filter((c) => c.is_theme).map((c) => ({
      code: c.code, label: c.label, editable: canEdit(actor, c.code),
      // Lectures, in teaching order: the other way into the same items.
      classes: classes.filter((k) => k.course_code === c.code)
        .map((k) => ({ key: k.key, label: k.label, intro: k.intro ?? '', outcomes: k.outcomes ?? [] })),
      topics: topics.filter((t) => t.course_code === c.code).map((t) => ({
        id: Number(t.id), key: t.key, label: t.label, icon: t.icon ?? '',
        items: items.filter((i) => String(i.topic_id) === String(t.id)).map((i) => ({
          id: Number(i.id), key: i.key, label: i.label, classKey: i.class_key,
          questions: i.questions, incomplete: i.no_description || i.questions === 0,
        })),
      })),
    }));
  }

  /** @param {any} actor @param {number} itemId @param {{ gameStats?: Map<string, any> }} [opts] */
  async function getItem(actor, itemId, { gameStats } = {}) {
    const ctx = await itemContext(itemId);
    const [[item], questions, classes, media] = await Promise.all([
      sql`select * from items where id = ${itemId}`,
      sql`select q.*, (select count(*)::int from answer_events e where e.question_qid = q.qid) as n,
                      (select count(*)::int from answer_events e where e.question_qid = q.qid and e.was_correct) as c
            from questions q where q.item_id = ${itemId} order by q.position, q.id`,
      sql`select key, label from classes where course_code = ${ctx.course_code} order by position`,
      sql`select id, kind, source, url, title, poster_url from media order by created_at desc limit 200`,
    ]);
    return {
      course: ctx.course_code, topicKey: ctx.topic_key, editable: canEdit(actor, ctx.course_code),
      item: itemOut(item), questions: questions.map((q) => { const m = merged(q.qid, q.n, q.c, gameStats); return { ...questionOut(q), answers: m.n, correct: m.c }; }), classes, media,
    };
  }

  // -------------------------------------------------------------- questions
  /** Validate, and report near-duplicates, without writing anything. */
  async function checkQuestion(input, course) {
    const q = {
      prompt: text(input.prompt), options: Array.isArray(input.options) ? input.options.map(text) : [],
      correctIndex: input.correctIndex, explanation: text(input.explanation),
      difficulty: input.difficulty ?? 'medium',
    };
    const { errors, warnings } = validateQuestion(q);
    let duplicates = [];
    if (!errors.length && course) {
      const pool = await sql`
        select q.qid, q.prompt from questions q
          join items i on i.id = q.item_id join topics t on t.id = i.topic_id
         where t.course_code = ${course}`;
      duplicates = nearDuplicates(q.prompt, pool, { exclude: input.qid ?? null });
    }
    return { q, errors, warnings, duplicates };
  }

  async function saveQuestion(actor, input, { dryRun = false } = {}) {
    const existing = input.qid ? await questionContext(input.qid) : null;
    const ctx = await itemContext(existing ? existing.item_id : input.itemId);
    assertCourse(actor, ctx.course_code);

    const { q, errors, warnings, duplicates } = await checkQuestion(input, ctx.course_code);
    if (dryRun) return { errors, warnings, duplicates };
    if (errors.length) throw new ValidationError(errors);

    const hashtags = list(input.hashtags);
    const classKey = orNull(input.classKey);
    const mediaId = orNull(input.mediaId);
    const allowInTimed = input.allowInTimed !== false;
    let row;
    if (existing) {
      [row] = await sql`
        with old as (select * from questions where qid = ${existing.qid}),
        upd as (
          update questions set prompt = ${q.prompt}, options = ${q.options}, correct_index = ${q.correctIndex},
                 explanation = ${q.explanation}, difficulty = ${q.difficulty}, hashtags = ${hashtags},
                 class_key = ${classKey}, media_id = ${mediaId}, allow_in_timed = ${allowInTimed}
           where qid = ${existing.qid} returning *),
        rev as (
          insert into content_revisions (entity, entity_key, course_code, action, before, after, actor_uid)
          select 'question', ${existing.qid}, ${ctx.course_code}, 'update', to_jsonb(old), to_jsonb(upd), ${actor.uid} from old, upd),
        ver as (
          insert into settings (key, value) values ('content_version', to_jsonb(extract(epoch from clock_timestamp())))
          on conflict (key) do update set value = excluded.value)
        select * from upd`;
    } else {
      const qid = `q-${ctx.topic_key}-${randomSuffix()}${randomSuffix().slice(0, 2)}`;
      [row] = await sql`
        with ins as (
          insert into questions (item_id, qid, prompt, options, correct_index, explanation, difficulty,
                                 hashtags, class_key, media_id, allow_in_timed, position,
                                 contributor_name, contributor_email)
          values (${ctx.id}, ${qid}, ${q.prompt}, ${q.options}, ${q.correctIndex}, ${q.explanation}, ${q.difficulty},
                  ${hashtags}, ${classKey}, ${mediaId}, ${allowInTimed},
                  (select coalesce(max(position), -1) + 1 from questions where item_id = ${ctx.id}),
                  ${actor.displayName ?? null}, ${actor.email ?? null})
          returning *),
        rev as (
          insert into content_revisions (entity, entity_key, course_code, action, after, actor_uid)
          select 'question', ins.qid, ${ctx.course_code}, 'create', to_jsonb(ins), ${actor.uid} from ins),
        ver as (
          insert into settings (key, value) values ('content_version', to_jsonb(extract(epoch from clock_timestamp())))
          on conflict (key) do update set value = excluded.value)
        select * from ins`;
    }
    return { question: questionOut(row), warnings, duplicates };
  }

  async function removeQuestion(actor, qid) {
    const existing = await questionContext(qid);
    assertCourse(actor, existing.theme_course);
    const before = await questionRow(qid);
    await sql.transaction([
      sql`delete from questions where qid = ${qid}`,
      log('question', qid, existing.theme_course, 'delete', before, null, actor),
      bump(),
    ]);
    return { removed: qid };
  }

  // ------------------------------------------------------------------ items
  async function saveItem(actor, input) {
    const { errors } = validateItem(input);
    if (errors.length) throw new ValidationError(errors);
    const fields = {
      label: text(input.label), description: text(input.description), mechanism: orNull(input.mechanism),
      funFacts: list(input.funFacts), activeRecall: list(input.activeRecall), hashtags: list(input.hashtags),
      classKey: orNull(input.classKey), mediaId: orNull(input.mediaId),
    };
    if (input.id) {
      const ctx = await itemContext(input.id);
      assertCourse(actor, ctx.course_code);
      const [row] = await sql`
        with old as (select * from items where id = ${input.id}),
        upd as (
          update items set label = ${fields.label}, description = ${fields.description}, mechanism = ${fields.mechanism},
                 fun_facts = ${fields.funFacts}, active_recall = ${fields.activeRecall}, hashtags = ${fields.hashtags},
                 class_key = ${fields.classKey}, media_id = ${fields.mediaId}
           where id = ${input.id} returning *),
        rev as (
          insert into content_revisions (entity, entity_key, course_code, action, before, after, actor_uid)
          select 'item', ${String(input.id)}, ${ctx.course_code}, 'update', to_jsonb(old), to_jsonb(upd), ${actor.uid} from old, upd),
        ver as (
          insert into settings (key, value) values ('content_version', to_jsonb(extract(epoch from clock_timestamp())))
          on conflict (key) do update set value = excluded.value)
        select * from upd`;
      return { item: itemOut(row) };
    }
    const [topic] = await sql`select id, course_code from topics where id = ${input.topicId}`;
    if (!topic) throw new NotFoundError('That topic no longer exists.');
    assertCourse(actor, topic.course_code);
    let key = camelKey(fields.label);
    const [clash] = await sql`select 1 from items where topic_id = ${topic.id} and key = ${key}`;
    if (clash) key = `${key}${randomSuffix()}`;
    const [row] = await sql`
      with ins as (
        insert into items (topic_id, key, label, description, mechanism, fun_facts, active_recall, hashtags,
                           course_code, class_key, media_id, position, contributor_name, contributor_email)
        values (${topic.id}, ${key}, ${fields.label}, ${fields.description}, ${fields.mechanism}, ${fields.funFacts},
                ${fields.activeRecall}, ${fields.hashtags}, ${topic.course_code}, ${fields.classKey}, ${fields.mediaId},
                (select coalesce(max(position), -1) + 1 from items where topic_id = ${topic.id}),
                ${actor.displayName ?? null}, ${actor.email ?? null})
        returning *),
      rev as (
        insert into content_revisions (entity, entity_key, course_code, action, after, actor_uid)
        select 'item', ins.id::text, ${topic.course_code}, 'create', to_jsonb(ins), ${actor.uid} from ins),
      ver as (
        insert into settings (key, value) values ('content_version', to_jsonb(extract(epoch from clock_timestamp())))
        on conflict (key) do update set value = excluded.value)
      select * from ins`;
    return { item: itemOut(row) };
  }

  /** Removing an item takes its questions with it, so the revision keeps both. */
  async function removeItem(actor, itemId) {
    const ctx = await itemContext(itemId);
    assertCourse(actor, ctx.course_code);
    const item = await itemRow(itemId);
    const questions = (await sql`select to_jsonb(q) as row from questions q where item_id = ${itemId} order by position`).map((r) => r.row);
    await sql.transaction([
      sql`delete from items where id = ${itemId}`,
      log('item', itemId, ctx.course_code, 'delete', { item, questions }, null, actor),
      bump(),
    ]);
    return { removed: Number(itemId), questions: questions.length };
  }

  // ------------------------------------------------------ topics & lectures
  async function saveTopic(actor, input) {
    const label = text(input.label);
    if (!label) throw new ValidationError(['The topic needs a name.']);
    if (input.id) {
      const [t] = await sql`select to_jsonb(t) as row, t.course_code from topics t where id = ${input.id}`;
      if (!t) throw new NotFoundError('That topic no longer exists.');
      assertCourse(actor, t.course_code);
      // Only what was sent is changed: renaming a topic must not wipe its colour.
      const icon = input.icon === undefined ? t.row.icon : orNull(input.icon);
      const color = input.color === undefined ? t.row.color : orNull(input.color);
      const after = { ...t.row, label, icon, color };
      await sql.transaction([
        sql`update topics set label = ${label}, icon = ${icon}, color = ${color} where id = ${input.id}`,
        log('topic', input.id, t.course_code, 'update', t.row, after, actor),
        bump(),
      ]);
      return { topic: after };
    }
    const course = text(input.course);
    assertCourse(actor, course);
    // The game flattens every course's topics into one map, so a key has to be
    // unique across ALL courses even though the table only enforces it per course.
    let key = camelKey(label);
    if ((await sql`select 1 from topics where key = ${key}`).length) key = `${key}${course.replace(/[^A-Za-z0-9]/g, '')}`;
    if ((await sql`select 1 from topics where key = ${key}`).length) {
      throw new ValidationError([`A topic called "${label}" already exists. Pick a more specific name.`]);
    }
    const [row] = await sql`
      with ins as (insert into topics (course_code, key, label, icon, color, position)
                   values (${course}, ${key}, ${label}, ${orNull(input.icon)}, ${orNull(input.color)},
                           (select coalesce(max(position), -1) + 1 from topics where course_code = ${course}))
                   returning *),
      rev as (insert into content_revisions (entity, entity_key, course_code, action, after, actor_uid)
              select 'topic', ins.id::text, ${course}, 'create', to_jsonb(ins), ${actor.uid} from ins),
      ver as (insert into settings (key, value) values ('content_version', to_jsonb(extract(epoch from clock_timestamp())))
              on conflict (key) do update set value = excluded.value)
      select * from ins`;
    return { topic: row };
  }

  async function listClasses(actor, course) {
    assertCourse(actor, course);
    return sql`select id, key, label, intro, outcomes from classes where course_code = ${course} order by position`;
  }
  async function saveClass(actor, input) {
    const course = text(input.course), key = text(input.key), label = text(input.label);
    assertCourse(actor, course);
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/.test(key)) throw new ValidationError(['The lecture key should look like L12 or W3.']);
    if (!label) throw new ValidationError(['The lecture needs a title.']);
    const [old] = await sql`select to_jsonb(c) as row from classes c where course_code = ${course} and key = ${key}`;
    const after = { course_code: course, key, label, intro: orNull(input.intro), outcomes: list(input.outcomes) };
    await sql.transaction([
      sql`insert into classes (course_code, key, label, intro, outcomes, position)
          values (${course}, ${key}, ${label}, ${after.intro}, ${after.outcomes},
                  (select coalesce(max(position), -1) + 1 from classes where course_code = ${course}))
          on conflict (course_code, key) do update set
            label = excluded.label, intro = excluded.intro, outcomes = excluded.outcomes`,
      log('class', `${course}:${key}`, course, old ? 'update' : 'create', old ? old.row : null, after, actor),
      bump(),
    ]);
    return { class: after };
  }

  // -------------------------------------------------------------- revisions
  /** @param {any} actor @param {{ entity?: string|null, key?: string|null, course?: string|null, limit?: number }} [filter] */
  async function revisions(actor, { entity = null, key = null, course = null, limit = 50 } = {}) {
    const rows = await sql`
      select r.id, r.entity, r.entity_key, r.course_code, r.action, r.before, r.after, r.at,
             u.email as actor_email, u.display_name as actor_name
        from content_revisions r left join users u on u.uid = r.actor_uid
       where (${entity}::text is null or r.entity = ${entity})
         and (${key}::text is null or r.entity_key = ${key})
         and (${course}::text is null or r.course_code = ${course})
       order by r.at desc, r.id desc limit ${Math.min(200, Number(limit) || 50)}`;
    return rows
      .filter((r) => (r.course_code ? canEdit(actor, r.course_code) : actor.role === 'admin'))
      .map((r) => ({ ...r, id: Number(r.id) }));
  }

  /** Undo one revision: put back what was there before it. */
  async function revert(actor, revisionId) {
    const [r] = await sql`select * from content_revisions where id = ${revisionId}`;
    if (!r) throw new NotFoundError('That history entry no longer exists.');
    assertCourse(actor, r.course_code);
    const relog = (before, after) => log(r.entity, r.entity_key, r.course_code, 'revert', before, after, actor);

    if (r.entity === 'question') {
      const current = await questionRow(r.entity_key);
      if (r.action === 'create') {
        if (!current) throw new NotFoundError('That question is already gone.');
        await sql.transaction([sql`delete from questions where qid = ${r.entity_key}`, relog(current, null), bump()]);
      } else if (!current) {
        // It was removed: put the row back exactly as it was.
        await sql.transaction([
          sql`insert into questions select * from jsonb_populate_record(null::questions, ${json(r.before)}::jsonb)`,
          relog(null, r.before), bump()]);
      } else {
        await sql.transaction([
          sql`update questions q set (prompt, options, correct_index, explanation, difficulty, hashtags, class_key, media_id, allow_in_timed)
                = (select p.prompt, p.options, p.correct_index, p.explanation, p.difficulty, p.hashtags, p.class_key, p.media_id, p.allow_in_timed
                     from jsonb_populate_record(null::questions, ${json(r.before)}::jsonb) p)
               where q.qid = ${r.entity_key}`,
          relog(current, r.before), bump()]);
      }
      return { reverted: Number(r.id) };
    }
    if (r.entity === 'item') {
      const current = await itemRow(r.entity_key);
      if (r.action === 'delete') {
        if (current) throw new ValidationError(['That item already exists again.']);
        await sql.transaction([
          sql`insert into items select * from jsonb_populate_record(null::items, ${json(r.before.item)}::jsonb)`,
          sql`insert into questions select * from jsonb_populate_recordset(null::questions, ${json(r.before.questions)}::jsonb)`,
          relog(null, r.before), bump()]);
      } else if (r.action === 'create') {
        throw new ValidationError(['To undo creating an item, remove it from its own page.']);
      } else {
        if (!current) throw new NotFoundError('That item has been removed.');
        await sql.transaction([
          sql`update items i set (label, description, mechanism, fun_facts, active_recall, hashtags, class_key, media_id)
                = (select p.label, p.description, p.mechanism, p.fun_facts, p.active_recall, p.hashtags, p.class_key, p.media_id
                     from jsonb_populate_record(null::items, ${json(r.before)}::jsonb) p)
               where i.id = ${r.entity_key}::bigint`,
          relog(current, r.before), bump()]);
      }
      return { reverted: Number(r.id) };
    }
    throw new ValidationError(['Only questions and items can be undone from here.']);
  }

  // --------------------------------------------------------------- insights
  /**
   * What a lecturer wants to know about a course: is it being used, where are
   * students struggling, and what is missing. Everything here comes from
   * answers logged by the website (/api/answer); play on the offline builds
   * is not in this database.
   */
  /** @param {any} actor @param {string} course @param {{ gameStats?: Map<string, any> }} [opts] */
  async function insights(actor, course, { gameStats } = {}) {
    assertCourse(actor, course);
    const [logged, [totals], daily, picks, classes, gaps] = await Promise.all([
      sql`select q.qid, q.prompt, q.options, q.correct_index, q.item_id, coalesce(q.explanation, '') = '' as no_explanation,
                 i.label as item_label, t.label as topic_label, coalesce(q.class_key, i.class_key) as class_key,
                 count(e.id)::int as n, (count(e.id) filter (where e.was_correct))::int as c
            from questions q
            join items i on i.id = q.item_id join topics t on t.id = i.topic_id
            left join answer_events e on e.question_qid = q.qid
           where t.course_code = ${course}
           group by q.id, i.label, t.label, i.class_key`,
      sql`select count(e.id)::int as answers, (count(e.id) filter (where e.was_correct))::int as correct,
                 count(distinct e.player_uid)::int as signed_in, count(distinct e.session_id)::int as browsers,
                 count(distinct e.room_id)::int as rooms, (count(e.id) filter (where e.chosen_index < 0))::int as timeouts,
                 (count(e.id) filter (where e.answered_at > now() - interval '7 days'))::int as week,
                 max(e.answered_at) as last
            from answer_events e
            join questions q on q.qid = e.question_qid join items i on i.id = q.item_id join topics t on t.id = i.topic_id
           where t.course_code = ${course}`,
      sql`select to_char(d.day, 'YYYY-MM-DD') as day, count(e.id)::int as n, (count(e.id) filter (where e.was_correct))::int as c
            from generate_series(current_date - 29, current_date, interval '1 day') as d(day)
            left join (answer_events e
                       join questions q on q.qid = e.question_qid join items i on i.id = q.item_id
                       join topics t on t.id = i.topic_id and t.course_code = ${course})
                   on e.answered_at::date = d.day::date
           group by d.day order by d.day`,
      sql`select e.question_qid as qid, e.chosen_authored as pick, count(*)::int as n
            from answer_events e
            join questions q on q.qid = e.question_qid join items i on i.id = q.item_id join topics t on t.id = i.topic_id
           where t.course_code = ${course} and e.chosen_authored is not null and e.chosen_authored >= 0 and not e.was_correct
           group by 1, 2`,
      sql`select key, label from classes where course_code = ${course} order by position`,
      sql`select i.id, i.label, coalesce(i.description, '') = '' as no_description,
                 (select count(*)::int from questions q where q.item_id = i.id) as questions
            from items i join topics t on t.id = i.topic_id where t.course_code = ${course}`,
    ]);

    const website = { answers: totals.answers, correct: totals.correct };
    const rows = logged.map((r) => ({ ...r, ...merged(r.qid, r.n, r.c, gameStats) }));
    const brief = (r) => ({ qid: r.qid, itemId: Number(r.item_id), prompt: r.prompt, item: r.item_label, topic: r.topic_label,
                            classKey: r.class_key, n: r.n, c: r.c });
    // The wrong option most people chose: first-attempt picks from the game's
    // own totals, plus whatever the website log has recorded since.
    const wrongPicks = new Map();
    const addPick = (qid, index, n) => {
      const m = wrongPicks.get(qid) ?? new Map();
      m.set(index, (m.get(index) ?? 0) + n); wrongPicks.set(qid, m);
    };
    for (const r of logged) {
      const g = gameStats && gameStats.get(r.qid);
      if (g) g.picks.forEach((n, i) => { if (n && i !== r.correct_index) addPick(r.qid, i, n); });
    }
    if (!gameStats || !gameStats.size) for (const p of picks) addPick(p.qid, p.pick, p.n);
    const withPick = (r) => {
      const m = wrongPicks.get(r.qid);
      if (!m) return brief(r);
      const [index, n] = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
      return { ...brief(r), ...(r.options[index] ? { drawnTo: r.options[index], drawnToCount: n } : {}) };
    };
    const group = (keyOf, labelOf) => {
      const m = new Map();
      for (const r of rows) {
        const k = keyOf(r) ?? '';
        const g = m.get(k) ?? { key: k, label: labelOf(r, k), questions: 0, answers: 0, correct: 0 };
        g.questions++; g.answers += r.n; g.correct += r.c; m.set(k, g);
      }
      return [...m.values()];
    };
    const classLabel = new Map(classes.map((k) => [k.key, k.label]));
    const byLecture = group((r) => r.class_key, (_r, k) => (k ? classLabel.get(k) ?? k : 'Not tied to a lecture'));
    const order = new Map(classes.map((k, i) => [k.key, i]));
    byLecture.sort((x, y) => (order.get(x.key) ?? 1e9) - (order.get(y.key) ?? 1e9));
    const audit = auditSet(rows.map((r) => ({ qid: r.qid, prompt: r.prompt, options: r.options, correctIndex: r.correct_index })));
    const byQid = new Map(rows.map((r) => [r.qid, r]));

    return {
      course,
      totals: {
        questions: rows.length, items: gaps.length, lectures: classes.length, ...totals,
        // All builds, all time -- against the website-only log the rest of the tiles describe.
        answers: rows.reduce((t, r) => t + r.n, 0), correct: rows.reduce((t, r) => t + r.c, 0),
        website_answers: website.answers, includes_game_totals: !!(gameStats && gameStats.size),
      },
      daily,
      byLecture,
      byTopic: group((r) => r.topic_label, (_r, k) => k).sort((x, y) => y.answers - x.answers),
      // Missed by most of the people who tried it: a hard concept, or a broken question.
      hardest: rows.filter((r) => r.n >= 3 && r.c / r.n < 0.5).sort((x, y) => x.c / x.n - y.c / y.n).slice(0, 25).map(withPick),
      mostAnswered: rows.filter((r) => r.n > 0).sort((x, y) => y.n - x.n).slice(0, 10).map(brief),
      gaps: {
        neverAnswered: rows.filter((r) => r.n === 0).length,
        lecturesWithoutQuestions: classes.filter((k) => !rows.some((r) => r.class_key === k.key)).map((k) => ({ key: k.key, label: k.label })),
        itemsWithoutQuestions: gaps.filter((g) => g.questions === 0).map((g) => ({ id: Number(g.id), label: g.label })),
        itemsWithoutDescription: gaps.filter((g) => g.no_description).map((g) => ({ id: Number(g.id), label: g.label })),
        questionsWithoutExplanation: rows.filter((r) => r.no_explanation).slice(0, 40).map(brief),
        citeASlide: audit.cited.slice(0, 40).map((id) => brief(byQid.get(id))),
      },
    };
  }

  // ------------------------------------------------------------------ users
  async function listUsers(actor) {
    assertAdmin(actor);
    const [users, grants, courses] = await Promise.all([
      sql`select uid, email, display_name, role, last_seen_at from users where role <> 'student' order by role, email`,
      sql`select uid, course_code from user_courses`,
      sql`select code, label from courses where is_theme order by position`,
    ]);
    return {
      courses,
      users: users.map((u) => ({
        email: u.email, name: u.display_name, role: u.role, lastSeen: u.last_seen_at,
        pending: u.uid.startsWith('email:'),
        courses: grants.filter((g) => g.uid === u.uid).map((g) => g.course_code),
      })),
    };
  }
  async function setUser(actor, input) {
    assertAdmin(actor);
    const email = text(input.email).toLowerCase();
    const role = input.role;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ValidationError(['That is not an email address.']);
    if (!['student', 'lecturer', 'admin'].includes(role)) throw new ValidationError(['Role must be student, lecturer or admin.']);
    if (email === actor.email && role !== 'admin') throw new ValidationError(['You cannot remove your own admin access. Ask another admin.']);
    const courses = role === 'lecturer' ? list(input.courses) : [];
    const [before] = await sql`select uid, role from users where email = ${email}`;
    // Someone who has never signed in gets a placeholder uid that lib/auth.ts
    // swaps for the real one at their first sign-in, keeping role and grants.
    const uid = before ? before.uid : 'email:' + email;
    await sql.transaction([
      sql`insert into users (uid, email, role) values (${uid}, ${email}, ${role})
          on conflict (uid) do update set role = excluded.role`,
      sql`delete from user_courses where uid = ${uid}`,
      sql`insert into user_courses (uid, course_code, granted_by)
          select ${uid}, c.code, ${actor.uid} from courses c where c.code = any(${courses})`,
      log('user', email, null, before ? 'update' : 'create', before ? { role: before.role } : null, { role, courses }, actor),
    ]);
    return { email, role, courses };
  }

  // ------------------------------------------------------------ suggestions
  const KINDS = ['fun-fact', 'note', 'flag-question', 'flag-item', 'other'];
  async function addSuggestion(user, input) {
    const body = text(input.body).slice(0, 2000);
    if (body.length < 3) throw new ValidationError(['Say a little more about what should change.']);
    const kind = KINDS.includes(input.kind) ? input.kind : 'other';
    const detail = input.detail && typeof input.detail === 'object' ? JSON.stringify(input.detail).slice(0, 4000) : '{}';
    const [row] = await sql`
      insert into suggestions (kind, course_code, question_qid, item_key, body, detail, from_uid, from_name)
      values (${kind}, ${orNull(input.course)}, ${orNull(input.qid)}, ${orNull(input.itemKey)}, ${body},
              ${detail}::jsonb, ${user ? user.uid : null}, ${orNull(input.name)?.slice(0, 80) ?? null})
      returning id`;
    return { id: Number(row.id) };
  }
  async function listSuggestions(actor, status = 'open') {
    const rows = await sql`
      select s.*, q.item_id as question_item_id, q.prompt as question_prompt
        from suggestions s left join questions q on q.qid = s.question_qid
       where s.status = ${status} order by s.created_at desc limit 200`;
    return rows.filter((r) => (r.course_code ? canEdit(actor, r.course_code) : actor.role === 'admin')).map((r) => ({
      id: Number(r.id), kind: r.kind, course: r.course_code, qid: r.question_qid, itemKey: r.item_key,
      itemId: r.question_item_id ? Number(r.question_item_id) : null, prompt: r.question_prompt,
      body: r.body, detail: r.detail, from: r.from_name, at: r.created_at, status: r.status,
    }));
  }
  async function resolveSuggestion(actor, id, status) {
    if (!['applied', 'dismissed', 'open'].includes(status)) throw new ValidationError(['Unknown status.']);
    const [s] = await sql`select course_code from suggestions where id = ${id}`;
    if (!s) throw new NotFoundError('That suggestion no longer exists.');
    if (s.course_code) assertCourse(actor, s.course_code); else assertAdmin(actor);
    await sql`update suggestions set status = ${status},
                     resolved_by = ${status === 'open' ? null : actor.uid},
                     resolved_at = ${status === 'open' ? null : new Date().toISOString()}
               where id = ${id}`;
    return { id: Number(id), status };
  }

  // ------------------------------------------------------------------ media
  async function listMedia() {
    return sql`
      select m.id, m.kind, m.source, m.url, m.mime, m.bytes, m.title, m.attribution, m.poster_url, m.duration_sec, m.created_at,
             (select count(*)::int from questions q where q.media_id = m.id) as used
        from media m order by m.created_at desc limit 300`;
  }
  async function addMedia(actor, m) {
    const [row] = await sql`
      insert into media (kind, source, url, mime, bytes, title, attribution, poster_url, duration_sec, uploaded_by)
      values (${m.kind}, ${m.source}, ${m.url}, ${m.mime ?? null}, ${m.bytes ?? null}, ${m.title},
              ${m.attribution ?? null}, ${m.posterUrl ?? null}, ${m.durationSec ?? null}, ${actor.uid})
      returning *`;
    return row;
  }
  async function removeMedia(actor, id) {
    const [m] = await sql`select * from media where id = ${id}`;
    if (!m) throw new NotFoundError('That media no longer exists.');
    if (actor.role !== 'admin' && m.uploaded_by !== actor.uid) throw new ForbiddenError('Only an admin or the person who added it can remove it.');
    await sql.transaction([sql`delete from media where id = ${id}`, bump()]);
    return m;
  }

  return {
    canEdit, tree, getItem, checkQuestion, saveQuestion, removeQuestion, saveItem, removeItem,
    saveTopic, listClasses, saveClass, revisions, revert, insights, listUsers, setUser,
    addSuggestion, listSuggestions, resolveSuggestion, listMedia, addMedia, removeMedia,
  };
}
