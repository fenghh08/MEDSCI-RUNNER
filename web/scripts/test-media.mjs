// npm run test:media -- the media rules, no network and no database.
import assert from 'node:assert/strict';
import { sniff, parsePdbId, parseMediaUrl, checkFile, LIMITS } from '../lib/media-rules.mjs';

const bytes = (...a) => Uint8Array.from([...a, ...new Array(Math.max(0, 12 - a.length)).fill(0)]);
const glb = bytes(0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0);
assert.equal(sniff(glb), 'glb');
assert.equal(sniff(bytes(0x67, 0x6c, 0x54, 0x46, 1, 0, 0, 0)), null, 'glTF 1 is refused');
assert.equal(sniff(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70)), 'mp4');
assert.equal(sniff(bytes(0x1a, 0x45, 0xdf, 0xa3)), 'webm');
assert.equal(sniff(bytes(0x4d, 0x5a)), null, 'an .exe renamed to .glb is still not a model');
assert.equal(sniff(new Uint8Array(3)), null);

assert.equal(parsePdbId(' 1hsg '), '1HSG');
assert.equal(parsePdbId('HSG1'), null);
assert.equal(parsePdbId('1HSG; drop'), null);

assert.equal(parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3').url, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
assert.equal(parseMediaUrl('https://youtu.be/dQw4w9WgXcQ').url, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
assert.equal(parseMediaUrl('https://vimeo.com/123456789').url, 'https://player.vimeo.com/video/123456789?dnt=1');
assert.equal(parseMediaUrl('https://example.org/files/heart.glb').kind, 'model');
assert.equal(parseMediaUrl('https://example.org/clip.MP4').mime, 'video/mp4');
for (const bad of ['http://example.org/a.mp4', 'javascript:alert(1)', 'https://localhost/a.glb', 'https://10.0.0.5/a.glb',
                   'https://example.org/page.html', 'https://www.youtube.com/watch?v="><script>', 'not a url', 'https://intranet/a.mp4']) {
  assert.equal(parseMediaUrl(bad), null, bad);
}

assert.equal(checkFile('model', glb, 1e6).ok, true);
assert.match(checkFile('model', glb, 9e6).warning, /large/);
assert.match(checkFile('model', glb, LIMITS.model.maxBytes + 1).error, /limit/);
assert.match(checkFile('model', bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70), 1e6).error, /not a \.glb/);
assert.equal(checkFile('video', bytes(0x1a, 0x45, 0xdf, 0xa3), 5e6).mime, 'video/webm');
assert.match(checkFile('video', glb, 5e6).error, /not an \.mp4/);
assert.match(checkFile('video', bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70), LIMITS.video.maxBytes + 1).error, /limit/);
console.log('media: all checks pass');
