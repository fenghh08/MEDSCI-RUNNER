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

-- One row per answered question. The player id is the Firebase uid; there is
-- no users table, because Firebase Auth is the source of truth for identity.
create table if not exists answer_events (
  id           bigserial primary key,
  player_uid   text,
  question_qid text not null references questions(qid) on delete cascade,
  chosen_index integer not null,
  was_correct  boolean not null,
  room_id      text,                            -- Firestore room, for group races
  answered_at  timestamptz not null default now()
);

create index if not exists classes_course_idx        on classes (course_code);
create index if not exists topics_course_idx         on topics (course_code);
create index if not exists items_topic_idx           on items (topic_id);
create index if not exists items_class_idx           on items (course_code, class_key);
create index if not exists questions_item_idx        on questions (item_id);
create index if not exists questions_difficulty_idx  on questions (difficulty);
create index if not exists answer_events_player_idx  on answer_events (player_uid, answered_at desc);
create index if not exists answer_events_room_idx    on answer_events (room_id, answered_at desc);

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
