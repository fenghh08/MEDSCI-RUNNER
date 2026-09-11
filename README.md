# Runner Game — study-guide trivia runner

A browser-based, study-guide trivia runner built for our own med school content (MEDS3002, MEDS2003, and whatever we add next). Hit a topic block, answer a multiple-choice question, push through the stages without running out of life — or skip the running entirely and use Study & Practice for untimed, filterable revision. New to it? The **🎬 See it in action** button on the landing screen is a short interactive walkthrough of the real game, not slides — it uses the actual canvas, a sample question, and a live look at the HUD.

No build step, no server, no install. Every file here is a plain HTML/JS file — double-click and it runs. It's also published as a website (see **Running it**), and the interface can be switched to 繁體中文 / 简体中文 / 日本語 / 한국어 from the 🌐 menu on the landing screen (the study content itself stays in English).

## What's in this repo

| File | What it is |
|---|---|
| `medsci-runner.html` | **The game itself.** Landing screen, Runner mode, Study & Practice, Custom Run, Group Race. This is what you send someone who just wants to play. |
| `game-data.js` | **All the content.** Every course, topic, theme, item, and question lives in this one file as plain data. The game and the developer tool both read it — nothing else needs touching to change what's playable. |
| `developer-tool.html` | **The content tool.** Five tabs — Browse, Add, CSV import, Team queue, Maintainer — for adding, editing, or deleting items, questions, topics, courses and learning outcomes through forms with a live preview, bulk-importing from CSV, reviewing everything the team has queued, and (maintainer only) merging the queue into a complete, ready-to-replace `game-data.js`. Every section has a small **i** button that explains how that part works under the hood. |
| `index.html`, `.nojekyll` | Only there for the website: `index.html` forwards to `medsci-runner.html` so the GitHub Pages URL opens the game directly, and the empty `.nojekyll` tells GitHub to serve the files as-is. Neither is needed for a local copy. |
| `SCORING_AND_LIFE.md` | Exactly how life (glucose/ATP), score, streaks, stage clearing, the question timer and Group Race ranking are calculated, with the tunables that drive them. |
| `TECHNICAL_OVERVIEW.md` | How the plumbing works: Google sign-in, Firebase, the native app build (`www/`, Capacitor, `ios/`/`android/`, `node_modules/`), every JSON/config file, and what must be true for the game to run. |
| `icons/`, `images/` | Icon assets (topic/theme icons, bomb, etc.) plus a few legacy image files. Item images are **links** to their source (listed under the item's References in the game), not files shipped in the repo — see "Images" below. |

All three files (plus the two asset folders) need to sit in the **same folder** — the game and the dev tool both load `game-data.js` via a relative path, and won't find it otherwise.

## Running it

**The easy way — open the website.** The repo is published with GitHub Pages at **https://fenghh08.github.io/MEDSCI-RUNNER/** — nothing to download, works on phones, and Google sign-in works there (it can't from a local `file://` copy). If that link 404s, Pages hasn't been switched on yet: on GitHub go to **Settings → Pages**, set *Source* to **Deploy from a branch**, branch **main**, folder **/ (root)**, save, and it goes live within a minute or two. For sign-in on the site, also add `fenghh08.github.io` under **Firebase console → Authentication → Settings → Authorized domains** (one-time).

**Or run it locally:**

**1. Download the files.** On the GitHub repo page, click the green **Code** button → **Download ZIP**. This gets you everything (`medsci-runner.html`, `developer-tool.html`, `game-data.js`, `icons/`, `images/`) in one file, correctly bundled together.

**2. Extract it first — don't run it from inside the ZIP.** This matters, especially on Windows: double-clicking straight into the ZIP and opening `medsci-runner.html` from there looks like it works, but the browser can't find `game-data.js` or the image folders next to it that way — you'll get a blank or broken-looking game.
   - **Windows**: right-click the downloaded ZIP → **Extract All...** → choose a folder → **Extract**. Then open `medsci-runner.html` from that extracted folder, not from inside the ZIP.
   - **Mac**: double-clicking the ZIP in Finder extracts it automatically into a matching folder — just make sure you're opening the file from that extracted folder, not the `.zip` itself.

**3. Open `medsci-runner.html`.** That's the whole setup — no install, no server. It works fully offline: Group Race needs an internet connection to sync between devices, but solo Runner, Study & Practice, and Custom Run don't need anything beyond the files themselves.

## How the content is structured

Four independent tags, not a strict tree:

- **Course** — a real university course (`MEDS3002`), broken into **Classes** (individual lectures, e.g. `L14`).
- **Topic** — a discipline (`genetics`, `immunology`, ...). Global and flat — the same topic can be reused across different themes without being "owned" by any one of them.
- **Theme** — the playable bundle a person picks on the landing screen (`Cancer`, `Biochemistry`). Each theme has its own topics and items.
- **Item** — one drug, mutation, checkpoint, or concept. Carries `theme`, `topic`, `course`, and `class` as independent tags, plus its own nested list of **questions**.

So a single item might be filed as: theme `cancer`, topic `genetics`, course `MEDS3002` class `L14` — four separate tags, not four levels of nesting. This is what makes Custom Run possible (mix-and-match any combination of theme/topic/course) without duplicating content.

Full storage shape:

```
THEMES
 └─ <theme>
     └─ topics
         └─ <topic>
             └─ items
                 └─ <item>
                     ├─ label, description, mechanism, funFacts, notes, activeRecall, saq, hashtags, refs
                     ├─ images                  ({ caption, url } — links to the source figure, shown alongside refs, never embedded)
                     ├─ course, class            (optional — inherited by nested questions by default)
                     └─ questions[]              (each optionally overriding course/class)
```

`notes` is the same shape as `funFacts` (an array of strings) -- it's
where player-contributed notes/tips land, kept separate from the curated
`funFacts` list. `saq` is an array of `{prompt, modelAnswer}` pairs --
self-graded short-answer questions shown on the item's study-guide page
only (not in Runner/Group Race, which are timed and MCQ-scored): the
student attempts it, reveals the model answer, then marks themselves right
or wrong. That self-grade feeds the same spaced-repetition scheduler MCQ
answers do (see "Review" on the landing screen) -- it just can't be
replayed through the MCQ modal, so a due SAQ shows as a direct link to its
item page instead of queuing into a review session.

## Adding content

Three ways in, all landing in the same shared queue:

### 1. The game itself -- small suggestions from any player

Open an item's study-guide page in `medsci-runner.html` and scroll to the
"Contribute" section: a player can suggest a fun fact, add a note/tip, or
flag something that looks wrong, right from the app -- no separate tool
needed. These write into the exact same Firebase queue `developer-tool.html`
reads below, so they show up for review the same way anything else added
there does. Nothing a player submits is ever visible to other players
directly -- it only becomes real content once a maintainer reviews and
merges it.

### 2. `developer-tool.html` — forms with a live preview

Open it next to `game-data.js`, type your name at the top (it's attached to everything you queue), and use the tabs on the left:

- **Browse** — the whole content tree (course → lecture → item → questions) with a search box, an "incomplete items" summary, and ✏️ buttons that jump straight into editing anything.
- **Add** — one form each for an **item**, a **question**, a **topic**, a **course**, and **learning outcomes**. Every field renders in a preview panel styled like the real game, so what you see is what players will see. Existing courses/topics/items are picked from dropdowns, so a typo can't silently create a near-duplicate category. Editing is the same form with "I'm editing an existing item/question" ticked; deleting is a button on the same page. Edits and deletes ask for the maintainer PIN.
- **CSV import** — see below.
- **Team queue** — everything queued by anyone, live, with filters for content vs. reports/flags. Delete what's wrong, leave the rest for the maintainer.
- **Maintainer** — PIN-locked: merge the queue into a new `game-data.js`, refresh the template, analytics, and a "is this folder up to date with GitHub?" check.

The small **i** buttons next to each heading open a short note on how that part actually works (how the queue syncs through Firebase, how the merge validates its output, why ids are generated the way they are…). The **🎓 Take the tour** button walks through the tabs once.

### 3. CSV import — for bulk work

The CSV tab has four importers, each with a column reference right above its paste box: a **whole lecture** (items *and* their questions in one sheet), **questions for one existing item**, **items only**, and **learning outcomes**. Rows are checked before anything is queued — a bad row is listed with its line number rather than silently skipped — and each tab can also **export** the current content in the same format, so the easiest way to get a template is to export first. A Google Sheets → *File → Download → CSV* export pastes straight in.

### The shared queue

Everything added — new items, edits, deletions, questions, new themes — lands in a **team queue**, synced live via Firebase so everyone working on this sees the same list in real time (falls back to local-only if there's no connection; nothing breaks, it just stops being shared until reconnected). Review it, delete anything wrong, leave the rest.

## Merging into the real file (maintainer only)

The **Maintainer** tab of `developer-tool.html` is locked behind a 4-digit PIN (see `MAINTAINER_PIN` near the top of the `<script>` block — **change it from the default before handing this file to anyone**, it's plain text in the source and only meant to stop accidental clicks, not determined snooping).

Once unlocked: **Generate merged game-data.js** takes everything currently in the queue and folds it into a complete, ready-to-paste copy of the file — themes, topics, and items included. It's validated as real JavaScript before it's ever shown to you, so a broken merge fails loudly with an error instead of silently corrupting the file. Copy or download the result, replace `game-data.js`, and push.

The merge only touches `COURSES`, `TOPICS`, and `THEMES` — everything else in the file (`GAME_CONFIG`, `LIFE_CONFIG`, `STAGES`, header comments) is carried through from a template, untouched, every time. That template only needs manual refreshing if you've hand-edited one of those sections directly, bypassing the tool entirely — routine content merges never touch it.

Also on that tab, past the same PIN gate, is **Analytics** — aggregate correct/wrong counts per question, collected from every player answering anywhere in the game (Runner, Group Race, Study & Practice, Review), sorted by miss rate. No per-player data, just counts per question — it's meant to answer "which questions are people actually struggling with," not to track anyone individually.

## Distributing updates

Git is push-only for the maintainer here — contributors pull, they don't push directly. After merging a batch:

```
git add game-data.js
git commit -m "merge: <short description of what was added>"
git push
```

The website updates itself: GitHub Pages redeploys from `main` within a minute or two of every push, so anyone using the link is on the new content on their next reload. Everyone with a local copy runs `git pull` and their `medsci-runner.html` picks up the new content automatically — it just reads whatever `game-data.js` is sitting next to it. `developer-tool.html` does the same, so contributors always see the current state of the game without anyone needing to send files around by hand.

## Interface languages

The 🌐 menu on the landing screen switches every menu, button, HUD label, popup and tutorial caption to Traditional Chinese, Simplified Chinese, Japanese or Korean, and back. The choice is remembered on the device and, when signed in, follows you across devices like the theme does. **Study content is not translated** — items, questions, explanations and stage stories are course material that would need a human check, so they stay in English on purpose. The translations live inside `medsci-runner.html` as one dictionary per language, keyed by the English text; a string with no translation simply shows in English, so nothing breaks when new UI text is added before its translations are.

## Known limitations, worth knowing before relying on them

- **Group Race caps out fast.** The Firebase project backing it is on the free tier — 100 simultaneous connections *total*, shared across everyone using the game at once, not per room. Fine for a few friends racing; not built for a lecture hall.
- **The maintainer PIN is a deterrent, not security.** It's readable in the page source by anyone who opens dev tools. It stops accidental destructive clicks, not a determined bypass.
- **`sessionStorage`/`localStorage` can be unavailable** in some browsers for local `file://` pages (Firefox and Safari are stricter about this than Chrome). The tool degrades gracefully if so — PIN unlock just won't persist across a reload — rather than breaking.
- **The merge tool only replays queue entries added after the merge feature shipped.** Anything older only has its display text, not structured data, and gets skipped (with a clear count shown) rather than guessed at.
