/**
 * Runs once when the server process starts (Next's instrumentation hook).
 * See lib/keepalive.ts for why holding the database connection open matters
 * so much here.
 *
 * On Vercel this is close to a no-op: invocations are short-lived and sit in
 * the same cloud as the database, where the handshake is not slow to begin
 * with. It matters for `next start` on a developer machine.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.DISABLE_DB_KEEPALIVE === '1') return;
  const { startKeepAlive } = await import('@/lib/keepalive');
  startKeepAlive();
  console.log('[db] connection keep-alive on (DISABLE_DB_KEEPALIVE=1 to turn off)');
}
