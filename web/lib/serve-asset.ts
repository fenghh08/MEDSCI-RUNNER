import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Serves one of the game's sibling files from the repo root, so
 * medsci-runner.html's own relative paths (icons/…, images/…, atlas/…) keep
 * working unchanged when the file is served from here.
 *
 * This used to be a single root catch-all, `app/[...asset]/route.ts`, with the
 * allowlist as an `if` inside it. That was a mistake worth remembering: a root
 * catch-all matches EVERYTHING, including /api/*, and in dev Next compiles
 * route handlers lazily — so any API route that had not been compiled yet was
 * swallowed by the catch-all and answered "Not found". /api/warm disappeared
 * that way, and the game read the resulting 404 on /api/answer as "couldn't
 * reach the server".
 *
 * Now each allowed prefix has its own route, so the allowlist is enforced by
 * routing rather than by a check that runs after routing has already picked
 * the wrong handler. /api/* cannot be shadowed, and an unknown path gets
 * Next's own 404 instead of this file's.
 */

const ROOT = path.resolve(process.cwd(), '..');

const TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2',
};

const notFound = () => new Response('Not found', { status: 404 });

/** @param segments path under the repo root, already split, not yet decoded. */
export async function serveFromRepoRoot(segments: string[]): Promise<Response> {
  if (!segments.length) return notFound();

  let relative: string;
  try {
    relative = segments.map((s) => decodeURIComponent(s)).join('/');
  } catch {
    return notFound(); // a malformed %-escape is not a path we have
  }

  const full = path.resolve(ROOT, relative);
  // The route's own shape already pins the prefix, but resolve() is what
  // decides where we actually end up, so check the result rather than trusting
  // the input.
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return notFound();

  try {
    if (!(await stat(full)).isFile()) return notFound();
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: {
        'content-type': TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch {
    return notFound();
  }
}
