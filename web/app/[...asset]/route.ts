import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

/**
 * Serves the game's sibling files from the repo root, so medsci-runner.html's
 * own relative paths keep working unchanged.
 *
 * This is a catch-all, so it is deliberately strict: only the two asset
 * folders and a short list of named files are reachable, and the resolved
 * path has to stay inside the repo. Everything else is a 404 — the repo holds
 * plenty that has no business being public.
 */

const ROOT = path.resolve(process.cwd(), '..');
const ALLOWED_DIRS = new Set(['icons', 'images']);
const ALLOWED_FILES = new Set(['feedback.html', 'feedback-questions.js']);

const TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2',
};

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  const { asset } = await params;
  const relative = asset.map((s) => decodeURIComponent(s)).join('/');

  const allowed = ALLOWED_DIRS.has(asset[0]) || (asset.length === 1 && ALLOWED_FILES.has(asset[0]));
  if (!allowed) return new Response('Not found', { status: 404 });

  const full = path.resolve(ROOT, relative);
  // Defence in depth: ALLOWED_DIRS already blocks '..', but resolve() is what
  // decides where we actually end up, so check the result, not the input.
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    if (!(await stat(full)).isFile()) return new Response('Not found', { status: 404 });
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: {
        'content-type': TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
