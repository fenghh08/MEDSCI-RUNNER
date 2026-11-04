import { renderGamePage } from '@/lib/game-page';

export const dynamic = 'force-dynamic';

/**
 * The site is the game: ../medsci-runner.html itself, with its data and
 * grading rerouted through this app. Served at the root so the file's own
 * relative paths (icons/..., images/..., feedback.html) resolve exactly as
 * they do when it sits next to them on disk.
 */
export async function GET() {
  try {
    return new Response(await renderGamePage(), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error('[game] refused to serve:', message);
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Game unavailable</title>` +
      `<body style="font:14px/1.6 ui-monospace,monospace;padding:40px;max-width:70ch">` +
      `<h1>The game could not be served</h1><pre style="white-space:pre-wrap">${
        message.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))
      }</pre></body>`,
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
}
