# Run Morris Run! — Development Report

A working log of what this project is, what's been built, every real issue hit along the way and how it was actually fixed, and what's still open. Written for handing to a supervisor/teammate as a record of the work, not as a how-to guide (see `README.md` for that).

**Scope note:** this document covers the extended session of work described below in full detail (packaging the app, the mobile/UX fixes, new content, the developer-tool rebuild, the incident investigations, Group Race's course/topic/lecture filtering, community contributions, spaced repetition, self-graded SAQs, analytics, and account sync). Earlier project history exists in `git log` going back further (score tracking, streak bonuses, the original Course-based restructure, etc.) but isn't itemized here in the same depth.

---

## 1. What this project is

**Run Morris Run!** is a browser-based, study-guide trivia runner built for med-school revision (MEDS3002, MEDS2003, and MEDS3003 — now fully built out across all 9 of its lectures). Players run a cell down a vessel, hit topic blocks, answer multiple-choice questions, and either push through timed Runner-mode stages or use untimed Study & Practice / Custom Run / Learning Path / **Review** (spaced repetition) / Group Race for more flexible revision.

Three files carry the whole thing, all plain HTML/JS with no build step:

| File | Role |
|---|---|
| `medsci-runner.html` | The game itself — the only file players ever open. |
| `game-data.js` | All content — every course, topic, item, and question, as one data file both the game and the dev tool read. |
| `developer-tool.html` | The contributor tool — add/edit content through a form or CSV, generate a ready-to-paste `game-data.js`. **Not** bundled into the shipped app. |

It also ships as a native iOS/Android app via **Capacitor**, which wraps the same three web files (minus `developer-tool.html`) in a native shell.

---

## 2. Features added

### Mobile app packaging
- Set up a full Capacitor project (chosen over Cordova/RN WebView) wrapping the existing web game untouched — got it running on iOS Simulator and a physical iPhone 15 Pro, including code signing with a free Personal Team and enabling iOS Developer Mode.
- Added `scripts/copy-web-assets.js` + `npm run sync`, which regenerates `www/` (Capacitor's web root) from the root `medsci-runner.html` / `game-data.js` / `icons/` / `images/` — the root files stay the single source of truth; `www/`, `ios/App/App/public/`, and `android/app/src/main/assets/public/` are disposable, regenerated copies.

### Portrait / mobile layout
- Canvas now resizes its own drawing resolution to match the real on-screen box instead of staying locked to a fixed landscape grid (`resizeCanvasForPortrait()`, a `SCALE` factor applied to every entity size).
- HUD's actual measured height is reserved as a no-go zone in the game's coordinate system (`updateTopInset()` / `--hud-clearance`), so it can never again cover the top lane or a modal, in any orientation — replaces a fixed, landscape-only magic number.
- Reaction time now scales with actual screen width (`W/960` factor) so a narrower phone doesn't make obstacles feel like they arrive faster than intended.
- Full safe-area padding (`env(safe-area-inset-*)`) so the status bar / notch / home-indicator never overlaps the title or controls when running edge-to-edge as a native app.

### Gameplay / UX
- Anti-crowding entity spawn logic (`pickRoomyLane()`) so obstacles/bombs/glucose stop spawning stacked on top of each other.
- Bomb redesigned to look visibly dangerous (spiky pulse animation) instead of just another block.
- "Flag question for later review" — flag from the MCQ feedback screen, reviewable afterward.
- Colorblind-accessible feedback: non-color cues added to correct/wrong MCQ answers and the low-life warning; one topic color that clashed with another in the same course was changed.
- Score-info popup ("How scoring works") now auto-closes instead of getting stuck open across a resume.
- Various copy/UI simplification: shorter title ("Run Morris Run!"), trimmed verbose text, full-screen game view during play, removed the version tag, fixed mismatched button widths and clipped stall-warning text.
- **Light/dark theme toggle** — retheme covers the UI chrome (menus, HUD, modals, buttons, panels) via the existing CSS variable system; the in-game canvas deliberately keeps its dark "vessel" art style in both modes, since its draw calls use literal colors tuned for a dark backdrop rather than the CSS variables. Defaults to dark, explicit toggle only, remembered via localStorage.
- **Cell customisation screen** — color (6 options), face expression (4), accessory (4) picker with live preview and Randomise button, all drawn with canvas shapes (no new image assets). The in-game player sprite and the picker share one `drawCellSprite()` function, so what's picked is exactly what races. Persisted via localStorage, and now syncs across devices for a signed-in player (see Account sync, below).
- **Group Race setup reordered** — now asks Host vs Join first; course/topic choice only appears inside the Host flow; name is asked separately in each flow instead of upfront for both.
- **Group Race: any course, plus optional topic/lecture filtering** — previously only the two courses with hand-authored stage content (MEDS3002/MEDS2003) were raceable. The host can now pick *any* course, and optionally narrow to specific topics and/or lectures within it. A course with no authored stage script (or any narrowed race) transparently reuses the same on-the-fly stage generator Custom Run already had, rather than needing new authored content — so this was almost entirely a reuse/wiring job, not new game logic. The waiting screen now also shows "Playing: `<course>` · `<topics>` · `<lectures>`" so joiners aren't going in blind.
- **"Browse by lecture" rebuilt as two levels** — pick a course first (with lecture/item counts), then pick a lecture within it, instead of one long flattened list of every lecture from every course. Lectures now sort by actual lecture number (`L7-8, L9, L10, L11, L12`) instead of alphabetically, and render as a single-column list instead of a card grid.
- **Learning outcomes now shown in Browse by lecture** — any lecture with authored outcomes shows them as a clearly labeled bullet list above its item list (reusing the same rendering already used by Learning Path's stage-intro screen).
- **Read aloud** — a button on each item's study-guide page uses the browser's built-in Web Speech API to read the label/description/mechanism out loud. Free, offline, no server; voice quality depends entirely on the device.

### New game modes

**Learning Path** — pick a lecture, see its learning outcome(s) up front, then work through questions ordered by cognitive level (identify → understand → apply → case study), using the same run engine as every other mode. Backed by `LEARNING_PATH_CONFIG` (levels/quotas/labels) in `game-data.js` and per-lecture `outcomes`/`intro` fields on `COURSES[...].classes[...]`.

**Review (spaced repetition)** — a real scheduler, not just a filter. Every question answered anywhere in the app (Runner, Group Race, Study & Practice, or a self-graded SAQ) updates a simple Leitner-box schedule (`srsState`, keyed by `itemId::questionId`): a correct answer moves a question up a box (reviewed less often, per a fixed `[0,1,3,7,16,35]`-day interval table), a wrong one drops it straight back to box 0. A new "📅 Review" mode card shows a live due-count badge and opens a calendar — every day is tappable and shows exactly what's due/scheduled that day, with each entry tappable to jump straight to its item page. "Start review" launches the due MCQ questions through the same practice-quiz machinery Study & Practice already uses. Deliberately much simpler than a floating-point SM-2 ease-factor scheduler — one interval array, easy to retune, still gives a real spaced effect.

### Content
- **MEDS3003 (Advanced Therapeutics) fully built out** across several content pushes — now 9 lectures, 62 items, ~185 questions, covering:
  - Nanoparticle drug delivery + extracellular vesicles (L7-8).
  - Auditory system anatomy/physiology + cochlear implants (L9-L10), and biosensors (L11-L12).
  - Mass spectrometry in diagnostics (L2).
  - Gene therapy strategies — mutation types, AAV, ASOs, CRISPR, the Christianson syndrome case study (L3-4).
  - ATTR amyloidosis — TTR biology, hereditary vs wild-type, RNAi therapeutics, CRISPR gene editing (L5-6).
  - All distractors deliberately written to avoid an obviously-longer or differently-styled correct answer, per explicit instruction.
- Obstacle/bomb spawn gaps widened per playtester feedback that content was arriving too fast.
- Images reorganized into a `images/<course>/<lecture>/` folder structure, with every image-URL-building path in the developer tool updated to a single shared helper so it stays consistent.
- **Self-graded short-answer questions (SAQs)** — a new optional per-item field (`saq: [{prompt, modelAnswer}]`), shown only on the study-guide item page (not in Runner/Group Race, which are timed and MCQ-scored — self-grading doesn't fit that). The player attempts it, reveals the model answer, then marks themselves right or wrong; that self-mark feeds the same spaced-repetition scheduler as MCQ answers. 22 authored for MEDS3003 across all 7 topics, synthesized from the already-curated item descriptions/mechanisms.

### Community contributions
Regular players (not just people using the separate developer tool) can now suggest a fun fact, add a note/study tip, or flag something that looks wrong, directly from an item's study-guide page — a new "🤝 Contribute" section. These write into the exact same Firebase "contributions" queue `developer-tool.html` already reviews and merges from, so nothing publishes directly and a maintainer still reviews everything; players never see each other's pending submissions. `notes` is a new item field (parallel to the curated `funFacts`, but for crowd-sourced tips), round-tripped through the same merge/edit-form pipeline as everything else.

### Analytics
Aggregate correct/wrong counts per question, collected from every player's answers across every mode — no per-player data stored, just counts per question — surfaced in the developer tool as a sortable "which questions get missed the most" table, to help find items that need a clearer explanation or a bad distractor fixed.

### Account sync (Google sign-in)
Players can sign in with Google (via Firebase Authentication, reusing the same Firebase project everything else already uses) so their spaced-repetition schedule, cell customization, and theme follow them across devices instead of staying stuck on one. Live, not just at login — a change on one signed-in device shows up on another without a reload. Signing out never touches local data; everything keeps working fully offline/signed-out exactly as before this existed. **Web sign-in only for now** — the packaged iOS/Android app needs a native Google Sign-In plugin instead (Google blocks its OAuth popup inside an embedded WebView), which is flagged as separate follow-up work, not yet built. Apple sign-in is deferred by explicit choice (Google first).

### Developer tool (`developer-tool.html`)
- **Image picker** — file picker with live thumbnail preview and a one-click "save a correctly-renamed copy" button, replacing blind caption/filename typing.
- **Two-way CSV sync for Items and Questions** — export everything as CSV, edit in a spreadsheet, paste back in: a recognized `itemId`/`questionId` updates that item/question in place (ignoring its own theme/topic/course columns, so a typo can't move it), a blank id creates new, nothing is ever deleted by import. Backed by a new `edit-question` merge-tool entry type and pair-list CSV encoding (`caption|filename;...`) for images/refs. Blank-cell-means-unchanged handling made consistent across every optional field (`mechanism`, `funFacts`, `notes`, `hashtags`, `refs`, `activeRecall`, `images`).
- **Two-way CSV sync for Learning Outcomes** — same pattern: export every lecture across every course, edit `outcomes`/`intro` in a spreadsheet, paste back in. Can only update outcomes on lectures that already exist (not create new courses/lectures); a blank `outcomes` column safely skips that row instead of clearing existing content.
- `q_level` (cognitive level) field added to the question form and its CSV import/export, feeding the Learning Path mode.
- "Lecture learning outcomes" single-lecture authoring card, plus a `lectureOutcomes` queue/merge-tool entry type.
- One-click "🔄 Refresh from GitHub main" button for the merge tool's template, plus a regenerated, up-to-date fallback — see the data-loss incident below for why this exists.
- "🧠 Test yourself" button added to item study-guide pages in the shipped game itself (a quick self-test quiz scoped to that one item's questions, separate from the developer tool).
- **Full reorganization into a 6-tab layout** (📖 Existing structure / 📄 New item / ❓ New question / 📚 New course / 👥 Team queue / 🛠 Maintainer) — the page had grown to ~3700 lines with the team queue, merge tool, and analytics all permanently visible below every tab regardless of what you were doing, with no visible container around them at all (a genuine CSS bug — `.batch` had no border/background, just a bare heading). Extended the tab system that already existed for the first four sections rather than inventing a new pattern; zero logic changes, purely markup regrouping plus CSS. The Team Queue tab shows a live pending-count badge. The two similar-looking question-CSV bulk-import cards got clearer headers and a "which one do I want?" note, since they'd become genuinely hard to tell apart.

---

## 3. Issues hit, and how they were actually fixed

### Layout & rendering
| Issue | Root cause | Fix |
|---|---|---|
| Top lane hidden under HUD; MCQ panel overlapping content on phones | Canvas had a fixed 960×480 internal resolution regardless of the real on-screen box, so HUD/modal sizing (tuned for landscape) no longer matched | Canvas resolution now tracks the real rendered box in portrait (`resizeCanvasForPortrait`); every draw position/margin scales off measured `topInset`/`SCALE` instead of fixed pixels |
| Reported as portrait-only at first | — | Turned out to affect landscape too once traced properly; fix was made orientation-agnostic, not portrait-specific |
| Pause button visible but non-functional during a question | By design (confirmed with the user) — pausing mid-MCQ was intentionally disabled, but the button didn't reflect that | Kept disabled deliberately, per explicit user confirmation, rather than "fixed" into something else |
| Entities spawning stuck together | No lane-occupancy check at spawn time | Added `pickRoomyLane()` to check lane availability before spawning |
| Reaction time felt too fast on narrower phones | Fixed pixel speeds didn't account for varying canvas width | Speed now scales by `W/960` |
| Question card opened mid-scroll instead of from the top | No scroll reset when opening the MCQ panel | `mcqPanelCard.scrollTop = 0` added on open |
| "How scoring works" popup stuck open after a resume | No auto-close logic existed at all | Added to `syncHudVisibility()` |
| Mismatched button widths / clipped stall-warning text | CSS sizing issues | Fixed directly once reproduced from screenshots |
| Long racer names wrapped the score onto a second line in Group Race, reading as "cropped/broken" | `.lb-row`'s flex children had no `flex-shrink`/`white-space:nowrap` protection | Name truncates with an ellipsis; score/status always stays on one line |
| Long content (MCQ card, race summary) looked cut off mid-scroll instead of obviously scrollable | `.panel-card` has always been scrollable (`max-height:92%`) with zero visual cue that more content exists below | Added a small pinned "▾ more below" hint, shown/hidden by actual scroll position, to every `.panel-card` |
| Topic blocks (the thing you steer into to trigger a question) were hard to see against the background | Their fill color was nearly identical to the vessel background at low opacity, and the emoji icon drawn on top inherited whatever `fillStyle` the block's own fill had last set — a near-invisible color, not a legible one | Brightened the block's fill/glow, and made `drawIconOnCanvas()` set its own explicit fillStyle instead of depending on caller state |
| In-game HUD text (life/score/racer names/the "hit a topic block" hint) went nearly unreadable specifically in light theme | The HUD overlays the canvas, which by design *never* re-themes (stays dark in both modes) — but the HUD's own text color was following the page-wide light/dark toggle, so light theme flipped it to a dark ink color sitting on the still-dark canvas underneath | Pinned the HUD/leaderboard/stall-warning text to fixed "always readable on dark" CSS variables, independent of the page theme |
| Racer scoreboard panel took a few real seconds to appear after a race started | It only re-rendered on the next Firebase value-change event, and nothing necessarily changes in the first moment after a race begins | Renders immediately from the roster snapshot already cached from the waiting-room listener, instead of waiting on the next round-trip |
| Landing-screen course cards (MEDS3002/3003 etc.) had left-aligned text under a centered icon, inconsistent with the mode-picker cards right below them | `.pick-card`'s text-align default was never overridden for the course grid specifically | `.cancer-grid .pick-card` now centers, matching the mode cards |

### Toolchain
| Issue | Root cause | Fix |
|---|---|---|
| Capacitor CLI failing on `.ts` config | `npm install -D typescript` pulled TypeScript 7 by default, which dropped the classic compiler API Capacitor's CLI needs | Pinned to `typescript@^5.4` |
| Headless-Chrome test harnesses silently failing | Nested `requestAnimationFrame` chains are unreliable under `--virtual-time-budget` | Switched to `setTimeout`-based test hooks, which worked reliably — used as the verification method for every change from that point on |
| Test hooks throwing `ReferenceError` for page variables | The game/dev-tool's main script is `<script type="module">`, so top-level consts are private to that module and invisible to a separately injected classic `<script>` | Test hooks now get injected *inside* the page's own module script instead of alongside it |

### The developer-tool data-loss incident (most serious issue found)
A downloaded "merged" `game-data.js` was found to have broken the entire game. Investigation traced it to **three distinct, real bugs**, not one:

1. **Primary, game-breaking bug:** the "Generate merged game-data.js" button falls back to a template *hardcoded inside `developer-tool.html` itself* whenever nobody has run its "Extract & Save Template" step first (an easy-to-miss, optional action in a collapsed section). That hardcoded fallback had drifted out of date — it predated `LEARNING_PATH_CONFIG` entirely, and `medsci-runner.html` reads `LEARNING_PATH_CONFIG.levels` unconditionally at page load, so any file generated from the stale fallback **crashed the entire game on load**, not just Learning Path mode.
   - *Fix:* refreshed the hardcoded fallback (`DEFAULT_TEMPLATE`) to exactly match current `game-data.js` content, verified via a headless test simulating a fresh page with no cached template. Later hardened further with a one-click "🔄 Refresh from GitHub main" button so this can't recur silently.
2. Same stale fallback also reverted `GAME_CONFIG` obstacle/bomb spawn timing to older, tighter values, undoing an earlier balance fix.
3. **Separate, unrelated bug:** the Items CSV export only knew how to carry an image's `caption`+`filename`. A couple of items had been hand-authored directly in `game-data.js` with just a `url` (no `filename`) — exporting and reimporting those silently blanked the image out.
   - *Fix:* export now derives a filename from `url` when `filename` is missing, so the round-trip is lossless either way. Verified against the real affected item (CAR-T cell therapy).
4. A smaller, self-inflicted mistake surfaced right after: manually restoring one legitimate new image reference, the `url` field was left off (only `caption`+`filename` were set), even though every other stored image entry carries both — the game reads `img.url` to build the `<img src>`, so the image rendered broken until this was caught from a screenshot and fixed.

**Net effect on process:** confirmed the safest habit going forward is reloading `developer-tool.html` fresh right before merging, rather than merging from a tab that's been open a while, since the merge reads whatever was loaded into that tab's memory, not necessarily the current file on disk.

### CSV sync design
- Initial design question: how to support editing existing items/questions via CSV without every re-import creating a duplicate. Solved with an add-or-update-by-ID convention: a recognized ID updates in place (ignoring its own theme/topic/course columns so a stray edit can't move it), a blank ID creates new, nothing is ever deleted by import.
- A test assertion once falsely reported a missing `level` field in the merge output — traced to a string-matching bug in the *test* code itself (`"level:'case'"` vs. the actual `'level': 'case'` with a space), not the feature; fixed the test, not the app.

### Bugs found and fixed while building the newer features
- **Test-yourself quiz sessions weren't recording toward spaced repetition (or the session log) at all.** Root cause: a raw item's `questions[]` array in `game-data.js` never carries its own `itemId` (it's only implicit from nesting) — every *other* code path enriches questions with `itemId` before use, but the item-page "Test yourself" button's queue-building was the one place that didn't. Fixed at the one call site, which also retroactively fixed a pre-existing, unnoticed gap in session-log data for that same flow.
- **A maintainer editing an item via the developer tool's own form would have silently wiped its `notes` field** the moment the new "notes" feature shipped — the edit form's prefill/collect logic was updated for `funFacts` everywhere except one of its two save-object branches (`buildItemObject()`'s new-item path), caught by re-reading the diff rather than assuming a `replace_all` edit had actually landed everywhere it needed to.
- **The maintainer's "🧹 Remove merged entries from the queue" button would have silently deleted unreviewed flags** the next time *any* unrelated batch got merged — flags were being counted as "merged" (and thus safe to clear) even though nothing about a flag ever actually merges into `game-data.js`. Fixed by excluding flag entries from that count entirely, so they only ever leave the queue when a maintainer removes them by hand.
- **Community-contributed fun facts risked silently deleting an item's existing fun facts on merge.** The merge tool does a full-field *replace* of an item, not an incremental patch — a naive "just send the new fact" submission would have overwritten the array instead of appending to it. The in-app contribution flow clones the item's entire current field set before appending, mirroring exactly what the maintainer's own "Edit this item" form already does.
- **Closing the study guide after jumping to an item from the Review calendar left a blank landing screen** — the jump hid the Review screen without anything else visible underneath it to fall back to once the modal closed. Fixed with a small "return to Review, not the generic landing screen" flag, set only on that specific jump path.
- **The Review calendar wasn't clickable on any day but today, and clicking a day gave no visual feedback about which one was selected.** Extended the (originally read-only) calendar renderer to accept a click handler and a distinct "selected" style, separate from "today"'s own marker, so both can be true of the same day at once.
- **The "saved" confirmation after submitting a contribution disappeared after 1.5 seconds** — fast enough that it read as "maybe this didn't actually save." Replaced the auto-close timer with a persistent success state and an explicit "Done" button.

---

## 4. Explicit design decisions (not bugs, but worth recording why)

- **Pause stays disabled during an MCQ** — confirmed via direct question, kept as-is.
- **Learning Path outcomes are per-lecture** ("each lecture has its own associated learning outcomes"), not per-question or per-course.
- **Cognitive-level tagging (identify/understand/apply/case) is not bulk-guessed** for existing questions — the user tags this manually over time.
- **Canvas gameplay view keeps its dark "vessel" art style in both light and dark theme** — a deliberate call, since the draw calls use literal colors tuned for a dark backdrop and retheming them would mean redesigning contrast for every entity with no way to verify it live; the toggle only re-themes the surrounding UI chrome (and, per the bug above, the in-game HUD overlay is now deliberately pinned to the dark palette too, for the same reason).
- **Image uploads stay a manual "drop the file in `images/`, reference it by filename" workflow** rather than building real in-browser upload storage (e.g. Firebase Storage) — considered and explicitly declined in favor of the lighter-weight approach, since the manual step is a one-time thing per image and avoids new infrastructure/cost.
- **Spaced repetition uses simple Leitner boxes, not full SM-2** — one fixed interval-days array, correct answer moves up a box, wrong answer resets to box 0. Deliberately simpler than a floating-point ease-factor scheduler; still gives a real spaced effect and is far easier to retune (it's one array).
- **Review only resurfaces questions you've already studied, never new ones** — a question enters the scheduler the first time it's answered anywhere in the app; Review doesn't double as a content-discovery tool, since Runner/Practice/Custom Run already cover that.
- **Self-graded SAQs are study-guide-only, never shown in Runner or Group Race** — those modes are timed and MCQ-scored; self-grading (attempt, reveal, mark yourself) doesn't fit a timed/auto-scored flow.
- **Player-submitted contributions (fun facts/notes/flags) land in the same review queue as everything else, never live/unmoderated** — matches the existing "a maintainer reviews and merges everything" trust model rather than introducing a second, different publishing path.
- **Account sync uses Firebase Authentication + the existing Realtime Database**, not a custom auth system or new backend — reuses infrastructure already in place for Group Race/contributions.
- **Google sign-in before Apple, web before native** — explicit sequencing choice; Apple requires an active paid Apple Developer Program enrollment, and the packaged app needs a native Sign-In plugin either way (Google blocks its web OAuth popup inside an embedded WebView), so proving the sync architecture out on the simpler path first was the deliberate order.
- **Spaced-repetition conflict resolution is tuned per data shape, not uniform** — `srsState` is a growing per-question dictionary where every entry already carries a timestamp, so cross-device merges keep whichever side's entry has the later `lastSeen`, entry-by-entry (protects review history from being clobbered by a stale device). `playerCustomization`/`theme` are single preference values, not collections, so simple last-write-wins is correct and sufficient there.

---

## 5. Not done yet / open items

- **Native Google Sign-In for the packaged app** — the web sign-in flow (`signInWithPopup`) works in a real browser tab but not inside the Capacitor WebView; needs a native plugin (e.g. `@capacitor-firebase/authentication`) plus Xcode/Android Studio-side configuration.
- **Apple sign-in** — deferred by explicit choice (Google first); also needs the Apple Developer Program enrollment to be complete.
- **`contributions`/`rooms`/`stats` stay fully open (no auth required) in the Firebase rules** — a deliberate, known trade-off consistent with how those features were designed (anonymous contribution/racing), but worth revisiting if the app is ever distributed more publicly than a small trusted group. `users/<uid>/...` (the new sync data) *is* locked to the signed-in owner only.
- **Review can't replay a due SAQ through "Start review"** — SAQ self-grading feeds the same scheduler as MCQ answers, but the review queue can only re-serve MCQ questions (different UI shape). A due SAQ instead shows as a direct link to its item page, where the existing self-grading card is used as-is. Works, but isn't a fully unified review session.
- **Speed selector UI** — `GAME_CONFIG` spawn timing is editable in code, but there's no in-game control for a player to adjust difficulty/speed themselves.
- **Hint button** — mentioned as a possible feature, not built.
- **Survival / "last chance" question** — not built.
- **Cancer-cell proliferation visual** — not built.
- **Tutorial / demo run** — not built.
- **Sound effects** — added earlier in the project and confirmed wired up correctly (wrong-answer/bomb-collision sounds trigger correctly in testing), but real on-device audio experience (volume balance, whether it's ever actually distracting) hasn't been explicitly walked through on a physical phone.
- **Automatic staleness warning in the merge tool** — superseded by the one-click "Refresh from GitHub main" button, which solves the same problem more directly; a live pre-merge diff check was considered and not built, since the refresh button covers the actual failure mode that caused the original incident.

---

## 6. Quick reference: keeping app/web/data in sync

- Edit only the **root** `medsci-runner.html` / `game-data.js` / `images/` — never the copies inside `www/`, `ios/`, or `android/`, which are overwritten on every sync.
- Run `npm run sync` after any content or code change — regenerates all three build targets from the root files in one step. (`developer-tool.html` is intentionally excluded from this — it's never bundled into the shipped app, so it needs no sync step of its own.)
- **Browser testing:** sync + refresh is enough.
- **Actual native app** (Simulator or a real device): sync, then rebuild and reinstall via Xcode (iOS) or Android Studio (Android) — Capacitor bakes these files into the binary at build time; there's no live/remote fetch configured, so editing the source files alone never updates an already-installed app.
- **Firebase Realtime Database rules** are managed only in the Firebase console (no rules file lives in this repo) — see Section 5 for current scope; the `users/<uid>/...` path is locked to its owner, everything else is intentionally open/anonymous.
