// Runs the admin write layer for real -- against a scratch Neon branch, never
// the live database.
//
//   npm run test:store -- --endpoint ep-xxxx-xxxx-xxxxxxxx
//
// Make a branch in the Neon console (or with the MCP tools), copy its endpoint
// id, and pass it here. The script takes DATABASE_URL from .env.local and
// swaps only the endpoint in the hostname: a branch keeps its parent's roles
// and passwords, so no second secret is needed. It refuses to run without
// --endpoint, and refuses if that is the endpoint already in DATABASE_URL.
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { loadEnv } from './env.mjs';
import { makeStore } from '../lib/content-store.mjs';

loadEnv();
const at = process.argv.indexOf('--endpoint');
const endpoint = at >= 0 ? process.argv[at + 1] : null;
const ENDPOINT = /ep-[a-z]+-[a-z]+-[a-z0-9]+/;
const live = process.env.DATABASE_URL ?? '';
if (!endpoint || !ENDPOINT.test(endpoint)) { console.error('Pass --endpoint <scratch branch endpoint id>. This never runs against the live database.'); process.exit(1); }
if (!ENDPOINT.test(live)) { console.error('DATABASE_URL does not look like a Neon URL.'); process.exit(1); }
if (live.match(ENDPOINT)[0] === endpoint) { console.error('That is the live endpoint. Use a scratch branch.'); process.exit(1); }

const sql = neon(live.replace(ENDPOINT, endpoint));
const store = makeStore(sql);
const rejects = async (fn, name) => { try { await fn(); } catch (e) { assert.equal(e.name, name, e.message); return e; } assert.fail(`expected ${name}`); };

// ---- people
await sql`insert into users (uid, email, role) values
            ('t-admin', 'admin@test.invalid', 'admin'), ('t-lect', 'lect@test.invalid', 'lecturer'), ('t-stud', 'stud@test.invalid', 'student')
          on conflict (uid) do nothing`;
const [topic] = await sql`select t.id, t.course_code from topics t order by t.id limit 1`;
const [other] = await sql`select t.id, t.course_code from topics t where t.course_code <> ${topic.course_code} order by t.id limit 1`;
const admin = { uid: 't-admin', email: 'admin@test.invalid', displayName: 'Test Admin', role: 'admin', courses: [] };
const lect = { uid: 't-lect', email: 'lect@test.invalid', displayName: 'Test Lecturer', role: 'lecturer', courses: [topic.course_code] };
const version = async () => JSON.stringify((await sql`select value from settings where key = 'content_version'`)[0]?.value ?? null);

// ---- scope
const tree = await store.tree(lect);
assert.equal(tree.find((c) => c.code === topic.course_code).editable, true);
assert.equal(tree.find((c) => c.code === other.course_code).editable, false);
await rejects(() => store.saveItem(lect, { topicId: other.id, label: 'Not mine' }), 'ForbiddenError');

// ---- item
const v0 = await version();
const { item } = await store.saveItem(lect, { topicId: topic.id, label: 'Store test item', description: 'A description.' });
assert.ok(item.id && item.key === 'storeTestItem');
assert.notEqual(await version(), v0, 'a write bumps content_version');

// ---- question: validation, create, duplicate, update, history, undo
const q = { itemId: item.id, prompt: 'Which enzyme catalyses the committed step of glycolysis in muscle?',
            options: ['Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'Aldolase'], correctIndex: 1,
            explanation: 'PFK-1 is the main control point.', difficulty: 'medium' };
const bad = await rejects(() => store.saveQuestion(lect, { ...q, explanation: '' }), 'ValidationError');
assert.match(bad.errors[0], /explanation/);
assert.deepEqual((await store.saveQuestion(lect, { ...q, options: ['A', 'A', 'B', 'C'] }, { dryRun: true })).errors.length, 1);

const made = await store.saveQuestion(lect, q);
const qid = made.question.qid;
assert.match(qid, /^q-/);
const dup = await store.saveQuestion(lect, { ...q, prompt: q.prompt + ' ' }, { dryRun: true });
assert.equal(dup.duplicates[0].qid, qid, 'a near-identical prompt is flagged');

await store.saveQuestion(lect, { ...q, qid, prompt: 'Which enzyme is the main control point of glycolysis in muscle?' });
let hist = await store.revisions(lect, { entity: 'question', key: qid });
assert.deepEqual(hist.map((h) => h.action), ['update', 'create']);
assert.equal(hist[0].actor_email, 'lect@test.invalid');
assert.match(hist[0].before.prompt, /committed step/);

await store.revert(lect, hist[0].id);
assert.match((await store.getItem(lect, item.id)).questions[0].prompt, /committed step/, 'undo restores the old prompt');

await store.removeQuestion(lect, qid);
assert.equal((await store.getItem(lect, item.id)).questions.length, 0);
hist = await store.revisions(lect, { entity: 'question', key: qid });
await store.revert(lect, hist[0].id);
assert.equal((await store.getItem(lect, item.id)).questions[0].qid, qid, 'undo of a removal puts the question back');

await rejects(() => store.removeQuestion({ ...lect, courses: [] }, qid), 'ForbiddenError');

// ---- removing an item keeps its questions in the revision, and undo restores both
const gone = await store.removeItem(lect, item.id);
assert.equal(gone.questions, 1);
const [itemRev] = await store.revisions(lect, { entity: 'item', key: String(item.id) });
await store.revert(lect, itemRev.id);
assert.equal((await store.getItem(lect, item.id)).questions.length, 1);

// ---- analytics, lectures, topics
const a = await store.analytics(lect, topic.course_code);
assert.ok(a.audit.total > 0 && a.audit.letterPct.length === 4);
await rejects(() => store.analytics(lect, other.course_code), 'ForbiddenError');
await store.saveClass(lect, { course: topic.course_code, key: 'T99', label: 'Test lecture', outcomes: ['One', 'Two'] });
assert.ok((await store.listClasses(lect, topic.course_code)).some((c) => c.key === 'T99'));
const t = await store.saveTopic(lect, { course: topic.course_code, label: 'Store Test Topic' });
assert.equal(t.topic.key, 'storeTestTopic');

// ---- users
await rejects(() => store.listUsers(lect), 'ForbiddenError');
await store.setUser(admin, { email: 'New.Person@test.invalid', role: 'lecturer', courses: [topic.course_code, 'NOPE0000'] });
const people = await store.listUsers(admin);
const np = people.users.find((u) => u.email === 'new.person@test.invalid');
assert.deepEqual([np.role, np.pending, np.courses], ['lecturer', true, [topic.course_code]]);
await rejects(() => store.setUser(admin, { email: admin.email, role: 'student' }), 'ValidationError');

// ---- suggestions
const s = await store.addSuggestion(null, { kind: 'flag-question', course: topic.course_code, qid, body: 'Option B is ambiguous.' });
assert.ok((await store.listSuggestions(lect)).some((x) => x.id === s.id && x.itemId === item.id));
assert.equal((await store.listSuggestions({ ...lect, courses: [] })).length, 0);
await store.resolveSuggestion(lect, s.id, 'applied');
assert.ok(!(await store.listSuggestions(lect)).some((x) => x.id === s.id));

// ---- media
const m = await store.addMedia(lect, { kind: 'model', source: 'pdb', url: '1HSG', title: 'HIV protease' });
await store.saveQuestion(lect, { ...q, qid, mediaId: m.id, allowInTimed: false });
const withMedia = (await store.getItem(lect, item.id)).questions[0];
assert.deepEqual([withMedia.mediaId, withMedia.allowInTimed], [m.id, false]);
assert.equal((await store.listMedia()).find((x) => x.id === m.id).used, 1);
await store.removeMedia(lect, m.id);
assert.equal((await store.getItem(lect, item.id)).questions[0].mediaId, null, 'removing media leaves the question in place');

console.log('store: all checks pass (scratch endpoint ' + endpoint + ')');
