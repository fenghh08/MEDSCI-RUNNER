import { sql } from '@/lib/db';

/**
 * Keeps one connection to Postgres open while the app is in use.
 *
 * Why this exists, measured from a laptop in Sydney against Neon in
 * ap-southeast-2:
 *
 *   fresh TLS handshake to *.neon.tech   ~3.1s   (dns 60ms, tcp 70ms)
 *   same connection reused               11-22ms
 *   TLS to vercel.com / api.github.com   ~30ms
 *
 * It is not the query, not the compute (which stays `active` throughout) and
 * not general network latency: it is the handshake to Neon specifically, and
 * it costs the same on the pooled and unpooled hosts, over IPv4 and IPv6, to
 * every address behind the name. So the only defence is to stop reconnecting.
 *
 * The interval has to beat Node's own HTTP agent, which closes an idle
 * connection after 4 seconds -- a 10s ping measured 3.9s on the request that
 * landed in the gap, because every ping was itself reconnecting.
 *
 * It follows activity rather than running forever. The compute is billed by
 * the hour it stays awake, and this project is on a free plan, so a server
 * left running overnight must not hold the database open until morning.
 */

const PING_MS = 3_000;          // under Node's 4s idle socket close
const IDLE_STOP_MS = 15 * 60_000; // stop once nobody has made a request

let timer: ReturnType<typeof setInterval> | null = null;
let lastActivity = Date.now();

/** Called by the routes a player actually hits. */
export function noteActivity(): void {
  lastActivity = Date.now();
  if (!timer) start();
}

function start(): void {
  if (timer) return;
  timer = setInterval(async () => {
    if (Date.now() - lastActivity > IDLE_STOP_MS) {
      clearInterval(timer!);
      timer = null;
      return;
    }
    try {
      await sql`select 1`;
    } catch {
      // The next real request reports anything genuinely wrong; retrying on a
      // timer is the whole point of this.
    }
  }, PING_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

/** Called once at server start, so the first player does not pay the handshake. */
export function startKeepAlive(): void {
  noteActivity();
}
