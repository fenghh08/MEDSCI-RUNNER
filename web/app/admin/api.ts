'use client';

/** How the admin pages talk to /api/admin: one function, the token attached, errors as exceptions. */
let getToken: () => Promise<string | null> = async () => null;
export function setTokenSource(fn: () => Promise<string | null>) { getToken = fn; }
export const currentToken = () => getToken();

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly errors: string[] = []) { super(message); }
}

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `The server answered ${res.status}.`, data.errors);
  return data as T;
}

export type Me = { uid: string; email: string; displayName: string | null; role: 'student' | 'lecturer' | 'admin'; courses: string[] };
export type TreeItem = { id: number; key: string; label: string; classKey: string | null; questions: number; incomplete: boolean };
export type TreeTopic = { id: number; key: string; label: string; icon: string; items: TreeItem[] };
export type TreeClass = { key: string; label: string; intro: string; outcomes: string[] };
export type TreeCourse = { code: string; label: string; editable: boolean; classes: TreeClass[]; topics: TreeTopic[] };
export type Question = {
  qid?: string; itemId: number; prompt: string; options: string[]; correctIndex: number; explanation: string;
  difficulty: string; hashtags: string[]; classKey: string | null; mediaId: string | null; allowInTimed: boolean;
};
export type Item = {
  id?: number; topicId: number; key?: string; label: string; description: string; mechanism: string;
  funFacts: string[]; activeRecall: string[]; hashtags: string[]; classKey: string | null; mediaId: string | null;
};
export type MediaRow = { id: string; kind: string; source: string; url: string; title: string; bytes?: number | null; used?: number; attribution?: string | null };
export type ItemPayload = {
  course: string; topicKey: string; editable: boolean; item: Item & { id: number }; questions: (Question & { qid: string; answers: number; correct: number })[];
  classes: { key: string; label: string }[]; media: MediaRow[];
};

export const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
