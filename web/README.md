# Medsci Runner — website version

A separate Next.js app that serves the **same question bank** as the HTML game,
but from a database instead of a JavaScript file.

Nothing in here touches the existing game. `../medsci-runner.html`,
`../game-data.js`, `../developer-tool.html` and the Capacitor build are
unchanged and keep working exactly as they do now. This folder reads
`../game-data.js` once, at import time, and never writes to it.

## Why

`game-data.js` ships the answer key to the browser. Anyone can open devtools,
read `window.RUNNER_DATA`, and see `correctIndex` for every question. Fine while
we're promoting it; not fine if the questions ever count for anything.

Here the split is:

| | where it lives | who can read it |
|---|---|---|
| prompts, options, topics, lectures | Neon Postgres → `/api/questions` | anyone |
| **`correct_index`, `explanation`** | Neon Postgres, **server only** | nobody, until they answer |
| who you are | Firebase Auth | you |
| live group-race rooms, scores | Firestore | room members |

The client never receives an answer. It posts `{ qid, chosenIndex }` to
`/api/answer` and the server replies with correct/incorrect plus the
explanation. `/api/questions` reads the `public_questions` view, which has no
`correct_index` column at all — so a careless `select *` can't leak it either.

## Setup

```bash
npm install
cp .env.example .env.local        # paste your Neon connection string
npm run db:schema                 # create the tables (safe to re-run)
npm run db:import                 # load everything from ../game-data.js
npm run dev
```

Neon: create a project at <https://console.neon.tech>, then **Connect** → copy
the **pooled** connection string into `DATABASE_URL`. Keep it out of
`NEXT_PUBLIC_*` — that prefix is what sends a value to the browser.

Firebase is optional. Leave the `NEXT_PUBLIC_FIREBASE_*` values blank and the
practice flow still runs; filling them in enables sign-in and, later, rooms.
Deploy `firestore.rules` with `firebase deploy --only firestore:rules`.

To see what an import would write without a database:

```bash
node scripts/dry-run.mjs
```

## Keeping the two versions in sync

`game-data.js` stays the single source of truth for now. Edit it as you always
have (by hand, or with `../developer-tool.html`), then re-run `npm run db:import`.
The import upserts on natural keys — course code, course+class key,
course+topic key, topic+item key, and question `id` — and deletes rows that have
disappeared from the file, so the database ends up a faithful mirror rather than
accumulating stale content.

Two consequences worth knowing:

- **Question ids are the join key.** Changing a question's `id` in
  `game-data.js` makes the import treat it as a new question and drop the old
  one, taking its `answer_events` history with it. Change the prompt freely;
  change the id only when you mean to.
- **Duplicate ids collapse.** `game-data.js` currently has one duplicate,
  `q-metabolism-3jk7` in MEDS3002, so 1131 questions in the file become 1130
  rows. `scripts/dry-run.mjs` lists any duplicates it finds.

If the website eventually becomes the source of truth, the direction reverses:
write an exporter that regenerates `game-data.js` from the database, so the
offline HTML game and the Capacitor builds keep working.

## Layout

```
app/
  page.tsx                  course list, read straight from Postgres
  play/[course]/            a ten-question practice set
  api/courses/route.ts      course list with counts
  api/questions/route.ts    questions WITHOUT the answer key
  api/answer/route.ts       grades one attempt, logs it, returns the explanation
lib/
  db.ts                     Neon serverless client (server-only)
  firebase.ts               Auth + Firestore, no-ops until configured
  types.ts                  the shapes that cross the network
db/schema.sql               tables, indexes, and the public_questions view
scripts/
  load-game-data.mjs        runs ../../game-data.js in a vm, returns RUNNER_DATA
  apply-schema.mjs          npm run db:schema
  import-game-data.mjs      npm run db:import
  dry-run.mjs               parse and report, no database needed
firestore.rules             who can read and write rooms
```

## Not built yet

The scaffold stops at a working practice loop. Still to come:

- Runner mode, Study & Practice filters, and Review, ported from the HTML game
- Firebase sign-in wired into the UI, with the uid passed to `/api/answer`
- Group Race rooms on Firestore (`rooms/{id}/players/{uid}` holds live scores)
- An authoring UI to replace `developer-tool.html`, writing to Postgres directly
