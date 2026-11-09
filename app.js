const h = React.createElement;
const { useState, useEffect, useRef, useContext, createContext } = React;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

const LS = {
  get(k, f) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('storage full', e); } }
};

const DEFAULT_PROFILE = { name: 'Maya', height: 160, weight: 80, bust: 120, waist: 105, hip: 125, shoulder: 41, upperArm: 40, torso: 44, inseam: 72, sleeve: 58 };

// ---------- units ----------
const U = createContext({ unit: 'cm', setUnit: () => { } });
const toU = (v, unit, kind) => kind === 'kg' ? (unit === 'in' ? Math.round(v * 2.2046) : Math.round(v)) : (unit === 'in' ? Math.round(v / 2.54 * 2) / 2 : Math.round(v));
const fromU = (v, unit, kind) => kind === 'kg' ? (unit === 'in' ? v / 2.2046 : v) : (unit === 'in' ? v * 2.54 : v);
const uLab = (unit, kind) => kind === 'kg' ? (unit === 'in' ? 'lb' : 'kg') : (unit === 'in' ? 'in' : 'cm');
const fmt = (v, unit, kind = 'len') => v == null ? '—' : toU(v, unit, kind) + ' ' + uLab(unit, kind);

const INFO = {
  height: 'Stand straight against a wall, barefoot. Measure from the floor to the top of your head.',
  weight: 'Optional context only. Clothing fit is calculated from your measurements.',
  bust: 'Measure around the fullest part of your bust, keeping the tape level.',
  waist: 'Measure around the natural waist — usually the narrowest part of the torso, above the navel.',
  hip: 'Measure around the fullest part of your hips and seat.',
  shoulder: 'Measure straight across your back, from one shoulder point to the other.',
  upperArm: 'Measure around the fullest part of your upper arm, arm relaxed.',
  torso: 'Measure from the base of the neck down to the natural waist.',
  inseam: 'Measure from the crotch to the ankle bone along the inner leg.',
  sleeve: 'Measure from the shoulder point, over a slightly bent elbow, to the wrist.'
};
const PRIMARY = [['height', 'Height', 130, 200], ['bust', 'Bust', 70, 170], ['waist', 'Waist', 55, 160], ['hip', 'Hip', 75, 180], ['shoulder', 'Shoulder', 30, 55], ['upperArm', 'Upper arm', 20, 60]];
const OPTIONAL = [['torso', 'Torso', 30, 60], ['inseam', 'Inseam', 55, 95], ['sleeve', 'Sleeve', 40, 70]];

// ---------- garments ----------
const imgFor = g => g.image || ('/api/nanobanana/image/640/800?seed=11&prompt=' + encodeURIComponent((g.prompt || (g.colorName ? g.colorName + ' ' : '') + g.name + ', ' + (g.attributes || []).join(', ')) + ', ghost mannequin fashion product photography, realistic fabric texture, natural folds, visible seams and stitching, soft studio lighting, soft shadow, isolated garment on warm ivory seamless background, no person, no model, catalog editorial'));
const SEED = [
  { id: 'g1', name: 'White Relaxed Blouse', category: 'top', color: '#F1ECE2', colorName: 'Ivory white', shape: 'blouse', attributes: ['Relaxed fit', 'Long sleeve', 'Button-up', 'Hip length'], size: 'XL', sizes: { L: { bust: 120, waist: 114, shoulder: 40, sleeve: 57, upperArm: 39, length: 66 }, XL: { bust: 128, waist: 122, shoulder: 42, sleeve: 58, upperArm: 42, length: 68 }, '2XL': { bust: 136, waist: 130, shoulder: 44, sleeve: 59, upperArm: 45, length: 70 } } },
  { id: 'g2', name: 'Black Wide-Leg Trousers', category: 'bottom', color: '#25211E', colorName: 'Black', shape: 'wide', attributes: ['High rise', 'Wide leg', 'Full length'], size: 'XL', sizes: { L: { waist: 102, hip: 126, length: 74 }, XL: { waist: 110, hip: 134, length: 76 } } },
  { id: 'g3', name: 'Beige Tailored Blazer', category: 'outer', color: '#C8B394', colorName: 'Beige', shape: 'blazer', attributes: ['Structured', 'Long sleeve', 'Single-breasted', 'Notch lapel'], size: 'XL', sizes: { XL: { bust: 125, shoulder: 42, sleeve: 59, upperArm: 41, length: 72 }, '2XL': { bust: 133, shoulder: 44, sleeve: 60, upperArm: 44, length: 74 } } },
  { id: 'g4', name: 'Navy Midi Dress', category: 'dress', color: '#2C3550', colorName: 'Navy', shape: 'a-line', attributes: ['A-line', 'Short sleeve', 'Midi length'], size: '2XL', sizes: { '2XL': { bust: 128, waist: 112, hip: 136, length: 115, sleeve: 20 } } },
  { id: 'g5', name: 'Blue Relaxed Shirt', category: 'top', color: '#A3B5C8', colorName: 'Pale blue', shape: 'shirt', attributes: ['Relaxed fit', 'Long sleeve', 'Button-up', 'Cotton poplin'], size: 'XL', sizes: { XL: { bust: 132, waist: 128, shoulder: 43, sleeve: 58, upperArm: 44, length: 72 } } },
  { id: 'g6', name: 'Camel A-Line Skirt', category: 'bottom', color: '#B08A5E', colorName: 'Camel', shape: 'skirt', attributes: ['A-line', 'Midi length', 'Wool blend'], size: 'XL', sizes: { XL: { waist: 106, hip: 136, length: 72 } } },
  { id: 'g7', name: 'Black Knit Top', category: 'top', color: '#2A2724', colorName: 'Black', shape: 'knit', attributes: ['Fitted', 'Long sleeve', 'Crew neck', 'Fine rib knit'], size: 'XL', sizes: { XL: { bust: 118, waist: 108, shoulder: 40, sleeve: 57, upperArm: 39, length: 64 } } },
  { id: 'g8', name: 'Dark Wide-Leg Jeans', category: 'bottom', color: '#2C3A55', colorName: 'Indigo', shape: 'wide', attributes: ['High rise', 'Wide leg', 'Rigid denim'], size: 'XL', sizes: { XL: { waist: 106, hip: 130, length: 75 } } }
];
const CATS = { top: 'Top', bottom: 'Bottom', dress: 'Dress', outer: 'Outerwear' };
const FIELDS = {
  top: [['bust', 'Bust width', 60, 200], ['waist', 'Waist width', 50, 200], ['shoulder', 'Shoulder', 30, 60], ['sleeve', 'Sleeve', 0, 75], ['upperArm', 'Upper arm', 20, 70], ['length', 'Length', 30, 100]],
  outer: [['bust', 'Bust width', 60, 210], ['shoulder', 'Shoulder', 30, 60], ['sleeve', 'Sleeve', 0, 75], ['upperArm', 'Upper arm', 20, 70], ['length', 'Length', 30, 130]],
  bottom: [['waist', 'Waist', 50, 200], ['hip', 'Hip', 60, 210], ['length', 'Inseam / length', 30, 100]],
  dress: [['bust', 'Bust width', 60, 200], ['waist', 'Waist width', 50, 200], ['hip', 'Hip', 60, 210], ['sleeve', 'Sleeve', 0, 75], ['length', 'Length', 60, 150]]
};
const DEFAULTS = { top: { length: 66, sleeve: 58 }, outer: { length: 74, sleeve: 59 }, bottom: { length: 74 }, dress: { length: 112, sleeve: 18 } };
function defaultSize(p, cat) {
  if (cat === 'bottom') return { waist: p.waist + 4, hip: p.hip + 8, length: p.inseam || 74 };
  if (cat === 'dress') return { bust: p.bust + 8, waist: p.waist + 8, hip: p.hip + 10, sleeve: 20, length: 110 };
  if (cat === 'outer') return { bust: p.bust + 10, shoulder: (p.shoulder || 40) + 1, sleeve: 59, upperArm: p.upperArm + 5, length: 74 };
  return { bust: p.bust + 8, waist: p.waist + 10, shoulder: (p.shoulder || 40) + 1, sleeve: 58, upperArm: p.upperArm + 3, length: 66 };
}

// ---------- fit analysis ----------
function circLabel(d, outer) {
  const e = outer ? d - 4 : d;
  if (e < 0) return ['Tight', 38, 'May require alteration'];
  if (e < 4) return ['Fitted', 82, 'Close to body'];
  if (e < 10) return ['Good ease', 97, 'Comfortable room'];
  if (e < 18) return ['Relaxed', 88, 'Extra room'];
  return ['Loose', 64, 'Generous room'];
}
function analyze(p, g, sizeKey) {
  if (!g) return null;
  const m = (g.sizes && g.sizes[sizeKey || g.size]) || {};
  const cat = g.category, outer = cat === 'outer';
  const rows = []; let expected = 0;
  const add = (key, label, fn) => { expected++; if (m[key] != null && m[key] !== '' && p[key === 'length' ? 'height' : key] != null) rows.push(fn(+m[key])); };
  const circ = (k, name) => add(k, name, v => { const d = v - p[k]; const [t, s, n] = circLabel(d, outer); return { key: k, name, status: t, score: s, note: n, ease: d }; });
  if (cat !== 'bottom') circ('bust', 'Bust');
  if (cat !== 'outer') circ('waist', 'Waist');
  if (cat === 'bottom' || cat === 'dress') circ('hip', 'Hip');
  if (cat === 'top' || cat === 'outer') {
    add('upperArm', 'Upper arm', v => { const d = v - p.upperArm; const r = d < 0 ? ['Tight', 40, 'May require alteration'] : d < 3 ? ['Slightly fitted', 80, 'Close around the arm'] : d < 8 ? ['Comfortable', 95, 'Easy movement'] : ['Relaxed', 88, 'Roomy sleeve']; return { key: 'upperArm', name: 'Upper arm', status: r[0], score: r[1], note: r[2], ease: d }; });
    add('shoulder', 'Shoulder', v => { const d = v - (p.shoulder || 40); const r = d < -1.5 ? ['Narrow', 55, 'May require alteration'] : d <= 3 ? ['Suitable', 93, 'Seam near shoulder point'] : ['Dropped', 82, 'Seam falls past shoulder']; return { key: 'shoulder', name: 'Shoulder', status: r[0], score: r[1], note: r[2], ease: d }; });
  }
  add('length', 'Length', v => {
    if (cat === 'bottom' && g.shape !== 'skirt') { const d = v - (p.inseam || 74); const r = d < -4 ? ['Cropped', 78, 'Ends above ankle'] : d <= 4 ? ['Suitable', 93, 'Close to your inseam'] : ['Long', 70, 'May require alteration']; return { key: 'length', name: 'Length', status: r[0], score: r[1], note: r[2], ease: d }; }
    return { key: 'length', name: 'Length', status: 'Suitable', score: 92, note: 'Proportional to your height' };
  });
  if (!rows.length) return { confidence: null, rows: [], verdict: 'Visual preview only', overall: 'Add measurements' };
  const avg = rows.reduce((a, r) => a + r.score, 0) / rows.length;
  const coverage = rows.length / expected;
  const confidence = Math.round(avg * (0.72 + 0.28 * coverage));
  const tight = rows.some(r => r.status === 'Tight');
  const verdict = confidence >= 85 ? 'Likely suitable' : confidence >= 72 ? 'Mostly suitable' : tight ? 'May feel snug' : 'May require alteration';
  const overall = confidence >= 85 ? 'Likely suitable' : confidence >= 72 ? 'Fair match' : 'Try another size';
  return { confidence, rows, verdict, overall };
}
function garmentEase(p, g, size) {
  const m = (g.sizes && g.sizes[size || g.size]) || {};
  const txt = ((g.attributes || []).join(' ') + ' ' + g.name).toLowerCase();
  const def = /relax|oversiz|wide|loose|a-line|roomy/.test(txt) ? 14 : /fitted|slim|pencil|knit/.test(txt) ? 3 : 8;
  const d = Object.assign({}, DEFAULTS[g.category] || {}, g.defaults || {});
  return {
    bust: m.bust ? m.bust - p.bust : def, waist: m.waist ? m.waist - p.waist : def + 2, hip: m.hip ? m.hip - p.hip : def,
    arm: m.upperArm ? m.upperArm - p.upperArm : def * 0.4, length: +(m.length || d.length || 66), sleeve: +(m.sleeve != null && m.sleeve !== '' ? m.sleeve : (d.sleeve != null ? d.sleeve : 58))
  };
}

// ---------- 3D geometry ----------
function catm(a, t) {
  const i = Math.min(Math.floor(t), a.length - 2), f = t - i;
  const p0 = a[Math.max(i - 1, 0)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(i + 2, a.length - 1)];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}
function tubeGeo(keys, n, seg, fn, caps) {
  const cols = [0, 1, 2, 3, 4].map(j => keys.map(k => k[j]));
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n * (keys.length - 1); const [y, x, z, rx, rz] = cols.map(c => catm(c, t)); const u = i / n;
    for (let s = 0; s < seg; s++) {
      const a = s / seg * Math.PI * 2; let dx = Math.cos(a) * rx, dz = Math.sin(a) * rz;
      const off = fn ? fn(a, u, y) : 0; const len = Math.hypot(dx, dz) || 1; dx += dx / len * off; dz += dz / len * off;
      pos.push(x + dx, y, z + dz); uv.push(s / seg * 4, u * 4);
    }
  }
  for (let i = 0; i < n; i++) for (let s = 0; s < seg; s++) { const a = i * seg + s, b = i * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c); }
  if (caps) {
    const L = keys.length - 1, top = pos.length / 3;
    pos.push(catm(cols[1], 0), catm(cols[0], 0), catm(cols[2], 0), catm(cols[1], L), catm(cols[0], L), catm(cols[2], L)); uv.push(0, 0, 0, 0);
    for (let s = 0; s < seg; s++) { idx.push(top, (s + 1) % seg, s); idx.push(top + 1, n * seg + s, n * seg + (s + 1) % seg); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function ell(C, k) { const r = C / 100 / (2 * Math.PI); const rx = r * Math.sqrt(2 / (1 + k * k)); return [rx, rx * k]; }
function interpKeys(keys, y) {
  if (y >= keys[0][0]) return keys[0].slice();
  for (let i = 1; i < keys.length; i++) if (y >= keys[i][0]) { const a = keys[i - 1], b = keys[i], t = (a[0] - y) / (a[0] - b[0]); return a.map((v, j) => v + (b[j] - v) * t); }
  return keys[keys.length - 1].slice();
}
function cutKeys(keys, y0, y1, pad) {
  const out = [interpKeys(keys, y0)];
  keys.forEach(k => { if (k[0] < y0 - 0.01 && k[0] > y1 + 0.01) out.push(k.slice()); });
  const last = interpKeys(keys, y1); last[0] = y1; out[0][0] = y0; out.push(last);
  return out.map(k => { const pd = pad(k[0]); k[3] += pd; k[4] += pd; return k; });
}
function bodyModel(p) {
  const H = p.height / 100, sw = (p.shoulder || 40) / 100;
  const [bx, bz] = ell(p.bust * 0.93, 0.74), [ux, uz] = ell(p.bust * 0.45 + p.waist * 0.55, 0.76), [wx, wz] = ell(p.waist, 0.8), [hhx, hhz] = ell(p.waist * 0.4 + p.hip * 0.6, 0.76), [hx, hz] = ell(p.hip * 0.97, 0.72);
  const torso = [[0.838 * H, 0, -0.008, 0.056, 0.05], [0.812 * H, 0, -0.004, sw * 0.47, 0.075], [0.775 * H, 0, 0, Math.max(bx * 0.98, sw * 0.46), bz * 0.85], [0.725 * H, 0, 0.004, bx, bz], [0.685 * H, 0, 0.006, ux, uz], [0.625 * H, 0, 0.004, wx, wz], [0.575 * H, 0, 0, hhx, hhz], [0.525 * H, 0, -0.006, hx, hz], [0.48 * H, 0, -0.004, hx * 0.94, hz * 0.92], [0.455 * H, 0, 0, hx * 0.62, hz * 0.6]];
  const bump = clamp(0.008 + (p.bust - 80) / 100 * 0.05, 0.006, 0.05), bb = clamp(0.006 + (p.hip - p.waist) / 100 * 0.08, 0.004, 0.04);
  const torsoFn = (a, u, y) => {
    const gb = Math.exp(-Math.pow((y - 0.718 * H) / (0.036 * H), 2));
    const cups = Math.exp(-Math.pow(a - Math.PI / 2 - 0.45, 2) / 0.16) + Math.exp(-Math.pow(a - Math.PI / 2 + 0.45, 2) / 0.16);
    const s = Math.sin(a);
    return bump * gb * cups + bb * Math.exp(-Math.pow((y - 0.51 * H) / (0.05 * H), 2)) * Math.pow(Math.max(0, -s), 1.5);
  };
  const soft = clamp((p.weight - 60) / 100, -0.1, 0.4) * 0.08 + 1;
  const lx = hx * 0.5, rT = p.hip * 0.6 / 100 / (2 * Math.PI) * soft, rK = p.hip * 0.3 / 100 / (2 * Math.PI), rC = p.hip * 0.29 / 100 / (2 * Math.PI) * soft;
  const leg = sx => [[0.5 * H, sx * lx, -0.008, rT, rT * 0.93], [0.42 * H, sx * lx * 0.92, -0.004, rT * 0.86, rT * 0.82], [0.36 * H, sx * lx * 0.8, 0, rT * 0.66, rT * 0.64], [0.285 * H, sx * lx * 0.72, 0.004, rK, rK * 0.95], [0.2 * H, sx * lx * 0.7, -0.012, rC, rC * 0.95], [0.11 * H, sx * lx * 0.68, -0.006, rC * 0.6, rC * 0.58], [0.045 * H, sx * lx * 0.68, -0.01, 0.032, 0.03]];
  const r = p.upperArm / 100 / (2 * Math.PI), sxp = sw * 0.47 - r * 0.55;
  const arm = sx => [[0.808 * H, sx * sxp, -0.004, r * 0.9, r * 1.05], [0.76 * H, sx * Math.max(sxp + 0.01, bx + r * 0.85), -0.006, r, r * 0.98], [0.69 * H, sx * (Math.max(ux, bx * 0.9) + r * 0.9 + 0.008), -0.01, r * 0.88, r * 0.86], [0.625 * H, sx * (wx + r * 0.75 + 0.025), -0.014, r * 0.62, r * 0.6], [0.55 * H, sx * (hhx + r * 0.6 + 0.035), -0.004, r * 0.55, r * 0.5], [0.475 * H, sx * (hx + 0.045), 0.012, 0.026, 0.02]];
  const ext = torso.slice(0, 8).concat([[0.47 * H, 0, -0.004, hx * 0.98, hz * 0.95], [0.3 * H, 0, 0, hx * 0.97, hz * 0.92], [0.05 * H, 0, 0, hx * 0.97, hz * 0.92]]);
  return { H, torso, torsoFn, leg, arm, ext, bx, bz, wx, hx, hz, lx, r, bump };
}
function pathTube(pts, radii, ref, n, seg, capA, capB) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const L = curve.getLength(), pos = [], idx = [], K = radii.length - 1;
  const rAt = (t, j) => catm(radii.map(r => r[j]), t * K);
  const T = new THREE.Vector3(), N = new THREE.Vector3(), Bn = new THREE.Vector3(), P = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n; curve.getPoint(t, P); curve.getTangent(t, T);
    N.copy(ref).addScaledVector(T, -ref.dot(T)).normalize(); Bn.crossVectors(T, N);
    let f = 1; const d0 = t * L, d1 = (1 - t) * L;
    const c0 = Math.max(radii[0][0], radii[0][1]), c1 = Math.max(radii[K][0], radii[K][1]);
    if (capA && d0 < c0) { const q = 1 - d0 / c0; f = Math.sqrt(Math.max(0, 1 - q * q)); }
    if (capB && d1 < c1) { const q = 1 - d1 / c1; f = Math.min(f, Math.sqrt(Math.max(0, 1 - q * q))); }
    f = Math.max(f, 0.02);
    const rx = rAt(t, 0) * f, rz = rAt(t, 1) * f;
    for (let s = 0; s < seg; s++) { const a = s / seg * Math.PI * 2, ca = Math.cos(a) * rx, sa = Math.sin(a) * rz; pos.push(P.x + N.x * ca + Bn.x * sa, P.y + N.y * ca + Bn.y * sa, P.z + N.z * ca + Bn.z * sa); }
  }
  for (let i = 0; i < n; i++) for (let s = 0; s < seg; s++) { const a = i * seg + s, b = i * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// ---------- smooth implicit body (one continuous surface, surface-nets meshed) ----------
const smin = (a, b, k) => { const hh = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * hh - k * hh * (1 - hh); };
const ell3 = (x, y, z, cx, cy, cz, a, b, c) => { const px = (x - cx) / a, py = (y - cy) / b, pz = (z - cz) / c; const k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / a, py / b, pz / c); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(a, b, c); };
const rcn = (x, y, z, a, b, ra, rb) => { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2]; const t = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1); return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t); };
const rbox = (x, y, z, a, b, c, r) => { const qx = Math.abs(x) - a, qy = Math.abs(y) - b, qz = Math.abs(z) - c; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
function loft(keys) {
  const cols = [1, 2, 3, 4].map(j => keys.map(k => k[j])), ys = keys.map(k => k[0]), top = ys[0], bot = ys[ys.length - 1];
  return y => { const yc = clamp(y, bot, top); let i = 0; while (i < ys.length - 2 && yc < ys[i + 1]) i++; const t = i + (ys[i] - yc) / ((ys[i] - ys[i + 1]) || 1); return [catm(cols[0], t), catm(cols[1], t), Math.max(0.004, catm(cols[2], t)), Math.max(0.004, catm(cols[3], t)), y - top, bot - y]; };
}
function ld(s, x, z, fo) {
  const dx = x - s[0], dz = z - s[1], rx = s[2], rz = s[3];
  const q = Math.hypot(dx / rx, dz / rz), g = Math.hypot(dx / (rx * rx), dz / (rz * rz));
  let d2 = g > 1e-9 ? q * (q - 1) / g : -Math.min(rx, rz);
  if (fo) d2 -= fo(Math.atan2(dz / rz, dx / rx));
  const dy = Math.max(s[4], s[5]);
  return dy > 0 ? (d2 > 0 ? Math.hypot(d2, dy) : dy) : Math.max(d2, dy);
}
function snet(f, row, x0, y0, z0, st, nx, ny, nz) {
  const at = (x, y, z) => f(x, y, z, row(y));
  const v = new Float32Array(nx * ny * nz);
  for (let j = 0; j < ny; j++) { const y = y0 + j * st, R = row(y); for (let kk = 0; kk < nz; kk++) { const z = z0 + kk * st, b = nx * (j + ny * kk); for (let i = 0; i < nx; i++) v[b + i] = f(x0 + i * st, y, z, R); } }
  const cx = nx - 1, cy = ny - 1, cz = nz - 1, ci = new Int32Array(cx * cy * cz).fill(-1), pos = [], nor = [], idx = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], c = new Float32Array(8), e = st * 0.35;
  const K4 = [[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]];
  for (let kk = 0; kk < cz; kk++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let m = 0;
    for (let q = 0; q < 8; q++) { const val = v[(i + (q & 1)) + nx * ((j + ((q >> 1) & 1)) + ny * (kk + ((q >> 2) & 1)))]; c[q] = val; if (val < 0) m |= 1 << q; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (let w = 0; w < 12; w++) { const a = E[w][0], b = E[w][1]; if ((c[a] < 0) !== (c[b] < 0)) { const t = c[a] / (c[a] - c[b]); sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; n++; } }
    let px = x0 + (i + sx / n) * st, py = y0 + (j + sy / n) * st, pz = z0 + (kk + sz / n) * st;
    let gx = 0, gy = 0, gz = 0;
    for (const q of K4) { const val = at(px + q[0] * e, py + q[1] * e, pz + q[2] * e); gx += q[0] * val; gy += q[1] * val; gz += q[2] * val; }
    const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
    const d = clamp(at(px, py, pz), -st, st); px -= gx * d; py -= gy * d; pz -= gz * d;
    ci[i + cx * (j + cy * kk)] = pos.length / 3; pos.push(px, py, pz); nor.push(gx, gy, gz);
  }
  const C = (i, j, kk) => ci[i + cx * (j + cy * kk)];
  const quad = (a, b, cc, d, flip) => { if (a < 0 || b < 0 || cc < 0 || d < 0) return; if (flip) idx.push(a, cc, b, a, d, cc); else idx.push(a, b, cc, a, cc, d); };
  for (let kk = 1; kk < cz; kk++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
    const in0 = v[i + nx * (j + ny * kk)] < 0;
    if (in0 !== (v[i + 1 + nx * (j + ny * kk)] < 0)) quad(C(i, j, kk), C(i, j - 1, kk), C(i, j - 1, kk - 1), C(i, j, kk - 1), !in0);
    if (in0 !== (v[i + nx * (j + 1 + ny * kk)] < 0)) quad(C(i, j, kk), C(i, j, kk - 1), C(i - 1, j, kk - 1), C(i - 1, j, kk), !in0);
    if (in0 !== (v[i + nx * (j + ny * (kk + 1))] < 0)) quad(C(i, j, kk), C(i - 1, j, kk), C(i - 1, j - 1, kk), C(i, j - 1, kk), !in0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
function bodyMeshes(B, step) {
  const H = B.H, k = H / 1.65;
  const tL = loft(B.torso);
  const legs = [-1, 1].map(s => { const L = B.leg(s); return loft(L.concat([[0.022 * H, L[6][1], L[6][2] - 0.004, 0.026 * k, 0.026 * k]])); });
  const armK = [-1, 1].map(s => { const a = B.arm(s).map(r => r.slice()); const w = a[a.length - 1]; w[3] = 0.017 * k; w[4] = 0.023 * k; a.unshift([0.828 * H, a[0][1] * 0.94, a[0][2], B.r * 0.5, B.r * 0.55]); return a; });
  const arms = armK.map(loft), wr = armK.map(a => a[a.length - 1]);
  const ank = [-1, 1].map(s => B.leg(s)[6]);
  const yArmTop = 0.83 * H + 0.04, yWr = wr[0][0];
  const row = y => ({ y, t: tL(y), l: y < 0.54 * H ? legs.map(f => f(y)) : null, a: (y < yArmTop && y > yWr - 0.04) ? arms.map(f => f(y)) : null });
  const sdf = (x, y, z, R) => {
    let d = ld(R.t, x, z, (R.t[4] <= 0 && R.t[5] <= 0) ? a => B.torsoFn(a, 0, y) : null);
    if (R.l) d = smin(d, Math.min(ld(R.l[0], x, z), ld(R.l[1], x, z)), 0.035 * k);
    if (y < 0.12 * H) for (const a of ank) {
      const ft = smin(ell3(x, y, z, a[1] * 1.04, 0.026 * k, a[2] + 0.05 * k, 0.04 * k, 0.03 * k, 0.108 * k), ell3(x, y, z, a[1], 0.036 * k, a[2] - 0.012 * k, 0.031 * k, 0.036 * k, 0.042 * k), 0.02 * k);
      d = smin(d, ft, 0.022 * k);
    }
    if (R.a) d = smin(d, Math.min(ld(R.a[0], x, z), ld(R.a[1], x, z)), lerp(0.003, 0.03, (y - 0.7 * H) / (0.07 * H)));
    if (y > 0.79 * H) {
      const cr = ell3(x, y, z, 0, 0.93 * H, 0.004, 0.074 * k, 0.098 * k, 0.09 * k), jaw = ell3(x, y, z, 0, 0.896 * H, 0.024 * k, 0.052 * k, 0.056 * k, 0.062 * k);
      const nk = rcn(x, y, z, [0, 0.82 * H, -0.01 * k], [0, 0.9 * H, -0.006 * k], 0.052 * k, 0.046 * k);
      d = smin(d, smin(smin(cr, jaw, 0.025 * k), nk, 0.02 * k), 0.025 * k);
    }
    return Math.max(d, -y);
  };
  let xm = 0; armK.forEach(a => a.forEach(r => xm = Math.max(xm, Math.abs(r[1]) + r[3]))); xm = Math.max(xm, B.hx + 0.02) + 0.03;
  const zmin = -(Math.max(B.hz, B.bz) + 0.09), zmax = Math.max(B.bz + B.bump + 0.05, 0.05 + 0.13 * k);
  const ymax = H + 0.02;
  const out = [snet(sdf, row, -xm, -0.01, zmin, step, Math.ceil(2 * xm / step) + 1, Math.ceil((ymax + 0.01) / step) + 1, Math.ceil((zmax - zmin) / step) + 1)];
  // hands — fine resolution, blended into the forearm
  const hs = 0.0024 * k;
  [-1, 1].forEach((s, si) => {
    const w = wr[si];
    const fingers = [[0.0255, 0.068, 0.008], [0.0085, 0.076, 0.0084], [-0.0085, 0.071, 0.008], [-0.025, 0.056, 0.007]];
    const hand = (x, y, z) => {
      const X = (x - w[1]) / k * s, Y = (y - w[0]) / k, Z = (z - w[2]) / k;
      if (Y > 0.03) return 1;
      let d = rbox(X + 0.001, Y + 0.05, Z - 0.002, 0.004, 0.03, 0.021, 0.0095);
      let df = 1;
      for (const [zo, L, r] of fingers) {
        const a = [-0.001, -0.082, zo], m = [-0.005, -0.082 - L * 0.55, zo * 1.1], t = [-0.014, -0.082 - L, zo * 1.2];
        df = Math.min(df, rcn(X, Y, Z, a, m, r, r * 0.9), rcn(X, Y, Z, m, t, r * 0.9, r * 0.78));
      }
      d = smin(d, df, 0.007);
      const th = Math.min(rcn(X, Y, Z, [-0.006, -0.028, 0.02], [-0.013, -0.056, 0.036], 0.012, 0.0092), rcn(X, Y, Z, [-0.013, -0.056, 0.036], [-0.019, -0.079, 0.04], 0.0092, 0.0074));
      return smin(d, th, 0.012) * k;
    };
    const f = (x, y, z, R) => smin(ld(R, x, z), hand(x, y, z), 0.01 * k);
    const x0 = w[1] - 0.05 * k, y0 = w[0] - 0.2 * k, z0 = w[2] - 0.06 * k;
    out.push(snet(f, arms[si], x0, y0, z0, hs, Math.ceil(0.1 * k / hs) + 1, Math.ceil((0.2 * k + 0.012) / hs) + 1, Math.ceil(0.14 * k / hs) + 1));
  });
  return out;
}
function handGeos(w, s, k) {
  const V = (x, y, z) => new THREE.Vector3(w[1] + x * k, w[0] + y * k, w[2] + z * k), X = new THREE.Vector3(1, 0, 0), out = [];
  out.push(pathTube([V(0, 0.012, 0), V(-s * 0.001, -0.025, 0.003), V(-s * 0.003, -0.07, 0.004)], [[0.016 * k, 0.024 * k], [0.017 * k, 0.035 * k], [0.013 * k, 0.037 * k]], X, 24, 28, true, true));
  [[0.025, 0.074, 0.0085], [0.009, 0.082, 0.0088], [-0.007, 0.077, 0.0083], [-0.022, 0.062, 0.0073]].forEach(([zo, Lf, r]) => {
    const y0 = -0.06;
    out.push(pathTube([V(-s * 0.003, y0, zo + 0.004), V(-s * 0.006, y0 - Lf * 0.5, zo * 1.05 + 0.007), V(-s * 0.014, y0 - Lf * 0.88, zo * 1.06 + 0.008), V(-s * 0.02, y0 - Lf, zo * 1.06 + 0.006)], [[r * k, r * 1.1 * k], [r * 0.92 * k, r * k], [r * 0.82 * k, r * 0.88 * k], [r * 0.75 * k, r * 0.8 * k]], X, 22, 14, true, true));
  });
  out.push(pathTube([V(-s * 0.006, -0.012, 0.022), V(-s * 0.014, -0.042, 0.04), V(-s * 0.022, -0.068, 0.046), V(-s * 0.027, -0.084, 0.044)], [[0.012 * k, 0.014 * k], [0.0105 * k, 0.011 * k], [0.009 * k, 0.0095 * k], [0.008 * k, 0.0085 * k]], X, 22, 14, true, true));
  return out;
}
function footGeo(a, k) {
  const x = a[1] * 1.02, z = a[2], V = (dx, y, dz) => new THREE.Vector3(x + dx, y * k, z + dz * k);
  const sx = Math.sign(x) || 1;
  return pathTube([V(0, 0.035, -0.045), V(0, 0.04, 0.0), V(sx * 0.004, 0.03, 0.06), V(sx * 0.01, 0.018, 0.115), V(sx * 0.012, 0.014, 0.14)], [[0.032 * k, 0.03 * k], [0.036 * k, 0.034 * k], [0.026 * k, 0.042 * k], [0.014 * k, 0.04 * k], [0.011 * k, 0.034 * k]], new THREE.Vector3(0, 1, 0), 40, 28, true, true);
}
let _fabTex = null;
function fabricTex() {
  if (_fabTex) return _fabTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(${i % 4 ? 255 : 0},${i % 4 ? 255 : 0},${i % 4 ? 255 : 0},.08)`; x.fillRect(0, i, 128, 1); x.fillRect(i, 0, 1, 128); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
  _fabTex = new THREE.CanvasTexture(c); _fabTex.wrapS = _fabTex.wrapT = THREE.RepeatWrapping; return _fabTex;
}
function garmentMeshes(B, p, g, size) {
  const e = garmentEase(p, g, size), H = B.H, out = [];
  const o = v => Math.max(0.003, v / 100 / (2 * Math.PI)) + 0.006;
  const col = new THREE.Color(g.color || '#cccccc');
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: g.shape === 'knit' ? 0.95 : 0.82, metalness: 0, side: THREE.DoubleSide, bumpMap: fabricTex(), bumpScale: 0.0015 });
  const dark = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.82), roughness: 0.85, side: THREE.DoubleSide });
  const cat = g.category, outer = cat === 'outer', extra = outer ? 0.012 : 0;
  const amp = 0.002 + clamp(Math.max(e.bust, e.waist), 0, 30) * 0.00022;
  const fold = (k, n) => (a, u, y) => B.torsoFn(a, u, y) * 0.92 + amp * k * (Math.sin(a * n + y * 22) * 0.6 + Math.sin(a * (n + 5) + 1.3) * 0.4) * clamp((0.72 * H - y) / (0.18 * H), 0, 1.6);
  const push = (geo, m) => out.push(new THREE.Mesh(geo, m || mat));
  if (cat !== 'bottom') {
    const hem = Math.max(0.06 * H, 0.835 * H - e.length / 100);
    const flare = cat === 'dress' ? (/pencil/i.test(g.name) ? 0.03 : 0.32) : (outer && e.length > 90 ? 0.12 : 0.02);
    const pad = y => extra + (y > 0.725 * H ? lerp(0.004, o(e.bust), (0.83 * H - y) / (0.105 * H)) : y > 0.625 * H ? lerp(o(e.bust), o(outer ? e.bust : e.waist), (0.725 * H - y) / (0.1 * H)) : lerp(o(outer ? e.bust : e.waist), o(e.hip) + 0.004, (0.625 * H - y) / (0.1 * H))) + flare * Math.max(0, 0.5 * H - y);
    push(tubeGeo(cutKeys(B.ext, 0.83 * H, hem, pad), 70, 72, fold(cat === 'dress' ? 2.2 : 1, cat === 'dress' ? 7 : 9), false));
    if (e.sleeve > 3) [-1, 1].forEach(sx => {
      const yc = 0.808 * H - clamp(e.sleeve / 58, 0.08, 1.03) * 0.333 * H;
      push(tubeGeo(cutKeys(B.arm(sx), 0.812 * H, yc, y => o(e.arm) * 0.8 + extra * 0.6 + (y < 0.6 * H ? 0.004 : 0)), 34, 28, (a, u, y) => 0.0018 * Math.sin(a * 6 + y * 40), false));
    });
    if (/blouse|shirt|blazer/.test(g.shape || '') || /collar|lapel|button/i.test((g.attributes || []).join(' '))) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.064 + extra, outer ? 0.016 : 0.011, 10, 48), dark);
      t.rotation.x = Math.PI / 2 - 0.25; t.position.set(0, 0.826 * H, 0.004); t.scale.set(1, 0.92, 1); out.push(t);
    }
    if (/button|breasted/i.test((g.attributes || []).join(' '))) {
      for (let y = 0.78 * H; y > hem + 0.03; y -= 0.075) {
        const k = interpKeys(B.ext, y); const z = k[2] + k[4] + pad(y) + B.torsoFn(Math.PI / 2, 0, y) * 0.92 + 0.003;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), new THREE.MeshStandardMaterial({ color: outer ? 0x2b1f18 : 0xe9e2d6, roughness: 0.4 }));
        b.position.set(0, y, z); b.scale.set(1, 1, 0.5); out.push(b);
      }
    }
  } else {
    const wpad = y => lerp(o(e.waist), o(e.hip), (0.625 * H - y) / (0.1 * H));
    if (g.shape === 'skirt') {
      const hem = Math.max(0.05 * H, 0.63 * H - e.length / 100);
      push(tubeGeo(cutKeys(B.ext, 0.632 * H, hem, y => wpad(y) + 0.3 * Math.max(0, 0.5 * H - y)), 60, 72, fold(2.6, 8), false));
    } else {
      push(tubeGeo(cutKeys(B.ext, 0.632 * H, 0.462 * H, wpad), 30, 64, (a, u, y) => B.torsoFn(a, u, y) * 0.9, false));
      const hem = Math.max(0.015 * H, 0.475 * H - (e.length / (p.inseam || 74)) * 0.43 * H);
      const wide = g.shape === 'wide';
      [-1, 1].forEach(sx => push(tubeGeo(cutKeys(B.leg(sx), 0.5 * H, hem, y => o(e.hip) * 0.55 + 0.006 + (wide ? 0.075 * clamp((0.47 * H - y) / (0.4 * H), 0, 1) : 0.006 + 0.012 * clamp((0.3 * H - y) / (0.3 * H), 0, 1))), 50, 40, (a, u, y) => (wide ? 0.004 : 0.0015) * Math.sin(a * 5 + y * 30) * u, false)));
    }
    push(tubeGeo(cutKeys(B.ext, 0.64 * H, 0.618 * H, y => wpad(y) + 0.004), 4, 64, (a, u, y) => B.torsoFn(a, u, y) * 0.9, false), dark);
  }
  return out;
}

// ---------- 3D body component ----------
function Body3DLegacy({ profile, garments = [], markers = false, cls = '', autoSpin = false, controls = true, initial = 'front' }) {
  const mount = useRef(), st = useRef({ dirty: true }), mkRefs = useRef({});
  const { unit } = useContext(U);
  const [spin, setSpin] = useState(autoSpin), [vw, setVw] = useState(initial);
  st.current.target = profile; st.current.garments = garments;
  const gKey = JSON.stringify(garments.map(x => [x.g.id, x.size, x.g.color, x.g.sizes && x.g.sizes[x.size]]));
  useEffect(() => { st.current.dirty = true; }, [gKey]);
  useEffect(() => {
    const el = mount.current, S = st.current;
    let W = el.clientWidth, Hh = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(W, Hh);
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, W / Hh, 0.05, 50);
    const hm = profile.height / 100, target = new THREE.Vector3(0, hm * 0.52, 0);
    cam.position.set(0, hm * 0.56, 4.3);
    const ctl = new THREE.OrbitControls(cam, renderer.domElement);
    ctl.target.copy(target); ctl.enablePan = false; ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.minDistance = 1.3; ctl.maxDistance = 7;
    ctl.minPolarAngle = 1.0; ctl.maxPolarAngle = 1.85; ctl.enableZoom = controls; ctl.autoRotate = autoSpin; ctl.autoRotateSpeed = 1.1; ctl.update();
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a7564, 0.7));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.15); key.position.set(2, 3, 3); scene.add(key);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -1, right: 1, top: 2.2, bottom: -0.2, near: 0.5, far: 8 }); key.shadow.camera.updateProjectionMatrix();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.62, 64), new THREE.ShadowMaterial({ opacity: 0.16 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; floor.receiveShadow = true; scene.add(floor);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.64, 0.04, 72), new THREE.MeshStandardMaterial({ color: 0xF1E8DC, roughness: 0.9 })); ped.position.y = -0.02; ped.receiveShadow = true; scene.add(ped);
    const fill = new THREE.DirectionalLight(0xeadccc, 0.4); fill.position.set(-3, 1.5, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(0, 2.5, -3); scene.add(rim);
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d');
    const gr = sx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(60,40,30,.35)'); gr.addColorStop(1, 'rgba(60,40,30,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);
    const rig = new THREE.Group(); scene.add(rig);
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xD8AF92, roughness: 0.62, metalness: 0, clearcoat: 0.05, clearcoatRoughness: 0.7, sheen: new THREE.Color(0x5a3a2c) });
    const res = markers ? 0.0072 : 0.0105;
    const cur = Object.assign({}, profile); let built = null;
    const rebuild = () => {
      rig.children.slice().forEach(m => { rig.remove(m); m.geometry && m.geometry.dispose(); });
      Object.keys(S.target).forEach(q => { if (typeof S.target[q] === 'number') cur[q] = S.target[q]; });
      const B = bodyModel(cur); S.B = B; const Hm = B.H;
      const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m || skin); mesh.castShadow = true; rig.add(mesh); return mesh; };
      bodyMeshes(B, res).forEach(g => add(g));
      (S.garments || []).filter(x => x.g.category === 'bottom').concat((S.garments || []).filter(x => x.g.category !== 'bottom')).forEach(x => garmentMeshes(B, cur, x.g, x.size).forEach(m => rig.add(m)));
      built = Object.assign({}, cur); S.dirty = false; S.lb = performance.now();
    };
    S.api = {
      view: v => { S.goal = { front: 0, side: Math.PI / 2, back: Math.PI }[v]; ctl.autoRotate = false; },
      reset: () => { S.goal = 0; ctl.autoRotate = false; const d = cam.position.clone().sub(ctl.target).setLength(4.3); cam.position.copy(ctl.target).add(d); },
      zoom: f => { const d = cam.position.clone().sub(ctl.target).multiplyScalar(f); if (d.length() > 1.3 && d.length() < 7) cam.position.copy(ctl.target).add(d); },
      spin: on => { ctl.autoRotate = on; }
    };
    const ro = new ResizeObserver(() => { W = el.clientWidth; Hh = el.clientHeight; if (!W || !Hh) return; renderer.setSize(W, Hh); cam.aspect = W / Hh; cam.updateProjectionMatrix(); });
    ro.observe(el);
    const v3 = new THREE.Vector3(); let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const T = S.target; let moved = false;
      if (!built) moved = true; else Object.keys(T).forEach(q => { if (typeof T[q] === 'number' && Math.abs(T[q] - (built[q] == null ? -999 : built[q])) > 0.04) moved = true; });
      if ((moved || S.dirty) && performance.now() - (S.lb || 0) > 200) { rebuild(); ctl.target.y = cur.height / 100 * 0.52; }
      if (S.goal != null) {
        const off = cam.position.clone().sub(ctl.target), sph = new THREE.Spherical().setFromVector3(off);
        let d = S.goal - sph.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); sph.theta += d * 0.12; sph.phi += (Math.PI / 2 - 0.04 - sph.phi) * 0.12;
        cam.position.setFromSpherical(sph).add(ctl.target); if (Math.abs(d) < 0.002) S.goal = null;
      }
      ctl.update(); renderer.render(scene, cam);
      const B = S.B; if (B && S.markers) {
        const pts = { bust: [-(B.bx + B.bump * 0.6), 0.725 * B.H, 0.02], waist: [B.wx, 0.625 * B.H, 0], hip: [-B.hx, 0.525 * B.H, 0], upperArm: [B.arm(1)[1][1] + B.r, 0.75 * B.H, 0] };
        Object.keys(pts).forEach(k => { const elm = mkRefs.current[k]; if (!elm) return; v3.set(...pts[k]).project(cam); const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * Hh; elm.style.transform = `translate(${x}px,${y}px) translate(${elm.dataset.side === 'l' ? '-100%' : '0'},-50%)`; });
      }
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, []);
  st.current.markers = markers;
  const api = st.current.api || {};
  const mk = (k, label, side) => h('div', { key: k, className: 'mk', ref: r => mkRefs.current[k] = r, 'data-side': side, style: { flexDirection: side === 'l' ? 'row-reverse' : 'row' } },
    h('span', { className: 'dot' }), h('span', { className: 'ln' }), h('span', { className: 'tx' }, label, h('b', null, fmt(profile[k], unit))));
  return h('div', { className: 'stage ' + cls },
    h('div', { ref: mount, className: 'absolute inset-0' }),
    markers ? h('div', { className: 'absolute inset-0 pointer-events-none' }, mk('bust', 'BUST', 'l'), mk('waist', 'WAIST', 'r'), mk('hip', 'HIP', 'l'), mk('upperArm', 'UPPER ARM', 'r')) : null,
    controls ? h('div', { className: 'absolute top-4 left-1/2 -translate-x-1/2 seg' }, ['front', 'side', 'back'].map(v => h('button', { key: v, className: vw === v ? 'on' : '', onClick: () => { setVw(v); setSpin(false); api.view && api.view(v); } }, v.toUpperCase()))) : null,
    controls ? h('div', { className: 'absolute left-4 bottom-4 flex flex-col gap-2' },
      h('button', { className: 'ctl', title: 'Zoom in', onClick: () => api.zoom && api.zoom(0.85) }, '+'),
      h('button', { className: 'ctl', title: 'Zoom out', onClick: () => api.zoom && api.zoom(1.18) }, '−'),
      h('button', { className: 'ctl', title: 'Reset view', onClick: () => { setVw('front'); setSpin(false); api.reset && api.reset(); } }, '⟲'),
      h('button', { className: 'ctl ' + (spin ? 'on' : ''), title: 'Rotate', onClick: () => { setSpin(!spin); api.spin && api.spin(!spin); } }, '↻')) : null,
    controls ? h('div', { className: 'absolute right-4 bottom-4 label', style: { fontSize: 9 } }, 'DRAG TO ROTATE') : null);
}

// ---------- Mannequin v2: primitive lofts built once, deformed per zone ----------
const MQ_BASE = { height: 165, bust: 92, waist: 72, hip: 100, shoulder: 39, upperArm: 28, torso: 44 };
const MQH = 1.65, TAU = Math.PI * 2, HP = Math.PI / 2;
const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function pw(keys, t) {
  if (t >= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t >= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * sstep((a[0] - t) / (a[0] - b[0])); }
  return keys[keys.length - 1][1];
}
function kAt(keys, t) {
  const n = keys.length;
  if (t >= keys[0][0]) return keys[0].slice(); if (t <= keys[n - 1][0]) return keys[n - 1].slice();
  let i = 0; while (i < n - 2 && t < keys[i + 1][0]) i++;
  const f = (keys[i][0] - t) / (keys[i][0] - keys[i + 1][0]), out = [t];
  for (let j = 1; j < keys[0].length; j++) out.push(catm(keys.map(k => k[j]), i + f));
  return out;
}
// [t (fraction of height), cx, cz, rx, rz]
const MQ_TORSO = [[0.905, 0, -0.012, 0.046, 0.048], [0.875, 0, -0.012, 0.05, 0.052], [0.848, 0, -0.008, 0.06, 0.058], [0.828, 0, -0.004, 0.12, 0.07], [0.805, 0, 0, 0.158, 0.088], [0.765, 0, 0.004, 0.16, 0.1], [0.72, 0, 0.008, 0.152, 0.108], [0.67, 0, 0.006, 0.138, 0.1], [0.62, 0, 0.004, 0.128, 0.092], [0.57, 0, 0, 0.146, 0.1], [0.52, 0, -0.004, 0.168, 0.108], [0.485, 0, -0.002, 0.164, 0.104], [0.46, 0, 0, 0.13, 0.09], [0.445, 0, 0, 0.06, 0.05]];
const MQ_EXT = MQ_TORSO.slice(0, 11).concat([[0.485, 0, -0.002, 0.17, 0.11], [0.44, 0, 0, 0.178, 0.114], [0.3, 0, 0, 0.18, 0.116], [0, 0, 0, 0.182, 0.118]]);
const MQ_ARM = [[0.838, 0.15, -0.004, 0.012, 0.012], [0.83, 0.163, -0.004, 0.036, 0.04], [0.812, 0.178, -0.004, 0.05, 0.052], [0.78, 0.19, -0.006, 0.048, 0.05], [0.74, 0.198, -0.008, 0.045, 0.046], [0.68, 0.206, -0.01, 0.04, 0.041], [0.625, 0.212, -0.01, 0.033, 0.034], [0.58, 0.218, -0.002, 0.034, 0.033], [0.53, 0.224, 0.008, 0.027, 0.025], [0.495, 0.228, 0.012, 0.021, 0.018]];
const MQ_LEG = [[0.5, 0.082, -0.006, 0.084, 0.088], [0.44, 0.084, -0.004, 0.08, 0.082], [0.37, 0.082, 0, 0.066, 0.068], [0.29, 0.076, 0.002, 0.05, 0.052], [0.23, 0.074, -0.008, 0.05, 0.054], [0.15, 0.072, -0.004, 0.038, 0.04], [0.07, 0.072, -0.006, 0.028, 0.03], [0.035, 0.072, -0.008, 0.026, 0.028], [0.02, 0.072, -0.008, 0.012, 0.012]];
const mqG = x => Math.exp(-x * x);
const nA = a => ((a % TAU) + TAU) % TAU;
const bodyBust = (t, a) => { a = nA(a); return 0.016 * mqG((t - 0.715) / 0.035) * (Math.exp(-Math.pow(a - HP - 0.5, 2) / 0.18) + Math.exp(-Math.pow(a - HP + 0.5, 2) / 0.18)); };
const shellBust = (t, a) => { a = nA(a); return 0.016 * mqG((t - 0.715) / 0.045) * 1.32 * Math.exp(-Math.pow(a - HP, 2) / 0.9); };
const seatB = (t, a) => 0.014 * mqG((t - 0.51) / 0.05) * Math.pow(Math.max(0, -Math.sin(a)), 1.5);
let _mqT = null;
function mqBaseTabs() {
  if (_mqT) return _mqT;
  const T = new Float32Array(201), A = new Float32Array(201);
  for (let i = 0; i <= 200; i++) { T[i] = kAt(MQ_TORSO, i / 200)[3]; A[i] = kAt(MQ_ARM, i / 200)[3]; }
  return (_mqT = { T, A });
}
function mqRatios(p) {
  const hr = clamp((p.height || 165) / 165, 0.8, 1.25), w = Math.sqrt(hr);
  const r = k => clamp((+p[k] || MQ_BASE[k]) / (MQ_BASE[k] * w), 0.8, 1.3);
  const bu = r('bust'), hi = r('hip'), wa = Math.min(r('waist'), Math.max(bu, hi) + 0.04);
  return { hr, w, bu, wa, hi, sh: r('shoulder'), ar: r('upperArm'), tr: clamp((+p.torso || 44) / 44, 0.92, 1.08) };
}
function mqTables(q) {
  const B = mqBaseTabs();
  const T = [[0.9, 1 + (q.bu - 1) * 0.2], [0.85, 1 + (q.sh - 1) * 0.5 + (q.bu - 1) * 0.15], [0.805, q.sh], [0.765, (q.sh + q.bu) / 2], [0.72, q.bu], [0.67, (q.bu + q.wa) / 2], [0.62, q.wa], [0.57, (q.wa + q.hi) / 2], [0.52, q.hi], [0, q.hi]];
  const A = [[0.84, 1 + (q.ar - 1) * 0.45], [0.78, q.ar], [0.68, q.ar], [0.6, 1 + (q.ar - 1) * 0.6], [0.5, 1 + (q.ar - 1) * 0.3]];
  const LS = [[0.5, 1 + (q.hi - 1) * 0.85], [0.37, 1 + (q.hi - 1) * 0.7], [0.29, 1 + (q.hi - 1) * 0.4], [0.22, 1 + (q.hi - 1) * 0.45], [0.1, 1 + (q.hi - 1) * 0.2]];
  const LC = [[0.5, 1 + (q.hi - 1) * 0.95], [0.3, 1 + (q.hi - 1) * 0.5], [0.05, 1 + (q.hi - 1) * 0.25]];
  const tb = [0, 1, 2, 3, 4].map(() => new Float32Array(201));
  for (let i = 0; i <= 200; i++) { const t = i / 200, ts = pw(T, t), as = pw(A, t); tb[0][i] = ts; tb[1][i] = as; tb[2][i] = (ts - 1) * B.T[i] * 0.95 + (as - 1) * B.A[i]; tb[3][i] = pw(LS, t); tb[4][i] = pw(LC, t); }
  const yh = 0.52 * MQH;
  return {
    q, bb: 1 + (q.bu - 1) * 1.6, sb: 1 + (q.hi - 1) * 1.2,
    f: (k, t) => { const x = clamp(t, 0, 1) * 200, i = Math.min(199, x | 0), fr = x - i; return tb[k][i] + (tb[k][i + 1] - tb[k][i]) * fr; },
    Y: t => { const y = t * MQH; return y > yh ? yh + (y - yh) * q.tr : y; }
  };
}
function mqPlace(part, t, cx, cz, rx, rz, a, bu, se, off, R, o, j) {
  let s, X;
  if (part === 0) { s = R.f(0, t); X = cx; }
  else if (part === 1) { s = R.f(1, t); X = cx + (cx < 0 ? -1 : 1) * R.f(2, t); }
  else { s = R.f(3, t); X = cx * R.f(4, t); }
  const ca = Math.cos(a), sa = Math.sin(a), RX = rx * s, RZ = rz * s;
  let nx = ca * RZ, nz = sa * RX; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
  const p = off + bu * R.bb + se * R.sb;
  o[j] = X + ca * RX + nx * p; o[j + 1] = R.Y(t); o[j + 2] = cz + sa * RZ + nz * p;
}
function mqLoft(keys, side, part, t0, t1, rows, seg, o) {
  o = o || {}; const open = o.a0 != null, M = [], uv = [], idx = [];
  const val = (v, t) => typeof v === 'function' ? v(t) : v;
  for (let i = 0; i <= rows; i++) {
    const t = t0 + (t1 - t0) * i / rows, k = kAt(keys, t);
    const a0 = open ? val(o.a0, t) : 0, a1 = open ? val(o.a1, t) : 0;
    for (let s = 0; s < seg; s++) {
      const a = open ? a0 + (a1 - a0) * s / (seg - 1) : s / seg * TAU;
      const bu = part === 0 ? (o.shell ? shellBust(t, a) : bodyBust(t, a)) : 0, se = part === 0 ? seatB(t, a) : 0;
      M.push(t, k[1] * side, k[2], k[3], k[4], a, bu, se, o.off ? o.off(t, a) : 0); uv.push(s / seg * 4, i / rows * 6);
    }
  }
  const sc = open ? seg - 1 : seg;
  for (let i = 0; i < rows; i++) for (let s = 0; s < sc; s++) { const a = i * seg + s, b = i * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c); }
  const cap = (t, top) => { const k = kAt(keys, t), ci = M.length / 9, r0 = top ? 0 : rows * seg; M.push(t, k[1] * side, k[2], 0, 0, 0, 0, 0, 0); uv.push(0, 0); for (let s = 0; s < seg; s++) { const v1 = r0 + s, v2 = r0 + (s + 1) % seg; if (top) idx.push(ci, v2, v1); else idx.push(ci, v1, v2); } };
  if (!open && o.capTop) cap(t0, true);
  if (!open && o.capBot) cap(t1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(M.length / 3), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData = { m: new Float32Array(M), part }; return g;
}
function mqDeform(geo, R) {
  const M = geo.userData.m, part = geo.userData.part, P = geo.attributes.position.array, n = M.length / 9;
  for (let i = 0; i < n; i++) { const o = i * 9; mqPlace(part, M[o], M[o + 1], M[o + 2], M[o + 3], M[o + 4], M[o + 5], M[o + 6], M[o + 7], M[o + 8], R, P, i * 3); }
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
}
const _mqv = [0, 0, 0];
function mqRigid(r, R) {
  const m = r.m; mqPlace(r.part, m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], R, _mqv, 0);
  r.obj.position.set(_mqv[0], _mqv[1], _mqv[2]);
  if (r.sk === 'hand') r.obj.scale.setScalar(1 + (R.q.ar - 1) * 0.25);
  if (r.sk === 'foot') r.obj.scale.setScalar(1 + (R.q.hi - 1) * 0.15);
}
function mqBody(skin) {
  const lofts = [], objs = [], rigid = [], geos = [];
  const add = geo => { lofts.push(geo); geos.push(geo); const m = new THREE.Mesh(geo, skin); m.castShadow = true; objs.push(m); };
  add(mqLoft(MQ_TORSO, 1, 0, 0.905, 0.445, 80, 56, { capTop: true, capBot: true }));
  [-1, 1].forEach(s => { add(mqLoft(MQ_ARM, s, 1, 0.838, 0.495, 48, 28, { capTop: true, capBot: true })); add(mqLoft(MQ_LEG, s, 2, 0.5, 0.02, 64, 32, { capTop: true, capBot: true })); });
  const el = (sx, sy, sz, x, y, z, seg) => { seg = seg || 32; const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)); g.scale(sx, sy, sz); g.translate(x, y, z); geos.push(g); const m = new THREE.Mesh(g, skin); m.castShadow = true; return m; };
  const grp = (items, part, m, sk) => { const G = new THREE.Group(); items.forEach(i => G.add(i)); objs.push(G); rigid.push({ obj: G, part, m, sk }); };
  grp([el(0.074, 0.1, 0.088, 0, 0, 0, 40), el(0.056, 0.058, 0.066, 0, -0.05, 0.014)], 0, [0.937, 0, 0, 0, 0, 0, 0, 0, 0]);
  [-1, 1].forEach(s => {
    grp([el(0.021, 0.06, 0.038, 0, -0.058, 0.002), el(0.011, 0.028, 0.013, -s * 0.006, -0.04, 0.03, 16)], 1, [0.495, s * 0.228, 0.012, 0, 0, 0, 0, 0, 0], 'hand');
    grp([el(0.036, 0.026, 0.1, 0, -0.009, 0.04)], 2, [0.02, s * 0.072, -0.008, 0, 0, 0, 0, 0, 0], 'foot');
  });
  return { lofts, objs, rigid, geos };
}
function mqGarment(p, g, size, fl) {
  const e = garmentEase(p, g, size), cat = g.category, outer = cat === 'outer';
  const txt = ((g.attributes || []).join(' ') + ' ' + g.name + ' ' + (g.shape || '')).toLowerCase();
  const ph = p.height || 165;
  const base = new THREE.Color(g.color || '#cccccc').convertSRGBToLinear();
  const mats = [], geos = [], objs = [], rigid = [], lofts = [];
  const mk = (c, rough) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough || 0.8, metalness: 0, side: THREE.DoubleSide, bumpMap: fabricTex(), bumpScale: 0.0012 }); mats.push(m); return m; };
  const mat = mk(base, /knit/.test(txt) ? 0.95 : 0.8), trim = mk(base.clone().multiplyScalar(0.78), 0.85), plk = mk(base.clone().multiplyScalar(0.92), 0.8);
  const lum = base.r * 0.3 + base.g * 0.59 + base.b * 0.11;
  const btnMat = new THREE.MeshStandardMaterial({ color: lum < 0.2 ? 0x8a8178 : base.clone().multiplyScalar(0.55), roughness: 0.4 }); mats.push(btnMat);
  const add = (geo, m) => { geos.push(geo); lofts.push(geo); const me = new THREE.Mesh(geo, m); me.castShadow = true; objs.push(me); return geo; };
  const btn = (t, off) => { const k = kAt(MQ_EXT, t); const sg = new THREE.SphereGeometry(0.0055, 10, 8); sg.scale(1, 1, 0.5); geos.push(sg); const me = new THREE.Mesh(sg, btnMat); objs.push(me); rigid.push({ obj: me, part: 0, m: [t, 0, k[2], k[3], k[4], HP, shellBust(t, HP), 0, off] }); };
  const ec = v => clamp(v || 0, 0, 8) / 100 / TAU;
  const L = outer ? 0.012 : cat === 'bottom' ? 0.004 : 0.006;
  const prevT = fl.t, prevA = fl.a;
  const withT = f => prevT ? (t, a) => Math.max(f(t, a), prevT(t) + 0.005) : f;
  const withA = f => prevA ? (t, a) => Math.max(f(t, a), prevA(t) + 0.004) : f;
  let newT = null, newA = null;
  if (cat !== 'bottom') {
    const eb = ec(e.bust), ew = outer ? eb : ec(e.waist), eh = outer ? eb : ec(cat === 'dress' ? e.hip : e.waist);
    const zone = t => L + pw([[0.85, eb * 0.25 + 0.002], [0.77, eb * 0.8], [0.72, eb], [0.62, ew], [0.52, eh], [0, eh]], t);
    const knit = /knit|crew/.test(txt) && !outer, shirt = !outer && /shirt|blouse|button|collar/.test(txt);
    const neckT = outer ? 0.842 : knit ? 0.858 : cat === 'dress' ? 0.838 : 0.852;
    const hemT = clamp(0.835 - e.length / ph, 0.03, 0.66);
    const fk = cat === 'dress' ? (/pencil|sheath|straight/.test(txt) ? 0.02 : /a-line|midi|flare/.test(txt) ? 0.2 : 0.08) : outer ? 0.05 : /relax|oversiz/.test(txt) ? 0.04 : 0.015;
    const fs = cat === 'dress' ? 0.6 : 0.53;
    const tOff = withT(zone), off = (t, a) => tOff(t, a) + fk * Math.max(0, fs - t);
    add(mqLoft(MQ_EXT, 1, 0, neckT, hemT, Math.max(20, Math.round((neckT - hemT) * 150)), 64, { shell: true, off }), mat);
    newT = t => (t <= neckT + 0.02 && t >= hemT) ? off(t, HP) + (outer ? 0.006 : 0.004) : -1;
    // sleeves
    if (e.sleeve > 3) {
      const endT = clamp(0.822 - e.sleeve / ph, 0.5, 0.8);
      const ea = ec(e.arm), rel = /relax|oversiz/.test(txt);
      const aOff = withA(t => L * 0.8 + 0.002 + ea * 0.8 + (rel ? 0.005 * sstep((0.72 - t) / 0.2) : 0));
      const cuff = endT < 0.56;
      [-1, 1].forEach(s => {
        add(mqLoft(MQ_ARM, s, 1, 0.838, endT, 40, 28, { off: aOff }), mat);
        if (cuff && (shirt || outer || knit)) add(mqLoft(MQ_ARM, s, 1, endT + (knit ? 0.025 : 0.035), endT, 4, 28, { off: (t, a) => aOff(t, a) + 0.003 }), knit ? trim : plk);
        else add(mqLoft(MQ_ARM, s, 1, endT + 0.012, endT, 2, 28, { off: (t, a) => aOff(t, a) + 0.002 }), trim);
      });
      newA = t => (t <= 0.84 && t >= endT) ? aOff(t, 0) + 0.004 : -1;
    }
    if (shirt) {
      const g0 = HP + 0.18, g1 = HP + TAU - 0.18;
      add(mqLoft(MQ_TORSO, 1, 0, 0.874, 0.848, 5, 48, { a0: g0, a1: g1, off: t => tOff(0.852, HP) + 0.004 + (0.874 - t) * 0.08 }), plk);
      add(mqLoft(MQ_TORSO, 1, 0, 0.868, 0.834, 6, 48, { a0: g0 - 0.06, a1: g1 + 0.06, off: t => tOff(0.85, HP) + 0.01 + (0.868 - t) * 0.35 }), plk);
    }
    if (/button/.test(txt) && !outer) {
      add(mqLoft(MQ_EXT, 1, 0, neckT - 0.004, hemT + 0.004, Math.round((neckT - hemT) * 150), 3, { shell: true, a0: HP - 0.045, a1: HP + 0.045, off: (t, a) => off(t, a) + 0.0022 }), plk);
      for (let t = neckT - 0.02; t > hemT + 0.02; t -= 0.05) btn(t, off(t, HP) + 0.0045);
    }
    if (outer) {
      add(mqLoft(MQ_TORSO, 1, 0, 0.872, 0.836, 6, 40, { a0: HP + 0.5, a1: HP + TAU - 0.5, off: t => tOff(0.845, HP) + 0.01 + (0.872 - t) * 0.3 }), trim);
      const wl = t => 0.04 + 0.5 * sstep((t - 0.66) / 0.175);
      add(mqLoft(MQ_EXT, 1, 0, 0.842, 0.66, 22, 8, { shell: true, a0: t => HP - 0.02 - wl(t), a1: HP - 0.02, off: (t, a) => off(t, a) + 0.004 }), trim);
      add(mqLoft(MQ_EXT, 1, 0, 0.842, 0.66, 22, 8, { shell: true, a0: HP + 0.02, a1: t => HP + 0.02 + wl(t), off: (t, a) => off(t, a) + 0.004 }), trim);
      add(mqLoft(MQ_EXT, 1, 0, 0.66, hemT + 0.002, Math.max(6, Math.round((0.66 - hemT) * 120)), 3, { shell: true, a0: HP - 0.008, a1: HP + 0.008, off: (t, a) => off(t, a) + 0.0015 }), trim);
      [0.625, 0.57].forEach(t => { if (t > hemT + 0.02) btn(t, off(t, HP) + 0.005); });
      if (hemT < 0.56) [-1, 1].forEach(s => add(mqLoft(MQ_EXT, 1, 0, 0.565, 0.55, 2, 6, { shell: true, a0: HP + s * 0.55, a1: HP + s * 0.95, off: (t, a) => off(t, a) + 0.003 }), trim));
    }
    if (knit || cat === 'dress') {
      add(mqLoft(MQ_TORSO, 1, 0, neckT + 0.014, neckT - 0.004, 4, 48, { shell: true, off: t => tOff(neckT, HP) + 0.002 }), trim);
      if (knit) add(mqLoft(MQ_EXT, 1, 0, hemT + 0.022, hemT, 4, 64, { shell: true, off: (t, a) => off(t, a) + 0.002 }), trim);
    }
    if (cat === 'dress') add(mqLoft(MQ_EXT, 1, 0, 0.626, 0.616, 2, 64, { shell: true, off: (t, a) => off(t, a) + 0.0015 }), trim);
  } else {
    const wOff = withT(t => L + pw([[0.64, ec(e.waist)], [0.52, ec(e.hip)], [0, ec(e.hip)]], t));
    add(mqLoft(MQ_TORSO, 1, 0, 0.648, 0.622, 4, 64, { shell: true, off: (t, a) => wOff(t, a) + 0.003 }), trim);
    if (g.shape === 'skirt' || /skirt/.test(txt)) {
      const hemT = clamp(0.64 - e.length / ph, 0.03, 0.5), fk = /a-line|flare/.test(txt) ? 0.16 : /pencil|straight/.test(txt) ? 0 : 0.08;
      const off = (t, a) => wOff(t, a) + fk * Math.max(0, 0.55 - t);
      add(mqLoft(MQ_EXT, 1, 0, 0.645, hemT, Math.round((0.645 - hemT) * 150), 64, { shell: true, off }), mat);
      newT = t => (t <= 0.65 && t >= hemT) ? off(t, HP) + 0.006 : -1;
    } else {
      add(mqLoft(MQ_TORSO, 1, 0, 0.645, 0.452, 30, 64, { shell: true, off: wOff, capBot: true }), mat);
      const hemT = clamp(0.455 - e.length / ph, 0.015, 0.4), wide = g.shape === 'wide' || /wide|palazzo|culotte/.test(txt);
      const eh = ec(e.hip) * 0.55;
      [-1, 1].forEach(s => {
        const lo = (t, a) => L + eh + 0.003 + (wide ? 0.045 * sstep((0.43 - t) / 0.32) * (0.6 + 0.4 * Math.cos(a) * s) : 0.006 * sstep((0.3 - t) / 0.25));
        add(mqLoft(MQ_LEG, s, 2, 0.5, hemT, 56, 32, { off: lo }), mat);
        add(mqLoft(MQ_LEG, s, 2, 0.45, hemT + 0.004, 30, 3, { a0: HP - 0.012, a1: HP + 0.012, off: (t, a) => lo(t, a) + 0.0012 }), trim);
      });
      add(mqLoft(MQ_TORSO, 1, 0, 0.62, 0.5, 10, 3, { shell: true, a0: HP - 0.012, a1: HP + 0.012, off: (t, a) => wOff(t, a) + 0.0012 }), trim);
      newT = t => (t <= 0.65 && t >= 0.452) ? wOff(t, HP) + 0.006 : -1;
    }
  }
  if (newT) { const pt = prevT; fl.t = pt ? t => Math.max(pt(t), newT(t)) : newT; }
  if (newA) { const pa = prevA; fl.a = pa ? t => Math.max(pa(t), newA(t)) : newA; }
  return { objs, rigid, geos, mats, lofts };
}
function Silhouette2D({ garments }) {
  const top = garments.find(x => x.g.category !== 'bottom'), bot = garments.find(x => x.g.category === 'bottom');
  return h('svg', { viewBox: '0 0 200 420', className: 'absolute inset-0 m-auto h-[92%] w-full' },
    h('ellipse', { cx: 100, cy: 40, rx: 20, ry: 26, fill: '#D9C3AE' }),
    h('path', { d: 'M92 64h16v12h-16z M60 82 Q100 70 140 82 L146 150 Q138 190 150 230 L140 400 h-30 L102 250 h-4 L90 400 h-30 L50 230 Q62 190 54 150 Z M58 84 L40 230 h10 L66 120 Z M142 84 L160 230 h-10 L134 120 Z', fill: '#D9C3AE' }),
    bot ? h('path', { d: 'M52 186 h96 L146 398 h-34 L102 250 h-4 L88 398 h-34 Z', fill: bot.g.color, opacity: 0.95 }) : null,
    top ? h('path', { d: 'M58 80 Q100 70 142 80 L148 150 Q140 190 150 236 H50 Q60 190 52 150 Z', fill: top.g.color, opacity: 0.95 }) : null,
    h('text', { x: 100, y: 416, textAnchor: 'middle', fontSize: 8, fill: '#7D6E62', letterSpacing: 2 }, '2D PREVIEW'));
}
function Body3D({ profile, garments = [], markers = false, cls = '', autoSpin = false, controls = true, initial = 'front' }) {
  const mount = useRef(), st = useRef({ dirty: true }), mkRefs = useRef({});
  const { unit } = useContext(U);
  const [spin, setSpin] = useState(autoSpin), [vw, setVw] = useState(initial), [fail, setFail] = useState(false);
  st.current.target = profile; st.current.garments = garments;
  const gKey = JSON.stringify(garments.map(x => [x.g.id, x.size, x.g.color, x.g.sizes && x.g.sizes[x.size]]));
  const pKey = JSON.stringify(profile);
  useEffect(() => { st.current.dirty = true; }, [gKey, pKey]);
  useEffect(() => {
    const el = mount.current, S = st.current;
    let W = el.clientWidth || 300, Hh = el.clientHeight || 400, renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); if (!renderer.getContext()) throw new Error('no gl'); }
    catch (err) { setFail(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, Hh);
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, W / Hh, 0.05, 50);
    const hm = profile.height / 100;
    cam.position.set(0, hm * 0.56, 4.3);
    const ctl = new THREE.OrbitControls(cam, renderer.domElement);
    ctl.target.set(0, hm * 0.52, 0); ctl.enablePan = false; ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.minDistance = 1.3; ctl.maxDistance = 7;
    ctl.minPolarAngle = 1.0; ctl.maxPolarAngle = 1.85; ctl.enableZoom = controls; ctl.autoRotate = autoSpin; ctl.autoRotateSpeed = 1.1; ctl.update();
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a7564, 0.7));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.15); key.position.set(2, 3, 3); scene.add(key);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -1, right: 1, top: 2.2, bottom: -0.2, near: 0.5, far: 8 }); key.shadow.camera.updateProjectionMatrix();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.62, 64), new THREE.ShadowMaterial({ opacity: 0.16 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; floor.receiveShadow = true; scene.add(floor);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.64, 0.04, 72), new THREE.MeshStandardMaterial({ color: 0xF1E8DC, roughness: 0.9 })); ped.position.y = -0.02; ped.receiveShadow = true; scene.add(ped);
    const fill = new THREE.DirectionalLight(0xeadccc, 0.4); fill.position.set(-3, 1.5, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(0, 2.5, -3); scene.add(rim);
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d');
    const gr = sx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(60,40,30,.35)'); gr.addColorStop(1, 'rgba(60,40,30,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
    const shTex = new THREE.CanvasTexture(sc);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);
    const rig = new THREE.Group(); scene.add(rig);
    const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color('#D9C3AE').convertSRGBToLinear(), roughness: 0.74, metalness: 0 });
    const body = mqBody(skin); body.objs.forEach(o => rig.add(o));
    let q = mqRatios(profile), R = mqTables(q), gar = null;
    const deformAll = () => {
      body.lofts.forEach(g => mqDeform(g, R)); body.rigid.forEach(r => mqRigid(r, R));
      if (gar) { gar.lofts.forEach(g => mqDeform(g, R)); gar.rigid.forEach(r => mqRigid(r, R)); }
      rig.scale.set(q.w, q.hr, q.w);
    };
    const clearG = () => { if (!gar) return; gar.objs.forEach(o => rig.remove(o)); gar.geos.forEach(g => g.dispose()); gar.mats.forEach(m => m.dispose()); gar = null; };
    const buildG = () => {
      clearG();
      const L = S.garments || [], ord = { bottom: 0, top: 1, dress: 1, outer: 2 };
      const list = L.slice().sort((a, b) => (ord[a.g.category] || 0) - (ord[b.g.category] || 0));
      const fl = { t: null, a: null }, all = { objs: [], rigid: [], geos: [], mats: [], lofts: [] };
      list.forEach(x => { const r = mqGarment(S.target, x.g, x.size, fl); Object.keys(all).forEach(k => all[k].push(...r[k])); });
      all.objs.forEach(o => rig.add(o)); gar = all;
      gar.lofts.forEach(g => mqDeform(g, R)); gar.rigid.forEach(r => mqRigid(r, R));
      S.dirty = false; S.lb = performance.now();
    };
    deformAll(); buildG();
    S.api = {
      view: v => { S.goal = { front: 0, side: Math.PI / 2, back: Math.PI }[v]; ctl.autoRotate = false; },
      reset: () => { S.goal = 0; ctl.autoRotate = false; const d = cam.position.clone().sub(ctl.target).setLength(4.3); cam.position.copy(ctl.target).add(d); },
      zoom: f => { const d = cam.position.clone().sub(ctl.target).multiplyScalar(f); if (d.length() > 1.3 && d.length() < 7) cam.position.copy(ctl.target).add(d); },
      spin: on => { ctl.autoRotate = on; }
    };
    if (initial !== 'front') S.api.view(initial);
    const ro = new ResizeObserver(() => { W = el.clientWidth; Hh = el.clientHeight; if (!W || !Hh) return; renderer.setSize(W, Hh); cam.aspect = W / Hh; cam.updateProjectionMatrix(); });
    ro.observe(el);
    const v3 = new THREE.Vector3(), tmp = [0, 0, 0]; let raf;
    const mpt = (part, side, keys, t, a, bu) => { const k = kAt(keys, t); mqPlace(part, t, k[1] * side, k[2], k[3], k[4], a, bu, part === 0 ? seatB(t, a) : 0, 0, R, tmp, 0); return tmp; };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const tq = mqRatios(S.target || profile); let moved = false;
      Object.keys(tq).forEach(k => { const d = tq[k] - q[k]; if (Math.abs(d) > 1e-4) { q[k] += d * 0.18; moved = true; } else q[k] = tq[k]; });
      if (moved) { R = mqTables(q); deformAll(); }
      if (S.dirty && performance.now() - (S.lb || 0) > 150) buildG();
      ctl.target.y += ((S.target ? S.target.height : 165) / 100 * 0.52 - ctl.target.y) * 0.15;
      if (S.goal != null) {
        const off = cam.position.clone().sub(ctl.target), sph = new THREE.Spherical().setFromVector3(off);
        let d = S.goal - sph.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); sph.theta += d * 0.12; sph.phi += (Math.PI / 2 - 0.04 - sph.phi) * 0.12;
        cam.position.setFromSpherical(sph).add(ctl.target); if (Math.abs(d) < 0.002) S.goal = null;
      }
      ctl.update(); renderer.render(scene, cam);
      if (S.markers) {
        const pts = { bust: () => mpt(0, 1, MQ_TORSO, 0.715, Math.PI, 0), waist: () => mpt(0, 1, MQ_TORSO, 0.62, 0, 0), hip: () => mpt(0, 1, MQ_TORSO, 0.52, Math.PI, 0), upperArm: () => mpt(1, 1, MQ_ARM, 0.75, 0, 0) };
        Object.keys(pts).forEach(k => { const elm = mkRefs.current[k]; if (!elm) return; const p = pts[k](); v3.set(p[0], p[1], p[2]); rig.localToWorld(v3); v3.project(cam); const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * Hh; elm.style.transform = `translate(${x}px,${y}px) translate(${elm.dataset.side === 'l' ? '-100%' : '0'},-50%)`; });
      }
    };
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); clearG();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
      shTex.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  st.current.markers = markers;
  const api = st.current.api || {};
  const mk = (k, label, side) => h('div', { key: k, className: 'mk', ref: r => mkRefs.current[k] = r, 'data-side': side, style: { flexDirection: side === 'l' ? 'row-reverse' : 'row' } },
    h('span', { className: 'dot' }), h('span', { className: 'ln' }), h('span', { className: 'tx' }, label, h('b', null, fmt(profile[k], unit))));
  if (fail) return h('div', { className: 'stage ' + cls }, h(Silhouette2D, { garments }));
  return h('div', { className: 'stage ' + cls },
    h('div', { ref: mount, className: 'absolute inset-0' }),
    markers ? h('div', { className: 'absolute inset-0 pointer-events-none' }, mk('bust', 'BUST', 'l'), mk('waist', 'WAIST', 'r'), mk('hip', 'HIP', 'l'), mk('upperArm', 'UPPER ARM', 'r')) : null,
    controls ? h('div', { className: 'absolute top-4 left-1/2 -translate-x-1/2 seg' }, ['front', 'side', 'back'].map(v => h('button', { key: v, className: vw === v ? 'on' : '', onClick: () => { setVw(v); setSpin(false); api.view && api.view(v); } }, v.toUpperCase()))) : null,
    controls ? h('div', { className: 'absolute left-4 bottom-4 flex flex-col gap-2' },
      h('button', { className: 'ctl', title: 'Zoom in', onClick: () => api.zoom && api.zoom(0.85) }, '+'),
      h('button', { className: 'ctl', title: 'Zoom out', onClick: () => api.zoom && api.zoom(1.18) }, '−'),
      h('button', { className: 'ctl', title: 'Reset view', onClick: () => { setVw('front'); setSpin(false); api.reset && api.reset(); } }, '⟲'),
      h('button', { className: 'ctl ' + (spin ? 'on' : ''), title: 'Rotate', onClick: () => { setSpin(!spin); api.spin && api.spin(!spin); } }, '↻')) : null,
    controls ? h('div', { className: 'absolute right-4 bottom-4 label', style: { fontSize: 9 } }, 'DRAG TO ROTATE') : null);
}

// ---------- UI atoms ----------
function useCount(target, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => { if (target == null) return; let raf, t0 = performance.now(); const f = t => { const k = clamp((t - t0) / dur, 0, 1); setV(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [target]);
  return v;
}
function Ring({ value, size = 130 }) {
  const v = useCount(value), r = size / 2 - 7, C = 2 * Math.PI * r;
  return h('div', { className: 'relative', style: { width: size, height: size } },
    h('svg', { width: size, height: size, style: { transform: 'rotate(-90deg)' } },
      h('circle', { cx: size / 2, cy: size / 2, r, stroke: '#E3D8C8', strokeWidth: 3, fill: 'none' }),
      h('circle', { cx: size / 2, cy: size / 2, r, stroke: '#2B1F18', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * (1 - (value == null ? 0 : v) / 100) })),
    h('div', { className: 'absolute inset-0 flex items-center justify-center serif', style: { fontSize: size * 0.3 } }, value == null ? '—' : v + '%'));
}
function Info({ text }) {
  const [o, setO] = useState(false);
  return h('span', { className: 'relative' }, h('button', { className: 'info', onClick: () => setO(!o), onBlur: () => setO(false), 'aria-label': 'How to measure' }, 'i'), o ? h('span', { className: 'pop' }, text) : null);
}
function UnitToggle() {
  const { unit, setUnit } = useContext(U);
  return h('div', { className: 'seg' }, h('button', { className: unit === 'cm' ? 'on' : '', onClick: () => setUnit('cm') }, 'CM'), h('button', { className: unit === 'in' ? 'on' : '', onClick: () => setUnit('in') }, 'INCH'));
}
function MSlider({ label, value, onChange, min, max, kind = 'len', info, small }) {
  const { unit } = useContext(U);
  const [t, setT] = useState(null);
  const v = value == null ? min : value;
  const disp = toU(v, unit, kind), step = kind === 'len' && unit === 'in' ? 0.5 : 1;
  const pct = clamp((v - min) / (max - min) * 100, 0, 100);
  const commit = () => { if (t != null) { const n = parseFloat(t); if (!isNaN(n)) onChange(clamp(fromU(n, unit, kind), min, max)); setT(null); } };
  return h('div', { className: 'mrow' + (small ? ' small' : '') },
    h('div', { className: 'flex items-center justify-between' },
      h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'mlabel' }, label), info ? h(Info, { text: info }) : null),
      h('div', { className: 'flex items-baseline gap-1' },
        h('input', { type: 'number', inputMode: 'decimal', className: 'mnum', value: t != null ? t : disp, step, onChange: e => setT(e.target.value), onBlur: commit, onKeyDown: e => e.key === 'Enter' && e.target.blur() }),
        h('span', { className: 'unit' }, uLab(unit, kind)))),
    h('input', { type: 'range', className: 'range', min: toU(min, unit, kind), max: toU(max, unit, kind), step, value: disp, style: { '--p': pct + '%' }, onChange: e => onChange(clamp(fromU(+e.target.value, unit, kind), min, max)) }));
}
function GImg({ g, cls = '' }) {
  const [ok, setOk] = useState(0);
  return h('div', { className: 'relative overflow-hidden bg-[#F0E8DC] ' + cls },
    ok === 0 ? h('div', { className: 'absolute inset-0 shim' }) : null,
    ok === -1 ? h('div', { className: 'absolute inset-0 flex items-center justify-center' }, h('div', { className: 'w-1/2 h-2/3 rounded-[40%_40%_12px_12px]', style: { background: g.color, boxShadow: 'inset 0 -20px 40px rgba(0,0,0,.12)' } })) : null,
    h('img', { src: imgFor(g), alt: g.name, loading: 'lazy', className: 'w-full h-full object-cover gin transition-opacity duration-700', style: { opacity: ok === 1 ? 1 : 0 }, onLoad: () => setOk(1), onError: () => setOk(-1) }));
}
const Credit = () => h('div', { className: 'text-[10px] text-[#A69383] tracking-wide' }, 'Garment image: AI-generated product render (Nano Banana) · original MEASUREME asset, no third-party photography');
function PageHead({ eyebrow, title, sub, right }) {
  return h('div', { className: 'flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10' },
    h('div', null, h('div', { className: 'label mb-3' }, eyebrow), h('h1', { className: 'serif text-5xl md:text-6xl leading-[1.02]' }, title), sub ? h('p', { className: 'text-[#7D6E62] mt-4 max-w-xl leading-relaxed' }, sub) : null), right || null);
}

// ---------- Landing ----------
const BODY_A = { height: 165, weight: 80, bust: 100, waist: 85, hip: 105, shoulder: 40, upperArm: 31, inseam: 76 };
const BODY_B = { height: 160, weight: 80, bust: 120, waist: 105, hip: 125, shoulder: 41, upperArm: 40, inseam: 72 };
function Landing({ go, profile, garments }) {
  const { unit } = useContext(U);
  const heroG = [garments.find(g => g.id === 'g1'), garments.find(g => g.id === 'g2')].filter(Boolean).map(g => ({ g, size: g.size }));
  return h('div', { className: 'page' },
    h('section', { className: 'max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-16 grid md:grid-cols-12 gap-10 items-center' },
      h('div', { className: 'md:col-span-6' },
        h('div', { className: 'label mb-6' }, 'Fit technology for real proportions'),
        h('h1', { className: 'serif text-[56px] md:text-[96px] leading-[.95]' }, 'Your body is more than a ', h('em', { className: 'text-[#6E5040]' }, 'number.')),
        h('p', { className: 'text-lg text-[#7D6E62] mt-6 max-w-md leading-relaxed' }, 'Understand how clothes fit your body through measurements, not assumptions.'),
        h('div', { className: 'flex flex-wrap gap-3 mt-9' }, h('button', { className: 'btn', onClick: () => go('body') }, 'Build my body profile →'), h('button', { className: 'btn-ghost', onClick: () => document.getElementById('how').scrollIntoView({ behavior: 'smooth' }) }, 'See how it works'))),
      h('div', { className: 'md:col-span-6 relative' },
        h(Body3D, { profile, garments: heroG, autoSpin: true, controls: false, cls: 'h-[520px] md:h-[640px]' }),
        h('div', { className: 'absolute top-6 right-6 serif italic text-3xl text-[#6E5040] text-right leading-tight' }, 'Same weight.', h('br'), 'Different fit.'),
        h('div', { className: 'absolute bottom-6 left-6 card px-4 py-3' }, h('div', { className: 'label' }, 'Rendered from'), h('div', { className: 'serif text-xl' }, '9 measurements, not 1 number')))),
    h('section', { id: 'how', className: 'max-w-7xl mx-auto px-5 md:px-10 py-24' },
      h('div', { className: 'label mb-10 text-center' }, 'How it works'),
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E3D8C8] border border-[#E3D8C8] rounded-[20px] overflow-hidden' },
        [['01', 'Measurements', 'Bust, waist, hip, shoulder, upper arm, height.'], ['02', 'Your 3D body', 'A personalized model that reflects your proportions.'], ['03', 'Real garments', 'Add pieces and their size-chart measurements.'], ['04', 'Personalized fit', 'Ease, length and confidence — per measurement.']].map(([n, t, d]) =>
          h('div', { key: n, className: 'bg-[#FCF9F4] p-6 md:p-8' }, h('div', { className: 'mono text-xs text-[#B98A82]' }, n), h('div', { className: 'serif text-3xl mt-6' }, t), h('p', { className: 'text-sm text-[#7D6E62] mt-2 leading-relaxed' }, d))))),
    h('section', { className: 'bg-[#2B1F18] text-[#F8F3EB] py-24' },
      h('div', { className: 'max-w-7xl mx-auto px-5 md:px-10' },
        h('h2', { className: 'serif huge' }, '80 KG IS ', h('em', { className: 'text-[#D9B9B2]' }, 'NOT'), ' A SIZE.'),
        h('p', { className: 'text-lg text-[#CDBFAE] mt-6 max-w-xl' }, 'Two people can weigh the same and still have completely different body measurements. Weight gives context — measurements describe fit.'),
        h('div', { className: 'grid md:grid-cols-2 gap-6 mt-14' }, [['BODY A', BODY_A], ['BODY B', BODY_B]].map(([n, b]) =>
          h('div', { key: n, className: 'rounded-[24px] bg-[#F8F3EB] text-[#2B1F18] p-4 grid grid-cols-5 gap-4 items-center' },
            h(Body3D, { profile: b, autoSpin: true, controls: false, cls: 'col-span-3 h-[380px]' }),
            h('div', { className: 'col-span-2 pr-2' }, h('div', { className: 'label' }, n), h('div', { className: 'serif text-5xl mt-1' }, fmt(80, unit, 'kg')),
              h('div', { className: 'mt-5 flex flex-col gap-2 text-sm' }, [['Bust', b.bust], ['Waist', b.waist], ['Hip', b.hip], ['Upper arm', b.upperArm]].map(([l, v]) => h('div', { key: l, className: 'flex justify-between border-b border-[#E3D8C8] pb-1' }, h('span', { className: 'text-[#7D6E62]' }, l), h('span', null, fmt(v, unit))))))))),
        h('p', { className: 'text-center serif italic text-2xl text-[#CDBFAE] mt-12' }, 'Same weight. Different measurements. Different fit — neither is better.'))),
    h('section', { className: 'max-w-4xl mx-auto px-5 text-center py-24' },
      h('h3', { className: 'serif text-5xl md:text-6xl' }, 'Don’t make the body fit the size.', h('br'), h('em', { className: 'text-[#6E5040]' }, 'Make the size understandable.')),
      h('button', { className: 'btn mt-10', onClick: () => go('body') }, 'Build my body profile →')));
}

// ---------- My Body ----------
function BodyScreen({ profile, setProfile, go }) {
  const { unit } = useContext(U);
  const [more, setMore] = useState(false);
  const set = k => v => setProfile(Object.assign({}, profile, { [k]: Math.round(v * 10) / 10 }));
  return h('div', { className: 'page max-w-7xl mx-auto px-5 md:px-10 py-10' },
    h(PageHead, { eyebrow: 'My body', title: h('span', null, 'Your body ', h('em', null, 'profile.')), sub: 'Drag the sliders — your 3D body reshapes as you go. Weight is optional context; fit is calculated from measurements.', right: h(UnitToggle) }),
    h('div', { className: 'grid lg:grid-cols-12 gap-6' },
      h('div', { className: 'lg:col-span-5 card p-6 order-2' },
        h('div', { className: 'label mb-1' }, 'Measurements'),
        PRIMARY.map(([k, l, a, b]) => h(MSlider, { key: k, label: l, value: profile[k], min: a, max: b, onChange: set(k), info: INFO[k] })),
        h('div', { className: 'mt-5 rounded-2xl bg-[#F0E8DC] px-4 pb-1 pt-3' }, h('div', { className: 'label' }, 'Context (optional)'),
          h(MSlider, { label: 'Weight', value: profile.weight, min: 35, max: 200, kind: 'kg', onChange: set('weight'), info: INFO.weight, small: true }),
          h('p', { className: 'text-[11px] text-[#7D6E62] py-2' }, 'Weight helps provide context, but clothing fit depends on more than one number.')),
        h('button', { className: 'w-full flex justify-between items-center mt-4 py-3 label', onClick: () => setMore(!more) }, 'More measurements', h('span', null, more ? '−' : '+')),
        more ? h('div', { className: 'page' }, OPTIONAL.map(([k, l, a, b]) => h(MSlider, { key: k, label: l, value: profile[k], min: a, max: b, onChange: set(k), info: INFO[k], small: true }))) : null),
      h('div', { className: 'lg:col-span-7 order-1' }, h(Body3D, { profile, markers: true, cls: 'h-[600px] md:h-[780px] lg:sticky lg:top-24' })),
      h('div', { className: 'lg:col-span-12 order-3 grid md:grid-cols-3 gap-4 items-start' },
        h('div', { className: 'card p-6' }, h('div', { className: 'serif text-3xl' }, 'Your measurements'),
          h('p', { className: 'text-xs text-[#7D6E62] mt-2 leading-relaxed' }, 'Your body is unique. MEASUREME uses these numbers to understand how garments may interact with your proportions.'),
          h('div', { className: 'mt-5' }, [['Height', 'height'], ['Bust', 'bust'], ['Waist', 'waist'], ['Hip', 'hip'], ['Shoulder', 'shoulder'], ['Upper arm', 'upperArm']].map(([l, k]) =>
            h('div', { key: k, className: 'flex justify-between items-baseline py-2.5 border-b border-[#E3D8C8]' }, h('span', { className: 'text-xs tracking-[.14em] uppercase text-[#7D6E62]' }, l), h('span', { className: 'serif text-2xl' }, fmt(profile[k], unit)))))),
        h('button', { className: 'btn', onClick: () => go('wardrobe') }, 'Add garments →'),
        h('button', { className: 'btn-ghost', onClick: () => go('fit') }, 'View on my body'))));
}

// ---------- Wardrobe ----------
function GCard({ g, profile, onClick }) {
  const a = analyze(profile, g, g.size);
  return h('button', { onClick, className: 'card gcard overflow-hidden text-left gin' },
    h(GImg, { g, cls: 'aspect-[4/5]' }),
    h('div', { className: 'p-4' }, h('div', { className: 'label', style: { fontSize: 9 } }, CATS[g.category]), h('div', { className: 'serif text-xl leading-tight mt-1' }, g.name),
      h('div', { className: 'flex items-center justify-between mt-3' }, h('span', { className: 'text-xs text-[#7D6E62]' }, a && a.confidence != null ? a.confidence + '% fit confidence' : 'Add measurements'), h('span', { className: 'w-3 h-3 rounded-full border border-[#E3D8C8]', style: { background: g.color } }))));
}
function Wardrobe({ garments, profile, openG, go }) {
  const [f, setF] = useState('all');
  const list = garments.filter(g => f === 'all' || g.category === f);
  return h('div', { className: 'page max-w-7xl mx-auto px-5 md:px-10 py-10' },
    h(PageHead, { eyebrow: 'My wardrobe · ' + garments.length + ' pieces', title: h('span', null, 'Pieces, ', h('em', null, 'measured.')), right: h('div', { className: 'flex gap-3' }, h('button', { className: 'btn', onClick: () => go('import') }, '+ Import garment'), h('button', { className: 'btn-ghost', onClick: () => go('create') }, 'Create a fit')) }),
    h('div', { className: 'flex gap-2 overflow-x-auto mb-8 pb-1' }, [['all', 'All'], ['top', 'Tops'], ['bottom', 'Bottoms'], ['dress', 'Dresses'], ['outer', 'Outerwear']].map(([k, l]) => h('button', { key: k, className: 'chip ' + (f === k ? 'on' : ''), onClick: () => setF(k) }, l))),
    h('div', { className: 'hscroll md:grid-cols-3 lg:grid-cols-4 md:gap-6' }, list.map(g => h(GCard, { key: g.id, g, profile, onClick: () => openG(g.id) }))),
    !list.length ? h('p', { className: 'text-[#7D6E62] py-12' }, 'Nothing here yet.') : null,
    h('div', { className: 'mt-8' }, h(Credit)));
}

// ---------- Import ----------
function downscale(src, max = 768) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)); const c = document.createElement('canvas'); c.width = i.width * k; c.height = i.height * k; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); }; i.onerror = rej; i.src = src; });
}
async function visionGuess(data) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: [{ type: 'text', text: 'Identify the main clothing garment in this image. Reply ONLY JSON: {"name":"e.g. White Relaxed Blouse","category":"top|bottom|dress|outer","color":"#hex","colorName":"","attributes":["3-4 short visual attributes"],"shape":"blouse|shirt|knit|blazer|wide|straight|skirt|a-line"}. Describe only the garment, never the person.' }, { type: 'image_url', image_url: { url: data } }] }] }) });
    const j = await r.json(); return JSON.parse(j.choices[0].message.content.match(/\{[\s\S]*\}/)[0]);
  } finally { clearTimeout(t); }
}
async function extractGarment(data, name) {
  const r = await fetch('/api/nanobanana/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Extract only the ' + (name || 'main garment') + ' from this photo. Show the isolated garment alone as a ghost-mannequin e-commerce product photo, realistic fabric, folds and seams preserved, centered, on a plain warm ivory background. Remove the person, face, body and background entirely.', base_image_base64: data.split(',')[1], base_image_url: undefined, width: 640, height: 800 }) });
  if (!r.ok) throw new Error('extract failed');
  const ct = r.headers.get('content-type') || '';
  if (r.redirected && r.url) return r.url;
  if (ct.startsWith('image/')) { const b = await r.blob(); return await downscale(URL.createObjectURL(b), 640); }
  const j = await r.json().catch(() => null); if (j && (j.url || j.image_url)) return j.url || j.image_url; throw new Error('no image');
}
function ImportScreen({ addGarment, openG, profile }) {
  const [src, setSrc] = useState(null), [stage, setStage] = useState(0), [res, setRes] = useState(null), [over, setOver] = useState(false);
  const fileRef = useRef();
  const handle = async file => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file); const data = await downscale(url, 768);
    setSrc(data); setRes(null); setStage(2);
    let guess = null; try { guess = await visionGuess(data); } catch (e) { }
    guess = Object.assign({ name: 'Imported Garment', category: 'top', color: '#D8CBB6', colorName: '', attributes: ['Visual analysis'], shape: '' }, guess || {});
    if (!CATS[guess.category]) guess.category = 'top';
    setStage(3);
    let img = null; try { img = await extractGarment(data, guess.name); } catch (e) { }
    setRes(Object.assign(guess, { image: img || data, extracted: !!img })); setStage(4);
  };
  useEffect(() => { const f = e => { for (const it of e.clipboardData.items) if (it.type.startsWith('image/')) handle(it.getAsFile()); }; window.addEventListener('paste', f); return () => window.removeEventListener('paste', f); }, []);
  const save = () => { const id = 'g' + Math.random().toString(36).slice(2, 8); addGarment({ id, name: res.name, category: res.category, color: /^#[0-9a-f]{6}$/i.test(res.color) ? res.color : '#D8CBB6', colorName: res.colorName, shape: res.shape, attributes: res.attributes.slice(0, 4), image: res.image, size: 'M', sizes: { M: defaultSize(profile, res.category) } }); openG(id); };
  const steps = ['Upload', 'Identifying', 'Extracting', 'Complete'];
  return h('div', { className: 'page max-w-7xl mx-auto px-5 md:px-10 py-10' },
    h(PageHead, { eyebrow: 'Import garment', title: h('span', null, 'Bring any garment', h('br'), h('em', null, 'into your wardrobe.')), sub: 'Upload a product photo, a screenshot or a photo of your own clothing. MEASUREME identifies the garment and separates it from the rest of the image.' }),
    h('div', { className: 'grid md:grid-cols-12 gap-6' },
      h('div', { className: 'md:col-span-7 flex flex-col gap-6' },
        h('div', { className: 'drop rounded-[24px] min-h-[340px] flex flex-col items-center justify-center text-center p-8 cursor-pointer bg-[#FCF9F4] ' + (over ? 'over' : ''), onClick: () => fileRef.current.click(), onDragOver: e => { e.preventDefault(); setOver(true); }, onDragLeave: () => setOver(false), onDrop: e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); } },
          h('div', { className: 'serif text-4xl' }, 'Drop an image here'), h('p', { className: 'text-sm text-[#7D6E62] mt-2' }, 'or click to upload · paste works too'),
          h('span', { className: 'btn-ghost mt-6' }, 'Upload image'),
          h('input', { ref: fileRef, type: 'file', accept: 'image/*', className: 'hidden', onChange: e => handle(e.target.files[0]) })),
        h('div', { className: 'card p-6' },
          h('div', { className: 'flex justify-between' }, steps.map((s, i) => h('div', { key: s, className: 'flex items-center gap-2 text-xs ' + (stage >= i + 1 ? 'text-[#2B1F18] font-semibold' : 'text-[#A69383]') }, h('span', { className: 'w-6 h-6 rounded-full border flex items-center justify-center mono text-[10px] ' + (stage >= i + 1 ? 'bg-[#2B1F18] text-[#F8F3EB] border-[#2B1F18]' : 'border-[#E3D8C8]') }, i + 1), h('span', { className: 'hidden sm:inline' }, s)))),
          h('div', { className: 'h-[2px] bg-[#E3D8C8] mt-5 rounded' }, h('div', { className: 'h-full bg-[#2B1F18] bar-fill', style: { width: (src ? stage / 4 * 100 : 0) + '%' } })),
          h('p', { className: 'text-sm text-[#7D6E62] mt-4' }, !src ? 'Waiting for an image.' : stage === 2 ? 'Identifying garment…' : stage === 3 ? 'Separating garment from background…' : 'Garment isolated. Review and save.'))),
      h('div', { className: 'md:col-span-5 grid grid-cols-2 gap-4 content-start' },
        h('div', null, h('div', { className: 'label mb-2' }, 'Original image'), h('div', { className: 'relative rounded-2xl overflow-hidden aspect-[4/5] bg-[#F0E8DC] border border-[#E3D8C8]' }, src ? h('img', { src, className: 'w-full h-full object-cover' }) : null, src && stage < 4 ? h('div', { className: 'scan' }) : null)),
        h('div', null, h('div', { className: 'label mb-2' }, 'Detected garment'), h('div', { className: 'rounded-2xl overflow-hidden aspect-[4/5] bg-[#F0E8DC] border border-[#E3D8C8]' }, res ? h('img', { src: res.image, className: 'w-full h-full object-cover gin' }) : src ? h('div', { className: 'w-full h-full shim' }) : null)),
        res ? h('div', { className: 'col-span-2 card p-5 page flex flex-col gap-4' },
          h('input', { className: 'serif text-3xl bg-transparent outline-none border-b border-[#E3D8C8] pb-1', value: res.name, onChange: e => setRes(Object.assign({}, res, { name: e.target.value })) }),
          h('div', { className: 'flex flex-wrap gap-2' }, Object.keys(CATS).map(k => h('button', { key: k, className: 'chip ' + (res.category === k ? 'on' : ''), onClick: () => setRes(Object.assign({}, res, { category: k })) }, CATS[k]))),
          h('div', { className: 'flex flex-wrap gap-2 text-xs' }, h('span', { className: 'flex items-center gap-2 border border-[#E3D8C8] rounded-full px-3 py-1' }, h('span', { className: 'w-3 h-3 rounded-full', style: { background: res.color } }), res.colorName || res.color), res.attributes.map(a => h('span', { key: a, className: 'border border-[#E3D8C8] rounded-full px-3 py-1' }, a))),
          h('p', { className: 'text-[11px] text-[#7D6E62]' }, (res.extracted ? 'Visual analysis complete. ' : 'Extraction unavailable — your original image is kept. ') + 'Add garment measurements from the size chart for a higher fit confidence. MEASUREME never guesses exact measurements from a photo.'),
          h('button', { className: 'btn', onClick: save }, 'Save to wardrobe →')) : null)));
}

// ---------- Garment detail ----------
function FitRows({ a }) {
  return h('div', { className: 'flex flex-col' }, a.rows.map(r => h('div', { key: r.key, className: 'flex justify-between items-center py-2.5 border-b border-[#E3D8C8] text-sm' }, h('span', { className: 'text-[#7D6E62] uppercase tracking-[.14em] text-xs' }, r.name), h('span', { className: r.status === 'Tight' || r.status === 'Narrow' ? 'text-[#A0645A] font-semibold' : 'font-semibold' }, r.status))));
}
function GarmentDetail({ id, garments, profile, updateGarment, removeGarment, go, setView }) {
  const g = garments.find(x => x.id === id);
  const [newSz, setNewSz] = useState('');
  if (!g) return h('div', { className: 'p-20 text-center' }, 'Garment not found. ', h('button', { className: 'underline', onClick: () => go('wardrobe') }, 'Back to wardrobe'));
  const sizes = g.sizes || {}; const sz = g.size && sizes[g.size] ? g.size : Object.keys(sizes)[0];
  const m = sizes[sz] || {};
  const a = analyze(profile, g, sz);
  const setM = (k, v) => updateGarment(g.id, { sizes: Object.assign({}, sizes, { [sz]: Object.assign({}, m, { [k]: Math.round(v * 10) / 10 }) }) });
  const addSize = () => { const n = newSz.trim().toUpperCase(); if (!n) return; updateGarment(g.id, { sizes: Object.assign({}, sizes, { [n]: Object.assign({}, m.bust || m.waist ? m : defaultSize(profile, g.category)) }), size: n }); setNewSz(''); };
  const view = () => { const sel = { top: null, bottom: null, dress: null, outer: null }; sel[g.category] = g.id; if (g.category === 'top') sel.bottom = (garments.find(x => x.category === 'bottom') || {}).id; if (g.category === 'outer') { sel.top = (garments.find(x => x.category === 'top') || {}).id; sel.bottom = (garments.find(x => x.category === 'bottom') || {}).id; } setView({ sel, sizes: { [g.id]: sz }, primary: g.id }); go('fit'); };
  return h('div', { className: 'page max-w-7xl mx-auto px-5 md:px-10 py-10' },
    h('button', { className: 'label mb-6 hover:text-[#2B1F18]', onClick: () => go('wardrobe') }, '← Wardrobe'),
    h('div', { className: 'grid md:grid-cols-12 gap-8' },
      h('div', { className: 'md:col-span-5' }, h(GImg, { g, cls: 'aspect-[4/5] rounded-[24px] border border-[#E3D8C8]' }), h('div', { className: 'mt-3' }, h(Credit))),
      h('div', { className: 'md:col-span-7 flex flex-col gap-6' },
        h('div', null, h('div', { className: 'flex items-center gap-3' }, h('span', { className: 'chip on', style: { cursor: 'default' } }, CATS[g.category]), h('span', { className: 'w-4 h-4 rounded-full border border-[#E3D8C8]', style: { background: g.color } })),
          h('h1', { className: 'serif text-5xl md:text-6xl mt-4 leading-none' }, g.name),
          h('div', { className: 'flex flex-wrap gap-2 mt-4' }, (g.attributes || []).map(t => h('span', { key: t, className: 'text-xs border border-[#E3D8C8] rounded-full px-3 py-1 text-[#7D6E62]' }, t)))),
        h('div', { className: 'card p-6' },
          h('div', { className: 'flex flex-wrap justify-between items-center gap-3' }, h('div', null, h('div', { className: 'serif text-3xl' }, 'Garment measurements'), h('div', { className: 'text-xs text-[#7D6E62] mt-1' }, 'Copy these from the seller’s size chart.')), h(UnitToggle)),
          h('div', { className: 'flex flex-wrap gap-2 mt-5 items-center' }, Object.keys(sizes).map(s => h('button', { key: s, className: 'chip ' + (s === sz ? 'on' : ''), onClick: () => updateGarment(g.id, { size: s }) }, 'Size ' + s)),
            h('input', { className: 'chip w-24 outline-none', placeholder: '+ SIZE', value: newSz, onChange: e => setNewSz(e.target.value), onKeyDown: e => e.key === 'Enter' && addSize() }), newSz ? h('button', { className: 'chip', onClick: addSize }, 'Add') : null),
          sz ? FIELDS[g.category].map(([k, l, mn, mx]) => h(MSlider, { key: sz + k, label: l, value: m[k], min: mn, max: mx, onChange: v => setM(k, v) })) : h('p', { className: 'text-sm text-[#7D6E62] mt-4' }, 'Add a size to enter measurements.')),
        a ? h('div', { className: 'card p-6 grid sm:grid-cols-2 gap-6 items-center' },
          h('div', { className: 'flex flex-col items-center text-center gap-3' }, h('div', { className: 'serif text-3xl self-start' }, 'Fit analysis'), h(Ring, { value: a.confidence, key: sz + a.confidence }), h('div', { className: 'label', style: { color: '#2B1F18' } }, a.verdict), h('p', { className: 'text-[11px] text-[#7D6E62]' }, 'Prediction based on your body and garment measurements.')),
          h('div', null, h('div', { className: 'label mb-2' }, 'Why?'), h(FitRows, { a }))) : null,
        h('div', { className: 'flex flex-wrap gap-3' }, h('button', { className: 'btn', onClick: view }, 'View on my body →'), h('button', { className: 'btn-ghost', onClick: () => { view(); } }, 'Compare another size'), h('button', { className: 'text-xs text-[#A0645A] ml-auto', onClick: () => { if (confirm('Remove this garment?')) { removeGarment(g.id); go('wardrobe'); } } }, 'Remove')))));
}

// ---------- Fit check / View on my body ----------
function FitView({ profile, garments, view, setView, openG, go }) {
  const all = garments.concat(view.extra || []);
  const sel = view.sel || {}; const sizes = view.sizes || {};
  const find = id => all.find(g => g.id === id);
  const pieces = (sel.dress ? ['dress', 'outer'] : ['top', 'bottom', 'outer']).map(k => find(sel[k])).filter(Boolean);
  const primary = find(view.primary) || pieces[0];
  const szOf = g => sizes[g.id] || g.size;
  const outfit = pieces.map(g => ({ g, size: szOf(g) }));
  const [cmp, setCmp] = useState(false);
  const pKeys = primary && primary.sizes ? Object.keys(primary.sizes) : [];
  const [cmpB, setCmpB] = useState(null);
  const sizeB = cmpB || pKeys.find(s => primary && s !== szOf(primary)) || pKeys[0];
  const a = primary ? analyze(profile, primary, szOf(primary)) : null;
  const upd = patch => setView(Object.assign({}, view, patch));
  const pickRow = k => h('div', { key: k }, h('div', { className: 'label mb-2' }, CATS[k]),
    h('div', { className: 'flex gap-2 overflow-x-auto pb-1' },
      h('button', { className: 'flex-none w-14 h-16 rounded-xl border text-[10px] text-[#7D6E62] ' + (!sel[k] ? 'border-[#2B1F18]' : 'border-[#E3D8C8]'), onClick: () => upd({ sel: Object.assign({}, sel, { [k]: null }) }) }, 'None'),
      all.filter(g => g.category === k).map(g => h('button', { key: g.id, title: g.name, className: 'flex-none w-14 h-16 rounded-xl overflow-hidden border-2 ' + (sel[k] === g.id ? 'border-[#2B1F18]' : 'border-transparent'), onClick: () => { const s = Object.assign({}, sel, { [k]: g.id }); if (k === 'dress') { s.top = null; s.bottom = null; } if (k === 'top' || k === 'bottom') s.dress = null; upd({ sel: s, primary: g.id }); } }, h(GImg, { g, cls: 'w-full h-full' })))));
  return h('div', { className: 'page max-w-7xl mx-auto px-5 md:px-10 py-10' },
    h(PageHead, { eyebrow: 'Fit check', title: h('span', null, 'View on ', h('em', null, 'my body.')), sub: 'Your personalized body wearing the pieces you choose — each sized from its own measurements.', right: h(UnitToggle) }),
    h('div', { className: 'grid lg:grid-cols-12 gap-6' },
      h('div', { className: 'lg:col-span-3 card p-5 flex flex-col gap-5 order-2 lg:order-1' }, ['top', 'bottom', 'dress', 'outer'].map(pickRow)),
      h('div', { className: 'lg:col-span-6 order-1 lg:order-2' },
        cmp && primary && pKeys.length > 1 ? h('div', { className: 'grid grid-cols-2 gap-3' }, [szOf(primary), sizeB].map((s, i) => {
          const o = outfit.map(x => x.g.id === primary.id ? { g: x.g, size: s } : x); const r = analyze(profile, primary, s);
          return h('div', { key: i + s }, h(Body3D, { profile, garments: o, controls: i === 0, cls: 'h-[460px] md:h-[620px]' }), h('div', { className: 'flex justify-between mt-3 px-1' }, h('span', { className: 'label', style: { color: '#2B1F18' } }, 'Size ' + s), h('span', { className: 'serif text-2xl' }, r.confidence != null ? r.confidence + '%' : '—')));
        })) : h(Body3D, { profile, garments: outfit, cls: 'h-[560px] md:h-[720px]' })),
      h('div', { className: 'lg:col-span-3 flex flex-col gap-4 order-3' },
        primary && a ? h('div', { className: 'card p-6' },
          h('div', { className: 'label' }, 'Your fit · ' + primary.name), h('div', { className: 'flex items-center gap-4 mt-4' }, h(Ring, { value: a.confidence, size: 96, key: primary.id + szOf(primary) }), h('div', null, h('div', { className: 'serif text-2xl leading-tight' }, a.verdict), h('div', { className: 'text-xs text-[#7D6E62] mt-1' }, 'Size ' + (szOf(primary) || '—')))),
          h('div', { className: 'mt-4' }, a.rows.length ? h(FitRows, { a }) : h('p', { className: 'text-xs text-[#7D6E62]' }, 'Visual preview. Add size-chart measurements for a fit prediction.')),
          h('button', { className: 'text-xs underline mt-4', onClick: () => openG(primary.id) }, 'Edit garment measurements')) : h('div', { className: 'card p-6 text-sm text-[#7D6E62]' }, 'Choose a garment to see its fit.'),
        primary && pKeys.length ? h('div', { className: 'card p-6' }, h('div', { className: 'serif text-2xl' }, 'Compare another size'),
          h('div', { className: 'flex flex-col gap-2 mt-4' }, pKeys.map(s => { const r = analyze(profile, primary, s); const on = s === szOf(primary); return h('button', { key: s, className: 'flex justify-between items-center px-4 py-3 rounded-xl border transition ' + (on ? 'border-[#2B1F18] bg-[#F0E8DC]' : 'border-[#E3D8C8] hover:border-[#A69383]'), onClick: () => { if (cmp && !on) setCmpB(s); else upd({ sizes: Object.assign({}, sizes, { [primary.id]: s }) }); } }, h('span', { className: 'text-xs tracking-[.18em] font-semibold' }, 'SIZE ' + s), h('span', { className: 'text-sm' }, r.confidence != null ? r.confidence + '% fit confidence' : '—')); })),
          pKeys.length > 1 ? h('button', { className: 'btn w-full mt-4', onClick: () => setCmp(!cmp) }, cmp ? 'Single view' : 'Compare side by side') : h('p', { className: 'text-[11px] text-[#7D6E62] mt-3' }, 'Add another size on the garment page to compare.')) : null)));
}

// ---------- Create ----------
const LIB = {
  top: [['Structured white blouse', '#F2EEE6', 'Structured', 'work formal classic minimal smart mild cool'], ['Relaxed blue shirt', '#9DB2C9', 'Relaxed', 'casual travel relaxed smart hot mild'], ['Black knit top', '#24221F', 'Fitted', 'dinner minimal street cool work'], ['Linen camp-collar shirt', '#D8CBB4', 'Relaxed', 'hot casual travel relaxed'], ['Silk wrap top', '#7A3E2C', 'Relaxed', 'dinner formal mild'], ['Ribbed long-sleeve tee', '#8C8A84', 'Fitted', 'street casual cool minimal rainy'], ['Draped satin blouse', '#E8DCC8', 'Relaxed', 'formal dinner classic']],
  bottom: [['Straight trousers', '#3A3734', 'Straight', 'work classic minimal smart cool mild formal'], ['Wide-leg trousers', '#22201E', 'Wide leg', 'work dinner minimal relaxed smart mild'], ['A-line skirt', '#B08A5E', 'A-line', 'casual dinner mild hot classic'], ['Dark straight jeans', '#2E3A52', 'Straight', 'casual street travel cool rainy'], ['Pleated midi skirt', '#6C6F5A', 'A-line', 'work dinner mild'], ['Drawstring linen trousers', '#CDBFA8', 'Wide leg', 'hot travel relaxed casual'], ['Tailored culottes', '#5A4A3E', 'Wide leg', 'work smart minimal hot mild']],
  outer: [['Beige blazer', '#C9B79C', 'Structured', 'work smart classic formal mild'], ['Longline cardigan', '#9A8F82', 'Relaxed', 'relaxed casual travel cool'], ['Classic trench coat', '#B9A380', 'Relaxed', 'rainy classic work travel cool'], ['Cropped denim jacket', '#6E88A8', 'Relaxed', 'street casual mild'], ['Wool overcoat', '#3E3A36', 'Structured', 'cool formal minimal dinner classic'], ['Light rain shell', '#56625A', 'Relaxed', 'rainy travel street casual'], ['Linen chore jacket', '#D4C6AE', 'Relaxed', 'hot mild relaxed casual minimal']]
};
function toPiece(cat, name, color, fit, i) {
  const n = name.toLowerCase();
  const shape = cat === 'bottom' ? (/skirt/.test(n) ? 'skirt' : /wide|culotte|linen|palazzo/.test(n) ? 'wide' : 'straight') : cat === 'outer' ? 'blazer' : /shirt|blouse/.test(n) ? 'blouse' : 'knit';
  const defaults = cat === 'bottom' ? { length: shape === 'skirt' ? 72 : /culotte/.test(n) ? 55 : 74 } : cat === 'outer' ? { length: /trench|overcoat|coat|longline|cardigan/.test(n) ? 100 : /cropped/.test(n) ? 50 : 72, sleeve: 59 } : { length: 64, sleeve: /camp/.test(n) ? 22 : 58 };
  return { id: 'gen-' + cat + i + '-' + Date.now() % 100000, name: name.replace(/\b\w/g, c => c.toUpperCase()), category: cat, color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#999999', colorName: '', attributes: [fit + ' fit'], shape, sizes: {}, size: null, defaults, generated: true };
}
function mockGenerate(o, s, w) {
  const want = [o, s, w].map(x => x.toLowerCase().split(' ')[0]); const out = {};
  Object.keys(LIB).forEach(cat => { out[cat] = LIB[cat].map(it => ({ it, sc: want.filter(t => it[3].includes(t)).length + Math.random() * 0.9 })).sort((a, b) => b.sc - a.sc).slice(0, 3).map(({ it }, i) => toPiece(cat, it[0], it[1], it[2], i)); });
  return out;
}
async function aiGenerate(o, s, w) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const prompt = `You are a garment planner for a clothing-fit app. Occasion: ${o}. Style: ${s}. Weather: ${w}. Suggest modular separates that can be mixed and matched. Never mention bodies, slimming or flattering. Reply ONLY JSON: {"top":[{"name":"","color":"#hex","fit":"Relaxed|Fitted|Structured"} x3],"bottom":[...x3 (trousers or skirts)],"outer":[...x3]}`;
    const r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: prompt }] }) });
    const j = await r.json(); const d = JSON.parse(j.choices[0].message.content.match(/\{[\s\S]*\}/)[0]);
    const out = {}; ['top', 'bottom', 'outer'].forEach(c => { if (!Array.isArray(d[c]) || d[c].length < 2) throw 0; out[c] = d[c].slice(0, 3).map((x, i) => toPiece(c, String(x.name || 'Piece'), String(x.color || ''), String(x.fit || 'Relaxed'), i)); });
    return out;
  } finally { clearTimeout(t); }
}
function Create({ profile, addGarment, go, setView }) {
  const [o, setO] = useState('Work'), [s, setS] = useState('Smart Casual'), [w, setW] = useState('Mild');
  const [opts, setOpts] = useState(LS.get('mm_gen', null));
  const [pick, setPick] = useState({ top: 0, bottom: 0, outer: 0 });
  const [loading, setLoading] = useState(false), [src, setSrc] = useState('');
  const gen = async () => {
    setLoading(true); let r, live = false;
    try { r = await aiGenerate(o, s, w); live = true; } catch (e) { }
    if (!r) { r = mockGenerate(o, s, w); await new Promise(z => setTimeout(z, 700)); }
    setOpts(r); LS.set('mm_gen', r); setPick({ top: 0, bottom: 0, outer: 0 }); setSrc(live ? 'Suggested by live AI' : 'Suggested from the MEASUREME style library'); setLoading(false);
  };
  const chosen = opts ? ['top', 'bottom', 'outer'].map(k => pick[k] == null ? null : opts[k][pick[k]]).filter(Boolean) : [];
  const group = (label, list, val, set) => h('div', null, h('div', { className: 'label mb-3' }, label), h('div', { className: 'flex flex-wrap gap-2' }, list.map(x => h('button', { key: x, className: 'chip ' + (val === x ? 'on' : ''), onClick: () => set(x) }, x))));
  return h('div', { className: 'page max-w-7xl mx-auto px-5 md:px-10 py-10' },
    h(PageHead, { eyebrow: 'Create a fit', title: h('span', null, 'Create a fit ', h('em', null, 'for my day.')), sub: 'MEASUREME suggests separate pieces — tops, bottoms and outer layers — so you mix them your way.' }),
    h('div', { className: 'card p-6 md:p-8 grid md:grid-cols-4 gap-6 items-end' },
      group('Occasion', ['Work', 'Casual', 'Dinner', 'Formal', 'Travel'], o, setO),
      group('Style', ['Minimal', 'Smart Casual', 'Classic', 'Relaxed', 'Street'], s, setS),
      group('Weather', ['Hot', 'Mild', 'Cool', 'Rainy'], w, setW),
      h('button', { className: 'btn', disabled: loading, onClick: gen }, loading ? 'Composing pieces…' : 'Generate pieces')),
    opts ? h('div', { className: 'grid lg:grid-cols-12 gap-6 mt-8' },
      h('div', { className: 'lg:col-span-8 flex flex-col gap-8' },
        src ? h('div', { className: 'text-[11px] text-[#A69383]' }, src) : null,
        [['top', 'Top options'], ['bottom', 'Bottom options'], ['outer', 'Outer options']].map(([k, l]) => h('div', { key: k },
          h('div', { className: 'flex justify-between mb-3' }, h('div', { className: 'label', style: { color: '#2B1F18' } }, l), k === 'outer' ? h('button', { className: 'label hover:text-[#2B1F18]', onClick: () => setPick(Object.assign({}, pick, { outer: null })) }, 'Skip outer') : null),
          h('div', { className: 'grid grid-cols-3 gap-3' }, opts[k].map((g, i) => h('button', { key: g.id, onClick: () => setPick(Object.assign({}, pick, { [k]: i })), className: 'card gcard overflow-hidden text-left ' + (pick[k] === i ? '!border-[#2B1F18] ring-1 ring-[#2B1F18]' : '') },
            h(GImg, { g, cls: 'aspect-[4/5]' }),
            h('div', { className: 'p-3' }, h('div', { className: 'text-xs md:text-sm font-semibold leading-tight' }, g.name), h('div', { className: 'text-[11px] text-[#7D6E62] mt-1' }, g.attributes[0]))))))),
        h(Credit)),
      h('div', { className: 'lg:col-span-4' }, h('div', { className: 'lg:sticky lg:top-24 flex flex-col gap-3' },
        h(Body3D, { profile, garments: chosen.map(g => ({ g, size: null })), controls: false, autoSpin: true, cls: 'h-[460px]' }),
        h('button', { className: 'btn', disabled: !chosen.length, onClick: () => { const sel = { top: null, bottom: null, dress: null, outer: null }; chosen.forEach(g => sel[g.category] = g.id); setView({ sel, sizes: {}, primary: chosen[0].id, extra: chosen }); go('fit'); } }, 'View on my body →'),
        h('button', { className: 'btn-ghost', disabled: !chosen.length, onClick: () => { chosen.forEach(g => addGarment(Object.assign({}, g, { id: 'g' + Math.random().toString(36).slice(2, 8), generated: false, size: 'M', sizes: { M: defaultSize(profile, g.category) } }))); go('wardrobe'); } }, 'Save pieces to wardrobe'),
        h('p', { className: 'text-[11px] text-[#A69383]' }, 'Suggested pieces are visual previews. Add size-chart measurements after saving for a fit prediction.')))) : null);
}

// ---------- Profile ----------
function ProfileScreen({ profile, setProfile, go, garments }) {
  const { unit } = useContext(U);
  return h('div', { className: 'page max-w-5xl mx-auto px-5 md:px-10 py-10' },
    h(PageHead, { eyebrow: 'Profile', title: h('span', null, 'Hello, ', h('em', null, profile.name || 'there'), '.') }),
    h('div', { className: 'grid md:grid-cols-2 gap-6' },
      h('div', { className: 'card p-6 flex flex-col gap-4' }, h('div', { className: 'label' }, 'Name'), h('input', { className: 'serif text-3xl bg-transparent outline-none border-b border-[#E3D8C8]', value: profile.name, onChange: e => setProfile(Object.assign({}, profile, { name: e.target.value })) }),
        h('div', { className: 'label mt-4' }, 'Preferred units'), h(UnitToggle),
        h('div', { className: 'label mt-4' }, 'Wardrobe'), h('div', { className: 'serif text-3xl' }, garments.length + ' pieces'),
        h('button', { className: 'btn mt-4', onClick: () => go('body') }, 'Edit measurements')),
      h('div', { className: 'card p-6' }, h('div', { className: 'serif text-3xl' }, 'Your measurements'),
        [['Height', 'height'], ['Bust', 'bust'], ['Waist', 'waist'], ['Hip', 'hip'], ['Shoulder', 'shoulder'], ['Upper arm', 'upperArm'], ['Inseam', 'inseam']].map(([l, k]) => h('div', { key: k, className: 'flex justify-between py-2.5 border-b border-[#E3D8C8]' }, h('span', { className: 'text-xs tracking-[.14em] uppercase text-[#7D6E62]' }, l), h('span', { className: 'serif text-2xl' }, fmt(profile[k], unit)))),
        h('p', { className: 'text-[11px] text-[#7D6E62] mt-5 leading-relaxed' }, 'MEASUREME evaluates clothing fit — never your body. No scores, no BMI, no weight-loss tools, no face recognition.'))));
}

// ---------- Nav & App ----------
function Nav({ route, go }) {
  const links = [['body', 'My Body'], ['wardrobe', 'Wardrobe'], ['fit', 'Fit Check'], ['create', 'Create'], ['profile', 'Profile']];
  return h('header', { className: 'sticky top-0 z-40 bg-[#F8F3EB]/90 backdrop-blur border-b border-[#E3D8C8]' },
    h('div', { className: 'max-w-7xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-6' },
      h('button', { className: 'serif text-2xl tracking-[.08em]', onClick: () => go('landing') }, 'MEASURE', h('em', { className: 'text-[#B98A82]' }, 'ME')),
      h('nav', { className: 'hidden md:flex gap-8' }, links.map(([k, l]) => h('button', { key: k, className: 'navlink ' + (route === k || (k === 'wardrobe' && (route === 'garment' || route === 'import')) ? 'on' : ''), onClick: () => go(k) }, l))),
      h(UnitToggle)),
    h('nav', { className: 'md:hidden flex gap-6 overflow-x-auto px-5 pb-2' }, links.map(([k, l]) => h('button', { key: k, className: 'navlink ' + (route === k ? 'on' : ''), onClick: () => go(k) }, l))));
}
function App() {
  const parse = () => { const p = location.hash.replace(/^#\/?/, '').split('/'); return { name: p[0] || 'landing', id: p[1] }; };
  const [route, setRoute] = useState(parse());
  const [unit, setUnitS] = useState(LS.get('mm_unit', 'cm'));
  const [profile, setProfileS] = useState(Object.assign({}, DEFAULT_PROFILE, LS.get('mm_profile', {})));
  const [garments, setGarments] = useState(LS.get('mm_garments2', SEED));
  const [view, setViewS] = useState(LS.get('mm_view2', { sel: { top: 'g1', bottom: 'g2', dress: null, outer: null }, sizes: {}, primary: 'g1' }));
  useEffect(() => { const f = () => { setRoute(parse()); window.scrollTo({ top: 0 }); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => LS.set('mm_garments2', garments), [garments]);
  const setUnit = u => { setUnitS(u); LS.set('mm_unit', u); };
  const setProfile = p => { setProfileS(p); LS.set('mm_profile', p); };
  const setView = v => { setViewS(v); LS.set('mm_view2', v); };
  const go = r => { location.hash = '/' + (r === 'landing' ? '' : r); };
  const openG = id => { location.hash = '/garment/' + id; };
  const addGarment = g => setGarments(gs => [g].concat(gs));
  const updateGarment = (id, patch) => setGarments(gs => gs.map(g => g.id === id ? Object.assign({}, g, patch) : g));
  const removeGarment = id => setGarments(gs => gs.filter(g => g.id !== id));
  const ctx = { profile, setProfile, garments, go, openG, addGarment, updateGarment, removeGarment, view, setView };
  const screens = {
    landing: () => h(Landing, ctx), body: () => h(BodyScreen, ctx), wardrobe: () => h(Wardrobe, ctx), import: () => h(ImportScreen, ctx),
    garment: () => h(GarmentDetail, Object.assign({ id: route.id, key: route.id }, ctx)), fit: () => h(FitView, ctx), create: () => h(Create, ctx), profile: () => h(ProfileScreen, ctx)
  };
  return h(U.Provider, { value: { unit, setUnit } }, h('div', { className: 'min-h-screen flex flex-col' },
    h(Nav, { route: route.name, go }),
    h('main', { className: 'flex-1', key: route.name + (route.id || '') }, (screens[route.name] || screens.landing)()),
    h('footer', { className: 'border-t border-[#E3D8C8] mt-16' },
      h('div', { className: 'max-w-7xl mx-auto px-5 md:px-10 py-12 grid md:grid-cols-3 gap-8 items-end' },
        h('div', null, h('div', { className: 'serif text-3xl tracking-[.08em]' }, 'MEASURE', h('em', { className: 'text-[#B98A82]' }, 'ME')), h('div', { className: 'serif italic text-xl text-[#7D6E62] mt-1' }, 'Because Weight Isn’t a Size.')),
        h('p', { className: 'text-xs text-[#7D6E62] leading-relaxed' }, 'Responsible by design: no body scores, no BMI, no weight-loss tools, no face recognition. Fit results are predictions, not guarantees. Garment visuals are AI-generated renders.'),
        h('div', { className: 'md:text-right text-sm flex md:justify-end gap-5' }, h('button', { className: 'hover:underline py-2', onClick: () => { if (confirm('Reset all demo data?')) { localStorage.clear(); location.hash = '/'; location.reload(); } } }, 'Reset demo'), h('a', { href: '/remix', className: 'font-semibold hover:text-[#B98A82] py-2' }, 'Remix on Berrry'))))));
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));