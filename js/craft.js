// Mission spacecraft models. One design per mission, from the team's 3D model study (satellites.html):
// ASTRA (OSIRIS-APEX heritage), LUNARIS (LRO heritage), HALO (Aura-like), JEZERO ECHO (MRO heritage).
// Shapes follow those designs; the parts the player chooses in the builder (arrays, dish, battery, recorder,
// propellant, instruments) change the model. All dimensions are conceptual. Palette is locked: warm gold body,
// blue solar arrays, white high-gain antenna. Mission accent colours never recolour the spacecraft.
// Model axes: solar wings along x, dish on +y, payload on +z, main engine on -z. Conceptual, not NASA hardware.
import * as THREE from '../vendor/three.module.min.js';

const T = THREE, PI = Math.PI;
const V = (x, y, z) => new T.Vector3(x, y, z), Y = V(0, 1, 0);
let TX = null, ENV = null;
export function setCraftEnv(env) { ENV = env; }
export const fullCfg = mission => ({ solar: 'L', battery: 'L', radio: 'L', recorder: 'L', propKg: 120, inst: mission.instruments.map(i => i.id) });

function tex(w, h, fn, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.userData.shared = true; return t;
}
function textures() {
  if (TX) return TX;
  const tri = (x, w, h, n, fill, r) => { for (let i = 0; i < n; i++) { x.fillStyle = fill(); const px = Math.random() * w, py = Math.random() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.random() * r - r / 2, py + Math.random() * r - r / 2); x.lineTo(px + Math.random() * r - r / 2, py + Math.random() * r - r / 2); x.fill(); } };
  TX = {
    // crinkled gold multi-layer insulation
    foil: tex(512, 512, (x, w, h) => { x.fillStyle = '#b98a2e'; x.fillRect(0, 0, w, h); tri(x, w, h, 900, () => `hsl(${36 + Math.random() * 8},70%,${38 + Math.random() * 34}%)`, 60); }),
    foilB: tex(512, 512, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); tri(x, w, h, 1400, () => { const v = 40 + Math.random() * 180 | 0; return `rgb(${v},${v},${v})`; }, 50); }, false),
    // solar cells with bus-bars
    cell: tex(360, 500, (x, w, h) => { x.fillStyle = '#050b24'; x.fillRect(0, 0, w, h); const cw = w / 4, ch = h / 10;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) { const g = x.createLinearGradient(i * cw, j * ch, (i + 1) * cw, (j + 1) * ch); g.addColorStop(0, '#2c55c8'); g.addColorStop(1, '#10287a'); x.fillStyle = g; x.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
        x.strokeStyle = 'rgba(215,200,150,.55)'; for (let k = 1; k < 4; k++) { const px = i * cw + 3 + (cw - 6) * k / 4; x.beginPath(); x.moveTo(px, j * ch + 3); x.lineTo(px, (j + 1) * ch - 3); x.stroke(); } } }),
    cellB: tex(360, 500, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const cw = w / 4, ch = h / 10; for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) { x.fillStyle = '#ddd'; x.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6); } }, false),
    brush: tex(256, 256, (x, w, h) => { x.fillStyle = 'rgb(95,95,95)'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = 60 + Math.random() * 70 | 0; x.strokeStyle = `rgba(${v},${v},${v},.5)`; x.beginPath(); const y = Math.random() * h; x.moveTo(0, y); x.lineTo(w, y + Math.random() * 2 - 1); x.stroke(); } }, false),
    glow: tex(64, 64, x => { const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); }),
  };
  return TX;
}

export function buildCraft(cfg, mission) {
  const t = textures(), labels = [];
  const std = (c, m, r, o) => new T.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r, envMap: ENV, envMapIntensity: 1 }, o));
  const mli = std(0xffffff, 0.85, 0.34, { map: t.foil, bumpMap: t.foilB, bumpScale: 1.6 }),
    silver = std(0xd2d8e4, 1, 1, { roughnessMap: t.brush }), black = std(0x14161c, 0.4, 0.55),
    white = std(0xf0f0f0, 0.15, 0.5, { side: T.DoubleSide }), gold = std(0xe0b04a, 1, 0.22),
    cell = new T.MeshPhysicalMaterial({ map: t.cell, bumpMap: t.cellB, bumpScale: 0.8, metalness: 0.55, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMap: ENV }),
    back = std(0xcfd3da, 0.3, 0.6), glass = std(0x2a4a80, 1, 0.05, { emissive: 0x0a2a55 }), tankM = std(0xdde2ea, 0.9, 0.25),
    panelMats = [black, black, cell, back, black, black];
  const Box = (w, h, d) => new T.BoxGeometry(w, h, d), Cyl = (a, b, h, s, o) => new T.CylinderGeometry(a, b, h, s || 32, 1, !!o);
  const M = (g, m, x, y, z, p) => { const o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (p) p.add(o); return o; };
  const CX = (r, l, m, x, y, z, p) => { const o = M(Cyl(r, r, l), m, x, y, z, p); o.rotation.z = PI / 2; return o; };
  const CZ = (r, l, m, x, y, z, p) => { const o = M(Cyl(r, r, l), m, x, y, z, p); o.rotation.x = PI / 2; return o; };
  const link = (a, b, r, m, p) => { const d = b.clone().sub(a), o = M(Cyl(r, r, d.length(), 8), m, 0, 0, 0, p); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(Y, d.normalize()); return o; };
  const G = () => new T.Group();
  const sat = G(), wingPivots = [];
  const stow = k => k === 0 ? -PI / 2 : (k % 2 ? 3.1 : -3.1);
  const anchor = (p, x, y, z) => { const o = new T.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const label = (obj, text, id) => labels.push({ obj, text, id });
  const parts = {}, leds = [];
  const part = (id, g) => { (parts[id] ||= []).push(g); };
  const big = k => cfg[k] === 'L';
  const has = id => cfg.inst.includes(id);
  const iname = id => { const i = mission.instruments.find(x => x.id === id); return i ? `${i.name} (${i.heritage}-type)` : id; };
  const inst = (id, g, x, y, z) => { sat.add(g); part('inst:' + id, g); label(anchor(g, x, y, z), iname(id), 'inst:' + id); return g; };

  // ---- shared parts
  function rivets(g, w, h, d) {
    const pos = [], run = (len, f) => { for (let u = -len / 2 + 0.25; u < len / 2 - 0.1; u += 0.35) f(u); };
    for (const a of [-1, 1]) for (const b of [-1, 1]) { run(d, u => { pos.push([a * (w / 2 + 0.11), b * h / 2, u], [a * w / 2, b * (h / 2 + 0.11), u]); }); run(h, u => { pos.push([a * (w / 2 + 0.11), u, b * d / 2], [a * w / 2, u, b * (d / 2 + 0.11)]); }); run(w, u => { pos.push([u, a * (h / 2 + 0.11), b * d / 2], [u, a * h / 2, b * (d / 2 + 0.11)]); }); }
    const im = new T.InstancedMesh(new T.SphereGeometry(0.045, 6, 4), silver, pos.length), o = new T.Object3D();
    pos.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); g.add(im);
  }
  function shell(g, w, h, d) {
    rivets(g, w, h, d); M(Box(w, h, d), mli, 0, 0, 0, g);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { M(Box(0.2, 0.2, d + 0.1), silver, a * w / 2, b * h / 2, 0, g); M(Box(0.2, h + 0.1, 0.2), silver, a * w / 2, 0, b * d / 2, g); M(Box(w + 0.1, 0.2, 0.2), silver, 0, a * h / 2, b * d / 2, g); }
  }
  function wingG(side, n, L, W, at, y = 0, pitch) {
    const w = G(), pv = []; CX(0.4, 0.7, silver, 0.35, 0, 0, w); CX(0.13, 1.2, silver, 1.2, 0, 0, w); M(new T.SphereGeometry(0.26, 16, 16), gold, 1.85, 0, 0, w);
    let par = w, px = 1.9;
    for (let k = 0; k < n; k++) {
      const g = G(); g.position.x = px; par.add(g); M(Box(L, 0.09, W), panelMats, L / 2, 0, 0, g);
      for (const z of [-W / 2, W / 2]) M(Box(L + 0.1, 0.14, 0.12), silver, L / 2, 0, z, g); for (const x of [0, L]) M(Box(0.12, 0.14, W), silver, x, 0, 0, g);
      for (const z of [-W / 4, W / 4]) M(Box(L - 0.2, 0.08, 0.08), silver, L / 2, -0.1, z, g); CZ(0.09, W - 0.2, gold, 0, 0, 0, g); pv.push(g); par = g; px = pitch || L + 0.1;
    }
    w.position.set(side * at, y, 0); if (side < 0) w.rotation.y = PI;
    if (side > 0) label(anchor(pv[n - 1], L / 2, 0, 0), `Solar array · ${big('solar') ? '1,800' : '1,200'} W rating · ${n} panel${n > 1 ? 's' : ''} per wing`, 'solar');
    part('solar', w); wingPivots.push(pv); sat.add(w); return w;
  }
  function dishG(r) {
    const g = G(), f = r * 0.75, h = r * r / (4 * f), pts = []; for (let i = 0; i <= 12; i++) { const q = r * i / 12; pts.push(new T.Vector2(q, q * q / (4 * f))); }
    M(new T.LatheGeometry(pts, 40), white, 0, 0, 0, g); M(new T.TorusGeometry(r, 0.04, 8, 48), gold, 0, h, 0, g).rotation.x = PI / 2; M(Cyl(0.05, 0.18, 0.35), gold, 0, f, 0, g);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; link(V(0, -0.03, 0), V(r * Math.cos(a), h - 0.03, r * Math.sin(a)), 0.025, silver, g); }
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; link(V(r * Math.cos(a), h, r * Math.sin(a)), V(0, f, 0), 0.03, silver, g); } return g;
  }
  function dishAt(x, y, z, r, tx) {
    const g = G(); M(Cyl(0.5, 0.6, 0.25), silver, x, y + 0.12, z, g); M(Cyl(0.2, 0.2, 0.8), silver, x, y + 0.6, z, g);
    const d = dishG(r); d.position.set(x, y + 1.1, z); d.rotation.x = tx; g.add(d); sat.add(g); return g;
  }
  function pods(g, w, h, z) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) { const x = a * w, y = b * h; M(Box(0.45, 0.45, 0.45), black, x, y, z, g);
      for (const d of [V(a, 0, 0), V(0, b, 0), V(0, 0, -1)]) { const c = M(Cyl(0.03, 0.12, 0.26, 12), silver, x + d.x * 0.34, y + d.y * 0.34, z + d.z * 0.34, g); c.quaternion.setFromUnitVectors(Y, d); c.rotateX(PI); } }
  }
  function bell(g, x, y, z, s, rx) {
    const bp = []; for (let i = 0; i <= 14; i++) { const u = i / 14; bp.push(new T.Vector2((0.2 + 0.95 * Math.pow(u, 0.65)) * s, u * 1.8 * s)); }
    const m = M(new T.LatheGeometry(bp, 36), std(0xd2d8e4, 1, 0.35, { side: T.DoubleSide }), x, y, z, g); m.rotation.x = rx; return m;
  }
  const trackers = (g, pts) => { for (const [x, y, z] of pts) { M(Box(0.5, 0.4, 0.5), black, x, y, z, g); M(Cyl(0.3, 0.18, 0.45, 16, true), white, x, y + 0.4, z, g); } };
  // engine flame: additive cone plus a glow sprite. The game drives plume.material.opacity.
  let plume;
  function flame(p, len, r, dir) {
    plume = new T.Sprite(new T.SpriteMaterial({ map: t.glow, color: 0xbfe0ff, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    plume.scale.set(r * 4.5, r * 4.5, 1); plume.position.copy(p).addScaledVector(dir, r * 1.2); sat.add(plume);
    const mk = (rt, rb, l, col, k) => { const m = M(new T.CylinderGeometry(rt, rb, l, 24, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, 0, 0, sat);
      m.position.copy(p).addScaledVector(dir, l / 2); m.quaternion.setFromUnitVectors(Y, dir); m.onBeforeRender = () => { m.material.opacity = plume.material.opacity * k; m.scale.x = m.scale.z = 1 + Math.sin(performance.now() * 0.04) * 0.08; }; };
    mk(0.03, r, len, 0x9fd8ff, 0.7); mk(0.02, r * 0.45, len * 0.75, 0xffffff, 0.9);
  }
  const aperture = (g, x, y, z, r) => CZ(r, 0.1, glass, x, y, z, g);

  // Mission spacecraft follow the team's NEXUS04 model file part for part.
  // Game choices map onto them: solar S/L = one panel fewer/more per wing (both wings together),
  // instruments appear only when chosen. Radio, battery and recorder change readouts and labels, not geometry.
  const nPan = base => Math.max(1, base + (big('solar') ? 0 : -1));
  const busLabel = (g, x, y, z, ref) => { part('bus', g); label(anchor(g, x, y, z), `Bus · battery ${big('battery') ? 500 : 100} Wh · recorder ${big('recorder') ? 16 : 4} Gbit`, 'bus'); sat.add(g); };
  const radioLabel = (g, x, y, z) => { part('radio', g); label(anchor(g, x, y, z), big('radio') ? 'High-gain antenna · 20 Mb/s radio' : 'High-gain antenna · 2 Mb/s radio', 'radio'); };
  const engineLabel = (g, x, y, z) => { part('engine', g); label(anchor(g, x, y, z), `Main engine · ${cfg.propKg} kg propellant`, 'engine'); sat.add(g); };

  // ---- ASTRA: Apophis encounter, OSIRIS-APEX heritage
  function astra() {
    const b = G(); shell(b, 3, 3, 3.6); busLabel(b, 1.5, 1.2, 1.8);
    const n = nPan(2); wingG(1, n, 3.2, 3.6, 1.5); wingG(-1, n, 3.2, 3.6, 1.5);
    radioLabel(dishAt(0, 1.5, -0.3, 1.6, 0.7), 0, 3.3, 0.3);
    if (has('cam')) { const g = G(); for (const x of [-0.9, 0]) { M(Box(0.7, 0.7, 0.7), black, x, 0.8, 2.1, g); aperture(g, x, 0.8, 2.5, 0.22); } inst('cam', g, -0.45, 0.8, 2.6); }
    if (has('alt')) { const g = G(); CZ(0.3, 0.9, black, 0.9, -0.6, 2.3, g); aperture(g, 0.9, -0.6, 2.8, 0.2); inst('alt', g, 0.9, -0.6, 2.9); }
    if (has('vis')) { const g = G(); CZ(0.35, 1.3, silver, 0.9, 0.8, 2.5, g); aperture(g, 0.9, 0.8, 3.2, 0.25); inst('vis', g, 0.9, 0.8, 3.3); }
    if (has('tes')) { const g = G(); M(Box(0.9, 0.7, 0.9), silver, -0.9, -0.6, 2.2, g); CZ(0.28, 0.1, gold, -0.9, -0.6, 2.7, g); inst('tes', g, -0.9, -0.6, 2.8); }
    { const g = G(), a1 = V(0, -1.5, 1.8), a2 = V(0, -1.4, 4.2), a3 = V(0, -0.5, 5.5); link(a1, a2, 0.09, silver, g); link(a2, a3, 0.09, silver, g);
      for (const p of [a1, a2, a3]) M(new T.SphereGeometry(0.2, 16, 16), gold, p.x, p.y, p.z, g);
      M(Cyl(0.7, 0.55, 0.6, 28, true), white, 0, -0.5, 5.8, g).rotation.x = PI / 2; M(Cyl(0.5, 0.5, 0.05), black, 0, -0.5, 5.5, g).rotation.x = PI / 2;
      sat.add(g); part('arm', g); label(anchor(g, 0, -0.5, 5.8), 'Sampling arm', 'arm'); }
    { const g = G(); bell(g, 0, 0, -1.8, 0.8, -PI / 2); M(Cyl(1.3, 1.45, 0.4, 40, true), std(0xd2d8e4, 1, 0.4, { side: T.DoubleSide }), 0, 0, -1.95, g).rotation.x = PI / 2; M(new T.TorusGeometry(1.4, 0.06, 8, 40), silver, 0, 0, -2.15, g);
      pods(g, 1.6, 1.6, -1.5); engineLabel(g, 0, 0, -3.3); }
    { const g = G(); trackers(g, [[1, 1.75, 1.2], [-1, 1.75, 1.2]]); sat.add(g); }
    flame(V(0, 0, -3.25), 2.4, 0.5, V(0, 0, -1));
  }

  // ---- LUNARIS: lunar polar orbiter, LRO heritage
  function lunaris() {
    const b = G(); shell(b, 3, 2.6, 3.6); M(Box(2.8, 0.15, 3.2), silver, 0, -1.7, 0, b); busLabel(b, 1.5, 1, 1.8);
    wingG(1, nPan(2), 3.2, 3.2, 1.5);
    radioLabel(dishAt(0, 1.3, -1, 1.6, 0.6), 0, 3.2, -0.6);
    if (has('cam')) { const g = G(); for (const x of [-1, -0.5]) { M(Cyl(0.2, 0.22, 1.5), black, x, -2.55, 0.9, g); M(Cyl(0.3, 0.2, 0.3, 20, true), white, x, -3.4, 0.9, g); } M(Box(0.4, 0.4, 0.4), black, -0.75, -2.2, 1.5, g); inst('cam', g, -0.75, -3.4, 0.9); }
    if (has('alt')) { const g = G(); M(Cyl(0.35, 0.4, 1.1), silver, 0.9, -2.3, 1, g); M(Cyl(0.3, 0.3, 0.05), glass, 0.9, -2.88, 1, g); inst('alt', g, 0.9, -2.9, 1); }
    if (has('rad')) { const g = G(); M(Box(0.8, 0.8, 0.8), silver, -0.9, -2.2, -1.1, g); M(Cyl(0.25, 0.25, 0.05), gold, -0.9, -2.63, -1.1, g); inst('rad', g, -0.9, -2.65, -1.1); }
    if (has('neu')) { const g = G(); M(Box(1, 1.1, 1), white, 0.9, -2.25, -1.1, g); inst('neu', g, 0.9, -2.25, -1.1); }
    if (has('sar')) { const g = G(); M(Cyl(0.1, 0.1, 0.3), silver, 0, -1.8, -0.1, g); const d = dishG(0.55); d.position.set(0, -1.9, -0.1); d.rotation.x = PI; g.add(d); inst('sar', g, 0, -2.7, -0.1); }
    { const g = G(); bell(g, 0, 0, -1.8, 0.7, -PI / 2); M(Cyl(1.3, 1.45, 0.4, 40, true), std(0xd2d8e4, 1, 0.4, { side: T.DoubleSide }), 0, 0, -1.95, g).rotation.x = PI / 2; M(new T.TorusGeometry(1.4, 0.06, 8, 40), silver, 0, 0, -2.15, g);
      pods(g, 1.5, 1.3, -1.5); engineLabel(g, 0, 0, -3.2); }
    { const g = G(); trackers(g, [[1, 1.55, 1.2], [-1, 1.55, 1.2]]); sat.add(g); }
    flame(V(0, 0, -3.07), 2.2, 0.45, V(0, 0, -1));
  }

  // ---- HALO: Earth atmosphere, Aura-like illustrative model
  function halo() {
    const b = G(); shell(b, 2.6, 2.6, 3.8); busLabel(b, 1.3, 0, 1.9);
    wingG(1, nPan(2), 3, 3.2, 1.3);
    radioLabel(dishAt(0, 1.3, -0.8, 0.9, 0.4), 0, 2.3, -0.5);
    if (has('uv')) { const g = G(); M(Box(1.7, 0.9, 1.5), silver, 0, -1.8, 0.5, g); M(Box(1.2, 0.05, 0.6), glass, 0, -2.28, 0.5, g); M(Box(1.9, 0.1, 0.1), black, 0, -2.3, -0.4, g); inst('uv', g, 0, -2.3, 0.5); }
    if (has('limb')) { const g = G(); M(Box(1.2, 1.2, 1.4), silver, 0, 0.2, 2.3, g); const d = dishG(1.1); d.position.set(0, 0.2, 3.1); d.rotation.x = PI / 2; g.add(d); inst('limb', g, 0, 0.2, 4.1); }
    // Imager and infrared sounder are game choices with no part in the reference model: small nadir boxes in the same style.
    if (has('img')) { const g = G(); M(Box(0.8, 0.7, 0.8), black, -0.75, -1.6, -1.1, g); CX(0.3, 0.9, silver, -0.75, -2.05, -1.1, g); inst('img', g, -0.75, -2.3, -1.1); }
    if (has('ir')) { const g = G(); M(Box(0.8, 0.7, 0.8), white, 0.75, -1.6, -1.1, g); aperture(g, 0.75, -1.6, -0.68, 0.22); inst('ir', g, 0.75, -2, -1.1); }
    { const g = G(); M(Box(2.4, 2.4, 0.08), white, 0, 0, -1.95, g); for (let i = 0; i < 9; i++) M(Box(2.2, 0.05, 0.5), white, 0, -1 + i * 0.25, -2.25, g);
      bell(g, 0.8, -0.8, -1.95, 0.3, -PI / 2); bell(g, -0.8, -0.8, -1.95, 0.3, -PI / 2); engineLabel(g, 0, 0, -2.4); }
    { const g = G(); trackers(g, [[0.6, 1.5, -1.4], [-0.6, 1.5, -1.4]]); sat.add(g); }
    flame(V(0, 0, -2.5), 1.2, 0.35, V(0, 0, -1));
  }

  // ---- JEZERO ECHO: Mars reconnaissance orbiter, MRO heritage
  function mars() {
    const bus = G(); M(Box(4, 4, 5), mli, 0, 0, 0, bus); rivets(bus, 4, 4, 5);
    for (const a of [-1, 1]) for (const c of [-1, 1]) { M(Box(0.22, 0.22, 5.1), silver, a * 2, c * 2, 0, bus); M(Box(0.22, 4.1, 0.22), silver, a * 2, 0, c * 2.5, bus); M(Box(4.1, 0.22, 0.22), silver, 0, a * 2, c * 2.5, bus); }
    for (const s2 of [-1, 1]) for (const z of [-1.1, 1.1]) M(Box(4.02, 0.03, 0.1), black, 0, s2 * 2.01, z, bus);
    M(Box(2.4, 0.05, 2.6), silver, 0, 2.03, 0.2, bus); for (let i = 0; i < 4; i++) M(Cyl(0.07, 0.07, 0.06, 10), black, (i % 2 ? 1 : -1) * 1.1, 2.08, 0.2 + (i < 2 ? -1 : 1) * 1.1, bus);
    leds.push(M(new T.SphereGeometry(0.08, 12, 12), new T.MeshBasicMaterial({ color: 0x44ff88 }), -1.9, 1.7, 2.52, bus), M(new T.SphereGeometry(0.08, 12, 12), new T.MeshBasicMaterial({ color: 0xff4444 }), -1.6, 1.7, 2.52, bus));
    busLabel(bus, 2, 1, 2.4);
    { const g = G(); M(Box(3.6, 0.08, 4.4), white, 0, -2.12, 0, g); for (let i = 0; i < 9; i++) M(Box(3.4, 0.55, 0.05), white, 0, -2.42, -1.8 + i * 0.45, g); sat.add(g); }
    const n = nPan(3); wingG(1, n, 3.6, 5, 2, 0, 3.7); wingG(-1, n, 3.6, 5, 2, 0, 3.7);
    { const dish = G(); dish.position.set(0, 2, -0.4); const k = 1;
      M(Cyl(0.8, 0.9, 0.35), silver, 0, 0.18, 0, dish); M(Cyl(0.3, 0.3, 0.9), silver, 0, 0.7, 0, dish); M(Box(1.6, 0.2, 0.2), silver, 0, 1.2, 0, dish);
      const dg = G(); dg.position.set(0, 2.1, 0); dg.rotation.x = 0.75; dish.add(dg);
      link(V(-0.8, 1.2, 0), V(-0.5, 2.1, 0), 0.09, silver, dish); link(V(0.8, 1.2, 0), V(0.5, 2.1, 0), 0.09, silver, dish);
      const dp = []; for (let i = 0; i <= 14; i++) { const r = i * 0.15 * k; dp.push(new T.Vector2(r, r * r / 6.4)); }
      M(new T.LatheGeometry(dp, 48), white, 0, 0, 0, dg); M(new T.TorusGeometry(2.1 * k, 0.05, 8, 64), gold, 0, 0.69, 0, dg).rotation.x = PI / 2;
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; link(V(0, -0.03, 0), V(2.1 * Math.cos(a), 0.66, 2.1 * Math.sin(a)), 0.03, silver, dg); }
      for (let i = 0; i < 3; i++) { const a = i * 2 * PI / 3 + 0.5; link(V(2.1 * Math.cos(a), 0.69, 2.1 * Math.sin(a)), V(0, 1.6, 0), 0.035, silver, dg); }
      M(Cyl(0.06, 0.22, 0.45), gold, 0, 1.62, 0, dg); sat.add(dish); radioLabel(dish, 0, 3.2, 0.8); }
    M(Box(3.6, 3.6, 0.12), black, 0, 0, 2.56, sat);
    if (has('hir')) { const g = G(); CZ(0.85, 2.6, black, 0, -0.3, 3.8, g); M(Cyl(1.25, 0.9, 1.3, 40, true), white, 0, -0.3, 5.5, g).rotation.x = PI / 2; M(Cyl(0.82, 0.82, 0.06), glass, 0, -0.3, 4.9, g).rotation.x = PI / 2;
      M(Cyl(0.16, 0.16, 0.06), silver, 0, -0.3, 5.4, g).rotation.x = PI / 2; for (let i = 0; i < 3; i++) { const a = i * 2 * PI / 3 + 0.4; link(V(1.05 * Math.cos(a), -0.3 + 1.05 * Math.sin(a), 5.9), V(0, -0.3, 5.4), 0.025, silver, g); } inst('hir', g, 0, -0.3, 5.9); }
    if (has('cri')) { const g = G(); M(Box(1.2, 1, 1.6), silver, 1.35, 1.3, 3.4, g); CZ(0.2, 0.1, black, 1.35, 1.3, 4.2, g); inst('cri', g, 1.35, 1.3, 4.25); }
    if (has('ctx')) { const g = G(); M(Box(0.9, 0.9, 0.9), black, -1.3, 1.4, 3.1, g); aperture(g, -1.3, 1.4, 3.6, 0.28); inst('ctx', g, -1.3, 1.4, 3.65); }
    if (has('uhf')) { const g = G(), pts = []; for (let i = 0; i <= 60; i++) { const a = i * 0.55; pts.push(V(0.5 * Math.cos(a), -2.8 - i * 0.04, 1 + 0.5 * Math.sin(a))); }
      M(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 180, 0.04, 6), gold, 0, 0, 0, g); link(V(0, -2.7, 1), V(0, -5.3, 1), 0.05, silver, g); inst('uhf', g, 0.5, -4, 1); }
    { const g = G(); for (const s2 of [-1, 1]) { M(Box(0.6, 0.6, 0.7), black, s2 * 1.4, -1.3, 3.1, g); M(Cyl(0.38, 0.22, 0.5, 16, true), white, s2 * 1.4, -1.3, 3.6, g).rotation.x = PI / 2;
        M(Cyl(0.22, 0.22, 0.05), glass, s2 * 1.5, 2.06, 1.2, g); M(Cyl(0.22, 0.22, 0.05), glass, s2 * 1.5, 2.06, -1.6, g); M(Cyl(0.04, 0.2, 0.35), gold, s2 * 1, 2.2, 0.5, g); link(V(s2 * 1, -2.1, -1), V(s2 * 1, -3.3, -1), 0.02, silver, g); } sat.add(g); }
    { const g = G(); link(V(0, 2.15, -2.4), V(0, 2.15, -7), 0.06, silver, g); for (const z of [-3.5, -5.2]) CZ(0.1, 0.15, gold, 0, 2.15, z, g); M(Box(0.3, 0.3, 0.3), gold, 0, 2.15, -7.1, g); sat.add(g); part('mag', g); label(anchor(g, 0, 2.15, -7), 'SHARAD radar boom', 'mag'); }
    { const g = G(); bell(g, 0, 0, -2.5, 1, -PI / 2); CZ(0.35, 0.7, silver, 0, 0, -2.6, g); M(Cyl(1.7, 1.9, 0.45, 48, true), std(0xd2d8e4, 1, 0.4, { side: T.DoubleSide }), 0, 0, -2.75, g).rotation.x = PI / 2; M(new T.TorusGeometry(1.8, 0.07, 8, 48), silver, 0, 0, -3, g);
      for (const s2 of [-1, 1]) link(V(0, 0, -2.4), V(s2 * 1.6, -1, -2.5), 0.05, silver, g); engineLabel(g, 0, 0, -4.3); }
    { const g = G(); pods(g, 2.3, 2.3, -2.2); sat.add(g); }
    flame(V(0, 0, -4.3), 2.4, 0.6, V(0, 0, -1));
  }

  ({ astra, lunaris, earth: halo, mars }[mission.id] || mars)();

  // every craft has the same overall size, so each scene can use one scale
  // fixed per mission (span with large arrays = 5.4 units), so picking bigger arrays grows the wings, not shrinks the bus
  const k = { astra: 0.27, lunaris: 0.27, earth: 0.29, mars: 0.178 }[mission.id] || 0.25;
  const group = G(); sat.scale.setScalar(k); group.add(sat);
  const setDeploy = d => wingPivots.forEach(pv => pv.forEach((g, i) => { g.rotation.z = (1 - d) * stow(i); }));
  // inspection: glow the chosen part (emissive tint on its own material copies)
  let lit = null;
  const highlight = id => {
    if (lit) lit.forEach(([m, e, i]) => { m.emissive.copy(e); m.emissiveIntensity = i; }); lit = null;
    if (!id || !parts[id]) return;
    lit = [];
    parts[id].forEach(g => g.traverse(o => { if (!o.isMesh || !o.material) return;
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      [].concat(o.material).forEach(m => { if (!m.emissive) return; lit.push([m, m.emissive.clone(), m.emissiveIntensity]); m.emissive.set(0x4aa8ff); m.emissiveIntensity = 0.55; }); }));
  };
  group.userData = { plume, setDeploy, highlight, parts, leds };
  return { group, labels };
}
