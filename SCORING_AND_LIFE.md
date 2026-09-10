# Scoring and life — how the numbers work

Everything on this page is driven by the numbers in `GAME_CONFIG` in
[game-data.js](game-data.js) (the block starting at `const GAME_CONFIG = {`). Change a number
there and every mode, HUD label, and popup picks it up — nothing is hard-coded in the game file.
The code that applies them lives in `medsci-runner.html`; line references below point there.

Applies to: **Runner**, **Custom run**, and **Group Race** (all three share the same run engine).
**Study & Practice** and **Review** have no life and no score — see section 5.

---

## 1. Life (Glucose / ATP)

"Life" is the resource shown top-left of the HUD. It's called **Glucose 🩸** in MEDS3002 and
**ATP ⚡** in MEDS2003 (`LIFE_CONFIG`); the mechanics are identical.

| Event | Change | Config key | Where |
|---|---|---|---|
| Run starts | set to **100** | `startingGlucose` | `resetRunState()` |
| Collect a drifting yellow pickup | **+5** | `glucosePickupValue` | collision in `update()` |
| Every 3rd correct answer in a row (streak bonus) | **+10** | `streakBonusAmount`, gated by `streakBonusAppliesToLife` | `answerMCQ()` |
| Wrong MCQ answer | **−40** | `wrongAnswerPenalty` | `answerMCQ()` |
| MCQ timer runs out | **−40** (counted exactly like a wrong answer) | `wrongAnswerPenalty` | `answerMCQ(isTimeout)` |
| Touch a 💣 bomb | **−40**, instantly, no question | `bombDamage` | collision in `update()` |

Rules around it:

- **There is no upper cap.** Life can climb well past 100 if you collect a lot of pickups.
- **The run ends when life drops below zero** (`glucose < 0`), not at zero. Sitting on exactly 0
  still counts as alive. The check happens right after a wrong answer's Continue and immediately
  on a bomb hit.
- **Nothing drains life over time.** Speed ramps up as you survive (section 4) but simply
  existing costs nothing.
- **Life feeds the score** at 1 point per unit (section 2), so pickups are worth +5 score each
  and every wrong answer effectively costs 35 + 40 = 75 points.
- In Group Race, life is synced to the room after every answer, and the value used for the final
  score is `max(0, life)`.

---

## 2. Score

One formula, used for the HUD score box, the end-of-run screen, and Group Race ranking
(`mpScore()`):

```
score = correct   × 50      scoreCorrectWeight
      − wrong     × 35      scoreIncorrectWeight
      + life      × 1       scoreLifeWeight      (life floored at 0)
      + stageIdx  × 300     stageWeight          (0-based: Stage I = 0, II = 300, III = 600, IV = 900)
      + streak bonuses × 150   streakBonusScoreAmount
```

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
| Life at that moment (100 − 2×40 + 6 pickups×5 + 4 bonuses×10 = 90) | **+90** |
| Now standing on Stage II | **+300** |
| **Score** | **1520** |

---

## 3. Streaks

- `streak` counts consecutive **correct** answers. It resets to 0 on any wrong answer or timeout.
- Every time `streak` hits a multiple of **3** (`streakBonusEvery`), a bonus fires:
  +150 score, +10 life, a 🔥 popup, and the verdict line changes to "Correct — 🔥 3 in a row!".
- Because it fires on every multiple, a 9-answer streak pays out three times (at 3, 6, 9).
- The counter carries across stages within a run. It also ticks in Practice mode (for the
  "in a row" message) but awards nothing there.

---

## 4. Stages, questions and the timer

**Clearing a stage.** Each stage lists how many correct answers it needs per topic
(`STAGES[course][n].requirements`, e.g. Stage I of MEDS3002: genetics 3, immunology 3,
pharmacology 3, oncology 3). Only topics that still need answers spawn as blocks. A wrong
answer does **not** subtract from progress — it just costs life/score. When every topic's
counter is full you move to the next stage; clearing the last stage ends the run as a win.

**Question timer.** Runner, Custom run and Group Race always time each question:

```
limit = 45 s  +  1 s per 11 characters beyond a 220-character question (prompt + options)
        capped at +35 s extra   →   45–80 s
```

(`MCQ_TIME_LIMIT` and `mcqTimeLimitFor()` at [medsci-runner.html:1720](medsci-runner.html#L1720)).
Running out counts as a wrong answer: −40 life, −35 score, streak reset.

**Speed.** Purely a difficulty ramp; it never touches life or score:

```
speed = min(1000, 600 + 40 × stageIdx + 10 × seconds survived)   px/s
```

**Stall warning.** If you go 10 s without hitting a topic block, a banner tells you how many
more correct answers the stage needs. Cosmetic only.

**Spawn timing** (all in ms, `base + random(0..rand)`): topic blocks 500 + 0–700, life pickups
550 + 0–300, bombs 800 + 0–1600. First block after 1200 ms, first pickup after 500 ms.

---

## 5. What Practice and Review do instead

- **Study & Practice** and **Review** have no life, no score, no stages and no bombs. They only
  count `practiceCorrect / practiceAnswered` for the session summary.
- The question timer is **off by default** in Practice (opt-in checkbox, which then uses the same
  45–80 s rule as Runner — the checkbox label still says "30s", which is out of date).
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
| `baseSpeed` / `speedRampPerStage` / `speedRampPerSecond` / `maxSpeed` | 600 / 40 / 10 / 1000 | Scroll speed ramp (px/s) |
| `MCQ_TIME_LIMIT` (in the game file) | 45 s | Base question timer |

The in-game legend (tap the SCORE box) shows Correct +50, Wrong −35, Streak +150, Stage +300.
It omits the life term, which is the usual reason a final score doesn't match a quick mental sum.
