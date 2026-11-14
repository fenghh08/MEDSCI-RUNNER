'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LIMITS } from '@/lib/media-rules.mjs';
import { api, currentToken, when, type MediaRow, type TreeCourse } from './api';

/** Loads once, exposes reload, and shows the error instead of a blank tab. */
function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!path) return;
    try { setError(''); setData(await api<T>(path)); } catch (e) { setError((e as Error).message); }
  }, [path]);
  useEffect(() => { setData(null); reload(); }, [reload]);
  return { data, error, reload, setError };
}

function CoursePicker({ value, onChange, editableOnly = true }: { value: string; onChange: (c: string) => void; editableOnly?: boolean }) {
  const { data } = useLoad<TreeCourse[]>('/api/admin/tree');
  const courses = (data ?? []).filter((c) => !editableOnly || c.editable);
  useEffect(() => { if (!value && courses.length) onChange(courses[0].code); }, [value, courses, onChange]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 360 }} aria-label="Course">
      {courses.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
    </select>
  );
}

// ------------------------------------------------------------------ quality
type Brief = { qid: string; itemId: number; prompt: string; item: string; topic: string; n: number; c: number };
type Analytics = {
  audit: { total: number; correctLongestPct: number; correctShortestPct: number; giveawayCount: number; slideReferenceCount: number;
           letterPct: number[]; giveaway: Brief[]; cited: Brief[]; longest: Brief[] };
  answers: number; correct: number; needsReview: Brief[]; neverAnswered: number;
};

function Tile({ value, label, target, ok }: { value: ReactNode; label: string; target: string; ok: boolean }) {
  return <div className={'tile ' + (ok ? 'ok' : 'off')}><b>{value}</b>{label}<div className="hint">target {target}</div></div>;
}
function BriefList({ title, rows, onOpenItem, stat }: { title: string; rows: Brief[]; onOpenItem: (id: number) => void; stat?: boolean }) {
  if (!rows.length) return null;
  return (
    <details className="card" style={{ marginTop: 14 }}>
      <summary><b>{title}</b> <span className="muted">· {rows.length}{rows.length === 40 ? '+' : ''}</span></summary>
      <table><tbody>{rows.map((r) => (
        <tr key={r.qid}>
          <td>{r.prompt}<div className="muted">{r.topic} · {r.item}</div></td>
          {stat && <td className="num">{r.c}/{r.n} correct</td>}
          <td className="num"><button className="link" onClick={() => onOpenItem(r.itemId)}>Open</button></td>
        </tr>))}</tbody></table>
    </details>
  );
}

export function QualityTab({ onOpenItem }: { onOpenItem: (id: number) => void }) {
  const [course, setCourse] = useState('');
  const { data, error } = useLoad<Analytics>(course ? `/api/admin/analytics?course=${course}` : null);
  const a = data?.audit;
  return (
    <>
      <div className="row"><CoursePicker value={course} onChange={setCourse} /><span className="muted">The quiz-quality audit, for the whole course.</span></div>
      {error && <div className="note bad">{error}</div>}
      {!data && !error && <p className="muted">Working it out…</p>}
      {data && a && <>
        <div className="tiles" style={{ marginTop: 14 }}>
          <div className="tile"><b>{a.total}</b>questions<div className="hint">{data.neverAnswered} never answered yet</div></div>
          <Tile value={a.correctLongestPct + '%'} label="correct answer is the longest" target="25% or less" ok={a.correctLongestPct <= 25} />
          <Tile value={a.correctShortestPct + '%'} label="correct answer is the shortest" target="20 to 45%" ok={a.correctShortestPct >= 20 && a.correctShortestPct <= 45} />
          <Tile value={a.giveawayCount} label="giveaway options" target="0" ok={a.giveawayCount === 0} />
          <Tile value={a.slideReferenceCount} label="cite a slide or lecture" target="0" ok={a.slideReferenceCount === 0} />
          <Tile value={a.letterPct.map((p) => Math.round(p)).join(' / ')} label="correct letter A / B / C / D" target="about 25 each" ok={a.letterPct.every((p) => p >= 18 && p <= 32)} />
          <div className="tile"><b>{data.answers ? Math.round((100 * data.correct) / data.answers) + '%' : '—'}</b>answered correctly<div className="hint">{data.answers} answers recorded</div></div>
        </div>
        <p className="hint">These are properties of the whole set, so no single question passes or fails them. A long correct option can be picked without knowing the content; put the claim in the option and the reasoning in the explanation.</p>
        <BriefList title="Missed by most students who tried them" rows={data.needsReview} onOpenItem={onOpenItem} stat />
        <BriefList title="Giveaway options (correct answer much longer than the rest)" rows={a.giveaway} onOpenItem={onOpenItem} />
        <BriefList title="Cite a slide or lecture in the question" rows={a.cited} onOpenItem={onOpenItem} />
        <BriefList title="Correct answer is the longest" rows={a.longest} onOpenItem={onOpenItem} />
      </>}
    </>
  );
}

// ------------------------------------------------------------------ reports
type Suggestion = { id: number; kind: string; course: string | null; itemId: number | null; prompt: string | null; body: string; from: string | null; at: string };
const KIND: Record<string, string> = { 'flag-question': 'Question report', 'flag-item': 'Item report', 'fun-fact': 'Fun fact', note: 'Note', other: 'Suggestion' };

export function ReportsTab({ onOpenItem }: { onOpenItem: (id: number) => void }) {
  const [status, setStatus] = useState('open');
  const { data, error, reload, setError } = useLoad<Suggestion[]>(`/api/admin/suggestions?status=${status}`);
  async function resolve(id: number, to: string) {
    try { await api('/api/admin/suggestions', { id, status: to }); reload(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <>
      <div className="row">
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }} aria-label="Status">
          <option value="open">Waiting</option><option value="applied">Applied</option><option value="dismissed">Dismissed</option>
        </select>
        <span className="muted">What students reported or suggested from inside the game.</span>
      </div>
      {error && <div className="note bad">{error}</div>}
      {data?.length === 0 && <p className="muted">Nothing here.</p>}
      {data?.map((s) => (
        <div className="card" key={s.id} style={{ marginTop: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span><span className="pill">{KIND[s.kind] ?? s.kind}</span> {s.course && <span className="pill good">{s.course}</span>}</span>
            <span className="muted">{s.from || 'Anonymous'} · {when(s.at)}</span>
          </div>
          <p style={{ margin: '8px 0 4px' }}>{s.body}</p>
          {s.prompt && <p className="muted" style={{ margin: 0 }}>About: {s.prompt}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            {s.itemId && <button onClick={() => onOpenItem(s.itemId!)}>Open the item</button>}
            {status === 'open'
              ? <><button className="primary" onClick={() => resolve(s.id, 'applied')}>Mark as applied</button><button onClick={() => resolve(s.id, 'dismissed')}>Dismiss</button></>
              : <button onClick={() => resolve(s.id, 'open')}>Move back to waiting</button>}
          </div>
        </div>
      ))}
    </>
  );
}

// -------------------------------------------------------------------- media
const mb = (n?: number | null) => (n ? (n / 1024 / 1024).toFixed(1) + ' MB' : '');

export function MediaTab() {
  const { data, error, reload, setError } = useLoad<MediaRow[]>('/api/admin/media');
  const [source, setSource] = useState<'external' | 'pdb' | 'upload'>('external');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [attribution, setAttribution] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  async function add() {
    setError(''); setNote('');
    try {
      let body: Record<string, unknown> = { action: 'add', source, title, attribution, url };
      if (source === 'upload') {
        if (!file) throw new Error('Choose a file first.');
        const isModel = file.name.toLowerCase().endsWith('.glb');
        const rule = isModel ? LIMITS.model : LIMITS.video;
        if (!rule.extensions.some((e) => file.name.toLowerCase().endsWith(e))) throw new Error('Only .glb, .mp4 and .webm files can be uploaded.');
        if (file.size > rule.maxBytes) throw new Error(`That file is ${mb(file.size)}; the limit is ${mb(rule.maxBytes)}.`);
        setBusy('Uploading…');
        const { upload } = await import('@vercel/blob/client');
        const token = await currentToken();
        const blob = await upload(file.name, file, {
          access: 'public', handleUploadUrl: '/api/admin/media/upload',
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
          contentType: isModel ? 'model/gltf-binary' : file.type,
          onUploadProgress: (p) => setBusy(`Uploading… ${Math.round(p.percentage)}%`),
        });
        body = { ...body, url: blob.url, kind: isModel ? 'model' : 'video' };
      }
      setBusy('Checking the file…');
      const res = await api('/api/admin/media', body);
      setNote(res.warning ? `Added. ${res.warning}` : 'Added. Attach it to a question from the question editor.');
      setTitle(''); setUrl(''); setAttribution(''); setFile(null);
      reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  async function remove(m: MediaRow) {
    if (!window.confirm(`Remove "${m.title}"?${m.used ? ` ${m.used} question(s) use it and will go back to plain text.` : ''}`)) return;
    try { await api('/api/admin/media', { action: 'remove', id: m.id }); reload(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="two">
      <div className="card">
        <h2>Add a video or a 3D model</h2>
        <label>What are you adding?</label>
        <select value={source} onChange={(e) => { setSource(e.target.value as typeof source); setUrl(''); }}>
          <option value="external">A link (YouTube, Vimeo, or a direct file)</option>
          <option value="pdb">A molecular structure from the Protein Data Bank</option>
          <option value="upload">A file from my computer</option>
        </select>
        <label>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HIV-1 protease with inhibitor" />
        {source === 'external' && <><label>Link</label><input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></>}
        {source === 'pdb' && <><label>PDB id <small>four characters, from rcsb.org</small></label><input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="1HSG" maxLength={4} /></>}
        {source === 'upload' && <><label>File</label><input type="file" accept=".glb,.mp4,.webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></>}
        <label>Credit <small>optional: who made it, licence</small></label>
        <input type="text" value={attribution} onChange={(e) => setAttribution(e.target.value)} />
        <div className="row" style={{ marginTop: 14 }}>
          <button className="primary" disabled={!!busy || title.trim().length < 3} onClick={add}>{busy || 'Add'}</button>
        </div>
        {error && <div className="note bad">{error}</div>}
        {note && <div className="note good">{note}</div>}
        <details className="adv">
          <summary>What files are accepted?</summary>
          <ul className="hint">
            <li><b>3D models:</b> <code>.glb</code> only (glTF 2.0 binary, one file with textures inside), up to {mb(LIMITS.model.maxBytes)}; under {mb(LIMITS.model.warnBytes)} is better. In Blender: File → Export → glTF 2.0 → format "glTF Binary". Aim for under 150,000 triangles and 2048px textures; Draco compression is supported.</li>
            <li><b>Not accepted:</b> .gltf with separate files, .obj, .stl, .fbx. Convert to .glb first.</li>
            <li><b>Proteins and small molecules:</b> use a PDB id instead of converting. Nothing to upload.</li>
            <li><b>Video:</b> <code>.mp4</code> (H.264) or <code>.webm</code>, up to {mb(LIMITS.video.maxBytes)} and about {LIMITS.video.maxSeconds / 60} minutes. A YouTube or Vimeo link costs no storage.</li>
          </ul>
        </details>
      </div>
      <div className="card">
        <h2>Library</h2>
        {data?.length === 0 && <p className="muted">Nothing added yet.</p>}
        <table><tbody>{data?.map((m) => (
          <tr key={m.id}>
            <td>{m.kind === 'model' ? '🧊' : '🎬'} <b>{m.title}</b>
              <div className="muted">{m.source === 'pdb' ? `PDB ${m.url}` : m.source === 'upload' ? `uploaded ${mb(m.bytes)}` : new URL(m.url).hostname}{m.attribution ? ` · ${m.attribution}` : ''}</div></td>
            <td className="num">{m.used ? `${m.used} question${m.used === 1 ? '' : 's'}` : 'unused'}</td>
            <td className="num"><button className="danger" onClick={() => remove(m)}>Remove</button></td>
          </tr>))}</tbody></table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ history
type Revision = { id: number; entity: string; entity_key: string; action: string; before: any; after: any; at: string; actor_email: string | null; actor_name: string | null };

export function HistoryTab() {
  const [course, setCourse] = useState('');
  const { data, error, reload, setError } = useLoad<Revision[]>(course ? `/api/admin/history?course=${course}` : null);
  async function undo(id: number) {
    if (!window.confirm('Put this back how it was before the change?')) return;
    try { await api('/api/admin/history', { id }); reload(); } catch (e) { setError((e as Error).message); }
  }
  const title = (r: Revision) => (r.after ?? r.before)?.prompt ?? (r.after ?? r.before)?.label ?? (r.before?.item?.label) ?? r.entity_key;
  return (
    <>
      <div className="row"><CoursePicker value={course} onChange={setCourse} /><span className="muted">Every change made here, newest first.</span></div>
      {error && <div className="note bad">{error}</div>}
      {data?.length === 0 && <p className="muted">No changes recorded for this course yet.</p>}
      {data && data.length > 0 && <div className="card" style={{ marginTop: 14 }}><table><tbody>{data.map((r) => (
        <tr key={r.id}>
          <td style={{ whiteSpace: 'nowrap' }} className="muted">{when(r.at)}</td>
          <td><span className="pill">{r.action} {r.entity}</span> {String(title(r)).slice(0, 140)}
            {r.action === 'update' && r.before?.prompt !== r.after?.prompt && r.before?.prompt && <div className="diff"><del>{r.before.prompt}</del><br /><ins>{r.after.prompt}</ins></div>}
            <div className="muted">{r.actor_name || r.actor_email || 'unknown'}</div></td>
          <td className="num">{(r.entity === 'question' || (r.entity === 'item' && r.action !== 'create')) && <button className="link" onClick={() => undo(r.id)}>Undo</button>}</td>
        </tr>))}</tbody></table></div>}
    </>
  );
}

// ------------------------------------------------------------------- people
type People = { courses: { code: string; label: string }[]; users: { email: string; name: string | null; role: string; pending: boolean; courses: string[]; lastSeen: string | null }[] };

export function PeopleTab() {
  const { data, error, reload, setError } = useLoad<People>('/api/admin/users');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('lecturer');
  const [courses, setCourses] = useState<string[]>([]);
  const [note, setNote] = useState('');
  async function save() {
    try { setNote(''); await api('/api/admin/users', { email, role, courses }); setNote(`Saved ${email}.`); setEmail(''); setCourses([]); reload(); }
    catch (e) { setError((e as Error).message); }
  }
  const edit = (u: People['users'][number]) => { setEmail(u.email); setRole(u.role); setCourses(u.courses); window.scrollTo({ top: 0 }); };
  return (
    <div className="two">
      <div className="card">
        <h2>Give someone access</h2>
        <p className="hint">Use the Google address they will sign in with. They do not need to have signed in before.</p>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sydney.edu.au" />
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="lecturer">Lecturer: edits the courses ticked below</option>
          <option value="admin">Admin: edits everything and manages people</option>
          <option value="student">No access (remove)</option>
        </select>
        {role === 'lecturer' && <>
          <label>Courses</label>
          {data?.courses.map((c) => (
            <label key={c.code} style={{ fontWeight: 400, margin: '4px 0' }}>
              <input type="checkbox" checked={courses.includes(c.code)}
                     onChange={(e) => setCourses(e.target.checked ? [...courses, c.code] : courses.filter((x) => x !== c.code))} /> {c.code} · {c.label}
            </label>))}
        </>}
        <div className="row" style={{ marginTop: 14 }}><button className="primary" disabled={!email.includes('@')} onClick={save}>Save</button></div>
        {error && <div className="note bad">{error}</div>}
        {note && <div className="note good">{note}</div>}
      </div>
      <div className="card">
        <h2>Who has access</h2>
        <table><tbody>{data?.users.map((u) => (
          <tr key={u.email}>
            <td><b>{u.name || u.email}</b>{u.name && <div className="muted">{u.email}</div>}
              {u.pending && <div><span className="pill warn">has not signed in yet</span></div>}</td>
            <td>{u.role}{u.role === 'lecturer' && <div className="muted">{u.courses.join(', ') || 'no courses'}</div>}</td>
            <td className="num"><button className="link" onClick={() => edit(u)}>Change</button></td>
          </tr>))}</tbody></table>
      </div>
    </div>
  );
}
