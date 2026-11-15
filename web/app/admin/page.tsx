'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, setTokenSource, type Me } from './api';
import { ContentTab } from './content';
import { HistoryTab, InsightsTab, MediaTab, PeopleTab, ReportsTab } from './tabs';

type Phase = 'loading' | 'signin' | 'noaccess' | 'unconfigured' | 'ready';
const TABS = [['content', 'Content'], ['insights', 'Insights'], ['reports', 'Reports'], ['media', 'Media'], ['history', 'History'], ['people', 'People']] as const;
type Tab = (typeof TABS)[number][0];

/**
 * The content app for lecturers and unit coordinators.
 *
 * Signing in here proves who you are and nothing more: what you may edit is
 * decided by the server, from the `users` table, on every single request.
 * This page only hides what you could not use anyway.
 */
export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [problem, setProblem] = useState('');
  const [tab, setTab] = useState<Tab>('content');
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [signOut, setSignOut] = useState<(() => void) | null>(null);
  const [signIn, setSignIn] = useState<(() => void) | null>(null);

  const identify = useCallback(async () => {
    try {
      const who = await api<Me>('/api/me');
      setMe(who);
      setPhase(who.role === 'student' ? 'noaccess' : 'ready');
      return true;
    } catch (err) {
      const e = err as ApiError;
      if (e.status === 503) { setProblem(e.message); setPhase('unconfigured'); return true; }
      // Not signed in is expected; anything else is worth showing as it is.
      if (e.status !== 401) setProblem(e.message);
      return false;
    }
  }, []);

  useEffect(() => {
    let stop = () => {};
    (async () => {
      // Local development with ADMIN_DEV_USER answers /api/me without a token.
      if (await identify()) return;
      const [{ initializeApp, getApps }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
      const app = getApps()[0] ?? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
      const a = auth.getAuth(app);
      setSignIn(() => () => auth.signInWithPopup(a, new auth.GoogleAuthProvider()).catch((e) => setProblem(e.message)));
      setSignOut(() => () => auth.signOut(a));
      stop = auth.onIdTokenChanged(a, async (user) => {
        if (!user) { setTokenSource(async () => null); setMe(null); setPhase('signin'); return; }
        setTokenSource(() => user.getIdToken());
        if (!(await identify())) { setProblem((p) => p || 'Your sign-in could not be verified. Try signing in again.'); setPhase('signin'); }
      });
    })().catch((e) => { setProblem(String(e?.message ?? e)); setPhase('signin'); });
    return () => stop();
  }, [identify]);

  if (phase === 'loading') return <div className="center muted">Loading…</div>;
  if (phase === 'signin') return (
    <div className="center card">
      <h1>Medsci Runner · Content</h1>
      <p className="muted">For lecturers and unit coordinators. Sign in with the Google account your access was granted to.</p>
      <button className="primary" disabled={!signIn} onClick={() => signIn?.()}>Sign in with Google</button>
      {problem && <div className="note bad">{problem}</div>}
    </div>
  );
  if (phase === 'unconfigured') return (
    <div className="center card">
      <h1>Sign-in is not set up on this server</h1>
      <p className="muted">{problem}</p>
      <p className="muted">Add the Firebase service account to <code>web/.env.local</code> (see <code>.env.example</code>) and restart. Until then nothing here can be opened, by anyone.</p>
    </div>
  );
  if (phase === 'noaccess') return (
    <div className="center card">
      <h1>No editing access yet</h1>
      <p className="muted">You are signed in as <b>{me?.email}</b>, which has not been given a course to edit. Ask an admin to add this address under People.</p>
      <button onClick={() => signOut?.()}>Sign out</button>
    </div>
  );

  const tabs = TABS.filter(([k]) => k !== 'people' || me!.role === 'admin');
  const goToItem = (id: number) => { setOpenItem(id); setTab('content'); };
  return (
    <>
      <header className="top">
        <h1>Medsci Runner · Content</h1>
        <nav>{tabs.map(([k, label]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}</nav>
        <div className="who">
          <span>{me!.email} · {me!.role}{me!.role === 'lecturer' ? ` · ${me!.courses.join(', ') || 'no courses'}` : ''}</span>
          <a href="/" target="_blank" rel="noreferrer">Open the game</a>
          {signOut && <button onClick={() => signOut()}>Sign out</button>}
        </div>
      </header>
      <main className="wrap">
        {tab === 'content' && <ContentTab openItem={openItem} onOpened={() => setOpenItem(null)} />}
        {tab === 'insights' && <InsightsTab onOpenItem={goToItem} />}
        {tab === 'reports' && <ReportsTab onOpenItem={goToItem} />}
        {tab === 'media' && <MediaTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'people' && <PeopleTab />}
      </main>
    </>
  );
}
