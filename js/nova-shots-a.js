// Story shots for Nebula, Star Life and Planet Formation.
import { V, P, TAU, rgb, rng, gauss, mix, ease } from './nova-gl.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const step = (n, k) => Math.min(k - 1, Math.floor(n * k));

// ---------- HUD helpers (2D overlay) ----------
export function panel(g, w, h, pw, ph, title) {
  const narrow = w < 720;
  const x = narrow ? (w - pw) / 2 : w - pw - 28, y = narrow ? h - ph - 18 : h - ph - 70;
  g.save();
  g.fillStyle = 'rgba(14,16,48,.72)'; g.strokeStyle = 'rgba(160,140,255,.35)'; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(x, y, pw, ph, 18); g.fill(); g.stroke();
  if (title) { g.fillStyle = '#9fe9ff'; g.font = '700 11px system-ui'; g.letterSpacing = '1.5px'; g.fillText(title.toUpperCase(), x + 16, y + 22); g.letterSpacing = '0px'; }
  g.restore();
  return [x, y];
}
export function timeline(g, w, h, o) {
  const pw = Math.min(380, w - 36), ph = 92; const [x, y] = panel(g, w, h, pw, ph, o.title);
  const x0 = x + 18, x1 = x + pw - 18, yy = y + 52;
  const grad = g.createLinearGradient(x0, 0, x1, 0); (o.colors || ['#ff5fae', '#ffd45a']).forEach((c, i, a) => grad.addColorStop(i / (a.length - 1), c));
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(x0, yy - 5, x1 - x0, 10, 5); g.fill();
  g.fillStyle = grad; g.beginPath(); g.roundRect(x0, yy - 5, (x1 - x0) * (o.fill ?? 1), 10, 5); g.fill();
  g.fillStyle = '#c8d0f0'; g.font = '600 10.5px system-ui'; g.textAlign = 'center';
  (o.ticks || []).forEach(([t, s]) => { const xx = mix(x0, x1, t); g.fillRect(xx - .5, yy + 7, 1, 5); g.fillText(s, Math.max(x0 + 14, Math.min(x1 - 14, xx)), yy + 25); });
  if (o.marker !== undefined) { const xx = mix(x0, x1, o.marker); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 12; g.beginPath(); g.arc(xx, yy, 7, 0, TAU); g.fill(); g.shadowBlur = 0;
    if (o.markerText) { g.font = '700 12px system-ui'; g.fillStyle = '#fff'; g.fillText(o.markerText, Math.max(x0 + 40, Math.min(x1 - 40, xx)), yy - 14); } }
  g.textAlign = 'left';
}
export function readout(g, w, h, rows, title) {
  const pw = 250, ph = 34 + rows.length * 24; const [x, y] = panel(g, w, h, pw, ph, title);
  rows.forEach(([a, b, c], i) => {
    g.font = '600 12px system-ui'; g.fillStyle = '#b9c2e6'; g.fillText(a, x + 16, y + 46 + i * 24);
    g.font = '800 14px system-ui'; g.fillStyle = c || '#fff'; g.textAlign = 'right'; g.fillText(b, x + pw - 16, y + 46 + i * 24); g.textAlign = 'left';
  });
}
export function curve(g, w, h, f, o = {}) {
  const pw = Math.min(360, w - 36), ph = 150; const [x, y] = panel(g, w, h, pw, ph, o.title);
  const x0 = x + 16, x1 = x + pw - 16, y0 = y + ph - 18, y1 = y + 34;
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.strokeStyle = o.color || '#52e4ff'; g.lineWidth = 2.5; g.shadowColor = o.color || '#52e4ff'; g.shadowBlur = 8; g.beginPath();
  for (let i = 0; i <= 200; i++) { const t = i / 200; const v = f(t); const px = mix(x0, x1, t), py = mix(y0, y1, clamp(v)); i ? g.lineTo(px, py) : g.moveTo(px, py); if (o.until !== undefined && t > o.until) break; }
  g.stroke(); g.shadowBlur = 0; g.lineWidth = 1;
  if (o.until !== undefined) { const t = clamp(o.until); g.fillStyle = '#fff'; g.beginPath(); g.arc(mix(x0, x1, t), mix(y0, y1, clamp(f(t))), 5, 0, TAU); g.fill(); }
  if (o.note) { g.fillStyle = '#c8d0f0'; g.font = '600 11px system-ui'; g.fillText(o.note, x0, y0 + 14); }
}

// ---------- Composite helpers ----------
export function protostar(k, o = {}) {
  const st = k.star({ r: o.r ?? .35, color: o.color ?? 0xffc27a, glow: 0xff9a5a, spikes: o.spikes ?? .5 });
  const disk = k.disk({ rin: .45, rout: o.rout ?? 4, n: o.n ?? 14000, thick: .05, spin: o.spin ?? .45, seed: o.seed ?? 9, gaps: o.gaps });
  const haze = k.disk({ rin: .4, rout: (o.rout ?? 4) * 1.05, n: 1400, thick: .12, spin: .3, seed: 41, size: 0, color: t => t < .4 ? P.gold : P.purple });
  haze.u.uAlpha.value = .7;
  return { st, disk, haze };
}
function sunLike(k, o = {}) { return k.star({ r: o.r ?? 1, color: o.color ?? 0xffc04a, glow: o.glow ?? 0xff9a3a, spikes: o.spikes ?? .3, pos: o.pos, gran: o.gran, spots: o.spots }); }
export function milkyBand(k, o = {}) { // Milky Way band across the sky, like the solar-system reel.
  const cols = [0xfff0dc, 0xd8e0ff, 0xffd8b0, 0xc8b8e8];
  const tilt = o.tilt ?? .5;
  const place = (R, spread) => { const a = R() * TAU, lat = gauss(R) * spread; const x = Math.cos(a) * Math.cos(lat), y = Math.sin(lat), z = Math.sin(a) * Math.cos(lat); return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)]; };
  k.make(o.n ?? 9000, (i, R) => { const [x, y, z] = place(R, .09); return [x * 800, y * 800, z * 800, cols[i % 4], 1.2 + R() * 1.2, .25 + R() * .45]; }, { fixed: true, seed: 61, follow: true, soft: 5 });
  k.make(320, (i, R) => { const [x, y, z] = place(R, .07); return [x * 700, y * 700, z * 700, i % 5 ? 0x8a7a98 : 0x5a4a5a, 90 + R() * 120, .06]; }, { seed: 62, follow: true, defines: { GAS: 1 } });
}
export function solarSystem(k, o = {}) {
  const sun = sunLike(k, { r: .55, spikes: .45, gran: 9, spots: .25 });
  const pl = [[1.2, .1, 'mercury.jpg'], [1.7, .17, 'venus.jpg'], [2.3, .19, 'earth-day.jpg'], [2.9, .13, 'mars.jpg'],
    [4.4, .5, 'planets/jupiter.jpg'], [5.8, .42, 'planets/saturn.jpg', 0xffffff], [7.1, .3, 'planets/uranus.jpg'], [8.2, .29, 'planets/neptune.jpg']];
  const bodies = pl.map(([r, s, map, ring], i) => {
    k.orbit(r, i < 4 ? 0x9ad0ff : 0xc0a8ff, .22);
    const p = k.planet({ r: s, map: map.includes('/') || map.startsWith('earth') || map.startsWith('mars') ? map : 'planets/' + map, rim: i === 2 ? 0x7fc0ff : 0xffffff, seed: i * 1.7, ring, amb: .04 });
    if (ring) p.mesh.children[0]?.rotation.set(-Math.PI / 2 + .45, 0, 0);
    return { ...p, r, w: .9 / Math.pow(r, 1.5), ph: i * 1.9 };
  });
  const belt = k.disk({ rin: 3.4, rout: 3.9, n: 2500, thick: .03, spin: .25, size: .03, color: () => 0xb8a890, seed: 51 });
  const kuiper = k.disk({ rin: 9, rout: 11, n: 2600, thick: .08, spin: .05, size: .04, color: () => P.ice, seed: 52, bright: .6 });
  k.on((t) => { for (const b of bodies) { const a = b.ph + t * b.w * (o.speed ?? .6); b.mesh.position.set(Math.cos(a) * b.r, 0, Math.sin(a) * b.r); b.mesh.rotation.y = t * .3; } });
  if (o.band !== false) milkyBand(k);
  return { sun, bodies, belt, kuiper };
}
// Two neutron stars spiral in, collide, flash, throw a magenta ring and orange jets, leave a blue remnant.
export function merger(k, o = {}) {
  const g = k.group(o.parent);
  const A = k.star({ r: .28, color: 0xd8f4ff, glow: 0x7fe0ff, spikes: .6, parent: g }), B = k.star({ r: .28, color: 0xd8f4ff, glow: 0x7fe0ff, spikes: .6, parent: g });
  const trails = [0, 1].map(j => { const pts = []; for (let i = 0; i <= 200; i++) { const t = i / 200, r = 2.4 * (1 - t * .9), a = t * 14 + j * Math.PI; pts.push(V(Math.cos(a) * r, 0, Math.sin(a) * r)); } return k.ray(pts, P.cyan, { n: 900, size: .1, speed: .35, bright: .7, parent: g }); });
  const flash = k.glow([0, 0, 0], 9, 0xffffff, 0); g.add(flash);
  const ring = k.shell({ r: 1, n: 5000, flat: .04, thick: .03, colors: [P.pink, P.purple, 0xff7ae0], lumpy: .2, parent: g, bright: 2 });
  const jet = k.jet({ n: 3000, color: P.orange, len: 4, w: .1, parent: g, size: .14 });
  const rem = k.cloud({ n: 3000, r: .9, colors: [0x9fd8ff, 0xd8f0ff, P.purple], seed: 71, parent: g, turb: .08, gas: 40 });
  const h = { g, set(p) { // p: 0 inspiral -> 1 remnant
    const ins = Math.min(1, p / .6), sep = 2.4 * Math.pow(1 - ins, .7) + .02, a = Math.pow(ins, 2.2) * 40;
    A.g.position.set(Math.cos(a) * sep / 2, 0, Math.sin(a) * sep / 2); B.g.position.set(-Math.cos(a) * sep / 2, 0, -Math.sin(a) * sep / 2);
    const post = Math.max(0, (p - .6) / .4); A.fade(post > 0 ? 0 : 1); B.fade(post > 0 ? 0 : 1);
    trails.forEach(t => t.u.uAlpha.value = post > 0 ? 0 : .3 + ins * .7);
    flash.material.opacity = post > 0 ? Math.max(0, 1 - post * 2.2) : 0; flash.scale.setScalar(4 + post * 14);
    ring.u.uAlpha.value = post > 0 ? 1 - post * .6 : 0; ring.u.uExpand.value = .3 + post * 3.4;
    jet.u.uAlpha.value = post > .05 ? .9 : 0; jet.u.uJetLen.value = .5 + post * 4;
    rem.u.uAlpha.value = post > .1 ? Math.min(1, post * 2) : 0; rem.u.uExpand.value = .2 + post * .9;
    k.shake = post > 0 && post < .12 ? .06 : 0; } };
  h.set(0); return h;
}
// Pairs of systems crossfaded by the dial: f(n) -> index weight.
function fadePair(a, b, n) { a.u.uAlpha.value = 1 - n; b.u.uAlpha.value = n; }
function rocks(k, n, spread, o = {}) {
  const list = []; const R = rng(o.seed || 17);
  for (let i = 0; i < n; i++) {
    const r = (o.min ?? .05) + Math.pow(R(), 3) * (o.max ?? .5);
    const a = R() * TAU, d = (o.rin ?? 0) + R() * spread;
    const p = k.planet({ r, type: 'rocky', a: o.a ?? 0x5a4a44, b: o.b ?? 0xa89080, rim: o.rim ?? 0x553344, seed: R() * 9, pos: [Math.cos(a) * d, gauss(R) * (o.h ?? .3), Math.sin(a) * d], sun: o.sun || [0, 0, 0], amb: .12 });
    p.mesh.scale.set(r * (1 + R() * .4), r * (.7 + R() * .3), r);
    p.base = p.mesh.scale.clone(); p.a = a; p.d = d; list.push(p);
  }
  return list;
}

// ===================== NEBULA =====================
const nebula = [
  k => { // A cloud in the dark
    const c = k.cloud({ n: 16000, r: 4.2, seed: 3, gas: 300, blobs: [[0, 0, 0, 1], [1.8, .4, -1, .7], [-2, -.3, .8, .6]] });
    k.nebulaSky(); k.cam({ d: 9, el: 10, drift: .04 });
    k.on((t, n) => { c.u.uAlpha.value = .4 + n * .6; c.u.uTurb.value = .03 + n * .05; });
  },
  k => { // How thin is thin
    const air = k.make(3200, (i, R) => [-.6 + (R() - .5) * 2.4, (R() - .5) * 2.4, (R() - .5) * 2.4, P.cyan, .06, .9], { seed: 4 });
    const neb = k.make(10, (i, R) => [2.8 + (R() - .5) * 2.2, (R() - .5) * 2.2, (R() - .5) * 2.2, P.pink, .14, 1.4], { seed: 5 });
    const b1 = k.box(2.5, P.cyan, .6); b1.position.x = -.6; const b2 = k.box(2.5, P.pink, .6); b2.position.x = 2.8;
    k.label('A cube of air', [-.6, -1.8, 0], 'cyan'); k.label('A cube of nebula', [2.8, -1.8, 0], 'pink');
    air.u.uTurb.value = .05; neb.u.uTurb.value = .08;
    k.cam({ d: 8.5, el: 14, drift: .02 });
    k.on((t, n) => { k.camCfg.target.x = mix(1.1, 2.8, n); k.zoom = mix(1, .45, n); });
  },
  k => { // How big
    k.cloud({ n: 9000, r: 3, seed: 6, bright: .5 });
    const ticks = []; for (let i = 0; i <= 10; i++) { k.glow([-6 + i * 1.2, -2.6, 0], .35, P.yellow, .9); if (i % 2 === 0) ticks.push(k.label(i * 10 + ' ly', [-6 + i * 1.2, -3.1, 0], 'small')); }
    k.line([V(-6, -2.6, 0), V(6, -2.6, 0)], P.yellow, .7);
    const pulse = k.glow([-6, -2.6, 0], 1.1, 0xffffff, 1); const lab = k.label('', () => pulse.position.clone().add(V(0, .6, 0)), 'yellow');
    let x = 0;
    k.cam({ d: 10, el: 6, drift: .015 });
    k.on((t, n, dt) => { x = (x + dt * (.02 + n * .35)) % 1; pulse.position.x = -6 + x * 12; lab.set(Math.round(x * 100) + ' years of travel at light speed'); });
  },
  k => { // What it's made of
    const c = k.cloud({ n: 12000, r: 4, seed: 7 });
    const atoms = k.group(); const parts = [];
    const mkAtom = (x, he) => {
      const g = k.group(atoms); g.position.x = x;
      const nuc = he ? [[.13, 0, 0, P.pink], [-.13, 0, 0, P.pink], [0, .13, 0, P.ice], [0, -.13, 0, P.ice]] : [[0, 0, 0, P.pink]];
      nuc.forEach(([a, b, c2, col]) => { const s = k.glow([a, b, c2], .5, col, 1); g.add(s); });
      const orbits = he ? 2 : 1; for (let i = 0; i < orbits; i++) { const o = k.orbit(1.1, P.cyan, .5, { parent: g }); o.rotation.set(i * 1.1 + .4, i * .7, 0); const e = k.glow([1.1, 0, 0], .35, P.cyan, 1); o.add(e); parts.push([o, e, i]); }
      k.label(he ? 'Helium' : 'Hydrogen', [x, -1.6, 0], he ? 'yellow' : 'pink');
    };
    mkAtom(-1.6, false); mkAtom(1.6, true);
    k.cam({ d: 7, el: 10, drift: .03 });
    k.on((t, n) => {
      c.u.uAlpha.value = 1 - ease(n * 1.3); c.u.uExpand.value = 1 + n * 3;
      atoms.scale.setScalar(.2 + ease((n - .2) / .6) * .8); atoms.visible = n > .12;
      for (const [o, e, i] of parts) { const a = t * (2.2 + i); e.position.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1); }
    });
  },
  k => { // Gas and dust
    const gas = k.make(5000, (i, R) => [gauss(R) * 3, gauss(R) * 2, gauss(R) * 3, i % 2 ? P.cyan : P.purple, .05, .7], { seed: 8, u: { uTurb: .25 } });
    const grain = k.planet({ r: .6, type: 'rocky', a: 0x3a2c30, b: 0x8a6a60, rim: 0xff8ad8, sun: [5, 3, 4], amb: .1 });
    grain.mesh.scale.set(.7, .5, .55);
    const dust = k.make(400, (i, R) => [gauss(R) * 2.5, gauss(R) * 1.5, gauss(R) * 2.5, 0xffb38a, .12, .6], { seed: 9, u: { uTurb: .12 } });
    k.label('Dust grain', [0, -.9, 0], 'yellow'); k.label('Gas molecules', [2.2, 1.4, 0], 'cyan');
    k.cam({ d: 5.5, el: 12, drift: .05 });
    k.on((t, n) => { grain.mesh.rotation.y = t * .2; grain.mesh.rotation.x = t * .13; dust.u.uAlpha.value = .2 + n * 1.2; const s = .5 + n * .5; grain.mesh.scale.set(.7 * s, .5 * s, .55 * s); });
  },
  k => { // Dark nebula
    k.skyOpts = { n: 5000, bright: 1.3 };
    const back = k.cloud({ n: 9000, r: 6, seed: 10, colors: [P.pink, P.orange, P.purple], bright: .6 }); back.obj.position.z = -6;
    const dark = k.cloud({ n: 5000, r: 2.6, seed: 11, colors: [0x05040b], blend: 'dark', big: .35, bright: 1, haze: 14, blobs: [[0, 0, 0, 1], [.9, 1.1, 0, .6], [-.5, 1.9, 0, .4]] });
    k.cam({ d: 9, el: 4, drift: .02 });
    k.on((t, n) => { back.u.uAlpha.value = .25 + n * 1.1; });
  },
  k => { // Hidden stars
    k.skyOpts = { n: 5000, bright: 1.2 };
    const back = k.cloud({ n: 8000, r: 6, seed: 10, colors: [P.pink, P.orange, P.purple], bright: .5 }); back.obj.position.z = -6;
    const dark = k.cloud({ n: 5000, r: 2.6, seed: 11, colors: [0x05040b], blend: 'dark', big: .35, haze: 14 });
    const hidden = [[0, .3, .2], [.8, -.4, 0], [-.7, .8, .3], [.3, 1.4, 0], [-.4, -.7, .4]].map(p => k.star({ r: .08, pos: p, color: 0xffb070, spikes: .6 }));
    k.cam({ d: 8, el: 4, drift: .02 });
    k.on((t, n) => { dark.u.uAlpha.value = 1 - n * .85; hidden.forEach(s => s.fade(ease((n - .15) / .6))); back.tint(0xff9a40, n); });
  },
  k => { // Reflection nebula
    const st = k.star({ r: .45, color: 0xd8e8ff, glow: 0x9fc0ff, spikes: .7 });
    const c = k.cloud({ n: 14000, r: 3.4, seed: 12, colors: [0x6fa0ff, 0xa8d0ff, 0x4a70ff, 0xc0e0ff], bright: .7 });
    k.cam({ d: 8, el: 12, drift: .035 });
    k.on((t, n) => { c.u.uAlpha.value = .3 + n * 1.1; st.setR(.35 + n * .2); });
  },
  k => { // Emission nebula
    const st = k.star({ r: .4, color: 0xcfe0ff, glow: 0x8fb0ff, spikes: .8 });
    const sh = k.shell({ r: 2.6, n: 14000, thick: .12, colors: [P.red, P.orange, 0xff6a8a, P.pink], lumpy: 1.4 });
    const c = k.cloud({ n: 7000, r: 3.5, seed: 13, colors: [P.red, 0xff7a40, P.pink], bright: .4 });
    k.cam({ d: 9, el: 14, drift: .04 });
    k.on((t, n) => { sh.u.uAlpha.value = .25 + n; sh.u.uExpand.value = .75 + n * .35 + Math.sin(t * .8) * .01; c.u.uAlpha.value = .3 + n * .8; });
  },
  k => { // Colors are chemistry
    const st = k.star({ r: .4, color: 0xcfe0ff, glow: 0x8fb0ff, spikes: .8 });
    const sh = k.shell({ r: 2.6, n: 14000, thick: .12, colors: [0xffffff, 0xd8d8e8], lumpy: 1.4 });
    const c = k.cloud({ n: 7000, r: 3.5, seed: 13, colors: [0xffffff, 0xccccdd], bright: .35 });
    const tag = k.label('', [0, 3.3, 0], 'big');
    k.cam({ d: 9, el: 14, drift: .04 });
    const F = [['Hydrogen filter', P.red], ['Oxygen filter', P.teal], ['Sulfur filter', P.gold]];
    k.on((t, n) => { const [name, col] = F[step(n, 3)]; sh.tint(col, .9); c.tint(col, .9); tag.set(name); });
  },
  k => { // Infrared view
    const c = k.cloud({ n: 16000, r: 4, seed: 14, colors: [0xe0e0ff, 0xc8c8e8, 0xffffff] });
    const hid = [[.3, .2, 0], [-1, .6, .3], [1.2, -.4, .2]].map(p => k.star({ r: .07, pos: p, color: 0xffd0a0, spikes: .5 }));
    k.cam({ d: 9, el: 8, drift: .03 });
    k.on((t, n) => { c.tint(n < .5 ? P.purple : P.orange, n < .5 ? 1 - n * 2 : (n - .5) * 2); hid.forEach(s => s.fade(n)); });
  },
  k => { // Radio view
    const c = k.cloud({ n: 14000, r: 4, seed: 15, colors: [0xffffff, 0xd0d0e0], flat: .6 });
    const grid = k.well({ N: 40, L: 6, mass: 0, a: 0x0f5a40, b: 0x6dff9e, op: .3, y: -2.2 });
    k.cam({ d: 10, el: 22, drift: .03 });
    k.on((t, n) => { c.tint(P.green, n); grid.u.uAlpha.value = n * .5; c.u.uFlat.value = 1 - n * .3; });
  },
  k => { // Dense pillars
    k.nebulaSky({ colors: [P.orange, P.purple, P.blue] });
    const pil = [[-1.6, 0, 0, 3.6], [0, 0, -.6, 2.6], [1.5, 0, .3, 3.1]];
    pil.forEach(([x, , z, hgt], j) => {
      k.make(9000, (i, R) => { const y = R() * hgt; const w = .55 * (1 - y / hgt * .45) * (1 + .3 * Math.sin(y * 3 + j)); const a = R() * TAU, rr = Math.sqrt(R()) * w;
        const tip = y > hgt * .85; return [x + Math.cos(a) * rr + Math.sin(y * 1.7) * .15, y - 2, z + Math.sin(a) * rr, tip ? P.gold : (i % 3 ? 0x8a4a5a : 0x5a6a9a), tip ? .07 : .09, tip ? .6 : .22]; }, { seed: 60 + j, u: { uTurb: .02 } });
      k.glow([x, hgt - 2, z], 1.2, P.gold, .6);
    });
    k.cloud({ n: 6000, r: 6, seed: 16, colors: [P.cyan, P.teal, P.blue], bright: .35 });
    k.cam({ d: 9, el: 6, drift: .02, target: [0, 0, 0] });
    k.on((t, n) => { k.zoom = mix(1, .32, ease(n)); k.camCfg.target.y = mix(0, .8, n); });
  },
  k => { // Filaments and clumps
    const w = k.web({ r: 5, nodes: 26, n: 16000, colors: [P.cyan, P.pink, P.purple, 0xffffff], seed: 18 });
    k.cam({ d: 12, el: 15, drift: .04 });
    k.on((t, n) => { w.u.uExpand.value = 1 + n * .5; w.obj.scale.set(1 + n * .6, 1 - n * .3, 1); });
  },
  k => { // Shocks and winds: blue wind streams sweeping over a glowing red ridge of gas
    const ridge = k.make(16000, (i, R) => { const x = (R() - .5) * 14, z = (R() - .5) * 4; const crest = -x * .3 + Math.sin(x * 1.3 + z) * .25;
      const top = R() < .45; const y = top ? crest + gauss(R) * .06 : crest - Math.abs(gauss(R)) * 2.2;
      return [x, y, z, top ? (i % 3 ? P.red : 0xff8a5a) : (i % 2 ? 0x8a3a6a : 0x4a3a8a), top ? .07 : .13, top ? .8 : .45]; }, { seed: 20, u: { uTurb: .03, uTwinkle: .6 } });
    k.gas({ n: 160, r: 6, blobs: [[0, -1.2, 0, 1]], colors: [0x2a3a6a, 0x4a2a5a], flat: .3, bright: .8 });
    const streams = []; const R = rng(9);
    for (let i = 0; i < 26; i++) { const z = (R() - .5) * 3, y0 = 2.6 + R() * 1.4, lift = .2 + R() * 1.4;
      const pts = []; for (let j = 0; j <= 30; j++) { const x = mix(-7, 7, j / 30); pts.push(V(x, -x * .35 + lift + Math.sin(x * .5 + i) * .15 + (1 - j / 30) * (y0 - 2.6) * .4, z)); }
      streams.push(k.ray(pts, i % 4 ? 0x52c8ff : 0xbff0ff, { n: 500, size: .06, speed: .25 + R() * .3, bright: .9 })); }
    k.cam({ d: 10, el: 6, drift: 0, az: 12, target: [.8, -.2, 0] });
    k.on((t, n) => { streams.forEach(s2 => { s2.u.uSpeed.value = .1 + n * .8; s2.u.uAlpha.value = .4 + n * .8; }); });
  },
  k => { // A tug of war
    const c = k.cloud({ n: 9000, r: 1.6, seed: 20, colors: [P.purple, P.pink, P.cyan] });
    const dirs = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; dirs.push(V(Math.cos(a), Math.sin(a) * .7, Math.sin(a) * .7).normalize()); }
    const ins = dirs.map(d => k.arrow(d.clone().multiplyScalar(3.4), d.clone().negate(), 1, P.pink));
    const outs = dirs.map(d => { const r = d.clone().applyAxisAngle(V(0, 1, 0), .35); return k.arrow(r.clone().multiplyScalar(1.2), r, 1, P.cyan); });
    k.label('Gravity pulls in', [0, 3.2, 0], 'pink'); k.label('Gas pressure pushes out', [0, -3.2, 0], 'cyan');
    k.cam({ d: 9, el: 10, drift: .03 });
    k.on((t, n) => { ins.forEach(a => a.set(.4 + n * 1.4)); outs.forEach(a => a.set(1.4 - n * 1)); c.u.uExpand.value = 1.2 - n * .55; });
  },
  k => { // Cold helps
    const c = k.cloud({ n: 11000, r: 1.8, seed: 21, colors: [0xffffff, 0xe8e8f0] });
    const tag = k.label('', [0, 2.6, 0], 'big');
    k.cam({ d: 8, el: 10, drift: .03 });
    k.on((t, n) => { c.tint(n < .5 ? P.orange : 0x4a8aff, n < .5 ? 1 - n * 2 : (n - .5) * 2); c.u.uExpand.value = 1.15 - n * .55; c.u.uTurb.value = .12 * (1 - n); tag.set(Math.round(mix(100, 10, n)) + ' K above absolute zero'); });
  },
  k => { // Gravity wins
    const c = k.cloud({ n: 16000, r: 3.2, seed: 22, infall: true, colors: [P.purple, P.pink, P.cyan, P.blue] });
    const core = k.star({ r: .1, color: 0xffd0a0, glow: 0xff9a5a, spikes: .4 });
    k.cam({ d: 9, el: 12, drift: .03 });
    k.on((t, n) => { c.u.uInfall.value = .02 + n * .14; core.setR(.08 + n * .3); core.fade(.3 + n * .7); });
  },
  k => { // Falling inward
    const c = k.cloud({ n: 18000, r: 3.4, seed: 23, infall: true, flat: .45, spin: .6, colors: [P.purple, P.pink, P.cyan, P.gold] });
    c.u.uSpinPow.value = 1.2;
    const core = k.star({ r: .18, color: 0xffd0a0, glow: 0xffa060, spikes: .5 });
    k.cam({ d: 8.5, el: 32, drift: .04 });
    k.on((t, n) => { c.u.uInfall.value = .05 + n * .12; c.u.uSpin.value = .3 + n * .8; core.setR(.14 + n * .25); });
  },
  k => { // A disk forms
    const env = k.cloud({ n: 9000, r: 4.5, seed: 24, infall: true, flat: .7, spin: .3, colors: [P.purple, P.blue, P.pink], bright: .55 });
    const ps = protostar(k, { r: .3, rout: 4 });
    k.cam({ d: 9, el: 24, drift: .09 });
    k.on((t, n) => { ps.disk.u.uFlat.value = mix(5, 1, ease(n)); ps.disk.u.uSpin.value = .15 + n * .5; ps.haze.u.uFlat.value = mix(6, 1, n); env.u.uInfall.value = .04 + n * .06; env.u.uAlpha.value = 1 - n * .5; });
  },
  k => { // Jets
    const ps = protostar(k, { r: .3, rout: 3.6 });
    const jet = k.jet({ n: 4000, color: P.cyan, len: 4, w: .07 });
    const sp = k.spikes([0, 0, 0], 9, 0xbff4ff, .6);
    k.cam({ d: 9, el: 12, drift: .06 });
    k.on((t, n) => { jet.u.uJet.value = .15 + n * .7; jet.u.uJetLen.value = 1.5 + n * 4; jet.u.uAlpha.value = .3 + n; sp.material.opacity = .2 + n * .6; });
  },
  k => { // The protostar
    const st = k.star({ r: .35, color: 0xffb070, glow: 0xff8a40, spikes: .7 });
    const cocoon = k.cloud({ n: 7000, r: 1.6, seed: 25, colors: [0x0a0610], blend: 'dark', big: .4, haze: 14 });
    const warm = k.cloud({ n: 6000, r: 2.2, seed: 26, colors: [P.orange, P.gold, P.red], bright: .5 });
    k.cam({ d: 7, el: 10, drift: .03 });
    k.on((t, n) => { cocoon.u.uAlpha.value = 1 - ease(n) * .92; warm.u.uAlpha.value = n; st.setR(.3 + n * .1); });
  },
  k => { // The cluster lights up
    const sh = k.shell({ r: 3, n: 16000, thick: .2, colors: [P.purple, P.pink, P.orange, P.cyan], lumpy: 1.6 });
    const R = rng(4); const stars = [];
    for (let i = 0; i < 14; i++) stars.push(k.star({ r: .06 + R() * .1, pos: [gauss(R) * .7, gauss(R) * .5, gauss(R) * .7], color: R() < .6 ? 0xcfe0ff : 0xfff0d0, glow: 0x9fc0ff, spikes: .7 }));
    k.cam({ d: 10, el: 12, drift: .04 });
    k.on((t, n) => { sh.u.uExpand.value = .45 + n * .9; stars.forEach((s, i) => s.fade(clamp(n * 1.6 - i * .04))); sh.u.uAlpha.value = .9 - n * .3; });
  },
  k => { // Recycled
    const R0 = 3.2; const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; pts.push(V(Math.cos(a) * R0, 0, Math.sin(a) * R0)); }
    const ring = k.ray(pts, P.cyan, { n: 1200, size: .08, speed: .2 });
    const st = [['Cloud', 0, P.purple], ['Star', TAU / 3, P.yellow], ['Cloud again', 2 * TAU / 3, P.pink]];
    st.forEach(([name, a, col], i) => {
      const p = V(Math.cos(a) * R0, 0, Math.sin(a) * R0);
      if (i === 1) k.star({ r: .35, pos: p, color: 0xffc04a, spikes: .4 });
      else { const c = k.cloud({ n: 3000, r: .9, seed: 30 + i, colors: [col, P.cyan, P.blue] }); c.obj.position.copy(p); }
      k.label(name, p.clone().add(V(0, -1, 0)), i === 1 ? 'yellow' : 'pink');
    });
    k.cam({ d: 9, el: 38, drift: .05 });
    k.on((t, n) => { ring.u.uSpeed.value = .05 + n * .6; });
  },
];

// ===================== STAR LIFE =====================
const ONION = [[1.6, 1.25, 1, .78, .55, .32], [0xff6a3a, 0xffa040, 0xffd45a, 0x6dff9e, 0x52e4ff, 0x9aa0b0], ['Hydrogen', 'Helium', 'Carbon', 'Oxygen', 'Silicon', 'Iron']];
const stars = [
  k => { // Ignition
    const c = k.cloud({ n: 10000, r: 3, seed: 40, infall: true, colors: [P.purple, P.pink, P.orange] });
    const st = k.star({ r: 1, color: 0xff6a3a, glow: 0xff5a2a, spikes: 0 });
    const tag = k.label('', [0, 2.3, 0], 'big');
    k.cam({ d: 8, el: 10, drift: .04 });
    k.on((t, n) => { st.setR(1.1 - n * .5); st.lerpColor(0xc0402a, 0xfff0c0, ease(n)); st.u.uHeat.value = n * 1.6; st.sp.material.opacity = n > .8 ? (n - .8) * 4 * (.8 + .2 * Math.sin(t * 9)) : 0; c.u.uInfall.value = .03 + n * .1;
      tag.set(n > .8 ? 'Fusion is on!' : Math.round(mix(1, 15, n)) + ' million °C'); });
  },
  k => { // What fusion does
    const H = [0, 1, 2, 3].map(i => k.glow([0, 0, 0], 1.6, P.cyan, 1)); const He = k.glow([0, 0, 0], 2.8, P.gold, 0); const flash = k.glow([0, 0, 0], 6, 0xffffff, 0);
    const sp = k.spikes([0, 0, 0], 10, 0xffffff, 0);
    k.label('4 hydrogen', [-2.4, 1.6, 0], 'cyan'); k.label('1 helium + energy', [2.4, 1.6, 0], 'yellow');
    let ph = 0; k.cam({ d: 7, el: 8, drift: .02 });
    k.on((t, n, dt) => { ph = (ph + dt * (.12 + n * .6)) % 1; const m = ease(ph / .55);
      H.forEach((h, i) => { const a = i / 4 * TAU + t * .5; h.position.set(Math.cos(a) * 2.2 * (1 - m), Math.sin(a) * 2.2 * (1 - m), 0); h.material.opacity = ph < .6 ? 1 : 0; });
      const f = ph > .55 && ph < .8 ? Math.sin((ph - .55) / .25 * Math.PI) : 0; flash.material.opacity = f; sp.material.opacity = f; He.material.opacity = ph > .58 ? 1 : 0; });
  },
  k => { // The great balance
    const st = sunLike(k, { r: 1.3 });
    const dirs = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; dirs.push(V(Math.cos(a), Math.sin(a), 0)); }
    const ins = dirs.map(d => k.arrow(d.clone().multiplyScalar(3.6), d.clone().negate(), 1, P.pink));
    const outs = dirs.map(d => { const r = d.clone().applyAxisAngle(V(0, 0, 1), TAU / 20); return k.arrow(r.clone().multiplyScalar(1.5), r, 1, P.yellow); });
    k.label('Gravity', [-3.5, 2.6, 0], 'pink'); k.label('Fusion pressure', [3.5, 2.6, 0], 'yellow');
    k.cam({ d: 10, el: 0, drift: 0 });
    k.on((t, n) => { const b = n - .5; ins.forEach(a => a.set(.8 + b * 1.4)); outs.forEach(a => a.set(.8 - b * 1.2)); st.setR(1.3 - b * .9 + Math.sin(t * 2) * .02); });
  },
  k => { // Inside the star
    const L = k.layers([1.8, 1.25, .5], [0xff8a3a, 0xffc04a, 0xfff4d8]);
    const gl = k.glow([0, 0, 0], 9, 0xff9a3a, .5);
    const labs = [k.label('Core: fusion', [.25, 0, .02], 'yellow'), k.label('Radiative zone', [.88, .3, .02], 'pink'), k.label('Convective zone', [1.52, -.3, .02], 'cyan')];
    k.cam({ d: 7, el: 26, az: 28, drift: 0 });
    k.on((t, n) => { L.cut(n); labs.forEach((l, i) => l.show = n > .25 + i * .15 ? 1 : 0); });
  },
  k => { // Light from the surface
    const a = k.star({ r: .8, pos: [-3, 0, 0], color: 0xff5a3a, glow: 0xff4a2a });
    const b = k.star({ r: .9, pos: [0, 0, 0], color: 0xffd060, glow: 0xffb040 });
    const c = k.star({ r: 1, pos: [3, 0, 0], color: 0xbfd8ff, glow: 0x8fb0ff });
    k.label('3,000 °C', [-3, -1.5, 0], 'pink'); const mid = k.label('', [0, -1.6, 0], 'yellow'); k.label('20,000 °C', [3, -1.7, 0], 'cyan');
    k.cam({ d: 9, el: 4, drift: .01 });
    k.on((t, n) => { b.lerpColor(n < .5 ? 0xff5a3a : 0xffd060, n < .5 ? 0xffd060 : 0xbfd8ff, n < .5 ? n * 2 : (n - .5) * 2); mid.set(Math.round(mix(3000, 20000, n) / 100) * 100 + ' °C'); });
  },
  k => { // Mass is destiny
    const S = [[.25, 0xff5a3a, 'Red dwarf'], [.45, 0xffa050, 'Orange dwarf'], [.65, 0xffd060, 'Sun-like'], [1, 0xe8f0ff, 'White star'], [1.5, 0xa8c8ff, 'Blue giant']];
    let x = -5; const list = S.map(([r, c, name]) => { x += r + .6; const s = k.star({ r, pos: [x, 0, 0], color: c, glow: c }); const l = k.label(name, [x, -r - .6, 0], 'small'); x += r; return [s, l, r]; });
    k.cam({ d: 12, el: 6, drift: 0, target: [x / 2 - 2.6, 0, 0] });
    k.on((t, n) => { const i = step(n, 5); list.forEach(([s, l, r], j) => { s.setR(r * (j === i ? 1.15 + Math.sin(t * 4) * .03 : 1)); l.el.classList.toggle('on', j === i); }); });
  },
  k => { // Red dwarfs
    const st = k.star({ r: .7, color: 0xd8402a, glow: 0xff3a2a, spots: .6 });
    k.cam({ d: 6, el: 6, drift: .03, target: [0, .4, 0] });
    k.hud((g, w, h, t, n) => timeline(g, w, h, { title: 'Red dwarf lifetime', fill: n, marker: n, markerText: Math.round(n * 10) + ' trillion years', ticks: [[0, 'Birth'], [.5, '5 trillion'], [1, '10 trillion yr']], colors: ['#ff5a3a', '#ff8a5a'] }));
    k.on((t, n) => { st.u.uHeat.value = .5 - n * .2; });
  },
  k => { // Sun-like stars
    const st = sunLike(k, { r: 1, spots: .4 });
    k.cam({ d: 7, el: 6, drift: .03, target: [0, .5, 0] });
    k.hud((g, w, h, t, n) => timeline(g, w, h, { title: 'Sun-like star', fill: n, marker: n, markerText: (n * 10).toFixed(1) + ' billion years' + (Math.abs(n - .46) < .04 ? ' · our Sun now' : ''), ticks: [[0, '0'], [.46, 'Now'], [1, '10 billion']], colors: ['#ffd45a', '#ff8a3c'] }));
    k.on((t, n) => { st.setR(1 + n * .15); });
  },
  k => { // Massive stars
    const big = k.star({ r: 1.6, pos: [-1, 0, 0], color: 0xbfd8ff, glow: 0x8fb0ff, spikes: .6 });
    const small = sunLike(k, { r: .4, pos: [2.4, -.6, 0] });
    k.label('Our Sun', [2.4, -1.4, 0], 'yellow');
    const lab = k.label('', [-1, -2.6, 0], 'cyan');
    k.cam({ d: 10, el: 6, drift: .02, target: [.4, .4, 0] });
    k.hud((g, w, h, t, n) => { const m = mix(8, 40, n), life = 10000 / Math.pow(m, 2.5); timeline(g, w, h, { title: 'Lifetime', fill: life / 50, colors: ['#52e4ff', '#a070ff'], ticks: [[0, '0'], [1, '50 million yr']], marker: life / 50, markerText: life.toFixed(1) + ' million years' }); });
    k.on((t, n) => { const m = mix(8, 40, n); big.setR(1 + n * 1.2); lab.set(Math.round(m) + ' times the Sun’s mass'); });
  },
  k => { // The star map (H-R diagram)
    const N = 5000; const R = rng(77);
    const make = (age) => k.make(N, (i) => {
      const r = rng(i * 31 + 3); const u = r();
      let x, y, c;
      const mass = Math.pow(r(), 2.4);
      const ms = u < .82;
      if (ms) { x = 4 - mass * 8 + gauss(r) * .12; y = -3 + mass * 6.5 + gauss(r) * .18; }
      else if (u < .93) { x = 2.2 + gauss(r) * .5; y = 1.7 + gauss(r) * .6; }
      else { x = -1.6 + gauss(r) * .5; y = -3 + gauss(r) * .25; }
      if (ms && mass > 1 - age) { x = 1.3 + r() * 1.8 + gauss(r) * .2; y = 1.2 + mass * 2.2; }
      const tt = clamp((4 - x) / 8); c = tt > .7 ? 0xa8c8ff : tt > .45 ? 0xffffff : tt > .3 ? 0xffd060 : 0xff6a3a;
      return [x, y, 0, c, .09, .9];
    }, { seed: 78 });
    const young = make(0), old = make(.55);
    k.label('Hot', [-4.3, -3.8, 0], 'cyan'); k.label('Cool', [4.3, -3.8, 0], 'pink'); k.label('Bright', [-4.8, 3.4, 0], 'yellow'); k.label('Main sequence', [-.4, .2, 0], 'small');
    k.cam({ d: 11, el: 0, drift: 0 });
    k.on((t, n) => fadePair(young, old, n));
  },
  k => { // Running out of hydrogen
    const st = sunLike(k, { r: 1.4 });
    const core = k.glow([0, 0, 0], 2.4, 0xffffff, 1);
    st.mesh.material.uniforms.uAlpha.value = .82;
    k.cam({ d: 8, el: 8, drift: .03 });
    k.hud((g, w, h, t, n) => readout(g, w, h, [['Hydrogen left in core', Math.round((1 - n) * 100) + '%', '#52e4ff'], ['Helium ash', Math.round(n * 100) + '%', '#ffd45a']], 'Core fuel'));
    k.on((t, n) => { core.material.opacity = 1 - n * .85; core.scale.setScalar(2.4 - n * 1.2); });
  },
  k => { // The swelling
    const st = sunLike(k, { r: 1 });
    const orbit = k.orbit(4.5, P.cyan, .35); const earth = k.planet({ r: .12, type: 'earth', pos: [4.5, 0, 0] });
    k.label('Earth’s orbit', [4.5, -.5, 0], 'cyan');
    k.cam({ d: 14, el: 18, drift: .02 });
    k.on((t, n) => { st.setR(1 + ease(n) * 3.4); st.lerpColor(0xffc04a, 0xff4a2a, ease(n)); st.u.uGran.value = 5 - n * 3; });
  },
  k => { // Helium ignites
    const st = k.star({ r: 3, color: 0xff4a2a, glow: 0xff3a1a, gran: 2, spikes: 0 });
    st.u.uAlpha.value = .55;
    const core = k.glow([0, 0, 0], 1, 0xffffff, 1); const sp = k.spikes([0, 0, 0], 12, 0xfff4d0, 0);
    const tag = k.label('', [0, -3.6, 0], 'yellow');
    k.cam({ d: 11, el: 8, drift: .03 });
    k.on((t, n) => { const on = n > .6; core.scale.setScalar(on ? 2 + Math.sin(t * 6) * .3 : .6 + n); core.material.opacity = .4 + n * .6; sp.material.opacity = on ? (n - .6) * 2.5 : 0; tag.set(on ? 'Helium flash: 100 million °C' : Math.round(mix(40, 100, n)) + ' million °C in the core'); });
  },
  k => { // Shedding layers
    k.star({ r: .18, color: 0xe8f4ff, glow: 0xbfe0ff, spikes: .9 });
    const sh = k.shell({ r: 1.6, n: 14000, flat: .8, thick: .1, colors: [P.cyan, P.teal, P.pink, P.purple], lumpy: 1.2 });
    const outer = k.shell({ r: 2.3, n: 6000, thick: .05, colors: [P.red, P.pink], lumpy: 2, seed: 7 });
    k.cam({ d: 8, el: 25, drift: .04 });
    k.on((t, n) => { sh.u.uExpand.value = .6 + n * 1.1 + Math.sin(t) * .01; outer.u.uExpand.value = .55 + n * 1.3; outer.u.uAlpha.value = .3 + n * .7; });
  },
  k => { // The white dwarf
    const wd = k.star({ r: .22, color: 0xf0f6ff, glow: 0xbfe0ff, spikes: .9 });
    const sh = k.shell({ r: 2.2, n: 10000, thick: .1, colors: [P.cyan, P.pink, P.purple], lumpy: 1.2 });
    k.cam({ d: 8, el: 20, drift: .03 });
    k.hud((g, w, h, t, n) => readout(g, w, h, [['Time since shedding', (n * 10).toFixed(1) + ' billion yr'], ['Surface', Math.round(mix(100000, 5000, n)).toLocaleString() + ' °C', '#9fe9ff']], 'White dwarf'));
    k.on((t, n) => { sh.u.uExpand.value = 1 + n * 1.5; sh.u.uAlpha.value = 1 - n * .95; wd.lerpColor(0xf0f6ff, 0xff9a5a, n); wd.fade(1 - n * .5); });
  },
  k => { // Heavier fuel
    const L = k.layers(...ONION.slice(0, 2)); L.cut(1);
    const labs = ONION[2].map((s, i) => k.label(s, [(ONION[0][i] + (ONION[0][i + 1] ?? 0)) / 2, i % 2 ? -.25 : .25, .02], 'small'));
    k.glow([0, 0, 0], 8, 0xff9a3a, .35);
    k.cam({ d: 8, el: 26, az: 28, drift: 0 });
    k.on((t, n) => { const shown = 2 + Math.floor(n * 4.99); L.shells.forEach((s, i) => s.visible = i < shown); labs.forEach((l, i) => l.show = i < shown ? 1 : 0); });
  },
  k => { // Iron stops the fire
    const L = k.layers(...ONION.slice(0, 2)); L.cut(1);
    const iron = L.shells[5]; const tag = k.label('', [0, -2.3, 0], 'big');
    k.cam({ d: 8, el: 26, az: 28, drift: 0 });
    k.on((t, n) => { iron.scale.setScalar(.6 + n * 1.2); tag.set(n > .7 ? 'Iron core: fusion stops' : 'Iron piling up in the core'); });
  },
  k => { // The collapse
    const L = k.layers([2, 1.5, 1.1, .7], [0xff6a3a, 0xffa040, 0xffd45a, 0x9aa0b0]); L.cut(1);
    const flash = k.glow([0, 0, 0], 6, 0xffffff, 0);
    k.cam({ d: 9, el: 26, az: 28, drift: 0 });
    k.on((t, n) => { L.shells[3].scale.setScalar(Math.max(.03, 1 - ease(n) * 1.2)); L.shells[2].scale.setScalar(1 - ease((n - .5) * 2) * .5); flash.material.opacity = n > .9 ? (n - .9) * 10 : 0; k.shake = n > .9 ? .05 : 0; });
  },
  k => { // Supernova
    const flash = k.glow([0, 0, 0], 4, 0xffffff, 1); const sp = k.spikes([0, 0, 0], 22, 0xfff4e0, .8);
    const s1 = k.shell({ r: 1, n: 16000, thick: .08, colors: [P.orange, P.yellow, 0xffffff], lumpy: 1.4 });
    const s2 = k.shell({ r: 1, n: 9000, thick: .15, colors: [P.pink, P.red, P.purple], lumpy: 2, seed: 9 });
    k.cam({ d: 12, el: 10, drift: .03 });
    k.on((t, n) => { s1.u.uExpand.value = .2 + n * 4; s2.u.uExpand.value = .15 + n * 3.2; flash.scale.setScalar(4 + n * 10); flash.material.opacity = 1 - n * .6; sp.material.opacity = .9 - n * .5; k.shake = n > .02 && n < .3 ? .04 : 0; s1.u.uTurb.value = .02 + n * .1; });
  },
  k => { // What's left
    const ns = k.star({ r: .18, pos: [-2, 0, 0], color: 0xbfe0ff, glow: 0x7fb0ff, spikes: .8 });
    const beam = k.jet({ n: 2000, color: P.cyan, len: 3, w: .03, speed: .9 }); beam.obj.position.x = -2; beam.obj.rotation.z = .4;
    const bh = k.bh({ r: .5, pos: [2.2, 0, 0], out: 4, disk: .8 });
    k.label('Neutron star', [-2, -1.4, 0], 'cyan'); k.label('Black hole', [2.2, -1.6, 0], 'pink');
    k.cam({ d: 10, el: 14, drift: .02 });
    k.on((t, n) => { beam.obj.rotation.y = t * 3; ns.fade(1 - n * .6); bh.du.uAlpha.value = .3 + n; bh.setR(.3 + n * .4); });
  },
  k => { // Forging elements
    const mg = merger(k); let ph = 0;
    k.on((t, n, dt) => { ph = (ph + dt * .09) % 1.15; mg.set(Math.min(1, ph)); });
    const E = [['Big Bang', '#52e4ff', [1, 2]], ['Fusion in stars', '#ffd45a', [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]], ['Supernova', '#ff5fae', [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]], ['Neutron star merger', '#a070ff', [47, 56, 78, 79, 92, 54, 74, 82, 80, 50, 53, 55]]];
    const cols = [1, 18, 1, 2, 13, 14, 15, 16, 17, 18, 1, 2, 13, 14, 15, 16, 17, 18];
    k.cam({ d: 9, el: 8, drift: .02 });
    k.hud((g, w, h, t, n) => {
      const pw = Math.min(400, w - 36), ph = 230; const [x, y] = panel(g, w, h, pw, ph, E[step(n, 4)][0]);
      const cell = (pw - 32) / 18; let z = 0; const pos = (Z) => { if (Z === 1) return [0, 0]; if (Z === 2) return [17, 0]; if (Z <= 10) return [Z <= 4 ? Z - 3 : Z + 7, 1]; if (Z <= 18) return [Z <= 12 ? Z - 11 : Z - 1, 2]; if (Z <= 36) return [Z - 19, 3]; if (Z <= 54) return [Z - 37, 4]; if (Z <= 86) return [Z <= 56 ? Z - 55 : Z >= 72 ? Z - 69 : -1, 5]; return [Z <= 88 ? Z - 87 : -1, 6]; };
      const active = step(n, 4);
      for (let Z = 1; Z <= 92; Z++) { const [cx, cy] = pos(Z); if (cx < 0) continue;
        const ev = E.findIndex(e => e[2].includes(Z)); const on = ev >= 0 && ev <= active;
        g.fillStyle = on ? E[ev][1] : 'rgba(255,255,255,.08)'; g.globalAlpha = on ? (ev === active ? 1 : .45) : 1;
        g.beginPath(); g.roundRect(x + 16 + cx * cell, y + 36 + cy * (cell + 2), cell - 2, cell - 1, 3); g.fill(); g.globalAlpha = 1; }
    });
  },
  k => { // Scattering the seeds
    k.star({ r: .25, color: 0xe8f4ff, spikes: .9 });
    const out = k.cloud({ n: 16000, r: 2.5, seed: 52, colors: [P.pink, P.cyan, P.gold, P.green, P.purple], infall: false });
    let ph = 0;
    k.cam({ d: 10, el: 14, drift: .04 });
    k.on((t, n, dt) => { out.u.uExpand.value = .4 + n * 2.4 + Math.sin(t * .4) * .03; out.u.uTurb.value = .05 + n * .2; out.u.uAlpha.value = 1.1 - n * .4; });
  },
  k => { // The next generation
    const base = k.cloud({ n: 12000, r: 3.4, seed: 53, infall: true, colors: [P.purple, P.blue, P.cyan] });
    const spk = k.cloud({ n: 5000, r: 3.4, seed: 54, infall: true, colors: [P.gold, P.green, P.pink, P.orange], bright: 1.2, big: 0 });
    k.glow([0, 0, 0], 1.6, P.gold, .7);
    k.cam({ d: 9, el: 14, drift: .04 });
    k.on((t, n) => { spk.u.uAlpha.value = n; base.u.uInfall.value = spk.u.uInfall.value = .03 + n * .04; });
  },
  k => { // The loop closes
    const R0 = 3.6; const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; pts.push(V(Math.cos(a) * R0, Math.sin(a) * R0, 0)); }
    const ring = k.ray(pts, P.gold, { n: 1400, size: .09, speed: .15 });
    const S = [['Nebula', P.purple], ['Protostar', P.orange], ['Star', P.yellow], ['Red giant', P.red], ['Supernova', P.pink], ['Stardust', P.cyan]];
    S.forEach(([name, c], i) => { const a = Math.PI / 2 - i / S.length * TAU; const p = V(Math.cos(a) * R0, Math.sin(a) * R0, 0);
      if (i === 0 || i === 5) { const cl = k.cloud({ n: 2500, r: .7, seed: 60 + i, colors: [c, P.blue] }); cl.obj.position.copy(p); }
      else if (i === 4) { const s = k.shell({ r: .55, n: 2500, colors: [P.pink, P.orange], seed: 64 }); s.obj.position.copy(p); }
      else k.star({ r: [0, .22, .35, .6][i], pos: p, color: c, glow: c, spikes: .4 });
      k.label(name, p.clone().multiplyScalar(1.32), 'small'); });
    k.glow([0, 0, 0], 1.2, P.cyan, 1); k.label('Nova', [0, -.7, 0], 'cyan');
    k.cam({ d: 11, el: 0, drift: 0 });
    k.on((t, n) => { ring.u.uSpeed.value = .05 + n * .5; });
  },
];

// ===================== PLANET FORMATION =====================
const tempColor = t => t < .12 ? 0xffffff : t < .3 ? P.yellow : t < .5 ? P.orange : t < .7 ? P.pink : t < .85 ? P.purple : P.blue;
const planets = [
  k => { // The leftover pancake
    const w = k.well({ N: 56, L: 9, mass: 1.6, soft: 1.4, op: .35, y: -1.6 });
    const ps = protostar(k, { r: .3, rout: 4.5, n: 18000 });
    k.cam({ d: 10, el: 26, drift: .08 });
    k.on((t, n) => { ps.disk.u.uSpin.value = .1 + n * .8; ps.haze.u.uSpin.value = .08 + n * .5; });
  },
  k => { // Hot inside, cold outside
    k.star({ r: .3, color: 0xffd0a0, spikes: .5 });
    k.disk({ rin: .45, rout: 5, n: 18000, spin: .3, color: tempColor });
    const ring = k.orbit(1, 0xffffff, .9); const lab = k.label('', () => V(ring.scale.x, .4, 0), 'big');
    k.cam({ d: 10, el: 40, drift: .04 });
    k.on((t, n) => { const r = mix(.6, 5, n); ring.scale.setScalar(r); lab.set(Math.round(1500 / Math.sqrt(r * 2)) - 200 + ' °C'); });
  },
  k => { // Gas and dust
    k.star({ r: .3, color: 0xffd0a0, spikes: .5 });
    const gas = k.disk({ rin: .4, rout: 5, n: 3000, thick: .14, size: 0, spin: .25, color: t => t < .4 ? P.purple : P.blue, seed: 3 });
    const dust = k.disk({ rin: .5, rout: 4.6, n: 14000, thick: .02, size: .035, spin: .35, color: () => 0xffe0c0, seed: 4, bright: 1.2 });
    dust.u.uTwinkle.value = .9;
    k.label('Gas: soft haze', [0, 1.4, -3], 'cyan'); k.label('Dust: sparkling grains', [3, .4, 2], 'yellow');
    k.cam({ d: 9.5, el: 24, drift: .05 });
    k.on((t, n) => { dust.u.uAlpha.value = .15 + n * 1.2; gas.u.uAlpha.value = 1.2 - n * .5; });
  },
  k => { // Disks in real life (HL Tau)
    k.star({ r: .22, color: 0xfff0d0, spikes: .3 });
    k.disk({ rin: .35, rout: 5, n: 26000, thick: .01, size: .06, spin: .08, gaps: [[1.3, .16], [2.1, .18], [2.9, .14], [3.5, .14], [4.2, .16]], color: t => t < .3 ? 0xffe2a8 : t < .6 ? 0xffa050 : 0xd2552a, conc: .9 });
    k.cam({ d: 10, el: 72, drift: .015 });
    k.on((t, n) => { k.zoom = mix(1.05, .45, ease(n)); });
  },
  k => { // A race against time
    k.star({ r: .3, color: 0xffd0a0, spikes: .5 });
    const d = k.disk({ rin: .45, rout: 4.6, n: 18000, spin: .3 });
    k.cam({ d: 10, el: 28, drift: .05 });
    k.hud((g, w, h, t, n) => readout(g, w, h, [['Disk age', (n * 10).toFixed(1) + ' million yr'], ['Gas left', Math.round(100 * Math.exp(-n * 3)) + '%', '#52e4ff']], 'Clock'));
    k.on((t, n) => { d.u.uAlpha.value = Math.exp(-n * 2.6); d.u.uFlat.value = 1 - n * .5; });
  },
  k => { // Grains stick
    const mk = (x, seed) => k.make(260, (i, R) => { const a = R() * TAU, b = Math.acos(R() * 2 - 1), r = Math.pow(R(), .6) * .7; return [x + Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r, i % 4 ? 0xd8b898 : 0xffffff, .14, .9]; }, { seed });
    const A = mk(0, 70), B = mk(0, 71);
    const flash = k.glow([0, 0, 0], 2, 0xffffff, 0);
    k.label('Microscopic dust grains', [0, -1.6, 0], 'yellow');
    let ph = 0; k.cam({ d: 6, el: 10, drift: .04 });
    k.on((t, n, dt) => { ph = (ph + dt * .12) % 1; const s = 2.6 * (1 - ease(ph / .6)); A.obj.position.x = -.55 - s; B.obj.position.x = .55 + s; flash.material.opacity = ph > .58 && ph < .7 ? 1 - Math.abs(ph - .64) * 16 : 0; k.zoom = mix(1, .45, n); });
  },
  k => { // Growing pebbles
    k.star({ r: .25, color: 0xffd0a0, spikes: .3, pos: [0, 0, -6] });
    const dust = k.make(14000, (i, R) => [gauss(R) * 3, gauss(R) * .5, gauss(R) * 3, 0xe8d0b8, .03, .9], { seed: 72, u: { uTurb: .05 } });
    const peb = k.make(600, (i, R) => [gauss(R) * 3, gauss(R) * .5, gauss(R) * 3, i % 3 ? 0xc8a888 : 0xa8c8e8, .22 + R() * .2, 1], { seed: 73, u: { uTurb: .04 } });
    k.cam({ d: 8, el: 14, drift: .04 });
    k.on((t, n) => fadePair(dust, peb, ease(n)));
  },
  k => { // The size barrier
    k.star({ r: .3, color: 0xffd0a0, spikes: .5 });
    k.disk({ rin: .5, rout: 5, n: 9000, spin: .3, bright: .4 });
    const peb = k.disk({ rin: .5, rout: 5, n: 2500, spin: .9, size: .14, color: () => 0xffe0c0, infall: true, bright: 1.1, seed: 12 });
    k.cam({ d: 10, el: 36, drift: .04 });
    k.on((t, n) => { peb.u.uInfall.value = .01 + n * .12; });
  },
  k => { // Pebble traffic jams
    k.star({ r: .3, color: 0xffd0a0, spikes: .5, pos: [0, 0, 0] });
    const even = k.make(5000, (i, R) => { const a = R() * TAU, r = 3 + gauss(R) * .25; return [Math.cos(a) * r, gauss(R) * .05, Math.sin(a) * r, 0xe8d0b8, .07, 1]; }, { seed: 80, u: { uSpin: .3 } });
    const clump = k.make(5000, (i, R) => { const c = Math.floor(R() * 7) / 7 * TAU; const a = c + gauss(R) * .07, r = 3 + gauss(R) * .12; return [Math.cos(a) * r, gauss(R) * .05, Math.sin(a) * r, 0xffe8c8, .09, 1.2]; }, { seed: 81, u: { uSpin: .3 } });
    k.cam({ d: 8, el: 40, drift: .03 });
    k.on((t, n) => fadePair(even, clump, ease(n)));
  },
  k => { // Planetesimals
    const sun = k.star({ r: .4, color: 0xffd0a0, pos: [-8, 2, -6] });
    const list = rocks(k, 46, 4.5, { max: .45, h: .6, sun: [-8, 2, -6] });
    k.cam({ d: 8, el: 12, drift: .03 });
    k.on((t, n) => list.forEach((p, i) => { p.mesh.scale.copy(p.base).multiplyScalar(.5 + n * 1.2); p.mesh.rotation.y = t * .1 + i; }));
  },
  k => { // Big eats small
    const big = k.planet({ r: .7, type: 'rocky', a: 0x6a5048, b: 0xb09080, rim: 0xff9a6a, sun: [6, 3, 5] });
    const bits = k.make(3000, (i, R) => { const a = R() * TAU, r = 1 + R() * 4; return [Math.cos(a) * r, gauss(R) * .3, Math.sin(a) * r, 0xc8a888, .08, 1]; }, { seed: 82, defines: { INFALL: 1 }, u: { uSpin: .6, uSpinPow: 1 } });
    k.cam({ d: 8, el: 24, drift: .04 });
    k.on((t, n) => { bits.u.uInfall.value = .02 + n * .14; big.mesh.scale.setScalar(.6 + n * .5); big.mesh.rotation.y = t * .2; });
  },
  k => { // Planetary embryos
    const w = k.well({ N: 56, L: 8, mass: 2, soft: 1, op: .45 });
    const sun = k.star({ r: .35, color: 0xffd0a0, pos: [0, w.depthAt(0, 0) + .3, 0], spikes: .5 });
    k.disk({ rin: .6, rout: 6, n: 8000, spin: .2, bright: .4, parent: sun.g });
    const em = [1.4, 2.1, 2.9, 3.8, 4.7, 5.6].map((r, i) => ({ r, p: k.planet({ r: .12 + i * .02, type: 'rocky', a: 0x7a5a48, b: 0xc8a888, seed: i, sun: sun.g.position }), w: 1 / Math.pow(r, 1.5), o: i * 1.1 }));
    k.cam({ d: 10, el: 30, drift: .04, target: [0, -.8, 0] });
    k.on((t, n) => em.forEach(e => { const a = e.o + t * e.w * .9; const x = Math.cos(a) * e.r, z = Math.sin(a) * e.r; e.p.mesh.position.set(x, w.depthAt(x, z) + .15, z); e.p.mesh.scale.setScalar(.06 + n * .14 + e.r * .01); }));
  },
  k => { // Rocky worlds inside
    k.star({ r: .45, color: 0xfff0c0, spikes: .5 });
    const P4 = [[1.1, 0x9a8a80], [1.6, 0xd9a65a], [2.2, 0], [2.9, 0xa04a2a]].map(([r, c], i) => { k.orbit(r, P.cyan, .3); return { r, p: k.planet({ r: .12, type: c ? 'rocky' : 'earth', a: c || 0, b: 0xe0d0c0, seed: i }) }; });
    const lab = k.label('', () => P4[3].p.mesh.position.clone().add(V(0, .4, 0)), 'big');
    k.cam({ d: 8, el: 34, drift: .03 });
    k.on((t, n) => { P4[3].r = mix(1, 3.6, n); P4.forEach((q, i) => { const a = t * .5 / Math.pow(q.r, 1.5) + i * 1.7; q.p.mesh.position.set(Math.cos(a) * q.r, 0, Math.sin(a) * q.r); }); lab.set(n < .25 ? 'Scorching' : n < .6 ? 'Warm and rocky' : 'Colder'); });
  },
  k => { // The frost line
    k.star({ r: .3, color: 0xffd0a0, spikes: .5 });
    k.disk({ rin: .45, rout: 6, n: 14000, spin: .3, color: tempColor, bright: .6 });
    const ice = k.disk({ rin: 2.5, rout: 6, n: 5000, spin: .25, size: .05, color: () => P.ice, bright: 1.3, seed: 33 });
    ice.u.uTwinkle.value = 1;
    const line = k.orbit(2.5, 0xffffff, 1); const line2 = k.orbit(2.52, P.cyan, .8);
    const lab = k.label('Frost line', () => V(line.scale.x * 2.5, .5, 0), 'cyan');
    k.cam({ d: 11, el: 38, drift: .04 });
    k.on((t, n) => { const r = mix(3.8, 1.6, n); line.scale.setScalar(r / 2.5); line2.scale.setScalar(r / 2.52); ice.obj.scale.setScalar(r / 2.5); });
  },
  k => { // Giant cores
    const core = k.planet({ r: .7, type: 'rocky', a: 0x5a6a7a, b: 0xc8e0f0, rim: 0x9fe9ff, sun: [6, 2, 5] });
    const gas = k.cloud({ n: 6000, r: 1.3, seed: 90, colors: [P.cyan, P.purple, P.blue], big: .2, haze: 2, bright: .6 });
    k.cam({ d: 6, el: 10, drift: .05 });
    k.on((t, n) => { gas.u.uExpand.value = .7 + n * 1.2; gas.u.uAlpha.value = .1 + n * .9; core.mesh.rotation.y = t * .2; });
  },
  k => { // Gas giants
    const pl = k.planet({ r: 1, type: 'gas', a: 0xc8a070, b: 0xf0dcc0, rim: 0xffd0a0, sun: [8, 3, 6] });
    const inflow = k.make(4000, (i, R) => { const a = R() * TAU, r = 1.5 + R() * 4; return [Math.cos(a) * r, gauss(R) * .4, Math.sin(a) * r, i % 2 ? P.purple : P.cyan, .07, .8]; }, { seed: 91, defines: { INFALL: 1 }, u: { uSpin: .5, uSpinPow: 1 } });
    k.cam({ d: 8, el: 14, drift: .04 });
    k.on((t, n) => { pl.mesh.scale.setScalar(.4 + ease(n) * 1.3); inflow.u.uInfall.value = .04 + n * .1; pl.mesh.rotation.y = t * .25; });
  },
  k => { // Ice giants
    const gg = k.planet({ r: 1.5, type: 'gas', a: 0xc8a070, b: 0xf0dcc0, rim: 0xffd0a0, pos: [-1.8, 0, 0], sun: [8, 3, 8] });
    const ig = k.planet({ r: .7, type: 'gas', a: 0x3f6ae0, b: 0x9fd8ff, rim: 0x9fe9ff, pos: [1.8, 0, 0], sun: [8, 3, 8] });
    k.label('Gas giant', [-1.8, -1.9, 0], 'yellow'); k.label('Ice giant', [1.8, -1.1, 0], 'cyan');
    k.cam({ d: 8, el: 8, drift: .03 });
    k.on((t, n) => { gg.mesh.scale.setScalar(.8 + n * .9); ig.mesh.scale.setScalar(.55 + n * .25); gg.mesh.rotation.y = t * .3; ig.mesh.rotation.y = t * .2; });
  },
  k => { // Carving gaps
    k.star({ r: .3, color: 0xffd0a0, spikes: .5 });
    const disks = [.05, .18, .32, .5].map((gw, i) => k.disk({ rin: .45, rout: 5, n: 14000, spin: .3, gaps: [[2.6, gw]], seed: 100 + i }));
    const pl = k.planet({ r: .2, type: 'gas', a: 0xc8a070, b: 0xf0dcc0 });
    k.cam({ d: 10, el: 48, drift: .03 });
    k.on((t, n) => { const x = n * 3; disks.forEach((d, i) => d.u.uAlpha.value = clamp(1 - Math.abs(x - i))); const a = t * .3 / Math.pow(2.6, 1.5) * 1.6; pl.mesh.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6); pl.mesh.scale.setScalar(.12 + n * .25); });
  },
  k => { // Planets on the move
    const w = k.well({ N: 56, L: 8, mass: 2.2, soft: .9, op: .4 });
    const sun = k.star({ r: .4, color: 0xffd0a0, pos: [0, w.depthAt(0, 0) + .35, 0] });
    const pl = k.planet({ r: .3, type: 'gas', a: 0xc8a070, b: 0xf0dcc0, sun: sun.g.position });
    const trail = []; for (let i = 0; i <= 400; i++) { const tt = i / 400; const r = mix(5.5, 1.6, tt); const a = tt * 22; trail.push(V(Math.cos(a) * r, w.depthAt(Math.cos(a) * r, Math.sin(a) * r) + .1, Math.sin(a) * r)); }
    k.ray(trail, P.yellow, { n: 1400, size: .05, speed: .1, bright: .5 });
    k.cam({ d: 11, el: 32, drift: .03, target: [0, -.8, 0] });
    k.on((t, n) => { const r = mix(5.5, 1.6, n); const a = n * 22 + t * .4 / Math.pow(r, 1.5); const x = Math.cos(a) * r, z = Math.sin(a) * r; pl.mesh.position.set(x, w.depthAt(x, z) + .3, z); });
  },
  k => { // Leftovers
    k.star({ r: .35, color: 0xfff0c0 });
    k.disk({ rin: 3, rout: 3.6, n: 5000, thick: .04, spin: .25, size: .05, color: () => 0xb8a890, seed: 51 });
    const comets = []; for (let i = 0; i < 5; i++) { const c = k.glow([0, 0, 0], .5, P.ice, 1); const tail = k.jet({ n: 600, color: P.ice, len: 1.6, w: .05, speed: .8, seed: i }); comets.push([c, tail, i]); }
    k.label('Asteroid belt', [3.3, -.5, 0], 'yellow');
    k.cam({ d: 12, el: 30, drift: .03 });
    k.on((t, n) => { k.zoom = mix(1, .55, n); comets.forEach(([c, tail, i]) => { const a = t * .15 + i * 1.3; const r = 6 + Math.cos(a * 2) * 2.5; const p = V(Math.cos(a) * r, Math.sin(i) * .8, Math.sin(a) * r); c.position.copy(p); tail.obj.position.copy(p); tail.obj.quaternion.setFromUnitVectors(V(0, 1, 0), p.clone().normalize()); }); });
  },
  k => { // Our Solar System
    const w = k.well({ N: 70, L: 12, mass: 1.6, soft: 1.1, op: .3, y: -1.4 });
    solarSystem(k, {});
    k.cam({ d: 16, el: 28, drift: .03 });
    k.on((t, n) => { k.zoom = mix(1, .32, ease(n)); });
  },
  k => { // Other systems
    const sys = [[-5, 0x5a8dff, 3], [0, 0xffd060, 5], [5, 0xff5a3a, 2]].map(([x, c, np], j) => {
      const g = k.group(); g.position.x = x;
      k.sphereWire(2.1, j === 1 ? P.yellow : j ? P.pink : P.cyan, .14, g);
      k.star({ r: .25, color: c, glow: c, spikes: .4, parent: g });
      const pl = []; for (let i = 0; i < np; i++) { const r = .6 + i * .32 * (j === 2 ? .6 : 1); k.orbit(r, 0xffffff, .2, { parent: g }); pl.push([k.planet({ r: .06 + (j === 0 && i === 0 ? .15 : .03 * i), type: i > 2 || (j === 0 && i === 0) ? 'gas' : 'rocky', a: 0xc8a070, b: 0xe8d8c0, parent: g, sun: [x, 0, 0] }), r]); }
      k.label(['Hot Jupiter', 'Like ours', 'Packed red dwarf'][j], [x, -2.5, 0], 'small'); return pl;
    });
    k.cam({ d: 14, el: 16, drift: 0 });
    k.on((t, n) => { k.camCfg.target.x = mix(-5, 5, n); k.zoom = .55; sys.forEach(pl => pl.forEach(([p, r], i) => { const a = t * .8 / Math.pow(r, 1.5) + i; p.mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); })); });
  },
  k => { // Is there a normal?
    const A = k.group(), B = k.group(); A.position.x = -3.5; B.position.x = 3.5;
    const dA = k.disk({ rin: .3, rout: 2.4, n: 9000, spin: .3, parent: A, color: () => 0xffd8b0 });
    const dB = k.disk({ rin: .3, rout: 2.4, n: 9000, spin: .3, parent: B, color: () => 0x9fd8ff, seed: 22 });
    k.star({ r: .2, parent: A, color: 0xffd0a0 }); k.star({ r: .2, parent: B, color: 0xffd0a0 });
    const sA = [[.7, .1, 'rocky'], [1.1, .12, 'rocky'], [1.6, .3, 'gas']].map(([r, s, ty]) => [k.planet({ r: s, type: ty, parent: A, sun: [-3.5, 0, 0] }), r]);
    const sB = [[.6, .22, 'gas'], [1.2, .14, 'gas'], [1.9, .12, 'gas']].map(([r, s, ty]) => [k.planet({ r: s, type: ty, a: 0x3f6ae0, b: 0x9fd8ff, parent: B, sun: [3.5, 0, 0] }), r]);
    k.label('Rocky-rich dust', [-3.5, -1.6, 0], 'yellow'); k.label('Icy dust', [3.5, -1.6, 0], 'cyan');
    k.cam({ d: 11, el: 26, drift: 0 });
    k.on((t, n) => { dA.u.uAlpha.value = dB.u.uAlpha.value = 1 - n * .85; [...sA, ...sB].forEach(([p, r], i) => { const a = t * .7 / Math.pow(r, 1.5) + i; p.mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); p.mesh.visible = n > .3; p.mesh.material.uniforms.uAlpha.value = clamp((n - .3) * 3); }); });
  },
  k => { // The habitable zone
    k.star({ r: .5, color: 0xffd060, spikes: .5 });
    const hz = k.disk({ rin: 2.2, rout: 3.4, n: 7000, thick: .01, spin: .05, size: .07, color: () => P.green, conc: 1, bright: .5 });
    const pl = k.planet({ r: .2, type: 'earth' });
    const lab = k.label('', () => pl.mesh.position.clone().add(V(0, .5, 0)), 'big');
    k.cam({ d: 10, el: 40, drift: .03 });
    k.on((t, n) => { const r = mix(1, 5, n); const a = t * .25; pl.mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const ty = r < 2.2 ? 3 : r > 3.4 ? 0 : 2; const u = pl.u; u.uType.value = ty; if (ty === 3) { u.uA.value.set(.4, .05, .02); u.uB.value.set(1, .45, .1); u.uC.value.set(1, .4, .1); } else if (ty === 0) { u.uA.value.set(.75, .85, .95); u.uB.value.set(1, 1, 1); u.uC.value.set(.7, .9, 1); } else u.uC.value.set(.45, .75, 1);
      lab.set(r < 2.2 ? 'Too hot' : r > 3.4 ? 'Too cold' : 'Just right for water'); });
  },
];

export default { nebula, stars, planets };
