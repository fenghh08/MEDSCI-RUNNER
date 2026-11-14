// npm run test:validate -- the content rules, with no database involved.
import assert from 'node:assert/strict';
import { validateQuestion, nearDuplicates, auditSet, similarity } from '../lib/validate.mjs';

const good = {
  prompt: 'Which enzyme catalyses the committed step of glycolysis?',
  options: ['Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'Aldolase'],
  correctIndex: 1, explanation: 'PFK-1 is the main control point.', difficulty: 'medium',
};
const errs = (q) => validateQuestion({ ...good, ...q }).errors;

assert.deepEqual(errs({}), []);
assert.equal(errs({ prompt: 'Too short?' }).length, 1);
assert.equal(errs({ options: ['Only one'] , correctIndex: 0 }).length, 1);
assert.match(errs({ options: ['A thing', 'a  THING', 'Other', 'More'] })[0], /same/);
assert.match(errs({ options: ['A', '', 'C', 'D'] })[0], /empty/);
assert.match(errs({ correctIndex: 4 })[0], /correct/);
assert.match(errs({ correctIndex: 1.5 })[0], /correct/);
assert.match(errs({ explanation: '  ' })[0], /explanation/);
assert.match(errs({ difficulty: 'brutal' })[0], /Difficulty/);
assert.match(errs({ prompt: 'According to slide 7, which enzyme is the control point?' })[0], /slide/);
assert.match(errs({ prompt: 'As covered in MEDS3002 L14, which enzyme is rate limiting?' })[0], /reference/);
assert.deepEqual(errs({ prompt: 'Which enzyme converts L-dopa into dopamine in neurons?' }), []);
assert.deepEqual(errs({ prompt: 'A disc herniation at L5 compresses which nerve root?' }), []);
assert.match(validateQuestion({ ...good, prompt: 'A disc herniation at L5 compresses which nerve root?' }).warnings.join(), /lecture/);

const w = validateQuestion({ ...good, options: ['Hexokinase', 'Phosphofructokinase-1, because it is the first irreversible step unique to glycolysis', 'Pyruvate kinase', 'Aldolase'] }).warnings;
assert.match(w[0], /much longer/);
assert.match(validateQuestion({ ...good, prompt: 'Which of these is not an enzyme of glycolysis?' }).warnings.join(), /capitals/);

assert.ok(similarity(good.prompt, good.prompt) === 1);
const pool = [{ qid: 'a', prompt: 'Which enzyme catalyses the committed step of glycolysis' }, { qid: 'b', prompt: 'What is the capital of France and why is it Paris?' }];
assert.deepEqual(nearDuplicates(good.prompt, pool).map((d) => d.qid), ['a']);
assert.deepEqual(nearDuplicates(good.prompt, pool, { exclude: 'a' }), []);

const audit = auditSet([{ qid: 'x', ...good }, { qid: 'y', ...good, options: ['A long distractor here', 'Short', 'Another long distractor', 'Yet another one'], correctIndex: 1 }]);
assert.equal(audit.total, 2);
assert.equal(audit.correctLongestPct, 50);
assert.equal(audit.correctShortestPct, 50);
assert.deepEqual(audit.letterPct, [0, 100, 0, 0]);
console.log('validate: all checks pass');
