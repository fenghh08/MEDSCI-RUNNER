# Run Morris Run! — Development Report

A working log of what this project is, what's been built, every real issue hit along the way and how it was actually fixed, and what's still open. Written for handing to a supervisor/teammate as a record of the work, not as a how-to guide (see `README.md` for that).

**Scope note:** this document covers the extended session of work described below in full detail (packaging the app, the mobile/UX fixes, new content, the developer-tool rebuild, and the incident investigations). Earlier project history exists in `git log` going back further (score tracking, streak bonuses, the original Course-based restructure, etc.) but isn't itemized here in the same depth.

---

## 1. What this project is

**Run Morris Run!** is a browser-based, study-guide trivia runner built for med-school revision (currently MEDS3002, MEDS2003, MEDS3003). Players run a cell down a vessel, hit topic blocks, answer multiple-choice questions, and either push through timed Runner-mode stages or use untimed Study & Practice / Custom Run / Learning Path / Group Race for more flexible revision.

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
- **Cell customisation screen** — color (6 options), face expression (4), accessory (4) picker with live preview and Randomise button, all drawn with canvas shapes (no new image assets). The in-game player sprite and the picker share one `drawCellSprite()` function, so what's picked is exactly what races. Persisted via localStorage.
- **Group Race setup reordered** — now asks Host vs Join first; course/topic choice only appears inside the Host flow; name is asked separately in each flow instead of upfront for both.
- **"Browse by lecture" rebuilt as two levels** — pick a course first (with lecture/item counts), then pick a lecture within it, instead of one long flattened list of every lecture from every course. Lectures now sort by actual lecture number (`L7-8, L9, L10, L11, L12`) instead of alphabetically, and render as a single-column list instead of a card grid.
- **Learning outcomes now shown in Browse by lecture** — any lecture with authored outcomes shows them as a clearly labeled bullet list above its item list (reusing the same rendering already used by Learning Path's stage-intro screen).

### New game mode: Learning Path
- Pick a lecture, see its learning outcome(s) up front, then work through questions ordered by cognitive level (identify → understand → apply → case study), using the same run engine as every other mode.
- Backed by `LEARNING_PATH_CONFIG` (levels/quotas/labels) in `game-data.js` and per-lecture `outcomes`/`intro` fields on `COURSES[...].classes[...]`.

### Content
- **MEDS3003 (Advanced Therapeutics)** built out from scratch across two content pushes:
  - Nanoparticle drug delivery + extracellular vesicles (L7-8) — 17 items, 34 questions.
  - Auditory system anatomy/physiology + cochlear implants/gene therapy (L9-L10), and biosensors (L11-L12) — 24 more items, 48 more questions.
  - All distractors deliberately written to avoid an obviously-longer or differently-styled correct answer, per explicit instruction.
- Obstacle/bomb spawn gaps widened per playtester feedback that content was arriving too fast.

### Developer tool (`developer-tool.html`)
- **Image picker** — file picker with live thumbnail preview and a one-click "save a correctly-renamed copy" button, replacing blind caption/filename typing.
- **Two-way CSV sync for Items and Questions** — export everything as CSV, edit in a spreadsheet, paste back in: a recognized `itemId`/`questionId` updates that item/question in place (ignoring its own theme/topic/course columns, so a typo can't move it), a blank id creates new, nothing is ever deleted by import. Backed by a new `edit-question` merge-tool entry type and pair-list CSV encoding (`caption|filename;...`) for images/refs.
- **Two-way CSV sync for Learning Outcomes** — same pattern: export every lecture across every course, edit `outcomes`/`intro` in a spreadsheet, paste back in. Can only update outcomes on lectures that already exist (not create new courses/lectures); a blank `outcomes` column safely skips that row instead of clearing existing content.
- `q_level` (cognitive level) field added to the question form and its CSV import/export, feeding the Learning Path mode.
- "Lecture learning outcomes" single-lecture authoring card, plus a `lectureOutcomes` queue/merge-tool entry type.

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

### Toolchain
| Issue | Root cause | Fix |
|---|---|---|
| Capacitor CLI failing on `.ts` config | `npm install -D typescript` pulled TypeScript 7 by default, which dropped the classic compiler API Capacitor's CLI needs | Pinned to `typescript@^5.4` |
| Headless-Chrome test harnesses silently failing | Nested `requestAnimationFrame` chains are unreliable under `--virtual-time-budget` | Switched to `setTimeout`-based test hooks, which worked reliably — used as the verification method for every change from that point on |
| Test hooks throwing `ReferenceError` for page variables | The game/dev-tool's main script is `<script type="module">`, so top-level consts are private to that module and invisible to a separately injected classic `<script>` | Test hooks now get injected *inside* the page's own module script instead of alongside it |

### The developer-tool data-loss incident (most serious issue found)
A downloaded "merged" `game-data.js` was found to have broken the entire game. Investigation traced it to **three distinct, real bugs**, not one:

1. **Primary, game-breaking bug:** the "Generate merged game-data.js" button falls back to a template *hardcoded inside `developer-tool.html` itself* whenever nobody has run its "Extract & Save Template" step first (an easy-to-miss, optional action in a collapsed section). That hardcoded fallback had drifted out of date — it predated `LEARNING_PATH_CONFIG` entirely, and `medsci-runner.html` reads `LEARNING_PATH_CONFIG.levels` unconditionally at page load, so any file generated from the stale fallback **crashed the entire game on load**, not just Learning Path mode.
   - *Fix:* refreshed the hardcoded fallback (`DEFAULT_TEMPLATE`) to exactly match current `game-data.js` content, verified via a headless test simulating a fresh page with no cached template.
2. Same stale fallback also reverted `GAME_CONFIG` obstacle/bomb spawn timing to older, tighter values, undoing an earlier balance fix.
3. **Separate, unrelated bug:** the Items CSV export only knew how to carry an image's `caption`+`filename`. A couple of items had been hand-authored directly in `game-data.js` with just a `url` (no `filename`) — exporting and reimporting those silently blanked the image out.
   - *Fix:* export now derives a filename from `url` when `filename` is missing, so the round-trip is lossless either way. Verified against the real affected item (CAR-T cell therapy).
4. A smaller, self-inflicted mistake surfaced right after: manually restoring one legitimate new image reference, the `url` field was left off (only `caption`+`filename` were set), even though every other stored image entry carries both — the game reads `img.url` to build the `<img src>`, so the image rendered broken until this was caught from a screenshot and fixed.

**Net effect on process:** confirmed the safest habit going forward is reloading `developer-tool.html` fresh right before merging, rather than merging from a tab that's been open a while, since the merge reads whatever was loaded into that tab's memory, not necessarily the current file on disk.

### CSV sync design
- Initial design question: how to support editing existing items/questions via CSV without every re-import creating a duplicate. Solved with an add-or-update-by-ID convention: a recognized ID updates in place (ignoring its own theme/topic/course columns so a stray edit can't move it), a blank ID creates new, nothing is ever deleted by import.
- A test assertion once falsely reported a missing `level` field in the merge output — traced to a string-matching bug in the *test* code itself (`"level:'case'"` vs. the actual `'level': 'case'` with a space), not the feature; fixed the test, not the app.

---

## 4. Explicit design decisions (not bugs, but worth recording why)

- **Pause stays disabled during an MCQ** — confirmed via direct question, kept as-is.
- **Learning Path outcomes are per-lecture** ("each lecture has its own associated learning outcomes"), not per-question or per-course.
- **Progress is per-run only**, no persistent account progress across sessions.
- **Cognitive-level tagging (identify/understand/apply/case) is not bulk-guessed** for existing questions — the user tags this manually over time.
- **Canvas gameplay view keeps its dark "vessel" art style in both light and dark theme** — a deliberate call, since the draw calls use literal colors tuned for a dark backdrop and retheming them would mean redesigning contrast for every entity with no way to verify it live; the toggle only re-themes the surrounding UI chrome.
- **Image uploads stay a manual "drop the file in `images/`, reference it by filename" workflow** rather than building real in-browser upload storage (e.g. Firebase Storage) — considered and explicitly declined in favor of the lighter-weight approach, since the manual step is a one-time thing per image and avoids new infrastructure/cost.

---

## 5. Not done yet / open items

- **Speed selector UI** — `GAME_CONFIG` spawn timing is editable in code, but there's no in-game control for a player to adjust difficulty/speed themselves.
- **Hint button** — mentioned as a possible feature, not built.
- **Survival / "last chance" question** — not built.
- **Cancer-cell proliferation visual** — not built.
- **Tutorial / demo run** — not built.
- **Sound effects** — added earlier in the project but never explicitly confirmed working on the user's actual device.
- **Automatic staleness warning in the merge tool** — after the data-loss incident, refreshing the fallback template fixed the immediate cause, but a live pre-merge check (comparing the loaded page's data against GitHub before generating) was offered and not yet built. Would catch the *next* time the template drifts, regardless of which field goes stale.
- **Uncommitted as of this report:** the Learning Outcomes display in Browse by lecture and its CSV bulk-edit support (`medsci-runner.html`, `developer-tool.html`) are built and tested but not yet committed — run `git status` to confirm current state before treating this report as reflecting what's actually in version control.

---

## 6. Quick reference: keeping app/web/data in sync

- Edit only the **root** `medsci-runner.html` / `game-data.js` / `images/` — never the copies inside `www/`, `ios/`, or `android/`, which are overwritten on every sync.
- Run `npm run sync` after any content or code change — regenerates all three build targets from the root files in one step.
- **Browser testing:** sync + refresh is enough.
- **Actual native app** (Simulator or a real device): sync, then rebuild and reinstall via Xcode (iOS) or Android Studio (Android) — Capacitor bakes these files into the binary at build time; there's no live/remote fetch configured, so editing the source files alone never updates an already-installed app.
