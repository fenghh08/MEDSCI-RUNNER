'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { validateQuestion } from '@/lib/validate.mjs';
import { api, ApiError, when, type Item, type ItemPayload, type Question, type TreeCourse } from './api';
import type React from 'react';

const LETTERS = 'ABCDEF';
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const blankQuestion = (itemId: number, classKey: string | null): Question => ({
  itemId, prompt: '', options: ['', '', '', ''], correctIndex: -1, explanation: '', difficulty: 'medium',
  hashtags: [], classKey, mediaId: null, allowInTimed: true,
});

type Selection = { kind: 'item'; id: number } | { kind: 'lecture'; key: string } | null;

/** A one-line form that opens in place: friendlier than a browser prompt, and it can carry a second field. */
function InlineAdd({ label, placeholder, onAdd, children }: { label: string; placeholder: string; onAdd: (value: string) => Promise<void> | void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return <button className="leaf muted" onClick={() => setOpen(true)}><span>{label}</span><span /></button>;
  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try { await onAdd(value.trim()); setValue(''); setOpen(false); }
    catch { /* stays open: whoever refused has already said why */ }
    finally { setBusy(false); }
  };
  return (
    <div className="inline-add">
      <input type="text" autoFocus value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)}
             onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }} />
      {children}
      <div className="row">
        <button className="primary" disabled={busy || !value.trim()} onClick={submit}>Add</button>
        <button onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function ContentTab({ openItem, onOpened }: { openItem: number | null; onOpened: () => void }) {
  const [tree, setTree] = useState<TreeCourse[] | null>(null);
  const [course, setCourse] = useState('');
  const [view, setView] = useState<'lecture' | 'topic'>('lecture');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Selection>(null);
  const [error, setError] = useState('');
  const [newItemTopic, setNewItemTopic] = useState<number | ''>('');

  const loadTree = useCallback(async () => {
    try {
      const t = await api<TreeCourse[]>('/api/admin/tree');
      setTree(t);
      setCourse((c) => c || (t.find((x) => x.editable) ?? t[0])?.code || '');
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { loadTree(); }, [loadTree]);

  // Arriving from Insights or Reports: open that item, in whichever course it lives.
  useEffect(() => {
    if (openItem == null || !tree) return;
    const home = tree.find((c) => c.topics.some((t) => t.items.some((i) => i.id === openItem)));
    if (home) setCourse(home.code);
    setSelected({ kind: 'item', id: openItem });
    onOpened();
  }, [openItem, tree, onOpened]);

  const current = tree?.find((c) => c.code === course);
  const needle = search.trim().toLowerCase();
  const allItems = useMemo(() => (current?.topics ?? []).flatMap((t) => t.items.map((i) => ({ ...i, topicId: t.id, topic: t.label }))), [current]);
  const itemId = selected?.kind === 'item' ? selected.id : null;
  const guard = async (fn: () => Promise<void>) => { try { setError(''); await fn(); } catch (e) { setError((e as Error).message); } };

  const addItem = (topicId: number, label: string, classKey: string | null) => guard(async () => {
    const { item } = await api('/api/admin/item', { action: 'save', topicId, label, classKey });
    await loadTree(); setSelected({ kind: 'item', id: item.id });
  });
  const addTopic = (label: string) => guard(async () => { await api('/api/admin/topic', { course, label }); await loadTree(); });
  const addLecture = (label: string, key: string) => guard(async () => {
    await api('/api/admin/classes', { course, key, label });
    await loadTree(); setSelected({ kind: 'lecture', key });
  });
  const nextLectureKey = () => {
    const nums = (current?.classes ?? []).map((k) => /^L(\d+)$/.exec(k.key)?.[1]).filter(Boolean).map(Number);
    return 'L' + ((nums.length ? Math.max(...nums) : 0) + 1);
  };

  if (error && !tree) return <div className="note bad">{error}</div>;
  if (!tree) return <div className="muted">Loading the content…</div>;

  const leaf = (i: { id: number; label: string; questions: number; incomplete: boolean }, extra?: string) => (
    <button key={i.id} className={'leaf' + (i.id === itemId ? ' on' : '')} onClick={() => setSelected({ kind: 'item', id: i.id })}>
      <span>{i.label}{extra && <small className="muted"> · {extra}</small>}</span>
      <span>{i.incomplete ? '⚠ ' : ''}{i.questions}</span>
    </button>
  );
  const match = (i: { label: string }) => !needle || i.label.toLowerCase().includes(needle);
  const topicPicker = (
    <select value={newItemTopic} onChange={(e) => setNewItemTopic(e.target.value ? Number(e.target.value) : '')} aria-label="Topic for the new item">
      <option value="">Which topic is it about?</option>
      {current?.topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
    </select>
  );

  return (
    <div className="split">
      <aside className="card tree">
        <select value={course} onChange={(e) => { setCourse(e.target.value); setSelected(null); }} aria-label="Course">
          {tree.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}{c.editable ? '' : ' (view only)'}</option>)}
        </select>
        <div className="seg" role="tablist" aria-label="How to list the content">
          <button role="tab" aria-selected={view === 'lecture'} className={view === 'lecture' ? 'on' : ''} onClick={() => setView('lecture')}>By lecture</button>
          <button role="tab" aria-selected={view === 'topic'} className={view === 'topic' ? 'on' : ''} onClick={() => setView('topic')}>By topic</button>
        </div>
        <input type="search" placeholder="Find an item…" value={search} onChange={(e) => setSearch(e.target.value)} />

        {view === 'lecture' && current && <>
          {[...current.classes, { key: '', label: 'Not tied to a lecture', intro: '', outcomes: [] }].map((k) => {
            const items = allItems.filter((i) => (i.classKey ?? '') === k.key && match(i));
            if ((needle || !k.key) && !items.length) return null;
            const questions = items.reduce((t, i) => t + i.questions, 0);
            const isOpen = !!needle || (selected?.kind === 'lecture' && selected.key === k.key) || items.some((i) => i.id === itemId);
            return (
              <details key={k.key || 'none'} open={isOpen}>
                <summary>{k.key && <b>{k.key} · </b>}{k.label} <span className="muted">· {questions} q</span></summary>
                {k.key && <button className={'leaf' + (selected?.kind === 'lecture' && selected.key === k.key ? ' on' : '')} onClick={() => setSelected({ kind: 'lecture', key: k.key })}>
                  <span>✎ Lecture title, intro and outcomes</span><span />
                </button>}
                {items.map((i) => leaf(i, i.topic))}
                {!items.length && <div className="leaf muted"><span>No items yet</span><span /></div>}
                {current.editable && !needle && k.key &&
                  <InlineAdd label="+ New item in this lecture" placeholder="Name of the concept"
                             onAdd={async (label) => { if (newItemTopic === '') { setError('Pick which topic the new item is about.'); throw new Error('no topic'); } await addItem(newItemTopic, label, k.key); }}>
                    {topicPicker}
                  </InlineAdd>}
              </details>
            );
          })}
          {current.editable && !needle &&
            <LectureAdder suggest={nextLectureKey()} onAdd={addLecture} />}
        </>}

        {view === 'topic' && current?.topics.map((t) => {
          const items = t.items.filter(match);
          if (needle && !items.length) return null;
          return (
            <details key={t.id} open={!!needle || t.items.some((i) => i.id === itemId)}>
              <summary>{t.icon} {t.label} <span className="muted">· {t.items.length}</span></summary>
              {items.map((i) => leaf(i, i.classKey ?? undefined))}
              {current.editable && !needle && <>
                <InlineAdd label="+ New item" placeholder="Name of the concept" onAdd={(label) => addItem(t.id, label, null)} />
                <InlineAdd label="✎ Rename this topic" placeholder={t.label}
                           onAdd={(label) => guard(async () => { await api('/api/admin/topic', { id: t.id, label }); await loadTree(); })} />
              </>}
            </details>
          );
        })}
        {view === 'topic' && current?.editable && !needle && <InlineAdd label="+ New topic" placeholder="Name of the topic" onAdd={addTopic} />}

        <p className="hint">The number is how many questions there are. ⚠ marks an item with no description or no questions.</p>
      </aside>
      <section>
        {error && <div className="note bad">{error}</div>}
        {selected === null && <div className="card muted">
          <h2 style={{ color: 'var(--ink)' }}>{current?.code} · {current?.label}</h2>
          <p>{current?.classes.length} lectures · {current?.topics.length} topics · {allItems.length} items · {allItems.reduce((t, i) => t + i.questions, 0)} questions.</p>
          <p>Open a lecture on the left to see what it covers. Pick an item to edit it and its questions, or use
             “Lecture title, intro and outcomes” to edit the lecture itself. Everything you save is live in the game straight away, and every change can be undone from History.</p>
        </div>}
        {selected?.kind === 'item' && <ItemPanel key={selected.id} itemId={selected.id} onChanged={loadTree} onGone={() => { setSelected(null); loadTree(); }} />}
        {selected?.kind === 'lecture' && current && current.classes.some((k) => k.key === selected.key) &&
          <LecturePanel key={course + selected.key} course={course} editable={current.editable}
                        lecture={current.classes.find((k) => k.key === selected.key)!}
                        items={allItems.filter((i) => i.classKey === selected.key)}
                        onOpenItem={(id) => setSelected({ kind: 'item', id })} onSaved={loadTree} />}
      </section>
    </div>
  );
}

function LectureAdder({ suggest, onAdd }: { suggest: string; onAdd: (label: string, key: string) => Promise<void> }) {
  const [key, setKey] = useState('');
  return (
    <InlineAdd label="+ New lecture" placeholder="Lecture title" onAdd={(label) => onAdd(label, (key || suggest).trim())}>
      <input type="text" value={key} placeholder={`Short code, e.g. ${suggest}`} onChange={(e) => setKey(e.target.value)} aria-label="Lecture code" />
    </InlineAdd>
  );
}

function LecturePanel({ course, lecture, items, editable, onOpenItem, onSaved }: {
  course: string; lecture: { key: string; label: string; intro: string; outcomes: string[] }; editable: boolean;
  items: { id: number; label: string; questions: number; topic: string; incomplete: boolean }[];
  onOpenItem: (id: number) => void; onSaved: () => void;
}) {
  const [label, setLabel] = useState(lecture.label);
  const [intro, setIntro] = useState(lecture.intro);
  const [outcomes, setOutcomes] = useState(lecture.outcomes.join('\n'));
  const [status, setStatus] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);
  async function save() {
    try {
      await api('/api/admin/classes', { course, key: lecture.key, label, intro, outcomes: lines(outcomes) });
      setStatus({ kind: 'good', text: 'Lecture saved. It is live in the game now.' }); onSaved();
    } catch (e) { setStatus({ kind: 'bad', text: (e as Error).message }); }
  }
  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{lecture.key} · {label || 'Untitled lecture'}</h2><span className="pill">{course}</span>
        </div>
        <label>Title</label>
        <input type="text" value={label} disabled={!editable} onChange={(e) => setLabel(e.target.value)} />
        <label>Introduction <small>a sentence or two shown when students browse by lecture</small></label>
        <textarea rows={3} value={intro} disabled={!editable} onChange={(e) => setIntro(e.target.value)} />
        <label>Learning outcomes <small>one per line</small></label>
        <textarea rows={5} value={outcomes} disabled={!editable} onChange={(e) => setOutcomes(e.target.value)} />
        {editable && <div className="row" style={{ marginTop: 14 }}><button className="primary" onClick={save}>Save lecture</button></div>}
        {status && <div className={'note ' + status.kind}>{status.text}</div>}
      </div>
      <div className="card">
        <h3>In this lecture · {items.length} item{items.length === 1 ? '' : 's'} · {items.reduce((t, i) => t + i.questions, 0)} questions</h3>
        {items.length === 0 && <p className="muted">Nothing yet. Use “+ New item in this lecture” on the left.</p>}
        <table><tbody>{items.map((i) => (
          <tr key={i.id}>
            <td><button className="link" onClick={() => onOpenItem(i.id)}>{i.label}</button><div className="muted">{i.topic}</div></td>
            <td className="num">{i.incomplete ? '⚠ ' : ''}{i.questions} question{i.questions === 1 ? '' : 's'}</td>
          </tr>))}</tbody></table>
      </div>
    </>
  );
}

function ItemPanel({ itemId, onChanged, onGone }: { itemId: number; onChanged: () => void; onGone: () => void }) {
  const [data, setData] = useState<ItemPayload | null>(null);
  const [form, setForm] = useState<Item | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [status, setStatus] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);

  const load = useCallback(async () => {
    try { const d = await api<ItemPayload>(`/api/admin/item?id=${itemId}`); setData(d); setForm(d.item); }
    catch (e) { setStatus({ kind: 'bad', text: (e as Error).message }); }
  }, [itemId]);
  useEffect(() => { load(); }, [load]);

  if (!data || !form) return <div className="card muted">{status?.text ?? 'Loading…'}</div>;
  const ro = !data.editable;
  const set = (patch: Partial<Item>) => setForm({ ...form, ...patch });

  async function saveItem() {
    try { await api('/api/admin/item', { action: 'save', ...form }); setStatus({ kind: 'good', text: 'Item saved. It is live in the game now.' }); onChanged(); }
    catch (e) { setStatus({ kind: 'bad', text: (e as Error).message }); }
  }
  async function removeItem() {
    const n = data!.questions.length;
    if (!window.confirm(`Remove "${form!.label}"${n ? ` and its ${n} question${n > 1 ? 's' : ''}` : ''}? It can be put back from History.`)) return;
    try { await api('/api/admin/item', { action: 'remove', id: itemId }); onGone(); }
    catch (e) { setStatus({ kind: 'bad', text: (e as Error).message }); }
  }
  async function removeQuestion(qid: string) {
    if (!window.confirm('Remove this question? It can be put back from History.')) return;
    try { await api('/api/admin/question', { action: 'remove', qid }); await load(); onChanged(); }
    catch (e) { setStatus({ kind: 'bad', text: (e as Error).message }); }
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{form.label || 'Untitled item'}</h2>
          <span className="pill">{data.course}{ro ? ' · view only' : ''}</span>
        </div>
        <label>Name</label>
        <input type="text" value={form.label} disabled={ro} onChange={(e) => set({ label: e.target.value })} />
        <label>Lecture <small>which lecture this belongs to</small></label>
        <select value={form.classKey ?? ''} disabled={ro} onChange={(e) => set({ classKey: e.target.value || null })}>
          <option value="">Not tied to a lecture</option>
          {data.classes.map((c) => <option key={c.key} value={c.key}>{c.key} · {c.label}</option>)}
        </select>
        <label>Description <small>shown in the study guide</small></label>
        <textarea rows={3} value={form.description} disabled={ro} onChange={(e) => set({ description: e.target.value })} />
        <details className="adv">
          <summary>More: mechanism, fun facts, recall prompts</summary>
          <label>Mechanism</label>
          <textarea rows={2} value={form.mechanism} disabled={ro} onChange={(e) => set({ mechanism: e.target.value })} />
          <label>Fun facts <small>one per line</small></label>
          <textarea rows={3} value={form.funFacts.join('\n')} disabled={ro} onChange={(e) => set({ funFacts: lines(e.target.value) })} />
          <label>Active-recall prompts <small>one per line</small></label>
          <textarea rows={3} value={form.activeRecall.join('\n')} disabled={ro} onChange={(e) => set({ activeRecall: lines(e.target.value) })} />
        </details>
        {!ro && <div className="row" style={{ marginTop: 14 }}>
          <button className="primary" onClick={saveItem}>Save item</button>
          <button className="danger" onClick={removeItem}>Remove item</button>
        </div>}
        {status && <div className={'note ' + status.kind}>{status.text}</div>}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>Questions · {data.questions.length}</h3>
          {!ro && !editing && <button className="primary" onClick={() => setEditing(blankQuestion(itemId, form.classKey))}>+ New question</button>}
        </div>
        {editing
          ? <QuestionForm key={editing.qid ?? 'new'} initial={editing} data={data} onCancel={() => setEditing(null)}
                          onSaved={async () => { setEditing(null); await load(); onChanged(); }} />
          : data.questions.length === 0
            ? <p className="muted">No questions yet.</p>
            : data.questions.map((q) => (
              <div className="qrow" key={q.qid}>
                <div>
                  <div>{q.prompt}</div>
                  <div className="muted">✓ {q.options[q.correctIndex]} · {q.difficulty}{q.mediaId ? ' · has media' : ''}
                    {' · '}{q.answers ? `${q.answers} answer${q.answers === 1 ? '' : 's'}, ${Math.round((100 * q.correct) / q.answers)}% correct` : 'not answered yet'}</div>
                </div>
                {!ro && <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <button onClick={() => setEditing(q)}>Edit</button>
                  <button title="Start a new question from a copy of this one" onClick={() => setEditing({ ...q, qid: undefined, prompt: q.prompt })}>Duplicate</button>
                  <button className="danger" onClick={() => removeQuestion(q.qid)}>Remove</button>
                </div>}
              </div>
            ))}
      </div>
    </>
  );
}

function QuestionForm({ initial, data, onSaved, onCancel }: { initial: Question; data: ItemPayload; onSaved: () => void; onCancel: () => void }) {
  const [q, setQ] = useState<Question>(initial);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<{ qid: string; prompt: string; score: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const set = (patch: Partial<Question>) => { setQ({ ...q, ...patch }); setServerErrors([]); setDuplicates(null); };

  // The same rules the server enforces, run as you type. The server's copy is the one that counts.
  const live = useMemo(() => validateQuestion(q), [q]);
  const touched = q.prompt.length > 0 || q.options.some(Boolean);
  const media = data.media.find((m) => m.id === q.mediaId);

  async function save() {
    setBusy(true);
    try {
      if (duplicates === null) {
        const check = await api('/api/admin/question', { action: 'check', ...q });
        if (check.errors.length) { setServerErrors(check.errors); return; }
        if (check.duplicates.length) { setDuplicates(check.duplicates); return; }   // second click saves anyway
      }
      await api('/api/admin/question', { action: 'save', ...q });
      onSaved();
    } catch (e) {
      const err = e as ApiError;
      setServerErrors(err.errors?.length ? err.errors : [err.message]);
    } finally { setBusy(false); }
  }
  async function showHistory() {
    setHistory(await api(`/api/admin/history?entity=question&key=${encodeURIComponent(q.qid!)}`));
  }
  async function undo(id: number) {
    try { await api('/api/admin/history', { id }); onSaved(); }
    catch (e) { setServerErrors([(e as Error).message]); }
  }

  const errors = serverErrors.length ? serverErrors : (touched ? live.errors : []);
  return (
    <div className="two" style={{ marginTop: 12 }}>
      <div>
        <label>Question</label>
        <textarea rows={3} value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} autoFocus />
        <label>Options <small>select the correct one</small></label>
        {q.options.map((o, i) => (
          <div className="opt" key={i}>
            <input type="radio" name="correct" checked={q.correctIndex === i} onChange={() => set({ correctIndex: i })} aria-label={`Option ${LETTERS[i]} is correct`} />
            <input type="text" value={o} placeholder={`Option ${LETTERS[i]}`} onChange={(e) => set({ options: q.options.map((x, k) => (k === i ? e.target.value : x)) })} />
            <button title="Remove this option" disabled={q.options.length <= 2}
                    onClick={() => set({ options: q.options.filter((_, k) => k !== i), correctIndex: q.correctIndex === i ? -1 : q.correctIndex > i ? q.correctIndex - 1 : q.correctIndex })}>×</button>
          </div>
        ))}
        {q.options.length < 6 && <button style={{ marginTop: 8 }} onClick={() => set({ options: [...q.options, ''] })}>+ Option</button>}
        <label>Explanation <small>what the student reads after answering</small></label>
        <textarea rows={3} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} />
        <div className="two">
          <div>
            <label>Difficulty</label>
            <select value={q.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label>Lecture</label>
            <select value={q.classKey ?? ''} onChange={(e) => set({ classKey: e.target.value || null })}>
              <option value="">Same as the item</option>
              {data.classes.map((c) => <option key={c.key} value={c.key}>{c.key} · {c.label}</option>)}
            </select>
          </div>
        </div>
        <details className="adv" open={!!q.mediaId}>
          <summary>Add media (optional)</summary>
          <p className="hint">A video or 3D model shown above the question. Add files and links under the Media tab first.</p>
          <select value={q.mediaId ?? ''} onChange={(e) => set({ mediaId: e.target.value || null, allowInTimed: e.target.value ? (data.media.find((m) => m.id === e.target.value)?.kind !== 'model') : true })}>
            <option value="">No media</option>
            {data.media.map((m) => <option key={m.id} value={m.id}>{m.kind === 'model' ? '🧊' : '🎬'} {m.title}</option>)}
          </select>
          {q.mediaId && <label style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={q.allowInTimed} onChange={(e) => set({ allowInTimed: e.target.checked })} /> Also use in timed modes (Runner, Group Race, Cell Battle)
            <br /><small>Off by default for 3D models: they can take longer to load than the timer allows.</small>
          </label>}
        </details>

        {errors.length > 0 && <div className="note bad"><ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
        {!errors.length && live.warnings.length > 0 && <div className="note warn"><ul>{live.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
        {duplicates && duplicates.length > 0 && <div className="note warn">
          This looks like a question that already exists:
          <ul>{duplicates.map((d) => <li key={d.qid}>{d.prompt} <span className="muted">({Math.round(d.score * 100)}% similar)</span></li>)}</ul>
          Save again to keep both.
        </div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="primary" disabled={busy || live.errors.length > 0} onClick={save}>{duplicates?.length ? 'Save anyway' : q.qid ? 'Save changes' : 'Add question'}</button>
          <button onClick={onCancel}>Cancel</button>
          {q.qid && <button className="link" onClick={showHistory}>History</button>}
        </div>
        {history && <div style={{ marginTop: 10 }}>
          {history.length === 0 && <p className="muted">No recorded changes.</p>}
          {history.map((h) => (
            <div className="diff" key={h.id}>
              <b>{h.action}</b> · {h.actor_name || h.actor_email || 'unknown'} · {when(h.at)}
              {h.before?.prompt && h.after?.prompt && h.before.prompt !== h.after.prompt && <div><del>{h.before.prompt}</del><br /><ins>{h.after.prompt}</ins></div>}
              {h.action !== 'create' && <div><button className="link" onClick={() => undo(h.id)}>Put back how it was before this change</button></div>}
            </div>
          ))}
        </div>}
      </div>

      <div>
        <h3>How students see it</h3>
        <div className="preview" style={{ marginTop: 8 }}>
          {media && <div className="pill" style={{ marginBottom: 8 }}>{media.kind === 'model' ? '🧊 3D model' : '🎬 Video'}: {media.title}</div>}
          <div style={{ fontWeight: 600 }}>{q.prompt || <span className="muted">Your question appears here.</span>}</div>
          {q.options.map((o, i) => <div key={i} className={'p-opt' + (i === q.correctIndex ? ' right' : '')}>{LETTERS[i]}. {o || <span className="muted">…</span>}</div>)}
          {q.explanation && <p className="muted" style={{ marginBottom: 0 }}>{q.explanation}</p>}
        </div>
        <p className="hint">The game shuffles the options in Runner, Group Race and Custom run, and shows them in this order in Study &amp; Practice and Review.</p>
      </div>
    </div>
  );
}
