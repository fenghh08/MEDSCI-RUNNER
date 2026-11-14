// What counts as acceptable media, in one importable place: the admin API
// enforces it, the admin page shows it, and the test script checks it.
//
// The limits are about the student, not the server. A 3D model is downloaded
// on a phone, on campus wifi, in the middle of a question.

export const LIMITS = {
  model: { maxBytes: 15 * 1024 * 1024, warnBytes: 8 * 1024 * 1024, types: ['model/gltf-binary'], extensions: ['.glb'] },
  video: { maxBytes: 100 * 1024 * 1024, maxSeconds: 180, types: ['video/mp4', 'video/webm'], extensions: ['.mp4', '.webm'] },
};

/**
 * Identify a file from its first bytes. The name and the declared type are
 * both whatever the uploader says they are; this is what the file actually is.
 * @param {Uint8Array} b at least the first 12 bytes
 * @returns {'glb' | 'mp4' | 'webm' | null}
 */
export function sniff(b) {
  if (!b || b.length < 12) return null;
  // glTF binary: magic "glTF", then a little-endian uint32 version, which must be 2.
  if (b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46) {
    const version = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    return version === 2 ? 'glb' : null;
  }
  // MP4 family: a box size, then "ftyp".
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'mp4';
  // WebM / Matroska: the EBML header.
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  return null;
}

/** A PDB entry id: one digit then three letters or digits (1HSG, 4HHB). */
export function parsePdbId(value) {
  const id = String(value ?? '').trim().toUpperCase();
  return /^[0-9][A-Z0-9]{3}$/.test(id) ? id : null;
}

/**
 * Turn a pasted link into something safe to embed.
 *   YouTube / Vimeo  -> their privacy-preserving embed URL
 *   a direct https .mp4 / .webm / .glb -> itself
 * Anything else is rejected; nothing is ever embedded just because it is a URL.
 * @returns {{ kind: 'video' | 'model', embed: boolean, url: string, mime?: string } | null}
 */
export function parseMediaUrl(value) {
  let u;
  try { u = new URL(String(value ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const ID = /^[A-Za-z0-9_-]{6,20}$/;

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return ID.test(id) ? { kind: 'video', embed: true, url: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v') ?? (/^\/(?:embed|shorts|live)\/([^/?]+)/.exec(u.pathname) ?? [])[1];
    return id && ID.test(id) ? { kind: 'video', embed: true, url: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = (/(\d{6,12})/.exec(u.pathname) ?? [])[1];
    return id ? { kind: 'video', embed: true, url: `https://player.vimeo.com/video/${id}?dnt=1` } : null;
  }
  // A direct file. Refuse anything that is not a public hostname: this URL is
  // fetched by the server to check the file, and by every student's browser.
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host) || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.')) return null;
  const path = u.pathname.toLowerCase();
  if (path.endsWith('.glb')) return { kind: 'model', embed: false, url: u.href, mime: 'model/gltf-binary' };
  if (path.endsWith('.mp4')) return { kind: 'video', embed: false, url: u.href, mime: 'video/mp4' };
  if (path.endsWith('.webm')) return { kind: 'video', embed: false, url: u.href, mime: 'video/webm' };
  return null;
}

/**
 * Check a file the server has fetched the head of.
 * @param {'video' | 'model'} kind
 * @param {Uint8Array} head  first bytes of the file
 * @param {number | null} bytes  total size, when known
 * @returns {{ ok: true, mime: string, warning?: string } | { ok: false, error: string }}
 */
export function checkFile(kind, head, bytes) {
  const type = sniff(head);
  const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
  if (kind === 'model') {
    if (type !== 'glb') return { ok: false, error: 'That is not a .glb file (glTF 2.0 binary). Export as .glb from Blender: File, Export, glTF 2.0, format "glTF Binary".' };
    if (bytes != null && bytes > LIMITS.model.maxBytes) return { ok: false, error: `That model is ${mb(bytes)}; the limit is ${mb(LIMITS.model.maxBytes)}. Reduce the textures or turn on Draco compression when exporting.` };
    return { ok: true, mime: 'model/gltf-binary',
             ...(bytes != null && bytes > LIMITS.model.warnBytes ? { warning: `${mb(bytes)} is large for a phone on campus wifi. Under ${mb(LIMITS.model.warnBytes)} loads much faster.` } : {}) };
  }
  if (type !== 'mp4' && type !== 'webm') return { ok: false, error: 'That is not an .mp4 or .webm video.' };
  if (bytes != null && bytes > LIMITS.video.maxBytes) return { ok: false, error: `That video is ${mb(bytes)}; the limit is ${mb(LIMITS.video.maxBytes)}. A question video is a clip of up to 3 minutes, not a lecture.` };
  return { ok: true, mime: type === 'mp4' ? 'video/mp4' : 'video/webm' };
}
