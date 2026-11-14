// The one place content is judged before it is written.
//
// Plain JS with no imports, so the same rules run in three places and cannot
// drift: the admin API (which enforces them -- the browser is never trusted),
// the admin page (which shows them while someone types), and the test script.
//
// Hard rules reject the write. Soft rules warn and let it through, because
// they are either judgement calls or -- like the option-length targets --
// properties of a whole question set that no single question can pass or fail.

/** Thrown by the store when a hard rule fails. Routes turn it into a 422. */
export class ValidationError extends Error {
  /** @param {string[]} errors */
  constructor(errors) {
    super(errors.join(' '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// "slide 7", "lecture 12", "MEDS3002 L14". A question that cites its source
// inside the stem tells the student where to look instead of testing them; the
// handout audit's target for these is zero.
const SLIDE_REFERENCE = /\b(?:slides?|lectures?|lec)\s*#?\d+\b|\b[A-Z]{4}\d{4}\s+L\d+/i;
// A bare "L12" is usually a lecture key, but it is also a vertebra, a nerve
// root and a cell adhesion molecule -- so it only warns.
const BARE_LECTURE_KEY = /\bL\d{1,2}\b(?!-)/;

export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const MIN_PROMPT = 20;

/**
 * @param {{ prompt?: string, options?: string[], correctIndex?: number,
 *           explanation?: string, difficulty?: string }} q
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateQuestion(q) {
  const errors = [];
  const warnings = [];
  const prompt = String(q.prompt ?? '').trim();
  const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? '').trim()) : [];

  if (prompt.length < MIN_PROMPT) errors.push(`The question needs at least ${MIN_PROMPT} characters (it has ${prompt.length}).`);
  if (options.length < 2 || options.length > 6) errors.push(`A question needs 2 to 6 options (it has ${options.length}).`);
  options.forEach((o, i) => { if (!o) errors.push(`Option ${String.fromCharCode(65 + i)} is empty.`); });

  const seen = new Map();
  options.forEach((o, i) => {
    const k = norm(o);
    if (!k) return;
    if (seen.has(k)) errors.push(`Options ${String.fromCharCode(65 + seen.get(k))} and ${String.fromCharCode(65 + i)} are the same.`);
    else seen.set(k, i);
  });

  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) {
    errors.push('Mark which option is correct.');
  }
  if (!String(q.explanation ?? '').trim()) errors.push('Add an explanation: it is what the student reads after answering.');
  if (q.difficulty != null && !DIFFICULTIES.includes(q.difficulty)) errors.push('Difficulty must be easy, medium or hard.');

  const cited = [prompt, ...options].find((t) => SLIDE_REFERENCE.test(t));
  if (cited) errors.push(`Take the slide or lecture reference out of the question ("${cited.match(SLIDE_REFERENCE)[0]}"). Put it in the explanation instead.`);

  // ---- soft
  if (!errors.length) {
    const lengths = options.map((o) => o.length);
    const correct = lengths[q.correctIndex];
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const others = lengths.filter((_, i) => i !== q.correctIndex);
    if (correct >= mean * 1.35) warnings.push('The correct option is much longer than the others, so it can be picked without knowing the content. Move the reasoning into the explanation.');
    else if (correct > Math.max(...others)) warnings.push('The correct option is the longest. Fine for one question, but keep it under a quarter of the set.');
    if ([prompt, ...options].some((t) => BARE_LECTURE_KEY.test(t))) warnings.push('This looks like it cites a lecture ("L12"). If it does, move the reference to the explanation.');
    if (options.some((o) => /^(all|none) of the above\.?$/i.test(o))) warnings.push('"All/none of the above" stops working once the game shuffles the options.');
    if (/\b(?:not|except|least)\b/i.test(prompt) && !/\b(?:NOT|EXCEPT|LEAST)\b/.test(prompt)) warnings.push('Negative stems are easy to misread: write NOT / EXCEPT / LEAST in capitals.');
  }
  return { errors, warnings };
}

/** @param {{ label?: string, key?: string }} item */
export function validateItem(item) {
  const errors = [];
  if (!String(item.label ?? '').trim()) errors.push('The item needs a name.');
  if (item.key != null && !/^[A-Za-z][A-Za-z0-9]{1,63}$/.test(item.key)) errors.push('The item key must be letters and digits, starting with a letter.');
  return { errors, warnings: [] };
}

// ---------------------------------------------------------------- duplicates
// Normalised-bigram Dice similarity: the measure developer-tool.html used for
// its duplicate warnings, kept so the numbers mean the same thing here.
function bigrams(s) {
  const n = norm(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const out = new Set();
  for (let i = 0; i < n.length - 1; i++) out.add(n.slice(i, i + 2));
  return out;
}
export function similarity(a, b) {
  const x = bigrams(a), y = bigrams(b);
  if (!x.size && !y.size) return 0;
  let hit = 0;
  for (const g of x) if (y.has(g)) hit++;
  return (2 * hit) / (x.size + y.size);
}
/**
 * Existing questions whose prompt is close to this one, closest first.
 * @param {string} prompt
 * @param {{ qid: string, prompt: string }[]} pool
 */
export function nearDuplicates(prompt, pool, { threshold = 0.85, exclude = null, limit = 3 } = {}) {
  const b = bigrams(prompt);
  if (b.size < 8) return [];
  const out = [];
  for (const p of pool) {
    if (p.qid === exclude) continue;
    const y = bigrams(p.prompt);
    let hit = 0;
    for (const g of b) if (y.has(g)) hit++;
    const score = (2 * hit) / (b.size + y.size);
    if (score >= threshold) out.push({ qid: p.qid, prompt: p.prompt, score });
  }
  return out.sort((m, n) => n.score - m.score).slice(0, limit);
}

/**
 * The handout "quiz quality audit" for a whole set. These are cohort numbers:
 * they belong on a dashboard, never in a form validator.
 * @param {{ qid: string, options: string[], correctIndex: number, prompt: string }[]} questions
 */
export function auditSet(questions) {
  const n = questions.length;
  const letters = [0, 0, 0, 0, 0, 0];
  const longest = [], shortest = [], giveaway = [], cited = [];
  for (const q of questions) {
    const len = q.options.map((o) => String(o).trim().length);
    const c = len[q.correctIndex];
    if (c == null) continue;
    letters[q.correctIndex]++;
    const others = len.filter((_, i) => i !== q.correctIndex);
    if (c > Math.max(...others)) longest.push(q.qid);
    if (c < Math.min(...others)) shortest.push(q.qid);
    if (c >= 1.35 * (len.reduce((a, b) => a + b, 0) / len.length)) giveaway.push(q.qid);
    if ([q.prompt, ...q.options].some((t) => SLIDE_REFERENCE.test(String(t)))) cited.push(q.qid);
  }
  const pct = (k) => (n ? Math.round((1000 * k) / n) / 10 : 0);
  return {
    total: n,
    correctLongestPct: pct(longest.length),     // target <= 25
    correctShortestPct: pct(shortest.length),   // target 20-45
    giveawayCount: giveaway.length,             // target 0
    slideReferenceCount: cited.length,          // target 0
    letterPct: letters.slice(0, 4).map(pct),    // target ~25 each
    longest, shortest, giveaway, cited,
  };
}
