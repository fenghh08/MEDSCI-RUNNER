/* Injected into medsci-runner.html by web/lib/game-page.ts, immediately after
   the inlined RUNNER_DATA and before the game's own <script type="module">.
   (Classic scripts run before module scripts, so these globals exist by the
   time the game boots.)

   The game is unchanged apart from the bodies of its two grading-seam
   functions, gradeAnswer() and gradeFunFact(), which now call these. Each one
   asks the server to grade a single answer, writes the result onto the
   question object, and returns — after which the game's own code runs exactly
   as it always has, reading q.correctIndex and q.explanation the way it would
   have read them from game-data.js.

   Because the seam is what gets patched rather than a slice of answerMCQ(),
   any mode that calls gradeAnswer() is graded on the server for free. */
(function () {
  'use strict';

  var ENDPOINT = '/api/answer';

  // Identifies this browser to the per-question attempt limit. Not a login and
  // not trusted for anything: it only makes casual option-by-option guessing
  // inconvenient. Real identity is the Firebase uid the game already has.
  var sessionId = (function () {
    try {
      var k = 'runnerSessionId';
      var v = localStorage.getItem(k);
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
        localStorage.setItem(k, v);
      }
      return v;
    } catch (e) {
      return 'anon';
    }
  })();

  /* ---------------------------------------------------------------- warming
     Neon suspends an idle compute, and the wake happens inside the TLS
     handshake: measured at ~3.0s to first byte, against 6-10ms once the
     connection is up. That is the whole of the "why did answering freeze for
     three seconds" problem -- it is not the query, and it is not the game.

     The player spends several seconds reading a question before they commit,
     so we spend those seconds opening the connection. By the time they click,
     /api/answer is one warm round trip.

     Fire-and-forget on purpose: a failed warm-up must never be visible, and
     the real request will surface anything genuinely wrong. */
  var WARM_ENDPOINT = '/api/warm';
  var lastWarm = 0;

  function warm() {
    var now = Date.now();
    if (now - lastWarm < 20000) return;   // the connection stays up; don't spam it
    lastWarm = now;
    try {
      fetch(WARM_ENDPOINT, { cache: 'no-store', keepalive: true }).catch(function () {});
    } catch (e) { /* nothing to do, and nothing to report */ }
  }

  warm();                                  // as the page boots
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) warm();          // coming back to a tab that went idle
  });

  /* Neon's free plan suspends an idle compute after five minutes and will not
     let the interval be changed (the API answers 412 on that account), so the
     only way to stop a session being interrupted by a three-second wake is to
     keep the compute awake while someone is actually playing.

     A ping just under the five-minute mark does that. It is deliberately
     cheap and deliberately conditional: nothing fires while the tab is hidden,
     and it gives up entirely after twenty minutes with no interaction, so a
     tab left open overnight does not hold the compute up and burn the monthly
     allowance. */
  var HEARTBEAT_MS = 240000;        // 4 minutes, inside the 5-minute timeout
  var IDLE_GIVE_UP_MS = 1200000;    // 20 minutes without a click or a keypress
  var lastInteraction = Date.now();

  ['pointerdown', 'keydown'].forEach(function (evt) {
    document.addEventListener(evt, function () { lastInteraction = Date.now(); },
      { passive: true, capture: true });
  });

  setInterval(function () {
    if (document.hidden) return;
    if (Date.now() - lastInteraction > IDLE_GIVE_UP_MS) return;
    warm();
  }, HEARTBEAT_MS);

  /* Warm again the moment a question card opens. This is the one that matters:
     it buys the whole reading time. */
  function watchForQuestions() {
    var modal = document.getElementById('mcqModal');
    if (!modal) return;
    new MutationObserver(function () {
      if (modal.classList.contains('active')) warm();
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchForQuestions);
  } else {
    watchForQuestions();
  }

  /* ------------------------------------------------------- instant feedback
     The game's answerMCQ() awaits grading before it touches the DOM, so even a
     fast round trip reads as a dead click. Acknowledge the press synchronously
     -- before any await -- so the card reacts the instant it is pressed, and
     let the game paint right/wrong when the verdict lands. */
  function acknowledge(chosenIndex) {
    try {
      var box = document.getElementById('mcqOptions');
      if (!box) return function () {};
      var btns = box.querySelectorAll('.mcq-option');
      btns.forEach(function (b) { b.classList.add('disabled'); });
      var picked = btns[chosenIndex];
      if (picked) picked.classList.add('picked');
      // Only show "checking" if the wait is long enough to notice. Below this
      // the verdict arrives first and nothing flickers.
      var slow = setTimeout(function () {
        if (picked) picked.classList.add('checking');
      }, 180);
      return function () {
        clearTimeout(slow);
        if (picked) picked.classList.remove('picked', 'checking');
      };
    } catch (e) {
      return function () {};
    }
  }

  function playerUid() {
    try {
      return (window.__runnerPlayer && window.__runnerPlayer.uid) || null;
    } catch (e) {
      return null;
    }
  }

  async function grade(body) {
    var payload = Object.assign({ sessionId: sessionId, playerUid: playerUid() }, body);
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
        // 429 means the attempt limit kicked in; retrying won't help.
        if (res.status === 429) return { error: 'rate-limited' };
      } catch (e) {
        /* network blip — fall through and retry once */
      }
    }
    return { error: 'unreachable' };
  }

  /* Study/runner questions. `q` is the shuffled object the game is showing, so
     q.optionOrder maps shown position -> authored position; the server grades
     in authored terms and we map its answer back to what's on screen. */
  window.__RUNNER_GRADE = async function (q, chosenIndex) {
    if (!q) return;
    // Grade once per served question. The check is an explicit marker, NOT
    // "does q.correctIndex look unset": the game shuffles options before
    // showing a question and recomputes correctIndex as
    // order.indexOf(q.correctIndex), which on an answer-free payload is
    // order.indexOf(undefined) === -1. Treating that -1 as "already graded"
    // skipped the server entirely and marked every answer wrong.
    if (q.__graded) return;
    q.__graded = true;
    var done = acknowledge(chosenIndex);
    var result = await grade({
      qid: q.id,
      chosenIndex: chosenIndex,
      optionOrder: q.optionOrder || null,
    });
    done();

    if (result.error) {
      // Never silently mark something right -- but never mark it WRONG either.
      // This used to set correctIndex = -1, which matches no option, so the
      // game scored it as a miss: -40 life, streak reset, and a wrong answer
      // written into spaced repetition and the question's miss-rate stats. A
      // dropped request is not evidence about what the player knows.
      //
      // __ungraded tells the game to skip scoring entirely. __graded is also
      // cleared so the next time this question is served it asks the server
      // again instead of reusing a verdict that never arrived.
      q.__ungraded = true;
      q.__graded = false;
      q.explanation =
        result.error === 'rate-limited'
          ? "Too many attempts at this question just now — come back to it in a minute. This one won't count."
          : "Couldn't reach the server to check this answer, so it won't count.";
      return;
    }
    q.__ungraded = false;

    var authored = result.correctIndex;
    q.correctIndex = q.optionOrder ? q.optionOrder.indexOf(authored) : authored;
    q.explanation = result.explanation || '';
  };

  /* The Group Race grenade's fun-fact question. The game only needs a
     pass/fail here, but q.correctIndex is set too so the overlay can highlight
     the right option the way it always did. */
  window.__RUNNER_GRADE_FUNFACT = async function (q, chosenIndex) {
    var result = await grade({ funFactId: q.id, chosenIndex: chosenIndex });
    if (result.error) {
      q.correctIndex = -1;
      return false;
    }
    q.correctIndex = result.correctIndex;
    q.explanation = result.explanation || '';
    return Boolean(result.correct);
  };

  /* The demo tour reads answers before the player picks, which this build
     deliberately cannot supply. Say so rather than letting it misbehave. */
  if (new URLSearchParams(location.search).has('demo')) {
    console.warn(
      '[runner] The demo tour needs the answer key up front, which the website ' +
      'build does not ship. Record demos from the offline build instead: ' +
      'https://fenghh08.github.io/MEDSCI-RUNNER/medsci-runner.html?demo'
    );
    addEventListener('DOMContentLoaded', function () {
      var note = document.createElement('div');
      note.textContent = 'Demo tour is only available on the offline build.';
      note.style.cssText =
        'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;' +
        'background:#b91c1c;color:#fff;padding:8px 14px;border-radius:999px;' +
        'font:12px/1.4 ui-monospace,monospace;box-shadow:0 4px 14px rgba(0,0,0,.3)';
      document.body.appendChild(note);
    });
  }
})();
