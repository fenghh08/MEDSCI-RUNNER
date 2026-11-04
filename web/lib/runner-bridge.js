/* Injected into medsci-runner.html by web/lib/game-page.ts, immediately after
   the inlined RUNNER_DATA and before the game's own <script type="module">.
   (Classic scripts run before module scripts, so these globals exist by the
   time the game boots.)

   The game is unchanged apart from two call sites that now await one of these
   two functions. Each one asks the server to grade a single answer, writes the
   result onto the question object, and returns — after which the game's own
   code runs exactly as it always has, reading q.correctIndex and
   q.explanation the way it would have read them from game-data.js. */
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
    var result = await grade({
      qid: q.id,
      chosenIndex: chosenIndex,
      optionOrder: q.optionOrder || null,
    });

    if (result.error) {
      // Never silently mark something right. -1 matches no option, so the game
      // shows the player's pick as wrong and highlights nothing as correct.
      q.correctIndex = -1;
      q.explanation =
        result.error === 'rate-limited'
          ? 'Too many attempts at this question just now — come back to it in a minute.'
          : "Couldn't reach the server to check this answer.";
      return;
    }

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
