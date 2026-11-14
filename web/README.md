# Medsci Runner — website version

The same game as `../medsci-runner.html`, served from a database so the answer
key never reaches the browser.

Not a rewrite. This app **serves that exact file**. Every feature, every
animation, every theme and every edge case is whatever the game file says it
is, because it is the game file. Three things are rewritten as it goes out the
door, and nothing else.

Nothing outside this folder changes. `../medsci-runner.html`, `../game-data.js`,
`../developer-tool.html` and the Capacitor build are untouched and keep working
offline exactly as they do now.

## The problem this solves

`game-data.js` ships `correctIndex` to the browser. Open devtools, read
`window.RUNNER_DATA`, and you have every answer. Fine while we're promoting the
game; not fine if the questions ever count for anything.

| | where it lives | who can read it |
|---|---|---|
| prompts, options, topics, lectures, stages | Neon Postgres → inlined at boot | anyone |
| **`correctIndex`, `explanation`** | Neon Postgres, **server only** | nobody, until they answer |
| who you are, Group Race rooms | the game's own Firebase project | unchanged |

The page is served with all 1,130 questions inlined and **zero** answers. When
the player commits, the bridge posts `{ qid, chosenIndex, optionOrder }` to
`/api/answer`, the server grades it and returns the verdict plus the
explanation, and the game's own code carries on exactly as before.

## What gets patched, and what happens if the game changes

`lib/game-page.ts` reads `../medsci-runner.html` and makes three edits in
memory. The file on disk is never written to.

1. `<script src="game-data.js">` → the same object inlined, minus every
   `correctIndex` and `explanation`, followed by `lib/runner-bridge.js`.
   (Classic scripts run before module scripts, so the bridge's globals exist
   before the game boots.)
2. the body of `gradeAnswer()` → `await window.__RUNNER_GRADE(q, chosenIndex)`
3. the body of `gradeFunFact()` → `return window.__RUNNER_GRADE_FUNFACT(q, chosenIndex)`

The anchors live in `lib/game-patches.mjs`, shared with
`scripts/check-anchors.mjs` so the check and the deploy can never disagree.

Each anchor must match **exactly once**. If the game file changes so one
doesn't, the route throws and serves an error page naming the anchor — it does
not serve a half-patched game, because the failure mode of guessing here is
shipping the answer key.

There is one thing to know about `window.__RUNNER_GRADE`: it marks the question
with `q.__graded` rather than checking whether `q.correctIndex` looks unset.
The game shuffles options before showing a question and recomputes
`correctIndex` as `order.indexOf(q.correctIndex)`, which on an answer-free
payload is `order.indexOf(undefined)` — that is `-1`, not `undefined`. An
earlier version treated that as "already graded", skipped the server, and
marked every runner answer wrong.

## Setup

```bash
npm install
cp .env.example .env.local        # paste your Neon connection string
npm run db:schema                 # create/migrate the tables (safe to re-run)
npm run db:import                 # seed it from ../game-data.js (one-off)
npm run dev                       # the game, at http://localhost:3000
```

Neon: create a project at <https://console.neon.tech>, then **Connect** → copy
the **pooled** connection string into `DATABASE_URL`. Keep it out of
`NEXT_PUBLIC_*` — that prefix is what sends a value to the browser.

Firebase needs no configuration here. The game carries its own config inline
(project `runner-9b11b`) and uses Firebase Auth for sign-in and the **Realtime
Database** for Group Race rooms. Those work as-is. When you deploy to a real
domain, add it under Firebase console → Authentication → Settings → **Authorised
domains**, or sign-in will fail there; `localhost` is authorised by default.

To check a `game-data.js` edit without a database:

```bash
node scripts/dry-run.mjs
```

## Routes

| route | what it does |
|---|---|
| `/` | the game — `../medsci-runner.html`, patched as above |
| `/api/answer` | grades one attempt, logs it, returns the explanation |
| `/api/game-data` | the whole content payload as JSON, answers stripped |
| `/icons/*`, `/images/*`, `/feedback.html`, `/feedback-questions.js` | passthrough to the repo root |

The passthrough is a catch-all, so it is deliberately strict: only those two
folders and those two files are reachable, and the resolved path has to stay
inside the repo. `game-data.js` is **not** on the list, and the developer tool
is not served at all — both would hand over the answer key.

## Guarding against guessing

Server-side grading stops people *reading* answers. It doesn't by itself stop
someone trying each option in turn, so `/api/answer` allows **two attempts per
question per browser per 10 minutes** — below the option count, so elimination
never completes. Fun-fact questions are exempt: that's a pass/fail gate on
being hit by a grenade, and rate-limiting it would punish the player under
attack.

Be clear about the limit: `sessionId` comes from the client, so this is a speed
bump, not an authorisation check. Someone with a script can rotate it. Binding
attempts to the Firebase uid, once sign-in is required to play, is what would
close that.

## Where the content lives

**Postgres is the source of truth.** `game-data.js` is generated from it.

```bash
npm run db:export                 # write ../game-data.js from the database
npm run db:export -- --dry        # report only, write nothing
npm run db:verify                 # prove the export matches what is committed
```

The file still exists and still carries the answer key, because GitHub Pages
and the Capacitor app load it directly and play offline. It is an artifact
now, not a document: edit the database, export, commit. A hand edit still
works and `npm run db:import` still reads it, but the next export overwrites
it.

`db:verify` is what makes that safe. It exports to a scratch file, loads both
it and the committed `../game-data.js` through `scripts/load-game-data.mjs`,
and deep-compares the **parsed** objects — key order and formatting differ and
neither matters to the game. If a field in `game-data.js` has no home in the
schema, this fails loudly instead of letting the next export erase it. That is
exactly how `notes`, `relatedCourse`, both contributor fields, `THEMES.label`,
`is_theme` and `runnable_position` were found.

Two things worth knowing:

- **Question ids are the join key.** Changing a question's `id` makes the
  import treat it as a new question and drop the old one, taking its
  `answer_events` history with it. Change the prompt freely; change the id only
  when you mean to.
- **`db:import` is now a one-way legacy path**, kept for re-seeding a fresh
  database from the committed file. It is no longer part of the normal
  workflow.

## The grading seam

`medsci-runner.html` carries two one-line functions whose only job is to be
patched by this app:

```js
async function gradeAnswer(q, chosenIndex){ /* offline: q already carries correctIndex */ }
async function gradeFunFact(q, chosenIndex){ return !!q && chosenIndex === q.correctIndex; }
```

Offline they do nothing. Here their bodies are replaced with the `/api/answer`
round trip. Patching a function body rather than a slice of `answerMCQ()` means
an unrelated edit to the game no longer takes this site down with an anchor
mismatch — and any new mode gets server-side grading just by calling
`gradeAnswer()`.

`npm run check:anchors` runs the same exactly-once check from the command line,
and is wired into `predev` and `prebuild`, so a broken anchor fails at the
terminal rather than as a 500 in production.

## Known difference from the offline build

- **The demo tour doesn't run here.** It reads answers before the player picks,
  which this build deliberately cannot supply. `?demo` shows a banner pointing
  at the offline build; record demos from GitHub Pages.
- **Explanations arrive a beat later** — one round trip after the click,
  instead of instantly from the page.
- **No offline play.** Offline means the answers are on the device. GitHub
  Pages and the phone app keep `game-data.js` and stay fully offline; this
  build is for when that isn't acceptable.

## Layout

```
app/
  route.ts                  the game, at /
  [...asset]/route.ts       icons, images and feedback.html from the repo root
  api/answer/route.ts       grades one attempt — the only place the key is read
  api/game-data/route.ts    the content payload as JSON, answers stripped
lib/
  db.ts                     Neon serverless client (server-only)
  runner-data.mjs           rebuilds the RUNNER_DATA shape from Postgres --
                            shared by the website and the export, so they
                            cannot drift apart
  game-data.ts              the website's call into it: answers and contributor
                            emails stripped
  game-patches.mjs          what gets rewritten in medsci-runner.html
  game-page.ts              reads and patches ../medsci-runner.html
  runner-bridge.js          injected; routes grading through /api/answer
  types.ts                  the verdict shape
db/schema.sql               tables, migrations, indexes, answer-free views
db/game-data-template.json  the hand-written parts of game-data.js -- header,
                            banner comments, the inline GAME_CONFIG notes --
                            spliced back in by the export
scripts/
  load-game-data.mjs        runs a game-data.js in a vm, returns RUNNER_DATA
  apply-schema.mjs          npm run db:schema
  import-game-data.mjs      npm run db:import   (legacy, one-way)
  export-game-data.mjs      npm run db:export
  verify-round-trip.mjs     npm run db:verify
  check-anchors.mjs         npm run check:anchors
  dry-run.mjs               parse and report, no database needed
```
