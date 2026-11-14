// What the website build rewrites in medsci-runner.html, and nothing else.
//
// Shared by lib/game-page.ts (which applies them at request time) and
// scripts/check-anchors.mjs (which checks them from the command line), so the
// check can never test a different set of anchors than the one that ships.
//
// Each `find` must appear in the game file EXACTLY once. If one doesn't, the
// page is not served at all: a half-patched game is how the answer key would
// reach the browser.

/** The tag whose place the inlined, answer-free content payload takes. */
export const DATA_SLOT = '<script src="game-data.js"></script>';

/**
 * The grading seam. Both of these are one-line functions that exist in
 * medsci-runner.html only to be replaced here -- see the comment above them in
 * that file. Patching a function body rather than a slice of answerMCQ() is
 * what stops an unrelated edit to the game from taking the live site down.
 *
 * @type {{ name: string, find: string, replace: string }[]}
 */
export const PATCHES = [
  {
    name: 'gradeAnswer: ask the server before the caller reads q.correctIndex',
    find: '  async function gradeAnswer(q, chosenIndex){ /* offline: q already carries correctIndex */ }',
    replace: '  async function gradeAnswer(q, chosenIndex){ await window.__RUNNER_GRADE(q, chosenIndex); }',
  },
  {
    name: 'gradeFunFact: ask the server for the grenade mini-game',
    find: '  async function gradeFunFact(q, chosenIndex){ return !!q && chosenIndex === q.correctIndex; }',
    replace: '  async function gradeFunFact(q, chosenIndex){ return window.__RUNNER_GRADE_FUNFACT(q, chosenIndex); }',
  },
];

/** Every anchor that has to match exactly once, for the check script. */
export const ALL_ANCHORS = [
  { name: 'game-data.js script tag', find: DATA_SLOT },
  ...PATCHES.map(({ name, find }) => ({ name, find })),
];
