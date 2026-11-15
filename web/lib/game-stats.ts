/**
 * The game's own all-time answer counts, from Firebase.
 *
 * Long before answers were logged to Postgres, every copy of the game -- the
 * website, GitHub Pages, the phone app -- has been adding to
 * `stats/<itemId>::<qid>` in the Realtime Database: how many right, how many
 * wrong, and on a first attempt, which authored option was picked. That is
 * where the bulk of the history lives, and it keeps growing from the offline
 * builds, which have no server to log to.
 *
 * It is anonymous running totals: no player, no time. So it answers "how hard
 * is this question" for all of history, and Postgres answers "who, when, on
 * what device" for the website only. Insights uses both.
 *
 * Read-only, public (the same data the old dev tool read from the browser),
 * and cached for a few minutes. If Firebase cannot be reached the admin app
 * simply shows the Postgres numbers.
 */
export type GameStat = { n: number; c: number; picks: number[] };

const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://runner-9b11b-default-rtdb.asia-southeast1.firebasedatabase.app';
const TTL_MS = 5 * 60_000;

let cache: { at: number; stats: Map<string, GameStat> } | null = null;

type Raw = { correct?: number; wrong?: number; first?: { picks?: Record<string, number> } };

export async function loadGameStats(): Promise<Map<string, GameStat>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.stats;
  const stats = new Map<string, GameStat>();
  try {
    const res = await fetch(`${DATABASE_URL.replace(/\/$/, '')}/stats.json`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) throw new Error(`Firebase answered ${res.status}`);
    const raw = ((await res.json()) ?? {}) as Record<string, Raw>;
    for (const [key, v] of Object.entries(raw)) {
      const qid = key.slice(key.lastIndexOf('::') + 2);
      if (!qid || !v || typeof v !== 'object') continue;
      const s = stats.get(qid) ?? { n: 0, c: 0, picks: [] };
      const correct = Number(v.correct) || 0;
      s.n += correct + (Number(v.wrong) || 0);
      s.c += correct;
      for (const [p, count] of Object.entries(v.first?.picks ?? {})) {
        const i = /^p(\d)$/.exec(p)?.[1];
        if (i !== undefined) s.picks[Number(i)] = (s.picks[Number(i)] ?? 0) + (Number(count) || 0);
      }
      stats.set(qid, s);
    }
    cache = { at: Date.now(), stats };
  } catch (err) {
    console.error('[game-stats] could not read Firebase stats:', err);
    if (cache) return cache.stats;       // stale is better than nothing
  }
  return stats;
}
