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

-- Fields that game-data.js has always carried but the first version of this
-- schema had no home for. Without them the database is a lossy mirror: an
-- export would silently erase contributor credit on 774 questions and 188
-- items. `notes` is the player-contributed counterpart to the curated
-- `fun_facts`; `related_course` is the legacy free-text citation kept for the
-- handful of rows that use it instead of course_code + class_key.
-- A course wears two hats and they are not the same string: COURSES.label is
-- the full name ('Breakthroughs in Medical Science'), THEMES.label is what the
-- landing screen shows on the tile ('MEDS3002'). One column collapsed them.
-- is_theme records that the course is playable at all -- PCOL3011 is a theme
-- with no topics yet, which is not the same as a lecture-only course.
-- runnable_position keeps RUNNABLE_THEMES in its authored order, which is not
-- the order the courses themselves are listed in.
alter table courses add column if not exists theme_label       text;
alter table courses add column if not exists is_theme          boolean not null default false;
alter table courses add column if not exists runnable_position integer;

alter table items     add column if not exists notes             text[] not null default '{}';
alter table items     add column if not exists related_course    text;
alter table items     add column if not exists contributor_name  text;
alter table items     add column if not exists contributor_email text;
alter table questions add column if not exists related_course    text;
alter table questions add column if not exists contributor_name  text;
alter table questions add column if not exists contributor_email text;

-- ============================================================================
-- Identity and roles.
--
-- Firebase Auth stays the identity provider -- the game already signs people
-- in with Google and that works on the web and in the phone app. What it
-- cannot do is say who may EDIT what, so that lives here, keyed by the
-- Firebase uid. The server verifies the ID token and then reads this table;
-- the client is never trusted for a role.
--
-- This replaces two things that were never security: the dev tool's plaintext
-- access codes, and the Firebase RTDB nodes adminAccess/ ucAccess/ that the
-- codes gated.
-- ============================================================================

create table if not exists users (
  uid           text primary key,                -- Firebase uid
  email         text unique not null,
  display_name  text,
  role          text not null default 'student'
                check (role in ('student', 'lecturer', 'admin')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

-- Which courses a lecturer may edit. Admins are unscoped and need no rows
-- here; students never get any.
-- ON UPDATE CASCADE matters here. A user granted access before they have ever
-- signed in is stored with a placeholder uid (`email:<address>`), which
-- lib/auth.ts replaces with the real Firebase uid on first sign-in. Without
-- the cascade that rename is rejected, because these rows still point at the
-- placeholder -- so the grant would have to be deleted and recreated, and a
-- lecturer would silently lose their courses the moment they logged in.
create table if not exists user_courses (
  uid         text not null references users(uid) on update cascade on delete cascade,
  course_code text not null references courses(code) on delete cascade,
  granted_by  text references users(uid) on update cascade on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (uid, course_code)
);

-- For databases created before the cascade was added.
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'user_courses_uid_fkey' and confupdtype <> 'c'
  ) then
    alter table user_courses drop constraint user_courses_uid_fkey;
    alter table user_courses add constraint user_courses_uid_fkey
      foreign key (uid) references users(uid) on update cascade on delete cascade;
  end if;
  if exists (
    select 1 from pg_constraint
     where conname = 'user_courses_granted_by_fkey' and confupdtype <> 'c'
  ) then
    alter table user_courses drop constraint user_courses_granted_by_fkey;
    alter table user_courses add constraint user_courses_granted_by_fkey
      foreign key (granted_by) references users(uid) on update cascade on delete set null;
  end if;
end $$;

-- ============================================================================
-- The admin content app.
--
-- content_revisions is the audit trail: every write made through /api/admin
-- records what the row looked like before and after, and who did it, in the
-- same transaction as the write itself. That is what gives lecturers a
-- history, a diff and an undo -- none of which merging a file could offer.
-- ============================================================================
create table if not exists content_revisions (
  id          bigserial primary key,
  entity      text not null,              -- 'question' | 'item' | 'topic' | 'class' | 'user'
  entity_key  text not null,              -- qid, item id, topic id, ...
  course_code text,                       -- for scoping what a lecturer may see
  action      text not null check (action in ('create', 'update', 'delete', 'revert')),
  before      jsonb,
  after       jsonb,
  actor_uid   text references users(uid) on update cascade on delete set null,
  at          timestamptz not null default now()
);
create index if not exists content_revisions_entity_idx on content_revisions (entity, entity_key, at desc);
create index if not exists content_revisions_course_idx on content_revisions (course_code, at desc);

-- Player suggestions and question reports. These used to be pushed to the
-- Firebase RTDB `contributions` queue and merged into a file by hand; now a
-- lecturer reads them here and edits the live content directly.
create table if not exists suggestions (
  id            bigserial primary key,
  kind          text not null check (kind in ('fun-fact', 'note', 'flag-question', 'flag-item', 'other')),
  course_code   text,
  question_qid  text,
  item_key      text,
  body          text not null,
  detail        jsonb not null default '{}',
  from_uid      text references users(uid) on update cascade on delete set null,
  from_name     text,
  status        text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  created_at    timestamptz not null default now(),
  resolved_by   text references users(uid) on update cascade on delete set null,
  resolved_at   timestamptz
);
create index if not exists suggestions_status_idx on suggestions (status, created_at desc);

-- Video and 3D media. A row is reusable: one animation can back several
-- questions. Postgres holds the URL and metadata only -- the bytes live in
-- blob storage, on YouTube/Vimeo, or (for molecular structures) at RCSB.
create table if not exists media (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('video', 'model', 'image')),
  source        text not null check (source in ('upload', 'external', 'pdb')),
  url           text not null,              -- blob URL, embed URL, or the PDB id
  mime          text,
  bytes         bigint,
  title         text not null,
  attribution   text,
  poster_url    text,
  duration_sec  integer,
  uploaded_by   text references users(uid) on update cascade on delete set null,
  created_at    timestamptz not null default now()
);
alter table questions add column if not exists media_id uuid references media(id) on delete set null;
-- A model that takes six seconds to load inside a 45-second timed question is
-- a bad question, so media questions can be kept to the untimed modes.
alter table questions add column if not exists allow_in_timed boolean not null default true;
alter table items     add column if not exists media_id uuid references media(id) on delete set null;

create index if not exists users_role_idx         on users (role);
create index if not exists user_courses_course_idx on user_courses (course_code);

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
