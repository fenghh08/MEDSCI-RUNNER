/* ============================================================================
   battle3d.js — the 3D view for Cell Battle.

   medsci-runner.html owns the rules: positions, life, attacks, rooms. This
   file only draws them. The game loads it with a dynamic import when a battle
   starts; if that fails (opened from file://, no WebGL, an old phone) the game
   carries on with its 2D view and nothing else changes.

   World units are the game's: x across, z away from the camera, y up. A
   building is { x, z, w, d, h } where z is its FRONT face — the same record
   the game uses for collision, so what you bump into is what you see.

   The cells themselves are still drawn by the game's own drawCellSprite, onto
   a small canvas that becomes a billboard here. That keeps every player's
   customised cell looking exactly as it does everywhere else in the game.
   ============================================================================ */
import * as THREE from './vendor/three.module.min.js';

const FIGHTER_R = 46;                 // world radius of a cell
// Height of anything painted on the ground: the strike warning, a cell's shadow
// and its range ring. Above the highest street layer, or a road hides them.
const GROUND_MARK = 10;
const CELL_TEX = 192, CELL_TEX_R = 56;

/* Each map has its own light, sky and planting, so they do not read as the
   same place with different signs. */
const THEMES = {
  hospital: { sky: 0x9fd0ee, fog: [0xbfe0f2, 1700, 5200], sun: [0xfff4e0, 2.3, [-700, 1300, -900]],
              hemi: [0xdff1ff, 0x8a9a7a, 1.15], ground: 0xc9cdd1, lawn: 0x7fb069, road: 0x3d4047, kerb: 0xd9dcdf,
              trees: ['round', 'round', 'round', 'pine'], backdrop: 'hills', clouds: 9 },
  city:     { sky: 0xf4a66a, fog: [0xf0b98c, 1500, 5600], sun: [0xffc78a, 2.5, [900, 1100, -900]],
              hemi: [0xffe2c4, 0x5a5566, 1.5], ground: 0x8d8f96, lawn: 0x6f9a62, road: 0x2a2c33, kerb: 0xa9abb2,
              trees: ['round', 'pine'], backdrop: 'skyline', clouds: 5 },
  campus:   { sky: 0x6fb7ee, fog: [0xa9d6f5, 2000, 6200], sun: [0xffffff, 2.6, [-500, 1500, -600]],
              hemi: [0xcfeaff, 0x6f9a58, 1.2], ground: 0x79b35a, lawn: 0x66a84c, road: 0x4a4d52, kerb: 0xd6c9a5,
              trees: ['round', 'round', 'jacaranda', 'round', 'pine', 'jacaranda'], backdrop: 'hills', clouds: 12 },
  // The two maps built from real street data. Flatter, cooler light and
  // muted ground colours: these are meant to read as a place, not a toy set.
  townhall: { sky: 0x4f7fbd, fog: [0xb4c2d2, 3500, 17000], sun: [0xffe9cf, 3.1, [-2600, 5200, -2100]],
              hemi: [0xc3d4ea, 0x5f5c57, 0.95], ground: 0x8e8b85, lawn: 0x586f4c, road: 0x2c2e33, kerb: 0x8d8982,
              trees: ['round'], backdrop: 'none', clouds: 6 },
  usyd:     { sky: 0x4d84c4, fog: [0xb9cbdc, 3800, 18000], sun: [0xfff0d8, 3.1, [-2400, 5400, -1900]],
              hemi: [0xc7d9ee, 0x66704f, 1.0], ground: 0x77895c, lawn: 0x5d7a45, road: 0x33353a, kerb: 0x9a9488,
              trees: ['round'], backdrop: 'none', clouds: 8 },
};

/* ---------------------------------------------------------------- facades
   One small tile per building style -- a single window bay, one storey tall --
   repeated across every wall by the UVs. A handful of shared textures cover
   hundreds of buildings, which is what keeps a real city block cheap to draw. */
const TILE = {           // bay width and storey height, in world units (10 = 1 m)
  sandstone: [46, 58], glass: [30, 38], concrete: [40, 36], brick: [38, 36], render: [44, 36], shop: [70, 46],
};
function tileTexture(style) {
  const t = canvasTex(64, 64, (g) => {
    const noise = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 5, 1 + Math.random() * 2); } };
    if (style === 'glass') {
      const k = g.createLinearGradient(0, 0, 0, 64); k.addColorStop(0, '#9fb9cf'); k.addColorStop(0.55, '#6f8fa9'); k.addColorStop(1, '#52718c');
      g.fillStyle = k; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(6, 4, 20, 40);
      g.fillStyle = '#3c4852'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 0, 3, 64); g.fillRect(0, 50, 64, 5);
    } else if (style === 'sandstone') {
      g.fillStyle = '#c8a878'; g.fillRect(0, 0, 64, 64); noise(90, 0.08);
      g.fillStyle = '#b3925f'; g.fillRect(0, 0, 64, 4); g.fillRect(0, 0, 5, 64); g.fillRect(59, 0, 5, 64);
      g.fillStyle = '#d8bc8e'; g.fillRect(5, 4, 54, 3);
      g.fillStyle = '#3d3a36'; g.beginPath(); g.moveTo(22, 54); g.lineTo(22, 26); g.arc(32, 26, 10, Math.PI, 0); g.lineTo(42, 54); g.closePath(); g.fill();
      g.strokeStyle = '#a5844f'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#b3925f'; g.fillRect(18, 54, 28, 3);
    } else if (style === 'shop') {
      g.fillStyle = '#2b2f35'; g.fillRect(0, 0, 64, 64);
      const k = g.createLinearGradient(0, 14, 0, 60); k.addColorStop(0, '#5a6b78'); k.addColorStop(1, '#2f3b45');
      g.fillStyle = k; g.fillRect(4, 16, 56, 44);
      g.fillStyle = 'rgba(255,236,190,.22)'; g.fillRect(8, 22, 22, 34);
      g.fillStyle = '#1d2024'; g.fillRect(0, 0, 64, 12); g.fillRect(30, 16, 3, 44);
    } else {
      const wall = { concrete: '#a9a8a3', brick: '#9a6a52', render: '#cfc7b8' }[style] || '#a9a8a3';
      g.fillStyle = wall; g.fillRect(0, 0, 64, 64); noise(70, 0.06);
      if (style === 'brick') { g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < 64; y += 6) g.fillRect(0, y, 64, 1); }
      g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 0, 64, 3);
      const k = g.createLinearGradient(0, 16, 0, 52); k.addColorStop(0, '#6f8494'); k.addColorStop(1, '#3f4f5c');
      g.fillStyle = k; g.fillRect(12, 16, 40, 34);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(14, 18, 14, 30);
      g.fillStyle = wall; g.fillRect(31, 16, 2, 34);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(10, 50, 44, 3);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
const WALL_TINTS = {
  sandstone: ['#ffffff', '#f3ead9', '#fff6e3'], glass: ['#ffffff', '#dfeaf2', '#c9d6e6', '#eef0e6'],
  concrete: ['#ffffff', '#e6e2da', '#d6d9dc', '#f2ecdf'], brick: ['#ffffff', '#e9d2c6', '#d9b9a6'], render: ['#ffffff', '#efe6d6', '#e3ddd3', '#f4e9e0'],
  shop: ['#ffffff'],
};
const ROOF_COLOR = { sandstone: '#6f6258', glass: '#59626b', concrete: '#7b7c7c', brick: '#6b5a52', render: '#8a8780' };

/** Triangles for a batch of flat or vertical faces that all share one material. */
class Batch {
  constructor() { this.pos = []; this.uv = []; this.idx = []; }
  quad(a, b, c, d, u0, u1, v0, v1) {            // a,b bottom; c,d top (a-b-d-c)
    const n = this.pos.length / 3;
    this.pos.push(...a, ...b, ...c, ...d);
    this.uv.push(u0, v0, u1, v0, u0, v1, u1, v1);
    this.idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  mesh(material, shadow) {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
}

const hex = (c) => new THREE.Color(c);

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A wall with windows painted on it. `door` puts an entrance at the bottom centre. */
function facade(bd, span, door) {
  const style = bd.style || 'concrete';
  const cols = Math.max(2, Math.round(span / (style === 'glass' ? 46 : 78)));
  const rows = Math.max(1, Math.round(bd.h / (style === 'glass' ? 44 : 82)));
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = bd.wall; g.fillRect(0, 0, W, H);
    if (style === 'brick') {            // courses of brick
      g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 1;
      for (let y = 0; y < H; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }
    if (style === 'sandstone') {        // big dressed blocks
      g.strokeStyle = 'rgba(90,60,20,.18)'; g.lineWidth = 1.5;
      for (let y = 0; y < H; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let y = 0, r = 0; y < H; y += 26, r++) for (let x = (r % 2) * 22; x < W; x += 44) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); }
    }
    const top = style === 'glass' ? 6 : 26, bottom = door ? H * 0.2 : H * 0.06;
    const cw = W / cols, rh = (H - top - bottom) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cw, y = top + r * rh;
      if (style === 'glass') {
        const grad = g.createLinearGradient(0, y, 0, y + rh);
        grad.addColorStop(0, bd.glass || '#8fc4e8'); grad.addColorStop(1, bd.glassDark || '#3f6f97');
        g.fillStyle = grad; g.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      } else if (style === 'sandstone') {  // tall arched windows
        const ww = cw * 0.34, wh = rh * 0.66, wx = x + (cw - ww) / 2, wy = y + rh * 0.2;
        g.fillStyle = '#3b4658';
        g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill();
        g.strokeStyle = '#e6d3a4'; g.lineWidth = 3; g.stroke();
      } else {
        g.fillStyle = '#2f4963'; g.fillRect(x + cw * 0.2, y + rh * 0.2, cw * 0.6, rh * 0.56);
        g.fillStyle = 'rgba(190,225,255,.75)'; g.fillRect(x + cw * 0.2 + 2, y + rh * 0.2 + 2, cw * 0.6 - 4, rh * 0.26);
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + cw * 0.2, y + rh * 0.76, cw * 0.6, 3);
      }
    }
    if (door) {
      const dw = Math.min(W * 0.2, 90), dh = H * 0.18;
      g.fillStyle = '#1e2a36'; g.fillRect(W / 2 - dw / 2, H - dh, dw, dh);
      g.fillStyle = 'rgba(170,215,255,.7)'; g.fillRect(W / 2 - dw / 2 + 5, H - dh + 5, dw / 2 - 8, dh - 8); g.fillRect(W / 2 + 3, H - dh + 5, dw / 2 - 8, dh - 8);
    }
  });
}

function signTexture(text, bg, cross) {
  return canvasTex(512, 96, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const label = (cross ? '✚ ' : '') + text;
    let size = 58; g.font = `bold ${size}px sans-serif`;
    while (g.measureText(label).width > W - 30 && size > 18) { size -= 3; g.font = `bold ${size}px sans-serif`; }
    g.fillText(label, W / 2, H / 2 + 3);
  });
}

export async function createBattle3D(env) {
  // The logarithmic depth buffer is what lets a road sit a hand's width above
  // the ground, kilometres from the camera, without the two flickering.
  const renderer = new THREE.WebGLRenderer({ canvas: env.glCanvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(48, 2, 10, 9000);
  let scene = new THREE.Scene();
  let sun = null, world = null, root = null, clouds = [], orbs = [], danger = null;
  const fighters = new Map();
  const v = new THREE.Vector3(), camPos = new THREE.Vector3(0, 560, -700), camLook = new THREE.Vector3();
  let lastW = 0, lastH = 0, mapDef = null, fogFar = 5000, sky = null, cutaway = null, isGeo = false, camBack = 460, treeCrowns = null;
  const topView = { x: 0, z: 0, h: 3000 };

  const lambert = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: hex(color) }, extra || {}));
  function box(w, h, d, mat, x, y, z, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
    world.add(m); return m;
  }
  function flat(w, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
    world.add(m); return m;
  }

  function addVehicle(bd) {
    const cx = bd.x, cz = bd.z + bd.d / 2, amb = bd.kind === 'ambulance';
    const body = lambert(amb ? '#f5f5f5' : (bd.wall || '#3f6fb5'));
    box(bd.w, bd.h * 0.55, bd.d, body, cx, bd.h * 0.42, cz);
    box(bd.w * (amb ? 0.62 : 0.5), bd.h * 0.45, bd.d * 0.92, amb ? body : lambert('#22303d'), cx + (amb ? bd.w * 0.16 : 0), bd.h * 0.9, cz);
    if (amb) {
      box(bd.w * 0.62, 9, bd.d + 1, lambert('#c8102e'), cx + bd.w * 0.16, bd.h * 0.7, cz, false);
      box(22, 7, 30, new THREE.MeshBasicMaterial({ color: 0x2f7bff }), cx + bd.w * 0.3, bd.h * 1.16, cz, false);
      box(bd.w * 0.24, bd.h * 0.36, bd.d * 0.86, lambert('#22303d'), cx - bd.w * 0.3, bd.h * 0.86, cz);
    }
    const tyre = lambert('#1c1c1c');
    for (const sx of [-0.32, 0.32]) for (const sz of [-0.5, 0.5]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(bd.h * 0.2, bd.h * 0.2, 8, 12), tyre);
      w.rotation.x = Math.PI / 2; w.position.set(cx + bd.w * sx, bd.h * 0.2, cz + bd.d * sz); world.add(w);
    }
  }

  function addBuilding(bd) {
    const cx = bd.x, cz = bd.z + bd.d / 2;
    if (bd.kind === 'car' || bd.kind === 'ambulance') return addVehicle(bd);
    const front = lambert(0xffffff, { map: facade(bd, bd.w, bd.door !== false) });
    const back = lambert(0xffffff, { map: facade(bd, bd.w, false) });
    const side = lambert(0xffffff, { map: facade(bd, bd.d, false) });
    const roofMat = lambert(bd.trim || '#d8d4cf');
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z. The camera looks along +z, so -z is the front.
    const m = new THREE.Mesh(new THREE.BoxGeometry(bd.w, bd.h, bd.d), [side, side, roofMat, roofMat, back, front]);
    m.position.set(cx, bd.h / 2, cz); m.castShadow = true; m.receiveShadow = true;
    world.add(m);

    if (bd.roof === 'gableX' || bd.roof === 'gableZ') {
      // A pitched roof: a triangle pushed along the building.
      const alongX = bd.roof === 'gableX';
      const span = alongX ? bd.d : bd.w, len = alongX ? bd.w : bd.d, rise = Math.min(span * 0.42, 130);
      const shape = new THREE.Shape();
      shape.moveTo(-span / 2 - 8, 0); shape.lineTo(span / 2 + 8, 0); shape.lineTo(0, rise); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: len + 12, bevelEnabled: false });
      geo.translate(0, 0, -(len + 12) / 2);
      const roof = new THREE.Mesh(geo, lambert(bd.roofColor || '#6d5a4a'));
      if (alongX) roof.rotation.y = Math.PI / 2;
      roof.position.set(cx, bd.h, cz); roof.castShadow = true; world.add(roof);
    } else {
      // Flat roof: a parapet and some plant on top, so it is not a bare lid.
      box(bd.w + 6, 10, bd.d + 6, lambert(bd.trim || '#d8d4cf'), cx, bd.h + 5, cz);
      if (bd.w > 260) {
        box(60, 30, 44, lambert('#9aa0a6'), cx - bd.w * 0.22, bd.h + 25, cz + bd.d * 0.1);
        box(40, 22, 40, lambert('#b3b8bd'), cx + bd.w * 0.2, bd.h + 21, cz - bd.d * 0.12);
      }
    }
    if (bd.setback) {     // a narrower tower on a podium
      const sb = Object.assign({}, bd, { w: bd.w * 0.62, d: bd.d * 0.62, h: bd.setback, door: false });
      const fm = lambert(0xffffff, { map: facade(sb, sb.w, false) }), sm = lambert(0xffffff, { map: facade(sb, sb.d, false) });
      const t = new THREE.Mesh(new THREE.BoxGeometry(sb.w, sb.h, sb.d), [sm, sm, roofMat, roofMat, fm, fm]);
      t.position.set(cx, bd.h + sb.h / 2, cz); t.castShadow = true; world.add(t);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 110, 6), lambert('#c9c9c9'));
      mast.position.set(cx, bd.h + sb.h + 55, cz); world.add(mast);
    }
    if (bd.helipad) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(70, 28), new THREE.MeshLambertMaterial({ map: canvasTex(256, 256, (g, W, H) => {
        g.fillStyle = '#5a6068'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#ffd23f'; g.lineWidth = 14; g.beginPath(); g.arc(W / 2, H / 2, 104, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffffff'; g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', W / 2, H / 2 + 8);   // symmetric, so the mirror does not matter
      }) }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(cx + bd.w * 0.1, bd.h + 11, cz); world.add(pad);
    }
    if (bd.awning) {      // a canopy over the entrance
      box(Math.min(bd.w * 0.5, 260), 8, 70, lambert(bd.sign || '#c8102e'), cx, 96, bd.z - 35);
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 96, 8), lambert('#e9e9e9'));
        post.position.set(cx + sx * Math.min(bd.w * 0.24, 124), 48, bd.z - 64); post.castShadow = true; world.add(post);
      }
    }
    if (bd.name) {
      const sw = Math.min(bd.w * 0.72, 60 + bd.name.length * 26), sh = sw * (96 / 512);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, Math.max(30, sh)), new THREE.MeshBasicMaterial({ map: signTexture(bd.name, bd.sign || '#333333', bd.cross) }));
      sign.rotation.y = Math.PI; sign.scale.x = -1;   // un-mirror the lettering
      sign.position.set(cx, Math.min(bd.h - 30, bd.awning ? 140 : 128), bd.z - (bd.awning ? 72 : 2.5));
      world.add(sign);
    }
  }

  function addTree(pr, kind) {
    const s = pr.r / 44, g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(5 * s, 8 * s, 70 * s, 7), lambert('#6b4a32'));
    trunk.position.y = 35 * s; trunk.castShadow = true; g.add(trunk);
    if (kind === 'pine') {
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry((46 - i * 10) * s, 62 * s, 8), lambert('#2f6b46', { flatShading: true }));
        c.position.y = (70 + i * 36) * s; c.castShadow = true; g.add(c);
      }
    } else {
      const color = kind === 'jacaranda' ? '#9b6fd6' : (pr.color === '#f29bb7' ? '#5fae6b' : pr.color);
      for (const [dx, dy, dz, r] of [[0, 96, 0, 44], [-26, 78, 10, 30], [24, 82, -8, 32], [4, 122, 6, 28]]) {
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), lambert(color, { flatShading: true }));
        c.position.set(dx * s, dy * s, dz * s); c.castShadow = true; g.add(c);
      }
    }
    g.position.set(pr.x, 0, pr.z); g.rotation.y = Math.abs(pr.x * 13 + pr.z * 7) % 6.28;
    world.add(g);
  }

  function addRoads(def, theme) {
    const R = env.roadHalf, W = def.halfW, D = def.halfD;
    const asphalt = lambert(theme.road), kerb = lambert(theme.kerb), paint = new THREE.MeshBasicMaterial({ color: 0xf4ecc8 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const paved = def.paved || [];
    for (const x of def.v) {
      const isPaved = paved.includes(x);
      flat(2 * R + 50, 2 * D, kerb, x, 0.6, 0);                                  // footpath
      flat(2 * R, 2 * D, isPaved ? lambert('#d9c7a0') : asphalt, x, 1.2, 0);
      if (isPaved) {            // a pedestrian avenue: paver joints, no traffic lines
        for (let z = -D + 40; z < D; z += 80) flat(2 * R, 3, lambert('#bfa97c'), x, 1.6, z);
      } else {
        for (let z = -D + 40; z < D; z += 120) if (!def.h.some((h) => Math.abs(z - h) < R + 60)) flat(8, 56, paint, x, 1.8, z);
      }
    }
    for (const z of def.h) {
      flat(2 * W, 2 * R + 50, kerb, 0, 0.7, z);
      flat(2 * W, 2 * R, asphalt, 0, 1.4, z);
      for (let x = -W + 40; x < W; x += 120) if (!def.v.some((vx) => Math.abs(x - vx) < R + 60)) flat(56, 8, paint, x, 2.0, z);
      for (const vx of def.v) for (const side of [-1, 1]) for (let x = vx - R + 16; x < vx + R - 10; x += 36) flat(20, 40, white, x, 2.2, z + side * (R + 34));
    }
  }

  function addBackdrop(def, theme) {
    const W = def.halfW, D = def.halfD;
    // The edge of the playable area: a hedge, so the limit is something you can see.
    const hedge = lambert('#3f7a47');
    box(2 * W + 60, 46, 30, hedge, 0, 23, D + 15); box(2 * W + 60, 46, 30, hedge, 0, 23, -D - 15);
    box(30, 46, 2 * D + 60, hedge, W + 15, 23, 0); box(30, 46, 2 * D + 60, hedge, -W - 15, 23, 0);
    // What lies beyond it.
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (theme.backdrop === 'skyline') {
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2, r = Math.max(W, D) + 500 + rnd() * 700, h = 300 + rnd() * 1100, w = 160 + rnd() * 200;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), lambert(['#5d6680', '#6f6a80', '#4f5a73', '#7b7488'][i % 4]));
        m.position.set(Math.cos(a) * r * 1.3, h / 2, Math.sin(a) * r); world.add(m);
      }
    } else {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, r = Math.max(W, D) + 900 + rnd() * 500, s = 500 + rnd() * 500;
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert(i % 3 ? '#5f9a57' : '#4f8a52', { flatShading: true }));
        m.scale.y = 0.35 + rnd() * 0.25; m.position.set(Math.cos(a) * r * 1.3, 0, Math.sin(a) * r); world.add(m);
      }
    }
  }

  /** A gradient sky that travels with the camera: deeper overhead, pale at the horizon. */
  function addSky(theme) {
    const R = camera.far * 0.9;
    const g = new THREE.SphereGeometry(R, 24, 12);
    const top = new THREE.Color(theme.sky).multiplyScalar(0.82), low = new THREE.Color(theme.fog[0]);
    const col = [], p = g.attributes.position, c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const t = Math.max(0, Math.min(1, p.getY(i) / R));
      c.copy(low).lerp(top, Math.pow(t, 0.55)); col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -1; scene.add(sky);
  }

  /* --------------------------------------------------------- real streets
     A map built from OpenStreetMap data (scripts/build-battle-maps.mjs):
     building outlines with heights, street centre-lines with widths, tram
     tracks, parks and individual trees. Everything is merged into a few
     meshes by material, so a whole city block is a couple of dozen draw
     calls rather than several hundred. */
  function addGeo(geo, theme) {
    // In the far and overhead views a 150 m tower hides the street behind it,
    // so buildings are sliced off at about eight storeys there. render() moves
    // this plane out of the way for the close view.
    cutaway = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
    const walls = new Map(), roofs = new Map(), grounds = new Map();
    const k = (geo.unit || 10) / 10;          // sizes below were written at 10 units a metre
    const batch = (map, key) => { let b = map.get(key); if (!b) map.set(key, b = new Batch()); return b; };
    const hash = (pts) => Math.abs(Math.round(pts[0][0] * 7 + pts[0][1] * 13 + pts.length * 31));
    const mid = (pts) => { let x = 0, z = 0; for (const q of pts) { x += q[0]; z += q[1]; } return [x / pts.length, z / pts.length]; };

    function wallRing(pts, y0, y1, style, tint) {
      const tw = TILE[style][0] * k, th = TILE[style][1] * k;
      const b = batch(walls, style + '|' + tint);
      let run = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (len < 2) continue;
        // Whole bays per wall, so a window is never cut in half at a corner.
        const bays = Math.max(1, Math.round(len / tw)), u0 = run, u1 = run + bays; run = u1;
        b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], u0, u1, y0 / th, y0 / th + Math.max(1, Math.round((y1 - y0) / th)));
      }
    }
    const PLAIN = { sandstone: '#b89766', glass: '#4a5560', concrete: '#8d8c88', brick: '#7c5341', render: '#b3ab9d', plant: '#6f7478' };
    function plainRing(pts, y0, y1, style) {
      const b = batch(roofs, PLAIN[style] || PLAIN.concrete);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        b.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], 0, 1, 0, 1);
      }
    }
    function insideRing(pt, ring) {
      let hit = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, zi] = ring[i], [xj, zj] = ring[j];
        if ((zi > pt[1]) !== (zj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - zi)) / (zj - zi) + xi) hit = !hit;
      }
      return hit;
    }
    function cap(pts, holes, y, key) {
      const b = batch(roofs, key);
      const contour = pts.map((q) => new THREE.Vector2(q[0], q[1])), hs = (holes || []).map((h) => h.map((q) => new THREE.Vector2(q[0], q[1])));
      const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
      const all = [...pts, ...(holes || []).flat()], n = b.pos.length / 3;
      for (const q of all) { b.pos.push(q[0], y, q[1]); b.uv.push(q[0] / 260, q[1] / 260); }
      for (const t of tris) b.idx.push(n + t[0], n + t[1], n + t[2]);
    }
    function solid(rec, isPart) {
      const style = TILE[rec.style] ? rec.style : 'concrete';
      const tint = hash(rec.pts) % WALL_TINTS[style].length;
      const y0 = rec.min || 0, y1 = Math.max(y0 + 20, rec.h);
      // Street level of a commercial building is shopfront, not more office windows.
      const shop = !isPart && !y0 && theme === THEMES.townhall && style !== 'sandstone' && y1 > 140 * k ? TILE.shop[1] * k : 0;
      // A plain band at the very top: the parapet every real roof has, and what
      // stops a facade looking like wallpaper wrapped round a box.
      const band = !isPart && y1 - y0 > 100 * k ? 9 * k : 0;
      for (const ring of [rec.pts, ...(rec.holes || [])]) {
        if (shop) wallRing(ring, 0, shop, 'shop', 0);
        wallRing(ring, y0 + shop, y1 - band, style, tint);
        if (band) plainRing(ring, y1 - band, y1 + 3 * k, style);
      }
      // Tall buildings carry plant on the roof.
      if (!isPart && !rec.roof && y1 > 380 * k) {
        const [mx, mz] = mid(rec.pts), half = 28 * k + (hash(rec.pts) % 5) * 5 * k, hh = 30 * k + (hash(rec.pts) % 3) * 12 * k;
        const sq = [[mx - half, mz - half * 0.7], [mx + half, mz - half * 0.7], [mx + half, mz + half * 0.7], [mx - half, mz + half * 0.7]];
        if (sq.every((q) => rec.pts.length > 3 && insideRing(q, rec.pts))) { plainRing(sq, y1, y1 + hh, 'plant'); cap(sq, null, y1 + hh, '#5b5f63'); }
      }
      const roofKey = rec.colour || ROOF_COLOR[style];
      if (!rec.roof || !rec.roofH) return cap(rec.pts, rec.holes, y1, roofKey);
      const [cx, cz] = mid(rec.pts), r = rec.pts.reduce((t, q) => t + Math.hypot(q[0] - cx, q[1] - cz), 0) / rec.pts.length;
      let m;
      if (rec.roof === 'dome' || rec.roof === 'onion') {
        m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(style === 'sandstone' ? '#5f7f73' : '#8a9096'));
        m.scale.y = Math.max(0.5, rec.roofH / r);
      } else {
        cap(rec.pts, rec.holes, y1, roofKey);
        m = new THREE.Mesh(new THREE.ConeGeometry(r * 1.05, rec.roofH, 4), lambert('#5a4f48'));
        m.rotation.y = Math.PI / 4 + Math.atan2(rec.pts[1][1] - rec.pts[0][1], rec.pts[1][0] - rec.pts[0][0]);
        m.position.y = rec.roofH / 2;
      }
      m.position.x = cx; m.position.z = cz; m.position.y += y1; m.castShadow = true; world.add(m);
      if (rec.clock) {          // a clock face on each side of a tower
        const face = new THREE.MeshBasicMaterial({ color: 0xf4eedd, side: THREE.DoubleSide }), y = y0 + (y1 - y0) * 0.8;
        for (let i = 0; i < rec.pts.length; i++) {
          const p = rec.pts[i], q = rec.pts[(i + 1) % rec.pts.length], mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
          const nx = mx - cx, nz = mz - cz, nl = Math.hypot(nx, nz) || 1;
          const c = new THREE.Mesh(new THREE.CircleGeometry(r * 0.42, 24), face);
          c.position.set(mx + (nx / nl) * 1.5, y, mz + (nz / nl) * 1.5); c.lookAt(mx + nx * 4, y, mz + nz * 4); world.add(c);
        }
      }
    }
    for (const b of geo.buildings) if (!b.shell) solid(b, false);
    for (const p of geo.parts) solid(p, true);

    // ---- the ground: lawns and squares as filled outlines, streets as ribbons
    const fill = (pts, key) => { try { cap(pts, null, 0, key); } catch (e) { /* a self-crossing outline: leave it as bare ground */ } };
    function ribbon(pts, width, key) {
      const b = batch(grounds, key), h = width / 2;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
        if (len < 1) continue;
        // Each piece runs half a width past its ends, which closes the gaps at bends.
        const ux = dx / len, uz = dz / len, nx = -uz * h, nz = ux * h, ex = ux * h * 0.5, ez = uz * h * 0.5;
        b.quad([p[0] - ex + nx, 0, p[1] - ez + nz], [q[0] + ex + nx, 0, q[1] + ez + nz], [p[0] - ex - nx, 0, p[1] - ez - nz], [q[0] + ex - nx, 0, q[1] + ez - nz], 0, len / 260, 0, width / 260);
      }
    }
    const GROUND = [               // [key, colour, height above the base ground]
      // Each layer sits clearly above the one before, and is also drawn with a
      // depth offset, so overlapping surfaces never fight over the same pixels.
      ['grass', theme.lawn, 1], ['wood', '#4f6b41', 1.2], ['pitch', '#5f8a4e', 1.4], ['plaza', '#a39c8d', 2],
      ['path', '#aaa392', 3], ['walk', '#8b877e', 4], ['road', theme.road, 5], ['line', '#c9c5b8', 6], ['rail', '#1f2226', 7],
    ];
    for (const g of geo.green) fill(g.pts, 'g:' + g.kind);
    for (const pl of geo.plazas) fill(pl, 'g:plaza');
    for (const pa of geo.paths) ribbon(pa.pts, pa.w, 'path');
    for (const r of geo.roads) {
      ribbon(r.pts, r.w, r.walk ? 'walk' : 'road');
      if (!r.walk && r.w >= 170 * k) ribbon(r.pts, 2.2 * k, 'line');     // a centre line on the main streets only
    }
    for (const rl of geo.rails) for (const side of [-7.2 * k, 7.2 * k]) {  // two rails, standard gauge apart
      const off = rl.map((q, i) => {
        const a = rl[Math.max(0, i - 1)], c = rl[Math.min(rl.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1;
        return [q[0] - (dz / l) * side, q[1] + (dx / l) * side];
      });
      ribbon(off, 1.3 * k, 'rail');
    }

    // ---- hand the batches to the scene
    const tex = {};
    const grain = canvasTex(128, 128, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
      g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 127, 127);        // a faint paving joint
    });
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.anisotropy = 8;
    for (const [key, b] of walls) {
      const [style, tint] = key.split('|');
      tex[style] ||= tileTexture(style);
      const mat = lambert(WALL_TINTS[style][+tint], { map: tex[style], side: THREE.DoubleSide, clippingPlanes: [cutaway] });
      const m = b.mesh(mat, true); if (m) world.add(m);
    }
    for (const [key, b] of roofs) {
      const ground = key.startsWith('g:');
      const g = ground && GROUND.find((x) => x[0] === key.slice(2));
      const layer = ground ? GROUND.indexOf(g) + 1 : 0;
      const mat = lambert(ground ? g[1] : key, { side: THREE.DoubleSide, ...(ground ? { map: grain, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 4 } : { clippingPlanes: [cutaway] }) });
      const m = b.mesh(mat, !ground); if (!m) continue;
      if (ground) m.position.y = g[2];
      world.add(m);
    }
    for (const [key, b] of grounds) {
      const g = GROUND.find((x) => x[0] === key);
      const layer = GROUND.indexOf(g) + 1;
      const m = b.mesh(lambert(g[1], { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 4, ...(key === 'line' || key === 'rail' ? {} : { map: grain }) }), false); if (!m) continue;
      m.position.y = g[2]; world.add(m);
    }

    // ---- every mapped street tree: a trunk and three overlapping masses of
    // foliage, in muted greens. One round ball on a stick is what made them toys.
    const trees = geo.trees.slice(0, 700);
    if (trees.length) {
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.2 * k, 3.6 * k, 62 * k, 6), lambert('#4a3d33'), trees.length);
      const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lambert('#ffffff', { flatShading: true }), trees.length * 3);
      const o = new THREE.Object3D(), c = new THREE.Color(), full = [];
      trees.forEach(([x, z], i) => {
        const r1 = ((x * 73 + z * 19) % 100 + 100) % 100 / 100, r2 = ((x * 31 + z * 57) % 100 + 100) % 100 / 100;
        const r = (24 + r1 * 16) * k, top = 62 * k, jac = theme === THEMES.usyd && r1 > 0.92;
        o.position.set(x, 31 * k, z); o.scale.set(1, 1, 1); o.rotation.set(0, 0, 0); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
        [[0, 0.55, 0, 1], [0.55, 0.3, 0.2, 0.74], [-0.45, 0.38, -0.35, 0.68]].forEach(([ox, oy, oz, sc], n) => {
          const a = r2 * 6.28, cx = ox * Math.cos(a) - oz * Math.sin(a), cz = ox * Math.sin(a) + oz * Math.cos(a);
          o.position.set(x + cx * r, top + oy * r, z + cz * r); o.scale.set(r * sc, r * sc * 0.82, r * sc); o.rotation.set(r1 * 3, r2 * 6, n); o.updateMatrix();
          crown.setMatrixAt(i * 3 + n, o.matrix); full.push(o.matrix.clone());
          crown.setColorAt(i * 3 + n, jac ? c.setHSL(0.72, 0.3, 0.52 + n * 0.03) : c.setHSL(0.26 + r1 * 0.05, 0.3 + r2 * 0.1, 0.17 + n * 0.035 + r2 * 0.04));
        });
      });
      trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true;
      world.add(trunk, crown);
      // Kept so render() can drop the few that stand between the camera and the cell.
      treeCrowns = { mesh: crown, pts: trees, full, hidden: new Uint8Array(trees.length), zero: new THREE.Matrix4().makeScale(0, 0, 0), reach: 70 * k };
    }
  }

  function disposeWorld() {
    if (!world) return;
    world.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    });
    for (const f of fighters.values()) { f.tex.dispose(); f.sprite.material.dispose(); }
    fighters.clear(); clouds = []; orbs = []; danger = null; world = null; sky = null; cutaway = null; treeCrowns = null;
  }

  /** Builds the scene for one match. */
  function build(mapKey, def, buildings, props, pickups) {
    disposeWorld();
    isGeo = !!def.geo;
    // Real maps are far bigger than the drawn ones: see further, and keep the sky outside the far plane's reach.
    camera.far = isGeo ? 30000 : 9000; camera.updateProjectionMatrix();
    const theme = (isGeo && THEMES[def.geo.key]) || THEMES[mapKey] || THEMES.hospital;
    mapDef = def; fogFar = theme.fog[2];
    // Filmic tone mapping is what stops bright walls blowing out to flat
    // colour. Only on the real-street maps: the others were lit without it.
    renderer.toneMapping = isGeo ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.localClippingEnabled = isGeo;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.fog[0], theme.fog[1], theme.fog[2]);
    // Looking along +z with y up, three.js puts +x on the LEFT of the screen.
    // The game's +x is to the right (D moves right), so everything in the
    // world hangs off one root that is mirrored in x. The camera, the sun
    // and project() below account for it.
    root = new THREE.Group(); root.scale.x = -1; scene.add(root);
    world = new THREE.Group(); root.add(world);

    scene.add(new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]));
    sun = new THREE.DirectionalLight(theme.sun[0], theme.sun[1]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -1300; sc.right = 1300; sc.top = 1300; sc.bottom = -1300; sc.near = 100; sc.far = isGeo ? 9000 : 5000;
    if (isGeo) { sun.shadow.mapSize.set(4096, 4096); sc.left = sc.bottom = -2400; sc.right = sc.top = 2400; sc.far = 16000; sun.shadow.bias = -0.0012; }
    sun.shadow.bias = -0.0006;
    sun.userData.offset = new THREE.Vector3(...theme.sun[2]);
    scene.add(sun); scene.add(sun.target);

    const far = Math.max(def.halfW, def.halfD) * 6;
    flat(far, far, lambert(theme.ground), 0, 0, 0);
    addSky(theme);
    if (isGeo) addGeo(def.geo, theme);
    for (const l of def.lawns || []) flat(l.w, l.d, lambert(l.color || theme.lawn), l.x, 0.4, l.z + l.d / 2);
    for (const p of def.plazas || []) flat(p.w, p.d, lambert(p.color || '#d9c7a0'), p.x, 0.5, p.z + p.d / 2);
    if (!isGeo) addRoads(def, theme);
    for (const bd of buildings) addBuilding(bd);
    for (const d of def.decor || []) {
      if (d.type === 'tower') {      // a clock tower, standing over an archway
        box(d.w, d.h, d.w, lambert(0xffffff, { map: facade({ style: 'sandstone', wall: d.wall, h: d.h }, d.w, false) }), d.x, d.y + d.h / 2, d.z);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(d.w * 0.78, d.w * 0.9, 4), lambert('#6d5a4a'));
        cap.rotation.y = Math.PI / 4; cap.position.set(d.x, d.y + d.h + d.w * 0.45, d.z); cap.castShadow = true; world.add(cap);
        const clock = new THREE.Mesh(new THREE.CircleGeometry(d.w * 0.3, 24), new THREE.MeshBasicMaterial({ color: 0xf6efdc }));
        clock.rotation.y = Math.PI; clock.position.set(d.x, d.y + d.h * 0.72, d.z - d.w / 2 - 1.5); world.add(clock);
      }
      if (d.type === 'tree') addTree({ x: d.x, z: d.z, r: d.r, color: d.color }, d.kind || 'round');
      if (d.type === 'lamp') {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 150, 6), lambert('#4b4f57'));
        post.position.set(d.x, 75, d.z); post.castShadow = true; world.add(post);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c2 }));
        bulb.position.set(d.x, 154, d.z); world.add(bulb);
      }
    }
    props.forEach((pr, i) => addTree(pr, theme.trees[i % theme.trees.length]));
    if (!isGeo) addBackdrop(def, theme);

    for (let i = 0; i < theme.clouds; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(120 + (k * 37) % 70, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }));
        puff.position.set(k * 130 - 190, ((k * 53) % 40), ((k * 71) % 90) - 45); puff.scale.y = 0.5; c.add(puff);
      }
      c.position.set(((i * 977) % 7000) - 3500, 1500 + ((i * 331) % 500), 1500 + ((i * 613) % 3500));
      root.add(c); clouds.push(c);
    }

    // Life orbs: a glowing sphere with a cross through it.
    pickups.forEach(() => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(24, 16, 12), new THREE.MeshBasicMaterial({ color: 0x3ee6b8, transparent: true, opacity: 0.85 })));
      const cm = new THREE.MeshBasicMaterial({ color: 0xffffff });
      g.add(new THREE.Mesh(new THREE.BoxGeometry(30, 9, 9), cm)); g.add(new THREE.Mesh(new THREE.BoxGeometry(9, 30, 9), cm));
      root.add(g); orbs.push(g);
    });

    // The marked ground where an incoming strike will land.
    danger = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.3, depthWrite: false }));
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.95, depthWrite: false }));
    const closing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    danger.add(disc, rim, closing); danger.rotation.x = -Math.PI / 2; danger.position.y = GROUND_MARK + 2; danger.visible = false;
    danger.userData.closing = closing;
    root.add(danger);
  }

  function fighterFor(f) {
    let e = fighters.get(f.id);
    if (e) return e;
    const cv = document.createElement('canvas'); cv.width = cv.height = CELL_TEX;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.02 }));
    const size = 2 * FIGHTER_R * (CELL_TEX / (2 * CELL_TEX_R));
    sprite.scale.set(size, size, 1);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(FIGHTER_R * 0.95, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = GROUND_MARK;
    const ring = new THREE.Mesh(new THREE.RingGeometry(FIGHTER_R * 1.25, FIGHTER_R * 1.5, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = GROUND_MARK + 1;
    const group = new THREE.Group(); group.add(shadow, ring, sprite);
    root.add(group);
    e = { group, sprite, shadow, ring, cv, g: cv.getContext('2d'), tex };
    fighters.set(f.id, e);
    return e;
  }

  /** Draws one frame. `st` is everything the game knows that the picture needs. */
  function render(st) {
    const cw = env.glCanvas.clientWidth | 0, ch = env.glCanvas.clientHeight | 0;
    if (cw && ch && (cw !== lastW || ch !== lastH)) {
      lastW = cw; lastH = ch;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch; camera.updateProjectionMatrix();
    }
    // Third-person: above and behind, looking a little ahead of the cell.
    const tall = camera.aspect < 1 ? 1.35 : 1;      // pull back on a portrait phone
    camera.up.set(0, 1, 0);
    scene.fog.far = fogFar;
    const fov = st.view === 'first' ? 66 : 48;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    // The scene is mirrored in x, so a heading of st.yaw points along (-sin, cos) here.
    const fx = -Math.sin(st.yaw), fz = Math.cos(st.yaw);
    if (st.view === 'first') {
      // Through the cell's eye: at its height, looking where it is turned,
      // with a slight bob so walking feels like walking.
      const bob = Math.sin(st.time / 130) * (st.moving ? 2.2 : 0.4);
      camPos.set(-st.px + fx * 18, 66 + bob, st.pz + fz * 18);
      camLook.set(-st.px + fx * 600, 58 + bob, st.pz + fz * 600);
    } else if (st.view === 'close') {
      // Over the shoulder. On the real maps the boom is shorter and lower --
      // a camera at street level rather than a drone -- and it shortens when
      // a building is behind you, so the view never ends up inside a wall or
      // looking straight down at the roof.
      const boom = isGeo ? 330 : 460, high = isGeo ? 175 : 290;
      let back = boom;
      if (isGeo && env.blocked) {
        for (let d = 60; d <= boom; d += 18) {
          if (env.blocked(st.px - Math.sin(st.yaw) * d, st.pz - Math.cos(st.yaw) * d)) { back = Math.max(110, d - 46); break; }
        }
      }
      camBack += (back - camBack) * (back < camBack ? 0.35 : 0.06);         // in quickly, out slowly
      const pulled = (boom - camBack) / boom;                                 // 0 in the open, towards 1 against a wall
      camPos.set(-st.px - fx * camBack, high + pulled * 70, st.pz - fz * camBack);
      camLook.set(-st.px + fx * (isGeo ? 240 : 300), isGeo ? 62 - pulled * 20 : 40, st.pz + fz * (isGeo ? 240 : 300));
    } else if (st.view === 'top') {
      // The whole map from above, for someone watching rather than playing.
      if (isGeo) {
        // A real map is too big to show whole and still see anyone, so the
        // overhead view frames wherever the players are.
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        for (const f of st.fighters) if (!f.dead) { x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); z0 = Math.min(z0, f.z); z1 = Math.max(z1, f.z); }
        if (x0 > x1) { x0 = x1 = st.px; z0 = z1 = st.pz; }
        const want = Math.max(1400, (z1 - z0) / 2 + 700, ((x1 - x0) / 2 + 700) / camera.aspect) * 2.35;
        topView.x += ((x0 + x1) / 2 - topView.x) * 0.06; topView.z += ((z0 + z1) / 2 - topView.z) * 0.06; topView.h += (want - topView.h) * 0.06;
        camPos.set(-topView.x, topView.h, topView.z - 1); camLook.set(-topView.x, 0, topView.z);
      } else {
        const h = Math.max(mapDef.halfD, mapDef.halfW / camera.aspect) * 2.35;
        camPos.set(0, h, -1); camLook.set(0, 0, 0);
      }
      camera.up.set(0, 0, 1);
      scene.fog.far = 99999;
    } else {
      camPos.set(-st.camX, 560 * tall, st.camZ - 700 * tall);
      camLook.set(-st.camX, 40, st.camZ + 170);
    }
    camera.position.copy(camPos);
    if (st.shake) camera.position.add(v.set((Math.random() - 0.5) * st.shake * 4, (Math.random() - 0.5) * st.shake * 3, 0));
    if (st.push) camera.position.lerp(camLook, st.push * 0.035);
    camera.lookAt(camLook);
    camera.updateMatrixWorld();
    if (sky) sky.position.copy(camera.position);
    if (cutaway) cutaway.constant = (st.view === 'close' || st.view === 'first') ? 1e6 : 320;
    if (treeCrowns && st.view !== 'top') {
      // A tree canopy between the camera and your cell hides the one thing
      // you need to see. Those few are dropped while they are in the way.
      const ax = -camera.position.x, az = camera.position.z, bx = st.px, bz = st.pz, dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      let changed = false;
      treeCrowns.pts.forEach(([x, z], i) => {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
        const hide = Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < treeCrowns.reach ? 1 : 0;
        if (hide !== treeCrowns.hidden[i]) {
          treeCrowns.hidden[i] = hide; changed = true;
          for (let n = 0; n < 3; n++) treeCrowns.mesh.setMatrixAt(i * 3 + n, hide ? treeCrowns.zero : treeCrowns.full[i * 3 + n]);
        }
      });
      if (changed) treeCrowns.mesh.instanceMatrix.needsUpdate = true;
    }
    sun.position.copy(camLook).add(sun.userData.offset); sun.target.position.copy(camLook);

    const seen = new Set();
    for (const f of st.fighters) {
      seen.add(f.id);
      const e = fighterFor(f);
      e.group.visible = f.visible !== false;
      if (!e.group.visible) continue;
      e.g.clearRect(0, 0, CELL_TEX, CELL_TEX);
      env.drawCell(e.g, CELL_TEX / 2, CELL_TEX / 2, CELL_TEX_R, f.look, f.wob || 0);
      e.tex.needsUpdate = true;
      const bob = Math.sin(st.time / 260 + f.x * 0.01) * 3;
      e.group.position.set(f.x + (f.knock || 0) * 14, 0, f.z + (f.lunge || 0) * 26 - (f.windup || 0) * 14);
      e.sprite.position.y = FIGHTER_R + 6 + bob - (f.dead ? f.fall * FIGHTER_R * 0.8 : 0);
      e.sprite.material.opacity = f.dead ? Math.max(0, 1 - f.fall) : 1;
      e.sprite.material.rotation = f.dead ? f.fall * 1.5 : 0;
      const fl = f.flash || 0;
      e.sprite.material.color.setRGB(1, 1 - fl * 0.55, 1 - fl * 0.55);
      e.shadow.material.opacity = f.dead ? 0.28 * (1 - f.fall) : 0.28;
      e.ring.visible = !!f.ring && !f.dead;
      if (e.ring.visible) { e.ring.material.color.set(f.tint || '#ffffff'); e.ring.material.opacity = 0.6 + 0.3 * Math.sin(st.time / 200); }
    }
    for (const [id, e] of fighters) if (!seen.has(id)) e.group.visible = false;

    st.pickups.forEach((pk, i) => {
      const o = orbs[i]; if (!o) return;
      o.visible = !pk.taken;
      o.position.set(pk.x, 46 + Math.sin(st.time / 300 + i) * 6, pk.z);
      o.rotation.y = st.time / 600;
    });
    if (st.danger) {
      danger.visible = true; danger.position.set(st.danger.x, GROUND_MARK + 2, st.danger.z);
      danger.scale.setScalar(st.danger.r);
      danger.userData.closing.scale.setScalar(Math.max(0.02, 1 - st.danger.t));
    } else danger.visible = false;
    for (const c of clouds) { c.position.x += 0.12; if (c.position.x > 3800) c.position.x = -3800; }

    renderer.render(scene, camera);
  }

  /** World position -> pixel position on a canvas of size (cw, ch), plus pixels per world unit there. */
  function project(x, y, z, cw, ch) {
    v.set(-x, y, z).applyMatrix4(camera.matrixWorldInverse);
    const depth = -v.z;
    v.set(-x, y, z).project(camera);
    const ppu = depth > 1 ? (ch / 2) / (Math.tan((camera.fov * Math.PI / 180) / 2) * depth) : 0;
    return { x: (v.x * 0.5 + 0.5) * cw, y: (-v.y * 0.5 + 0.5) * ch, ppu, behind: depth <= 1 };
  }

  return { build, render, project, fighterRadius: FIGHTER_R, dispose: disposeWorld };
}
