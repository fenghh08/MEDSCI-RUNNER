import { adminRoute } from '@/lib/admin-route';
import { store } from '@/lib/content';
import { checkFile, parseMediaUrl, parsePdbId } from '@/lib/media-rules.mjs';
import { ValidationError } from '@/lib/validate.mjs';

export const dynamic = 'force-dynamic';

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

/** The first bytes of a remote file and its size, without downloading it. */
async function head(url: string): Promise<{ bytes: Uint8Array; size: number | null }> {
  const res = await fetch(url, { headers: { range: 'bytes=0-15' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new ValidationError([`That file could not be read (the host answered ${res.status}).`]);
  const total = /\/(\d+)$/.exec(res.headers.get('content-range') ?? '')?.[1] ?? (res.status === 200 ? res.headers.get('content-length') : null);
  const reader = res.body?.getReader();
  const first = reader ? (await reader.read()).value ?? new Uint8Array() : new Uint8Array();
  reader?.cancel().catch(() => {});
  return { bytes: first.slice(0, 16), size: total ? Number(total) : null };
}

async function discardBlob(url: string) {
  try { const { del } = await import('@vercel/blob'); await del(url); } catch { /* nothing more to do */ }
}

export const GET = adminRoute('lecturer', () => store.listMedia());

/**
 * { action: 'add', source: 'external', url }   a YouTube/Vimeo link, or a direct https .mp4/.webm/.glb
 * { action: 'add', source: 'pdb', url }        a PDB id such as 1HSG, shown with a molecular viewer
 * { action: 'add', source: 'upload', url }     a file already sent to blob storage by /api/admin/media/upload
 * { action: 'remove', id }
 *
 * A file is judged by what it is, not by what it is called: the server reads
 * its first bytes and its real size before a row is ever created, and an
 * upload that fails the check is removed from storage again.
 */
export const POST = adminRoute('lecturer', async (user, _request, body) => {
  if (body.action === 'remove') {
    const gone = await store.removeMedia(user, String(body.id));
    if (gone.source === 'upload') await discardBlob(gone.url);
    return { removed: gone.id };
  }

  const title = String(body.title ?? '').trim();
  if (title.length < 3) throw new ValidationError(['Give the media a title, so it can be found again.']);
  const common = { title, attribution: String(body.attribution ?? '').trim() || null, posterUrl: null as string | null };
  if (body.posterUrl) {
    let poster: URL | null = null;
    try { poster = new URL(String(body.posterUrl)); } catch { /* handled below */ }
    if (!poster || poster.protocol !== 'https:' || !/\.(png|jpe?g|webp)$/i.test(poster.pathname)) {
      throw new ValidationError(['The poster image must be an https link to a .png, .jpg or .webp.']);
    }
    common.posterUrl = poster.href;
  }

  if (body.source === 'pdb') {
    const id = parsePdbId(body.url);
    if (!id) throw new ValidationError(['A PDB id is one digit followed by three letters or digits, for example 1HSG.']);
    const known = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${id}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.ok).catch(() => null);
    if (known === false) throw new ValidationError([`RCSB has no structure called ${id}.`]);
    return { media: await store.addMedia(user, { ...common, kind: 'model', source: 'pdb', url: id }) };
  }

  if (body.source === 'upload') {
    const url = String(body.url ?? '');
    let host = '';
    try { host = new URL(url).hostname; } catch { /* handled below */ }
    if (!BLOB_HOST.test(host)) throw new ValidationError(['That is not a file from this app\'s storage.']);
    const kind = body.kind === 'model' ? 'model' : 'video';
    const { bytes, size } = await head(url);
    const verdict = checkFile(kind, bytes, size);
    if (!verdict.ok) { await discardBlob(url); throw new ValidationError([verdict.error]); }
    return {
      media: await store.addMedia(user, { ...common, kind, source: 'upload', url, mime: verdict.mime, bytes: size }),
      warning: verdict.warning ?? null,
    };
  }

  const parsed = parseMediaUrl(body.url);
  if (!parsed) throw new ValidationError(['Paste a YouTube or Vimeo link, or an https link straight to a .mp4, .webm or .glb file.']);
  if (parsed.embed) return { media: await store.addMedia(user, { ...common, kind: 'video', source: 'external', url: parsed.url }) };
  const { bytes, size } = await head(parsed.url);
  const verdict = checkFile(parsed.kind, bytes, size);
  if (!verdict.ok) throw new ValidationError([verdict.error]);
  return {
    media: await store.addMedia(user, { ...common, kind: parsed.kind, source: 'external', url: parsed.url, mime: verdict.mime, bytes: size }),
    warning: verdict.warning ?? null,
  };
});
