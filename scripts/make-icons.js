// Builds the favicon / touch-icon set from the master artwork at the repo
// root (MEDS3888_App_Icon_Without_Book.png, drawn by Stephanie). Run it again
// whenever a new master lands:  node scripts/make-icons.js
//
// The master is a non-square export with the icon sitting on a white page,
// and its rounded edge is hand-drawn rather than a true rounded rectangle --
// so a geometric corner mask doesn't line up. Instead the white background is
// flood-filled away from the border inwards, which follows whatever shape the
// artwork actually has and leaves interior whites (the eye highlight) alone.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const MASTER = path.join(root, 'MEDS3888_App_Icon_Without_Book.png');
const OUT_DIR = path.join(root, 'icons');
const SIZES = [
  ['app-icon-32.png', 32],    // browser tab
  ['app-icon-180.png', 180],  // iOS home screen
  ['app-icon-512.png', 512],  // everything else / future manifest
];
const WHITE = 238; // mean channel value at or above this counts as page white

async function main(){
  if(!fs.existsSync(MASTER)) throw new Error('missing master artwork: ' + MASTER);

  const { data, info } = await sharp(MASTER)
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  // Flood fill the page white, starting from every border pixel. Iterative
  // (not recursive) -- a 2.4MP image would blow the call stack otherwise.
  const seen = new Uint8Array(W * H);
  const stack = [];
  const isWhite = p => (data[p*C] + data[p*C+1] + data[p*C+2]) / 3 >= WHITE;
  const push = p => { if(!seen[p] && isWhite(p)){ seen[p] = 1; stack.push(p); } };
  for(let x = 0; x < W; x++){ push(x); push((H-1)*W + x); }
  for(let y = 0; y < H; y++){ push(y*W); push(y*W + W-1); }
  while(stack.length){
    const p = stack.pop(), x = p % W, y = (p - x) / W;
    if(x > 0) push(p-1);
    if(x < W-1) push(p+1);
    if(y > 0) push(p-W);
    if(y < H-1) push(p+W);
  }
  for(let p = 0; p < W*H; p++) if(seen[p]) data[p*C+3] = 0;

  // Trim on the new alpha, then letterbox onto a transparent square so the
  // art keeps its proportions at every output size.
  const trimmed = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .png().trim().toBuffer({ resolveWithObject: true });
  const side = Math.max(trimmed.info.width, trimmed.info.height);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for(const [name, size] of SIZES){
    await sharp(trimmed.data)
      .resize(side, side, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, name));
    console.log('icons/' + name + '  ' + size + 'x' + size);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
