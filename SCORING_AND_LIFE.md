# Scoring and life — how the numbers work

Everything on this page is driven by the numbers in `GAME_CONFIG` in
[game-data.js](game-data.js) (the block starting at `const GAME_CONFIG = {`). Change a number
there and every mode, HUD label, and popup picks it up — nothing is hard-coded in the game file.
The code that applies them lives in `medsci-runner.html`; line references below point there.

Applies to: **Runner**, **Custom run**, and **Group Race** (all three share the same run engine).
**Study & Practice** and **Review** have no life and no score — see section 5.

---

## 1. Life

"Life" is the resource shown top-left of the HUD, labelled **Life 🩸** in every course
(`LIFE_CONFIG` is still keyed per course, so a specific course could be given its own wording
later, but right now every entry — and the fallback in `lifeCfg()` — reads the same).

| Event | Change | Config key | Where |
|---|---|---|---|
| Run starts | set to **100** | `startingGlucose` | `resetRunState()` |
| Collect a drifting yellow pickup | **+5** | `glucosePickupValue` | collision in `update()` |
| Every 3rd correct answer in a row (streak bonus) | **+0 as currently set** (`streakBonusAmount`, gated by `streakBonusAppliesToLife` — was 10 in an earlier build; see the note in section 2) | `answerMCQ()` |
| Wrong MCQ answer | **−40** | `wrongAnswerPenalty` | `answerMCQ()` |
| MCQ timer runs out | **−40** (counted exactly like a wrong answer) | `wrongAnswerPenalty` | `answerMCQ(isTimeout)` |
| Touch a 💣 bomb | **−40**, instantly, no question | `bombDamage` | collision in `update()` |
| Buy a grenade or shield after a 🎁 gift question (Group Race) | **−25** | `giftCost` | `renderGiftShop()` |
| Hit by a rival's grenade without a shield (Group Race) | **−40** | `grenadeDamage` | `resolveGrenade()` |

Rules around it:

- **There is no upper cap.** Life can climb well past 100 if you collect a lot of pickups.
- **The run ends when life drops below zero** (`glucose < 0`), not at zero. Sitting on exactly 0
  still counts as alive. The check happens right after a wrong answer's Continue and immediately
  on a bomb hit.
- **Nothing drains life over time.** Speed ramps up as you survive (section 4) but simply
  existing costs nothing.
- **Gift purchases can't kill you.** The shop only sells while life is strictly above 25.
- **Life currently contributes 0 to the score** (`scoreLifeWeight` is set to 0 — see the note in
  section 2). Pickups still restore life for survival purposes, just not for score right now.
- In Group Race, life is synced to the room after every answer, and the value used for the final
  score is `max(0, life)`.

---

## 2. Score

One formula, used for the HUD score box, the end-of-run screen, and Group Race ranking
(`mpScore()`):

```
score = correct   × 50      scoreCorrectWeight
      − wrong     × 35      scoreIncorrectWeight
      + life      × 0       scoreLifeWeight      (currently zeroed — life doesn't affect score right now)
      + stageIdx  × 300     stageWeight          (0-based: Stage I = 0, II = 300, III = 600)
      + streak bonuses × 150   streakBonusScoreAmount
```

> **Heads up:** `scoreLifeWeight` and `streakBonusAmount` are both set to `0` in the current
> `game-data.js` (an earlier version of this document, and an earlier build, had them at `1` and
> `10`). If that's not intentional, they're both one-line tunables in `GAME_CONFIG`.

Notes:

- **"Stage reached", not "stages cleared".** `stageIdx` is the index of the stage you are
  currently on. Reaching Stage II is worth 300 whether or not you finish it.
- **The bonus term is banked separately** (`myBonusScore`) and never removed — a later wrong
  answer resets the streak counter but keeps points already earned.
- **Timed-out questions count as wrong** for the score too (−35, plus the −40 life).
- The score starts at 100 because life starts at 100 (0 correct, 0 wrong, 100 life, stage 0).

A worked example, one full Stage I on MEDS3002 (needs 12 correct answers):

| | Amount |
|---|---|
| 12 correct, 2 wrong | 12×50 − 2×35 = **+530** |
| Streak bonuses (say the 12 correct came as runs of 3, 5, 4 → 4 bonuses) | 4×150 = **+600** |
| Life at that moment — currently worth **+0** regardless (`scoreLifeWeight`) | **+0** |
| Now standing on Stage II | **+300** |
| **Score** | **1430** |

---

## 3. Streaks

- `streak` counts consecutive **correct** answers. It resets to 0 on any wrong answer or timeout.
- Every time `streak` hits a multiple of **3** (`streakBonusEvery`), a bonus fires:
  +150 score, +0 life (`streakBonusAmount` is currently 0), a 🔥 popup, and the verdict line
  changes to "Correct — 🔥 3 in a row!".
- Because it fires on every multiple, a 9-answer streak pays out three times (at 3, 6, 9).
- The counter carries across stages within a run. It also ticks in Practice mode (for the
  "in a row" message) but awards nothing there.

---

## 4. Stages, questions and the timer

**Three stages: easy → medium → hard.** MEDS3002 has three stages (`STAGES` in
`game-data.js`), each tagged with a difficulty:

| Stage | Difficulty | Correct answers needed |
|---|---|---|
| I | 🟢 easy | genetics 3, immunology 3, pharmacology 3, oncology 3 (12) |
| II | 🟡 medium | genetics 4, immunology 8, pharmacology 5 (17) |
| III | 🔴 hard | genetics 3, immunology 6, pharmacology 8, oncology 8 (25) |

Custom runs generate three stages the same way (3 per topic each, easy/medium/hard).
The difficulty does two things:

- **Question order.** Questions tagged with the stage's difficulty are served first, then the
  rest, so a stage never runs dry if few questions carry that tag. Untagged questions count as
  medium. (Right now no question is tagged, so every stage draws from the whole pool.)
- **Bomb frequency.** The bomb spawn interval is multiplied by 1.5 on easy, 1 on medium, 0.7 on
  hard (`bombIntervalByDifficulty`).

Only topics that still need answers spawn as blocks. A wrong answer does **not** subtract from
progress — it just costs life/score. When every topic's counter is full you move to the next
stage; clearing the last stage ends the run as a win.

**Question timer.** Runner, Custom run and Group Race always time each question:

```
limit = 45 s  +  1 s per 11 characters beyond a 220-character question (prompt + options)
        capped at +35 s extra   →   45–80 s
```

(`MCQ_TIME_LIMIT` and `mcqTimeLimitFor()` at [medsci-runner.html:1720](medsci-runner.html#L1720)).
Running out counts as a wrong answer: −40 life, −35 score, streak reset.

**Speed.** Purely a difficulty ramp; it never touches life or score:

```
speed = min(1000, 600 + 40 × stageIdx + 10 × seconds survived) × preset   px/s
preset = 0.75 (Slow) · 1 (Normal) · 1.25 (Fast)      Customise → Game speed, `speedPresets`
```

A Group Race uses the **host's** speed pick for everyone (stored on the room as `speed`).

**Stall warning.** If you go 10 s without hitting a topic block, a banner at the top of the HUD
tells you how many more correct answers the stage needs. Cosmetic only.

**Pause.** The track stays visible (dimmed) behind the pause menu, and resuming counts 3-2-1
before anything moves again. The same whole-second count runs after every question (2 s) and
after a grenade lands (1.5 s).

**Spawn timing** (all in ms, `base + random(0..rand)`): topic blocks 500 + 0–700, life pickups
550 + 0–300, bombs 800 + 0–1600. First block after 1200 ms, first pickup after 500 ms.

---

## 5. What Practice and Review do instead

- **Study & Practice** and **Review** have no life, no score, no stages and no bombs. They only
  count `practiceCorrect / practiceAnswered` for the session summary.
- The question timer is **off by default** in Practice (opt-in checkbox, which then uses the same
  45–80 s rule as Runner).
- Self-graded SAQs on an item's study-guide page are marked right/wrong by the student.

---

## 6. Every answer also feeds two other systems

Regardless of mode, each answered MCQ (and each self-graded SAQ) does two extra things:

1. **Spaced repetition** (`recordSrsAnswer`): a correct answer moves the question up one box,
   a wrong answer drops it to box 0. Boxes map to review intervals of
   **0, 1, 3, 7, 16, 35 days** (`SRS_INTERVAL_DAYS`). This is what the Review mode reads.
2. **Anonymous statistics**: a running correct/wrong count per question is incremented in
   Firebase at `stats/<itemId>::<qId>`, which the developer tool's Analytics tab turns into a
   miss-rate table. No per-player data is stored there.

---

## 7. Group Race specifics

### Winning: reaching the end first isn't enough

Finishing all stages doesn't win the race by itself — it starts a **30-second catch-up window**
(`catchUpWindowMs`) for everyone else still racing:

- The moment the **first** racer finishes, a gold banner tells every other still-racing client
  "🏁 \<name\> finished! Xs left to out-score them." Only the first finisher starts this — anyone
  who finishes afterward doesn't restart or extend it.
- Everyone still racing keeps playing normally for those 30 real seconds — more correct answers,
  more streak bonuses, more stage progress, all still count.
- When the window runs out, anyone still racing is locked in right where they stand (mid-question
  or not) and marked done with reason `timeup` (shown as ⌛ on the leaderboard).
- The match is still decided purely by **score** (section 2) once everyone is done, exactly as
  before — the first finisher can still lose if someone else's score overtakes them in that
  window.

### Gifts: grenades and shields

- **Unlock.** Gift questions switch on for the whole room once **20%** of racers have reached
  Stage II (`giftUnlockShare`). A toast announces it.
- **Spawning.** Every 7–13 s (`giftSpawnBaseMs/RandMs`) each racer rolls for a 🎁 gift block. The
  odds run from **30%** for whoever is in 1st place to **85%** for last place
  (`giftChanceMin/Max`), so falling behind earns more gifts. At most one gift block is on screen.
- **A gift block is a normal question** for one of the stage's topics: it counts toward stage
  progress, streaks, score and SRS exactly like any other. Answer it **correctly** and the shop
  appears under the explanation.
- **The shop.** Spend 25 life on one of:
  - 💣 **Grenade** — thrown immediately at the racer directly **ahead of** or directly **behind**
    you (your choice; racers who are already done can't be targeted).
  - 🛡 **Shield** — kept; you can hold several. The HUD shows `🛡 ×n`.
  - **No thanks** — keep your life.
  You can only buy while life is strictly above 25, so a purchase never ends your run.
- **Being hit.** The grenade is delivered through the room (`players/<you>/incoming`). It waits
  until you're actually running (never mid-question or mid-countdown), then the track freezes,
  a flashing ⚠️ *WARNING! Grenade incoming!* shows who threw it and how many shields you hold,
  and you choose **Apply shield** or **Brace**. The rest plays out on the track: the grenade lobs
  in from the right and drops onto your cell. With a shield, a blue arc pops up in front of the
  cell and the explosion bursts off it: *Blocked!*, no damage. Without one, the starburst lands
  on the cell: **−40 life** (`grenadeDamage`), red flash. Then a 1.5 s count and the run
  continues. If the hit takes life below zero, the run ends as usual.
- **Previewing it solo.** Open the game with `?debug=1` on the URL, start any run, and in the
  browser console call `__runnerDebug.simulateGrenade(1)` (the number is how many shields you
  hold) or `__runnerDebug.spawnGift()`.
- Grenades that arrive after you're already done simply fizzle.

- Each racer plays the same stages independently; only life, stage, counts and bonus points are
  synced to `rooms/<code>/players/<id>`.
- A racer is "done" when they finish the last stage, run out of life, or quit. Reaching the last
  stage first does **not** win.
- Once every racer is done (or everyone but you, in which case your run is frozen where it is),
  the match is decided purely by the section-2 score. Highest wins; an exact tie at the top is a
  draw.
- The leaderboard shows 🏆 for a finisher, 💀 for a run that ended on life, 🚪 for a quit.

---

## 8. Quick reference — the tunables

| Key | Value | Meaning |
|---|---|---|
| `startingGlucose` | 100 | Life at run start |
| `glucosePickupValue` | 5 | Life per pickup |
| `wrongAnswerPenalty` | 40 | Life lost per wrong / timed-out answer |
| `bombDamage` | 40 | Life lost per bomb |
| `streakBonusEvery` | 3 | Streak length that triggers a bonus |
| `streakBonusAmount` | 10 | Life per streak bonus |
| `streakBonusAppliesToLife` | true | Set false to make streaks score-only |
| `streakBonusScoreAmount` | 150 | Score per streak bonus |
| `scoreCorrectWeight` | 50 | Score per correct answer |
| `scoreIncorrectWeight` | 35 | Score lost per wrong answer |
| `scoreLifeWeight` | 1 | Score per unit of life remaining |
| `stageWeight` | 300 | Score per stage index reached |
| `speedPresets` | slow 0.75 / normal 1 / fast 1.25 | Customise → Game speed multipliers |
| `bombIntervalByDifficulty` | easy 1.5 / medium 1 / hard 0.7 | Bomb spawn interval multiplier per stage |
| `giftUnlockShare` | 0.2 | Share of racers on Stage II before gifts start |
| `giftSpawnBaseMs` / `giftSpawnRandMs` | 7000 / 6000 | How often a gift block is rolled for |
| `giftChanceMin` / `giftChanceMax` | 0.3 / 0.85 | Gift odds for 1st place / last place |
| `giftCost` | 25 | Life per grenade or shield |
| `grenadeDamage` | 40 | Life lost to an unshielded grenade |
| `baseSpeed` / `speedRampPerStage` / `speedRampPerSecond` / `maxSpeed` | 600 / 40 / 10 / 1000 | Scroll speed ramp (px/s) |
| `MCQ_TIME_LIMIT` (in the game file) | 45 s | Base question timer |

The in-game legend (tap the SCORE box) shows Correct +50, Wrong −35, Streak +150, Stage +300.
It omits the life term, which is the usual reason a final score doesn't match a quick mental sum.
