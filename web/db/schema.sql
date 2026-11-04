-- ============================================================================
-- Medsci Runner — website schema (Neon Postgres)
--
-- This mirrors the shape of ../../game-data.js, with one deliberate change:
-- the answer key (questions.correct_index, questions.explanation) lives in a
-- column that no public API ever selects. Grading happens in /api/answer on
-- the server, so a player with devtools open sees prompts and options and
-- nothing else.
--
-- Safe to re-run: every object is created IF NOT EXISTS, and the import
-- script upserts rather than inserting.
-- ============================================================================

create table if not exists courses (
  code        text primary key,                 -- 'MEDS3003'
  label       text not null,                    -- 'Horizons in Medical Sciences'
  icon        text,
  blurb       text,
  runnable    boolean not null default false,   -- has a STAGES entry
  position    integer not null default 0
);

create table if not exists classes (
  id          bigserial primary key,
  course_code text not null references courses(code) on delete cascade,
  key         text not null,                    -- 'L13', 'L3-4', 'W11'
  label       text not null,
  intro       text,
  outcomes    text[] not null default '{}',
  position    integer not null default 0,
  unique (course_code, key)
);

create table if not exists topics (
  id          bigserial primary key,
  course_code text not null references courses(code) on delete cascade,
  key         text not null,                    -- 'carTCellTherapy'
  label       text not null,
  icon        text,
  color       text,
  position    integer not null default 0,
  unique (course_code, key)
);

create table if not exists items (
  id            bigserial primary key,
  topic_id      bigint not null references topics(id) on delete cascade,
  key           text not null,                  -- 'carModularStructure'
  label         text not null,
  description   text,
  mechanism     text,
  fun_facts     text[] not null default '{}',
  active_recall text[] not null default '{}',
  hashtags      text[] not null default '{}',
  saq           jsonb  not null default '[]',
  refs          jsonb  not null default '[]',
  images        jsonb  not null default '[]',
  course_code   text references courses(code) on delete set null,
  class_key     text,
  position      integer not null default 0,
  unique (topic_id, key)
);

create table if not exists questions (
  id            bigserial primary key,
  item_id       bigint not null references items(id) on delete cascade,
  qid           text not null unique,           -- 'ct-arch-1', stable across imports
  prompt        text not null,
  options       text[] not null,
  -- The answer key. Never selected by /api/questions.
  correct_index integer not null,
  explanation   text,
  difficulty    text not null default 'medium'
                check (difficulty in ('easy', 'medium', 'hard')),
  hashtags      text[] not null default '{}',
  course_code   text,                           -- overrides the item's, when it differs
  class_key     text,
  position      integer not null default 0,
  constraint correct_index_in_range
    check (correct_index >= 0 and correct_index < array_length(options, 1))
);

create table if not exists stages (
  id           bigserial primary key,
  course_code  text not null references courses(code) on delete cascade,
  n            integer not null,
  roman        text not null,
  difficulty   text not null,
  scenario     text,
  requirements jsonb not null default '{}',     -- { topicKey: countNeeded }
  unique (course_code, n)
);

-- The small standalone trivia pool used by the Group Race grenade gift. Not
-- tied to any item, never counted toward stage progress -- but it still has an
-- answer key, so it gets the same treatment as everything else.
create table if not exists fun_fact_questions (
  qid           text primary key,               -- 'ff-honey'
  prompt        text not null,
  options       text[] not null,
  correct_index integer not null,
  explanation   text,
  position      integer not null default 0,
  constraint fun_fact_correct_index_in_range
    check (correct_index >= 0 and correct_index < array_length(options, 1))
);

-- Everything in game-data.js that isn't a question: GAME_CONFIG, LIFE_CONFIG
-- and COMPLETE_SCENARIO. The game needs all of it at boot, so it has to come
-- from somewhere; keeping it here means /api/game-data has a single source.
create table if not exists settings (
  key   text primary key,                       -- 'GAME_CONFIG'
  value jsonb not null
);

-- One row per answered question. The player id is the Firebase uid; there is
-- no users table, because Firebase Auth is the source of truth for identity.
create table if not exists answer_events (
  id           bigserial primary key,
  player_uid   text,                            -- Firebase uid, when signed in
  session_id   text,                            -- per-browser id, for the attempt limit
  question_qid text references questions(qid) on delete cascade,
  fun_fact_qid text references fun_fact_questions(qid) on delete cascade,
  chosen_index integer not null,                -- -1 means the timer ran out
  was_correct  boolean not null,
  room_id      text,                            -- Group Race room, when in one
  answered_at  timestamptz not null default now(),
  -- Exactly one kind of question per row.
  constraint answer_event_has_one_question
    check ((question_qid is null) <> (fun_fact_qid is null))
);

-- Migrations for databases created by an earlier version of this file.
-- `create table if not exists` is a no-op on an existing table, so columns
-- added later have to be applied explicitly. All of these are idempotent.
alter table answer_events add column if not exists session_id   text;
alter table answer_events add column if not exists fun_fact_qid text
  references fun_fact_questions(qid) on delete cascade;
alter table answer_events alter column question_qid drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'answer_event_has_one_question'
  ) then
    -- Older rows predate fun-fact logging, so they already satisfy this.
    alter table answer_events add constraint answer_event_has_one_question
      check ((question_qid is null) <> (fun_fact_qid is null));
  end if;
end $$;

create index if not exists classes_course_idx        on classes (course_code);
create index if not exists topics_course_idx         on topics (course_code);
create index if not exists items_topic_idx           on items (topic_id);
create index if not exists items_class_idx           on items (course_code, class_key);
create index if not exists questions_item_idx        on questions (item_id);
create index if not exists questions_difficulty_idx  on questions (difficulty);
create index if not exists answer_events_player_idx  on answer_events (player_uid, answered_at desc);
create index if not exists answer_events_room_idx    on answer_events (room_id, answered_at desc);
-- Backs the per-question attempt limit in /api/answer.
create index if not exists answer_events_attempt_idx
  on answer_events (session_id, question_qid, answered_at desc);

-- A question with everything the client is allowed to see, and nothing else.
-- Route handlers select from this rather than from questions directly, so a
-- careless `select *` can't leak the answer key.
create or replace view public_questions as
  select q.qid,
         q.prompt,
         q.options,
         q.difficulty,
         q.hashtags,
         coalesce(q.course_code, i.course_code) as course_code,
         coalesce(q.class_key,  i.class_key)    as class_key,
         i.key   as item_key,
         i.label as item_label,
         t.key   as topic_key,
         t.label as topic_label,
         t.icon  as topic_icon,
         t.color as topic_color
    from questions q
    join items  i on i.id = q.item_id
    join topics t on t.id = i.topic_id;

-- Same idea for the trivia pool: prompt and options, no answer.
create or replace view public_fun_fact_questions as
  select qid, prompt, options, position
    from fun_fact_questions;
