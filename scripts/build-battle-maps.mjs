// Turns OpenStreetMap data into a Cell Battle map: real building footprints
// and heights, real streets, real trees, in the game's own units.
//
//   node scripts/build-battle-maps.mjs <key> <overpass.json>
//
// <key> is one of AREAS below. The input is the JSON an Overpass query returns
// for that area's bounding box with `out geom tags;` -- the query is printed
// by `node scripts/build-battle-maps.mjs --query <key>`. Output goes to
// maps/<key>.json, which the game fetches when that map is picked.
//
// Map data © OpenStreetMap contributors, ODbL. The game credits it on screen.
//
// Units: 1 metre = 22 game units, x east, z north, origin at the area centre.
// A cell is 92 units across, so about 4 m at that scale: the size of a car on
// a 25 m street. At the earlier 10 units a metre it was 9 m wide and the city
// read as a model railway.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const AREAS = {
  // `heights` corrects buildings the map data has no real height for (metres).
  // `towers` adds a landmark the data lacks, placed relative to a named building.
  townhall: { label: 'George Street · Town Hall', lat: -33.87335, lon: 151.20665, halfW: 235, halfD: 270,
              heights: { 'Sydney Town Hall': 24, 'Queen Victoria Building': 20, 'Woolworths': 34 },
              // The data has the Town Hall's rooftop lantern but not the clock tower under it.
              towers: [{ name: 'Town Hall clock tower', at: [-7.6, 11], size: 11, h: 44, roofH: 5 }],
              sandstone: /town hall|cathedral|queen victoria|church|gowings|state theatre|grand united|commerce building|criterion|palings|pilgrim|banking house|macdonell|hotel coronation|sweeney/i },
  usyd:     { label: 'University of Sydney', lat: -33.88690, lon: 151.18870, halfW: 330, halfD: 300,
              heights: { 'Fisher Library': 36, 'Great Hall': 22, 'Anderson-Stuart Building': 18, 'Madsen Building': 19, 'Chemistry Building': 22,
                         'Carslaw Building': 34, 'Holme Building': 14, 'Macleay Building': 16, 'Physics Building': 18, 'Old Teachers College': 20 },
              // The Quadrangle's clock tower: mid-way along the east range, south of the Great Hall.
              // Buildings the data leaves unnamed, found by a point inside their outline (metres from the centre).
              named: [{ at: [40.5, 110], name: 'The Quadrangle', style: 'sandstone', h: 17 }],
              towers: [{ name: 'Clock Tower', at: [40.5, 110], size: 9, h: 42, roofH: 9 }],
              sandstone: /quadrangle|great hall|anderson stuart|madsen|holme|macleay|edgeworth|heydon|botany|badham|physics|r\. ?d\. ?watt|cottage|baxter|guardhouse|old teachers|pharmacy|bank building|woolley|john woolley|institute|refectory|maclaurin|nicholson|college|chaplaincy|old darlington/i },
};
const UNIT = 22;                       // game units per metre
const M = UNIT;                        // one metre, for distances below that are about the real world

const args = process.argv.slice(2);
if (args[0] === '--query') {
  const a = AREAS[args[1]];
  const dLat = (a.halfD + 40) / 110574, dLon = (a.halfW + 40) / (111320 * Math.cos(a.lat * Math.PI / 180));
  const b = [a.lat - dLat, a.lon - dLon, a.lat + dLat, a.lon + dLon].map((n) => n.toFixed(5)).join(',');
  console.log(`[out:json][timeout:90];(way[building](${b});relation[building](${b});way["building:part"](${b});relation["building:part"](${b});way[highway](${b});way[railway~"light_rail|tram"](${b});node[natural=tree](${b});way[leisure~"park|garden|pitch"](${b});way[landuse~"grass|recreation_ground"](${b});way[natural~"wood|scrub"](${b}););out geom tags;`);
  process.exit(0);
}
const [key, input] = args;
const area = AREAS[key];
if (!area || !input) { console.error('usage: node scripts/build-battle-maps.mjs <' + Object.keys(AREAS).join('|') + '> <overpass.json>'); process.exit(1); }

const cosLat = Math.cos(area.lat * Math.PI / 180);
const project = (p) => [(p.lon - area.lon) * cosLat * 111320 * UNIT, (p.lat - area.lat) * 110574 * UNIT];
const HW = area.halfW * UNIT, HD = area.halfD * UNIT;
const inside = ([x, z], pad = 0) => Math.abs(x) <= HW + pad && Math.abs(z) <= HD + pad;
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

// ------------------------------------------------------------------ geometry
function areaOf(pts) { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return a / 2; }
function centroid(pts) { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length]; }
function pointIn(pt, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > pt[1]) !== (zj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
/** Douglas-Peucker: drops vertices that move the outline by less than `tol`. */
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = 0, at = -1;
    const [ax, az] = pts[a], [bx, bz] = pts[b], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const round = (pts) => pts.map(([x, z]) => [Math.round(x), Math.round(z)]);
function ring(geometry) {
  let pts = geometry.map(project);
  if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts = pts.slice(0, -1);
  // A closed outline has no "ends" to simplify between, so it is split at the
  // vertex farthest from the first one and each half is simplified.
  let far = 0, best = -1;
  pts.forEach((q, i) => { const d = Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]); if (d > best) { best = d; far = i; } });
  if (far > 0) pts = [...simplify(pts.slice(0, far + 1), 0.6 * M).slice(0, -1), ...simplify([...pts.slice(far), pts[0]], 0.6 * M).slice(0, -1)];
  if (pts.length < 3) return null;
  if (areaOf(pts) < 0) pts.reverse();          // always counter-clockwise
  return round(pts);
}
/** The outlines of a way or a multipolygon relation, each with its courtyards. */
function rings(el) {
  if (el.type === 'way') { const r = el.geometry && ring(el.geometry); return r ? [{ pts: r, holes: [] }] : []; }
  const closed = (m) => m.type === 'way' && m.geometry && m.geometry.length > 3
      && m.geometry[0].lat === m.geometry[m.geometry.length - 1].lat && m.geometry[0].lon === m.geometry[m.geometry.length - 1].lon;
  const members = (el.members || []).filter(closed);
  const inner = members.filter((m) => m.role === 'inner').map((m) => ring(m.geometry)).filter(Boolean);
  return members.filter((m) => m.role !== 'inner').map((m) => ring(m.geometry)).filter(Boolean)
    .map((pts) => ({ pts, holes: inner.filter((h) => areaOf(h) > 60 * UNIT * UNIT && pointIn(centroid(h), pts)).map((h) => h.slice().reverse()) }));
}

/** Inside the building itself: within the outline and not in a courtyard. */
const solid = (pt, b) => pointIn(pt, b.pts) && !(b.holes || []).some((h) => pointIn(pt, h));

// ------------------------------------------------------------------- reading
const data = JSON.parse(readFileSync(input, 'utf8'));
const buildings = [], parts = [], roads = [], paths = [], rails = [], green = [], plazas = [], trees = [];
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

function heightOf(t, fallback) {
  const h = num(t.height) ?? num(t['building:height']);
  if (h) return h;
  const levels = num(t['building:levels']);
  if (levels) return levels * 3.6 + 2;
  return fallback;
}
function styleOf(t, h, id) {
  const name = t.name || '';
  const material = `${t['building:material'] || ''} ${t['building:facade:material'] || ''}`;
  if (area.sandstone.test(name) || /sandstone|stone/.test(material) || /church|cathedral|chapel/.test(t.building || '')) return 'sandstone';
  if (/glass/.test(material) || h > 55) return 'glass';
  if (/brick/.test(material)) return 'brick';
  return ['concrete', 'brick', 'concrete', 'render'][hash(id) % 4];
}

for (const el of data.elements) {
  const t = el.tags || {};
  if (el.type === 'node') { if (t.natural === 'tree') { const p = project(el); if (inside(p, -2 * M)) trees.push(p.map(Math.round)); } continue; }

  if (t.building || t['building:part']) {
    if (t.location === 'underground' || (num(t.layer) ?? 0) < 0) continue;
    for (const { pts, holes } of rings(el)) {
      if (!inside(centroid(pts), 15 * M) || areaOf(pts) < 30 * UNIT * UNIT / 4) continue;
      const isPart = !t.building;
      let h = area.heights[t.name] ?? heightOf(t, isPart ? 10 : (key === 'townhall' ? 24 : 11));
      if (!isPart && !area.heights[t.name] && styleOf(t, h, el.id) === 'sandstone') h = Math.max(h, 15);   // two tall storeys and a roof, not 2 x 3.6 m
      const rec = { pts, h: Math.round(Math.min(h, 190) * UNIT), style: styleOf(t, h, el.id) };
      if (holes.length) rec.holes = holes;
      const min = num(t.min_height) ?? (num(t['building:min_level']) ? num(t['building:min_level']) * 3.6 : 0);
      if (min) rec.min = Math.round(min * UNIT);
      if (t['roof:shape'] && t['roof:shape'] !== 'flat') { rec.roof = t['roof:shape']; rec.roofH = Math.round((num(t['roof:height']) ?? 4) * UNIT); }
      if (t.name) rec.name = t.name;
      if (t['building:colour'] && /^#[0-9a-f]{6}$/i.test(t['building:colour'])) rec.colour = t['building:colour'];
      (isPart ? parts : buildings).push(rec);
    }
    continue;
  }
  if (el.type !== 'way' || !el.geometry) continue;

  if (t.railway) { if (t.tunnel !== 'yes') rails.push(round(simplify(el.geometry.map(project), 0.4 * M))); continue; }

  if (t.highway) {
    if (t.tunnel === 'yes' || t.indoor === 'yes' || (num(t.layer) ?? 0) < 0 || t.covered === 'yes') continue;
    if (/^(motorway|motorway_link|corridor|construction|proposed|elevator)$/.test(t.highway)) continue;
    const pts = el.geometry.map(project);
    const closed = pts.length > 3 && el.geometry[0].lat === el.geometry[pts.length - 1].lat && el.geometry[0].lon === el.geometry[pts.length - 1].lon;
    if (closed && (t.area === 'yes' || t.highway === 'pedestrian')) { const r = ring(el.geometry); if (r) plazas.push(r); continue; }
    const widths = { trunk: 24, primary: 22, secondary: 18, tertiary: 14, tertiary_link: 8, unclassified: 11, residential: 10, living_street: 8, service: 5, pedestrian: 14 };
    const line = round(simplify(pts, 0.4 * M));
    if (!line.some((p) => inside(p, 6 * M))) continue;
    if (widths[t.highway]) roads.push({ w: Math.round((num(t.width) ?? widths[t.highway]) * UNIT), pts: line, walk: t.highway === 'pedestrian' || t.highway === 'living_street', ...(t.name ? { name: t.name } : {}) });
    else if (/^(footway|path|cycleway|steps)$/.test(t.highway) && !/sidewalk|crossing/.test(t.footway || '')) paths.push({ w: (t.highway === 'steps' ? 3 : 3.5) * UNIT, pts: line });
    continue;
  }
  if (t.leisure || t.landuse || t.natural) { const r = ring(el.geometry); if (r && inside(centroid(r), 10 * M)) green.push({ pts: r, kind: t.leisure === 'pitch' ? 'pitch' : (t.natural ? 'wood' : 'grass') }); }
}

// A building outline that has detailed parts inside it is a shell: the parts
// are what gets drawn, the outline is what you bump into.
// Only when the parts cover most of it: a single spire on a roof does not
// replace the building underneath.
for (const b of buildings) {
  const covered = parts.filter((p) => !p.min && pointIn(centroid(p.pts), b.pts)).reduce((t, p) => t + areaOf(p.pts), 0);
  if (covered > areaOf(b.pts) * 0.6) b.shell = true;
}
for (const n of area.named ?? []) {
  const b = buildings.find((x) => !x.name && solid([n.at[0] * UNIT, n.at[1] * UNIT], x));
  if (!b) { console.warn(`  could not find the building for "${n.name}"`); continue; }
  Object.assign(b, { name: n.name, style: n.style, h: n.h * UNIT });
}
for (const tw of area.towers) {
  const x = tw.at[0] * UNIT, z = tw.at[1] * UNIT, r = (tw.size / 2) * UNIT;
  const host = buildings.find((b) => solid([x, z], b));
  parts.push({ pts: round([[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]]), h: tw.h * UNIT, style: 'sandstone', roof: 'pyramidal', roofH: tw.roofH * UNIT, clock: true, name: tw.name });
  console.log(`  tower "${tw.name}" at ${Math.round(x)},${Math.round(z)} ${host ? 'on ' + (host.name || 'an unnamed building') : '(standing free)'}`);
}
// Parts carry no name; let them take their building's look. A rooftop part
// that the data leaves floating above its building is brought down to the roof.
for (const p of parts) {
  const owner = buildings.find((b) => pointIn(centroid(p.pts), b.pts));
  if (!owner) continue;
  p.style = owner.style; p.inside = true;
  if (p.min && !owner.shell && p.min > owner.h) p.min = owner.h;
}

// Somewhere to stand: points along streets and paths that are not inside a
// building. Spawns and healing orbs are picked from these, so nobody starts
// in a courtyard with no way out.
const open = [];
const blocked = (pt) => buildings.some((b) => pointIn(pt, b.pts)) || parts.some((p) => !p.inside && pointIn(pt, p.pts));   // courtyards count as blocked: there may be no way out
for (const way of [...roads, ...paths.filter((_, i) => i % 2 === 0)]) {
  for (let i = 1; i < way.pts.length; i++) {
    const [ax, az] = way.pts[i - 1], [bx, bz] = way.pts[i], len = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < len; d += 200) {
      const pt = [Math.round(ax + (bx - ax) * d / len), Math.round(az + (bz - az) * d / len)];
      if (inside(pt, -200) && !blocked(pt) && !open.some((o) => Math.hypot(o[0] - pt[0], o[1] - pt[1]) < 170)) open.push(pt);
    }
  }
}
const nearest = (x, z) => open.reduce((best, o) => (Math.hypot(o[0] - x, o[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? o : best), open[0]);
const you = nearest(0, -120), foe = open.filter((o) => Math.hypot(o[0] - you[0], o[1] - you[1]) > 300 && Math.hypot(o[0] - you[0], o[1] - you[1]) < 520)
  .sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]))[0] ?? nearest(0, 300);

const out = {
  key, label: area.label, attribution: 'Map data © OpenStreetMap contributors', unit: UNIT,
  halfW: HW, halfD: HD, spawn: { you, foe },
  buildings, parts: parts.map(({ inside: _i, ...p }) => p), roads, paths, rails, plazas, green, trees, open,
};
const file = fileURLToPath(new URL(`../maps/${key}.json`, import.meta.url));
mkdirSync(fileURLToPath(new URL('../maps/', import.meta.url)), { recursive: true });
writeFileSync(file, JSON.stringify(out));
console.log(`${key}: ${buildings.length} buildings (${buildings.filter((b) => b.shell).length} with detailed parts), ${parts.length} parts, ${roads.length} roads, ${paths.length} paths, ${rails.length} rails, ${plazas.length} plazas, ${green.length} green, ${trees.length} trees, ${open.length} open points -> maps/${key}.json (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
console.log('  spawn', you, foe, '| tallest', Math.max(...buildings.map((b) => b.h)) / UNIT, 'm | named:', buildings.filter((b) => b.name).length);
console.log('  styles', JSON.stringify(buildings.reduce((m, b) => { m[b.style] = (m[b.style] || 0) + 1; return m; }, {})), '| roofs', JSON.stringify(parts.reduce((m, p) => { if (p.roof) m[p.roof] = (m[p.roof] || 0) + 1; return m; }, {})));
