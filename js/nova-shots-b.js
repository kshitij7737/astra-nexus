// Story shots for Black Holes, Gravitational Lensing and the Universe Tour.
import { V, P, TAU, rgb, rng, gauss, mix, ease } from './nova-gl.js';
import { panel, timeline, readout, curve, solarSystem } from './nova-shots-a.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const step = (n, k) => Math.min(k - 1, Math.floor(n * k));
function fadePair(a, b, n) { a.u.uAlpha.value = 1 - n; b.u.uAlpha.value = n; }

// Integrate a light path past point masses (2D in the x-y plane, z constant).
function bend(start, dir, lenses, o = {}) {
  const x = start.clone(), v = dir.clone().normalize(), pts = [x.clone()];
  const ds = o.ds ?? .04, steps = o.steps ?? 420;
  for (let i = 0; i < steps; i++) {
    let caught = false;
    for (const L of lenses) {
      const d = L.p.clone().sub(x); const r = d.length();
      if (r < (L.cap ?? 0)) { caught = true; break; }
      v.addScaledVector(d.normalize(), L.m * ds / (r * r + .02));
    }
    if (caught) break;
    v.normalize(); x.addScaledVector(v, ds); if (i % 3 === 0) pts.push(x.clone());
  }
  pts.push(x.clone());
  return pts;
}
// Point-lens images of a point at offset b (2D) for Einstein radius e.
function images(bx, by, e) {
  const b = Math.hypot(bx, by) || 1e-4, ux = bx / b, uy = by / b; const s = Math.sqrt(b * b + 4 * e * e);
  const p = (b + s) / 2, m = (b - s) / 2;
  const mag = th => Math.abs(1 / (1 - Math.pow(e / th, 4)));
  return [[ux * p, uy * p, mag(p)], [ux * m, uy * m, mag(Math.abs(m))]];
}
function lensView(g, w, h, off, e, title) {
  const pw = Math.min(250, w - 36), ph = 250; const [x, y] = panel(g, w, h, pw, ph, title || 'What the telescope sees');
  const cx = x + pw / 2, cy = y + ph / 2 + 12, sc = 52;
  g.fillStyle = '#ffb347'; g.shadowColor = '#ffb347'; g.shadowBlur = 16; g.beginPath(); g.ellipse(cx, cy, 9, 7, 0, 0, TAU); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.setLineDash([3, 4]); g.beginPath(); g.arc(cx, cy, e * sc, 0, TAU); g.stroke(); g.setLineDash([]);
  const R = rng(5); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 900; i++) {
    const a = R() * TAU, r = Math.sqrt(R()) * .28; const bx = off + Math.cos(a) * r, by = Math.sin(a) * r * .7;
    for (const [ix, iy, m] of images(bx, by, e)) { const al = Math.min(.6, .05 * m); g.fillStyle = `rgba(110,190,255,${al})`; g.fillRect(cx + ix * sc - 1, cy + iy * sc - 1, 2.4, 2.4); }
  }
  g.globalCompositeOperation = 'source-over';
}
function ringPoints(k, r, o = {}) {
  return k.make(o.n ?? 2600, (i, R) => { const a = (o.a0 ?? 0) + R() * (o.span ?? TAU); const rr = r * (1 + gauss(R) * (o.w ?? .025)); return [Math.cos(a) * rr * (o.sx ?? 1), Math.sin(a) * rr, gauss(R) * .02, o.color ?? 0x8fc8ff, o.size ?? .07, (o.b ?? .35) * (.6 + R() * .8)]; }, { seed: o.seed || 7, parent: o.parent });
}
function lensGalaxy(k, pos = [0, 0, 0], s = 1, parent) {
  const g = k.group(parent); g.position.set(...pos);
  const pts = k.make(2600, (i, R) => { const r = Math.abs(gauss(R)) * .45 * s; const a = R() * TAU; return [Math.cos(a) * r * 1.3, Math.sin(a) * r, gauss(R) * .1, i % 3 ? 0xffd08a : 0xfff0d0, .06 * s, .7]; }, { seed: 31, parent: g });
  g.add(k.glow([0, 0, 0], 1.6 * s, 0xffc070, .8)); return { obj: pts.obj, g };
}
function cluster(k, n, r, seed = 3, parent) {
  return k.galaxies(n, (i, R) => { const rr = Math.abs(gauss(R)) * r; const a = R() * TAU, b = Math.acos(R() * 2 - 1); return [V(Math.sin(b) * Math.cos(a) * rr, Math.cos(b) * rr * .8, Math.sin(b) * Math.sin(a) * rr), .35 + R() * .6, i % 3 === 0 ? 2 : i % 6, .9]; }, parent);
}

// ===================== BLACK HOLES =====================
const blackHoles = [
  k => { // Stars orbiting nothing
    k.skyOpts = { n: 4500, bright: 1.1 };
    const mark = k.label('+', [0, 0, 0], 'cross');
    const S = [[1.4, .85, .2, 0xbfd8ff], [2.2, .6, 1.2, 0xffe0b0], [1.8, .75, 2.4, 0xffffff], [3, .5, 3.6, 0xbfe0ff], [2.6, .8, 5, 0xffd0a0]].map(([a, e, rot, c], i) => {
      const b = a * Math.sqrt(1 - e * e), cx = a * e; const pts = []; for (let j = 0; j <= 160; j++) { const t = j / 160 * TAU; pts.push(V(Math.cos(t) * a - cx, 0, Math.sin(t) * b)); }
      const g = k.group(); g.rotation.set(rot * .4, rot, rot * .3); k.line(pts, c, .25, g);
      const st = k.star({ r: .07, color: c, glow: c, spikes: .5, parent: g }); return { a, e, b, cx, st, ph: i * 1.3 };
    });
    k.cam({ d: 8, el: 20, drift: .02 });
    k.on((t, n) => { k.camCfg.el = mix(10, 80, n); S.forEach(s => { let M = t * .9 / Math.pow(s.a, 1.5) + s.ph, E = M; for (let j = 0; j < 6; j++) E = M + s.e * Math.sin(E); s.st.g.position.set(s.a * Math.cos(E) - s.cx * 0 - s.a * s.e, 0, s.b * Math.sin(E)); }); });
  },
  k => { // Weighing the invisible
    const a = 2.6, e = .6, b = a * Math.sqrt(1 - e * e); const pts = []; for (let j = 0; j <= 160; j++) { const t = j / 160 * TAU; pts.push(V(Math.cos(t) * a - a * e, 0, Math.sin(t) * b)); }
    k.ray(pts, P.cyan, { n: 900, size: .05, speed: .2 }); k.label('+', [0, 0, 0], 'cross');
    const st = k.star({ r: .1, color: 0xbfd8ff, spikes: .6 });
    k.cam({ d: 8, el: 50, drift: .02 });
    k.hud((g, w, h, t, n) => { const m = mix(1, 8, n); readout(g, w, h, [['Orbit size', '1,000 × Sun–Earth'], ['Orbit time', (16 / Math.sqrt(m / 4.1)).toFixed(1) + ' years'], ['Hidden mass', m.toFixed(1) + ' million Suns', '#ff5fae']], 'Weighing'); });
    let M = 0; k.on((t, n, dt) => { M += dt * .6 * Math.sqrt(mix(1, 8, n) / 4); let E = M; for (let j = 0; j < 6; j++) E = M + e * Math.sin(E); st.g.position.set(a * Math.cos(E) - a * e, 0, b * Math.sin(E)); });
  },
  k => { // Too small to be a star
    const big = k.star({ r: 2.2, pos: [-2.6, 0, 0], color: 0xff6a3a, glow: 0xff5a2a, gran: 2.5 });
    const dot = k.bh({ r: .05, pos: [2.2, 0, 0], out: 3, disk: .6 });
    const ring = k.orbit(.3, P.pink, .8, { pos: [2.2, 0, 0] }); ring.rotation.x = Math.PI / 2;
    k.label('A giant star', [-2.6, -2.7, 0], 'pink'); k.label('All that mass fits inside here', [2.2, -.8, 0], 'cyan');
    k.cam({ d: 11, el: 4, drift: 0 });
    k.on((t, n) => { k.camCfg.target.x = mix(0, 2.2, ease(n)); k.zoom = mix(1, .18, ease(n)); });
  },
  k => { // Gravity's limit
    const w = k.well({ N: 50, L: 7, mass: 1, soft: .8, op: .4, y: -.4 });
    const pl = k.planet({ r: .5, type: 'rocky', a: 0x4a6a9a, b: 0x9ac0e0, rim: 0x6fb0ff, sun: [5, 5, 5], pos: [0, -.4, 0] });
    const rk = k.group(); const body = k.ball(.05, 0xffffff); rk.add(body); const fl = k.glow([0, -.1, 0], .3, P.orange, 1); rk.add(fl);
    const trail = k.jet({ n: 500, color: P.orange, len: .6, w: .02, speed: 1.4 }); rk.add(trail.obj);
    const lab = k.label('', [0, 3.2, 0], 'big');
    let T = 0; k.cam({ d: 8, el: 12, drift: .02, target: [0, 1, 0] });
    k.on((t, n, dt) => { const g = mix(.4, 3, n); w.u.uM.value[0].z = g * .6; pl.mesh.scale.setScalar(.45 + n * .1); pl.u.uC.value.set(...rgb(n > .6 ? 0xff5fae : 0x6fb0ff));
      T += dt; const v = 1.6, tt = T % 4; const y = .5 + v * tt - .5 * g * .9 * tt * tt; if (y < .5 && tt > .5) T = 0; rk.position.set(0, Math.max(.5, y), 0);
      lab.set(n > .6 ? 'Heavier world: the rocket falls back' : 'Escape speed: ' + Math.round(mix(11, 60, n)) + ' km/s'); });
  },
  k => { // Light can't get out
    const bh = k.bh({ r: .7, disk: 0, halo: .5 });
    const R0 = [-.3, .3, .9, 1.4, 2]; const rays = R0.map((y, i) => k.ray([V(-6, y, 0), V(6, y, 0)], i < 2 ? P.yellow : P.cyan, { n: 500, size: .09, speed: .4, bright: 1.2 }));
    let last = -1; k.cam({ d: 10, el: 0, drift: 0 });
    k.on((t, n) => { if (Math.abs(n - last) < .01) return; last = n; const m = mix(.12, .7, n); bh.setR(.4 + n * .3);
      rays.forEach((r, i) => r.setPoints(bend(V(-6, R0[i], 0), V(1, 0, 0), [{ p: V(), m, cap: .4 + n * .3 }]))); });
  },
  k => { // A star collapses
    const st = k.star({ r: 1.4, color: 0xbfd8ff, glow: 0x8fb0ff, spikes: .5 });
    const bh = k.bh({ r: .3, disk: 0, halo: 0, photon: 0 });
    k.cam({ d: 7, el: 6, drift: .03 });
    k.on((t, n) => { const r = Math.max(.02, 1.4 * (1 - ease(n))); st.setR(r); st.u.uHeat.value = .5 + n * 2; st.fade(n > .92 ? (1 - n) * 12 : 1); bh.shadow.visible = n > .9; bh.hu.uAlpha.value = n > .9 ? 1 : 0; bh.hu.uPhoton.value = n > .9 ? 1 : 0; });
  },
  k => { // Bright or quiet
    const A = k.group(), B = k.group(); A.position.x = -3; B.position.x = 3;
    const sn = k.shell({ r: 1, n: 8000, colors: [P.orange, P.yellow, P.pink], parent: A });
    const bA = k.bh({ r: .15, disk: 0, parent: A }); const bB = k.bh({ r: .15, disk: 0, parent: B });
    const st = k.star({ r: .9, color: 0xbfd8ff, parent: B, spikes: .3 });
    k.label('With a blast', [-3, -2.4, 0], 'pink'); k.label('Quietly', [3, -2.4, 0], 'cyan');
    let ph = 0; k.cam({ d: 7.5, el: 8, drift: 0 });
    k.on((t, n, dt) => { ph = (ph + dt * .2) % 1; sn.u.uExpand.value = .2 + ph * 2; sn.u.uAlpha.value = (1 - ph) * (1.3 - n); st.setR(Math.max(.05, .9 * (1 - ph * 1.3))); st.fade(ph > .75 ? 0 : 1);
      A.scale.setScalar(1 + (.5 - n) * .3); B.scale.setScalar(1 + (n - .5) * .3); });
  },
  k => { // Stellar-mass black holes
    k.skyOpts = { n: 6000, bright: 1.3 };
    const bh = k.bh({ r: .5, out: 3, disk: .35, halo: .8 });
    const lab = k.label('', [0, -1.6, 0], 'big');
    k.cam({ d: 7, el: 10, drift: .03 });
    k.on((t, n) => { const m = mix(5, 50, n); bh.setR(.35 + n * .6); lab.set(Math.round(m) + ' Suns · ' + Math.round(m * 6) + ' km across'); });
  },
  k => { // Growing bigger
    const bh = k.bh({ r: .5, out: 3.2 });
    const st = k.star({ r: 1.1, pos: [5, 0, 0], color: 0x9fc0ff, glow: 0x8fb0ff });
    const pts = []; for (let i = 0; i <= 80; i++) { const t = i / 80; const r = mix(4, 1.2, t); const a = t * 4.2; pts.push(V(Math.cos(a) * r + (1 - t) * 1, 0, -Math.sin(a) * r)); }
    k.ray(pts, P.cyan, { n: 1600, size: .08, speed: .5, bright: 1 });
    k.cam({ d: 11, el: 32, drift: .02, target: [1.5, 0, 0] });
    k.on((t, n) => { bh.setR(.4 + n * .5); bh.du.uHeat.value = .4 + n; });
  },
  k => { // Supermassive giants
    const gal = k.galaxy({ r: 10, n: 30000, arms: 2, twist: 2.4 });
    const bh = k.bh({ r: .05, out: 4 });
    const lab = k.label('Supermassive black hole', [0, -.12, 0], 'pink');
    k.cam({ d: 22, el: 40, drift: .02 });
    k.on((t, n) => { k.zoom = Math.pow(10, -ease(n) * 1.75); gal.u.uAlpha.value = clamp(1 - ease(n) * 1.15); lab.show = n > .75 ? 1 : 0; });
  },
  k => { // The event horizon
    const bh = k.bh({ r: 1, disk: 0, halo: .6 });
    k.sphereWire(1.02, P.cyan, .35);
    const probe = k.glow([4, 0, 0], .4, P.yellow, 1); const lab = k.label('', () => probe.position.clone().add(V(0, .5, 0)), 'big');
    k.cam({ d: 8, el: 18, drift: .03 });
    k.on((t, n) => { const r = mix(5, 1.05, ease(n)); probe.position.set(r, 0, 0); lab.set(r < 1.3 ? 'Point of no return' : 'Still can escape'); });
  },
  k => { // Size depends on mass
    const bh = k.bh({ r: .5, disk: 0, halo: .7 });
    const rul = k.line([V(-4, -2, 0), V(4, -2, 0)], 0xffffff, .5);
    const tick = []; for (let i = 0; i <= 8; i++) tick.push(k.glow([-4 + i, -2, 0], .2, P.yellow, 1));
    const lab = k.label('', [0, -2.6, 0], 'big');
    k.cam({ d: 9, el: 0, drift: 0 });
    k.on((t, n) => { const m = mix(5, 100, n); bh.setR(.2 + n * 2); lab.set(Math.round(m) + ' Suns → ' + Math.round(m * 5.9) + ' km wide'); });
  },
  k => { // The singularity
    const bh = k.bh({ r: 1.4, disk: .4, halo: .8 });
    bh.shadow.material.transparent = true; bh.shadow.material.opacity = .85;
    k.sphereWire(1.4, P.purple, .15);
    const dot = k.glow([0, 0, 0], .5, 0xffffff, 1); const q = k.label('?', [0, .6, 0], 'question');
    k.cam({ d: 8, el: 12, drift: .03 });
    k.on((t, n) => { k.zoom = mix(1, .3, ease(n)); dot.scale.setScalar(.3 + Math.sin(t * 3) * .05); });
  },
  k => { // Slow time
    const bh = k.bh({ r: .7, out: 3.4 });
    const near = k.glow([2, 0, 0], .5, P.pink, 1), far = k.glow([7, 0, 0], .5, P.cyan, 1);
    const ln = k.label('', () => near.position.clone().add(V(0, .6, 0)), 'pink'), lf = k.label('', [7, .6, 0], 'cyan');
    let tn = 0, tf = 0;
    k.cam({ d: 11, el: 16, drift: .02, target: [3, 0, 0] });
    k.on((t, n, dt) => { const r = mix(5, 1.15, ease(n)); near.position.x = r; const f = Math.sqrt(Math.max(.02, 1 - .9 / r)); tf += dt; tn += dt * f; ln.set('Near clock ' + (tn % 60).toFixed(1) + ' s'); lf.set('Far clock ' + (tf % 60).toFixed(1) + ' s'); });
  },
  k => { // Stretching
    const bh = k.bh({ r: .6, out: 3 });
    const obj = k.make(3000, (i, R) => { const a = R() * TAU, b = Math.acos(R() * 2 - 1), r = Math.cbrt(R()) * .4; return [Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r, i % 2 ? P.yellow : P.orange, .05, 1]; }, { seed: 4 });
    let ph = 0; k.cam({ d: 9, el: 14, drift: .02, target: [2, 0, 0] });
    k.on((t, n, dt) => { ph = (ph + dt * .12) % 1; const r = mix(6, 1, ease(ph)); obj.obj.position.set(r, 0, 0); const s = 1 + Math.pow(ph, 3) * 10 * (.3 + n * 1.4); obj.obj.scale.set(s, 1 / Math.sqrt(s), 1 / Math.sqrt(s)); obj.u.uAlpha.value = ph > .93 ? (1 - ph) * 14 : 1; });
  },
  k => { // The gas disk
    const bh = k.bh({ r: .7, out: 5, heat: .2 });
    k.cam({ d: 8, el: 18, drift: .03 });
    k.on((t, n) => { bh.du.uSpin.value = .2 + n * 2.2; });
  },
  k => { // Friction makes heat
    const bh = k.bh({ r: .7, out: 5.5 });
    k.cam({ d: 8.5, el: 22, drift: .03 });
    k.on((t, n) => { bh.du.uHeat.value = n * 1.6; bh.du.uAlpha.value = .5 + n * .9; });
  },
  k => { // A lopsided glow
    const bh = k.bh({ r: .7, out: 5.5, dop: .9 });
    k.label('Coming toward us: brighter', [-3.5, .8, 0], 'yellow'); k.label('Moving away: dimmer', [3.5, .8, 0], 'pink');
    k.cam({ d: 9, el: 40, drift: 0, az: 0 });
    k.on((t, n) => { k.camCfg.el = mix(60, 4, n); });
  },
  k => { // Jets (reel style: spikes, swirl, blue beams)
    k.nebulaSky({ colors: [P.purple, P.blue, P.pink, P.cyan], bright: 1.4 });
    const bh = k.bh({ r: .45, out: 4.5, heat: .9, dop: .5 });
    const jet = k.jet({ n: 6000, color: 0x9fd8ff, len: 6, w: .05, size: .1 });
    const sp = k.spikes([0, 0, 0], 26, 0xfff0e0, .8);
    const core = k.glow([0, 0, 0], 2.4, 0xffe0c0, .9);
    k.cam({ d: 10, el: 14, drift: .05 });
    k.on((t, n) => { jet.u.uJet.value = .2 + n * .9; jet.u.uJetLen.value = 2 + n * 7; jet.u.uAlpha.value = .25 + n * 1.1; sp.material.opacity = .3 + n * .6; sp.material.rotation = t * .02; core.material.opacity = .4 + n * .6; });
  },
  k => { // Gravitational waves
    const w = k.well({ N: 80, L: 10, mass: 0, op: .55, a: 0x2a3a9a, b: 0x52e4ff });
    w.u.uM.value[0].set(0, 0, 1.4, .6); w.u.uM.value[1].set(0, 0, 1.4, .6);
    const A = k.bh({ r: .25, out: 1.2, disk: .5 }), B = k.bh({ r: .25, out: 1.2, disk: .5 });
    const flash = k.glow([0, 0, 0], 5, 0xffffff, 0);
    k.cam({ d: 12, el: 30, drift: .03 });
    k.on((t, n) => { const r = mix(2.2, .05, ease(n)); const a = t * (1 + 6 * Math.pow(n, 2)) * 1.2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r; w.u.uM.value[0].set(x, z, 1.4, .6); w.u.uM.value[1].set(-x, -z, 1.4, .6);
      A.g.position.set(x, w.depthAt(x, z) + .3, z); B.g.position.set(-x, w.depthAt(-x, -z) + .3, -z);
      w.u.uRipple.value = .15 + n * .5; w.u.uRippleK.value = 1.2 + n * 2; flash.material.opacity = n > .95 ? (n - .95) * 20 : 0; });
  },
  k => { // Light goes around
    const bh = k.bh({ r: .8, disk: 0, halo: .7, photon: 3 });
    k.cam({ d: 8, el: 0, drift: .01 });
    k.on((t, n) => { bh.setR(.5 + n * .8); });
  },
  k => { // The shadow (EHT style)
    k.noSky = true;
    const ring = ringPoints(k, 1.6, { n: 9000, w: .14, color: P.orange, size: .3, b: .07 });
    const hot = ringPoints(k, 1.6, { n: 3000, w: .08, color: 0xffd06a, size: .25, a0: -2.6, span: 2.2, seed: 9, b: .08 });
    const hz = k.orbit(.8, 0xffffff, .5); hz.rotation.x = Math.PI / 2;
    k.label('Shadow', [0, .2, 0], 'small'); k.label('Event horizon', [0, -.6, 0], 'small');
    k.cam({ d: 7, el: 0, drift: 0 });
    k.on((t, n) => { k.zoom = mix(1, .55, n); ring.obj.rotation.z = t * .03; });
  },
  k => { // The first pictures
    const A = k.group(), B = k.group(); A.position.x = -2.6; B.position.x = 2.6;
    ringPoints(k, 1.2, { n: 6000, w: .14, color: P.orange, size: .24, parent: A, b: .07 });
    ringPoints(k, 1.2, { n: 6000, w: .16, color: 0xff7a40, size: .24, parent: B, seed: 11, b: .07 });
    ringPoints(k, 1.2, { n: 2000, w: .1, color: 0xffd06a, size: .2, parent: A, a0: -2.2, span: 2, seed: 12, b: .08 });
    ringPoints(k, 1.2, { n: 2000, w: .1, color: 0xffd06a, size: .2, parent: B, a0: 1, span: 1.6, seed: 13, b: .08 });
    const la = k.label('M87*: 6.5 billion Suns', [-2.6, -1.9, 0], 'yellow'), lb = k.label('Sgr A*: 4 million Suns', [2.6, -1.9, 0], 'pink');
    k.cam({ d: 10, el: 0, drift: 0 });
    k.on((t, n) => { k.camCfg.target.x = mix(-2.6, 2.6, ease(n)); k.zoom = .6 + Math.abs(n - .5) * .3; la.el.classList.toggle('on', n < .5); lb.el.classList.toggle('on', n >= .5); });
  },
  k => { // What we still don't know
    k.bh({ r: 1, out: 4, disk: .5 });
    const Q = ['What happens inside?', 'How did the giants grow so fast?', 'Is information lost?', 'Do they evaporate?', 'Can we see the singularity?'];
    const qs = Q.map((q, i) => k.label('?', () => { const a = i / Q.length * TAU + k.t * .1; return V(Math.cos(a) * 3, Math.sin(a * 1.7) * 1.2, Math.sin(a) * 3); }, 'question'));
    const tag = k.label('', [0, -2.4, 0], 'big');
    k.cam({ d: 10, el: 14, drift: .02 });
    k.on((t, n) => { const i = step(n, Q.length); tag.set(Q[i]); qs.forEach((q, j) => q.el.classList.toggle('on', j === i)); });
  },
];

// ===================== GRAVITATIONAL LENSING =====================
const lensing = [
  k => { // The stretchy sheet
    const w = k.well({ N: 70, L: 8, mass: 2.4, soft: 1, op: .6 });
    const ball = k.planet({ r: .8, type: 'gas', a: 0xc8a070, b: 0xf0dcc0, rim: 0xffd0a0, pos: [0, w.depthAt(0, 0) + .8, 0], sun: [6, 6, 6], amb: .25 });
    const marble = k.ball(.15, P.cyan); marble.add(k.glow([0, 0, 0], .9, P.cyan, .8));
    k.cam({ d: 11, el: 30, drift: .03, target: [0, -1, 0] });
    k.on((t, n) => { k.camCfg.el = mix(10, 70, n); const a = t * .9, r = 3 + Math.sin(t * .3); marble.position.set(Math.cos(a) * r, w.depthAt(Math.cos(a) * r, Math.sin(a) * r) + .15, Math.sin(a) * r); });
  },
  k => { // Light follows the curve
    const w = k.well({ N: 60, L: 8, mass: 1.6, soft: 1, op: .3, y: -1.5 });
    const st = k.star({ r: .7, color: 0xffd060 });
    const ray = k.ray([V(-7, 1.2, 0), V(7, 1.2, 0)], P.cyan, { n: 900, size: .09, speed: .45, bright: 1 });
    const straight = k.line([V(-7, 1.2, 0), V(7, 1.2, 0)], 0xffffff, .15);
    let last = -1; k.cam({ d: 12, el: 8, drift: .01 });
    k.on((t, n) => { if (Math.abs(n - last) < .01) return; last = n; const m = mix(.05, 1, n); st.setR(.5 + n * .5); w.u.uM.value[0].z = .5 + n * 2; ray.setPoints(bend(V(-7, 1.2, 0), V(1, 0, 0), [{ p: V(), m }], { steps: 360 })); });
  },
  k => { // Einstein's prediction
    const sun = k.star({ r: .8, color: 0xffd060 });
    const far = k.star({ r: .12, pos: [7, 1.6, 0], color: 0xbfd8ff, spikes: .6 });
    const earth = k.planet({ r: .25, type: 'earth', pos: [-6, 0, 0], sun: [0, 0, 0] });
    const newton = k.ray(bend(V(7, 1.6, 0), V(-1, -.12, 0), [{ p: V(), m: .07 }]), P.yellow, { n: 600, size: .07 });
    const einstein = k.ray(bend(V(7, 1.6, 0), V(-1, -.12, 0), [{ p: V(), m: .14 }]), P.cyan, { n: 600, size: .07 });
    k.label('Newton: a small bend', [3, 2.4, 0], 'yellow'); k.label('Einstein: twice as much', [3, -.2, 0], 'cyan');
    k.cam({ d: 13, el: 6, drift: 0 });
    k.on((t, n) => { newton.u.uAlpha.value = 1 - n * .8; einstein.u.uAlpha.value = .2 + n * .8; });
  },
  k => { // The 1919 eclipse
    k.skyOpts = { n: 1500 };
    k.ball(1, 0x000000); k.glow([0, 0, 0], 5, 0xfff0d0, .9); k.spikes([0, 0, 0], 10, 0xffffff, .3);
    const S = [[1.6, .5], [-1.4, 1.2], [.4, -1.7], [-1.9, -.6], [1.1, 1.9]];
    const real = S.map(([x, y]) => k.glow([x, y, 0], .25, 0xffffff, .5));
    const seen = S.map(([x, y]) => k.glow([x, y, 0], .4, P.cyan, 1));
    S.forEach(([x, y]) => k.line([V(x, y, 0), V(x * 1.25, y * 1.25, 0)], P.cyan, .4));
    k.label('Measured in 1919', [0, -2.8, 0], 'cyan');
    k.cam({ d: 7, el: 0, drift: 0 });
    k.on((t, n) => seen.forEach((s, i) => { const [x, y] = S[i]; const f = 1 + n * .25; s.position.set(x * f, y * f, 0); }));
  },
  k => { // A cosmic lens
    const src = k.galaxy({ r: .8, n: 4000, armColor: 0x6fa0ff, core: 0xffffff }); src.obj.position.set(-7, 0, 0); src.obj.rotation.z = Math.PI / 2;
    lensGalaxy(k, [0, 0, 0], 1.2);
    k.planet({ r: .3, type: 'earth', pos: [7, 0, 0], sun: [7, 5, 5] });
    for (const s of [1, -1]) for (const z of [0]) k.ray(bend(V(-7, 0, 0), V(1, s * .2, 0), [{ p: V(), m: .17 }]), P.cyan, { n: 600, size: .07 });
    for (const s of [1, -1]) k.ray(bend(V(-7, 0, 0), V(1, 0, s * .2), [{ p: V(), m: .17 }]), P.purple, { n: 600, size: .07 });
    k.label('Distant galaxy', [-7, -1.4, 0], 'cyan'); k.label('Lens galaxy', [0, -1.6, 0], 'yellow'); k.label('Us', [7, -.7, 0], 'pink');
    k.cam({ d: 13, el: 16, drift: 0, az: 20 });
    k.on((t, n) => { k.camCfg.az = mix(20, 85, n); });
  },
  k => { // Lining up
    lensGalaxy(k, [0, 0, 0], 1);
    const src = k.galaxy({ r: .8, n: 5000, armColor: 0x6fa0ff, core: 0xffffff }); src.obj.rotation.x = Math.PI / 2; src.obj.position.z = -5;
    k.cam({ d: 9, el: 0, drift: 0, az: 35 });
    k.hud((g, w, h, t, n) => lensView(g, w, h, mix(1.4, .02, n), .7));
    k.on((t, n) => { src.obj.position.x = mix(2.4, 0, n); });
  },
  k => { // The Einstein ring
    lensGalaxy(k, [0, 0, 0], 1);
    const full = ringPoints(k, 1.6, { n: 5000, w: .05 });
    const arcs = [ringPoints(k, 1.9, { n: 2600, a0: -.7, span: 1.4, w: .04, seed: 8 }), ringPoints(k, 1.1, { n: 1200, a0: Math.PI - .4, span: .8, w: .04, seed: 9 })];
    k.cam({ d: 7, el: 0, drift: 0 });
    k.on((t, n) => { full.u.uAlpha.value = 1 - ease(n * 1.6); arcs.forEach(a => a.u.uAlpha.value = ease(n * 1.4)); });
  },
  k => { // Multiple images
    lensGalaxy(k, [0, 0, 0], 1);
    const cross = [[1.4, 0], [-1.4, 0], [0, 1.25], [0, -1.25]].map(([x, y]) => k.star({ r: .1, pos: [x, y, 0], color: 0xbfe0ff, glow: 0x8fc8ff, spikes: .7 }));
    const two = [[1.9, .2], [-.7, -.1]].map(([x, y]) => k.star({ r: .12, pos: [x, y, 0], color: 0xbfe0ff, glow: 0x8fc8ff, spikes: .7 }));
    k.cam({ d: 7, el: 0, drift: 0 });
    k.on((t, n) => { cross.forEach(s => s.fade(1 - ease(n * 1.5))); two.forEach(s => s.fade(ease(n * 1.5 - .3))); });
  },
  k => { // Arcs and smears
    const cl = cluster(k, 60, 1.6, 5);
    k.glow([0, 0, 0], 6, 0xffc070, .35);
    const R = rng(4); for (let i = 0; i < 7; i++) ringPoints(k, 2.2 + R() * 2.4, { n: 900, a0: R() * TAU, span: .5 + R() * .6, w: .02, color: i % 2 ? 0x8fc8ff : 0xbfa8ff, seed: 20 + i, size: .08 });
    k.cam({ d: 12, el: 0, drift: .005 });
    k.on((t, n) => { k.zoom = mix(1, .45, ease(n)); });
  },
  k => { // Strong and weak
    const A = k.group(), B = k.group(); A.position.x = -3.4; B.position.x = 3.4;
    cluster(k, 30, .8, 6, A); cluster(k, 8, .5, 7, B);
    const arcs = []; const R = rng(5); for (let i = 0; i < 5; i++) arcs.push(ringPoints(k, 1.4 + R(), { n: 700, a0: R() * TAU, span: .6, w: .02, seed: 30 + i, parent: A }));
    const weak = k.galaxies(40, (i, R2) => { const a = R2() * TAU, r = 1 + R2() * 1.8; return [V(Math.cos(a) * r, Math.sin(a) * r, 0), .3, i % 6, .8, a + Math.PI / 2]; }, B);
    k.label('Strong lensing', [-3.4, -3, 0], 'pink'); k.label('Weak lensing', [3.4, -3, 0], 'cyan');
    k.cam({ d: 12, el: 0, drift: 0 });
    k.on((t, n) => { arcs.forEach(a => a.u.uAlpha.value = .2 + n); weak.forEach(s => s.scale.set(.3 * (1 + n * .9), .3, 1)); });
  },
  k => { // Magnifying glass
    const faint = k.galaxy({ r: .6, n: 3000, armColor: 0x6fa0ff, core: 0xffffff }); faint.obj.rotation.x = Math.PI / 2; faint.obj.position.z = -4;
    const lens = k.group(); lensGalaxy(k, [0, 0, 0], .8, lens); const lr = k.orbit(1.2, P.yellow, .5, { parent: lens }); lr.rotation.x = Math.PI / 2;
    k.cam({ d: 9, el: 0, drift: 0, az: 25 });
    k.hud((g, w, h, t, n) => readout(g, w, h, [['Brightness', '×' + (1 + 14 * Math.pow(ease(n), 3)).toFixed(1), '#ffd45a']], 'Magnification'));
    k.on((t, n) => { lens.position.x = mix(4, 0, ease(n)); faint.u.uAlpha.value = .25 + 1.6 * Math.pow(ease(n), 3); });
  },
  k => { // Clusters as telescopes
    const cl = cluster(k, 40, 1.2, 8);
    const scope = k.group(); scope.position.set(7, 0, 0); const tube = k.ball(.3, 0x8a9ac0); tube.scale.set(2.4, 1, 1); scope.add(tube);
    const far = []; for (let i = 0; i < 4; i++) { const y = (i - 1.5) * .6; far.push(k.galaxies(1, () => [V(-8, y * 1.4, 0), .5, i])); }
    const rays = [-1, -.4, .4, 1].map((s, i) => k.ray([V(-8, s * 2, 0), V(7, 0, 0)], i % 2 ? P.cyan : P.purple, { n: 500, size: .07 }));
    let last = -1; k.cam({ d: 15, el: 10, drift: 0 });
    k.on((t, n) => { if (Math.abs(n - last) < .01) return; last = n; const m = mix(.02, .12, n); rays.forEach((r, i) => { const s = [-1, -.4, .4, 1][i]; r.setPoints(bend(V(-8, s * 1.2, 0), V(1, -s * .06 + s * .01, 0), [{ p: V(), m }], { steps: 420 })); }); });
  },
  k => { // Time delays
    lensGalaxy(k, [0, 0, 0], 1);
    const q = k.star({ r: .12, pos: [-7, .3, 0], color: 0xbfe0ff, spikes: .8 });
    k.planet({ r: .25, type: 'earth', pos: [7, 0, 0], sun: [7, 4, 4] });
    const short = k.ray([V(-7, .3, 0), V(-2, 1.2, 0), V(2, 1.2, 0), V(7, 0, 0)], P.cyan, { n: 600, size: .08 });
    const long = k.ray([V(-7, .3, 0), V(-2.5, -2.6, 0), V(2.5, -2.6, 0), V(7, 0, 0)], P.pink, { n: 600, size: .08 });
    k.cam({ d: 13, el: 4, drift: 0 });
    k.hud((g, w, h, t, n) => readout(g, w, h, [['Image A arrives', 'day 0', '#52e4ff'], ['Image B arrives', 'day ' + Math.round(mix(20, 420, n)), '#ff5fae']], 'Same flash, two arrivals'));
    k.on((t, n) => { short.u.uSpeed.value = .35; long.u.uSpeed.value = .35 / mix(1.1, 2, n); });
  },
  k => { // Microlensing
    const src = k.star({ r: .4, color: 0xffd060, pos: [0, 0, -3] });
    const lens = k.star({ r: .18, color: 0xff6a3a, glow: 0xff5a3a, spikes: .2 });
    const ring = k.orbit(.5, P.cyan, 0); ring.rotation.x = Math.PI / 2;
    k.cam({ d: 8, el: 0, drift: 0, az: 15 });
    const f = u => 1 / Math.sqrt(1 + Math.pow((u - .5) * 6, 2) * 4);
    k.hud((g, w, h, t, n) => curve(g, w, h, f, { title: 'Brightness of the far star', until: n, color: '#ffd45a', note: 'time →' }));
    k.on((t, n) => { lens.g.position.x = mix(-3, 3, n); const m = f(n); src.setR(.4 + m * .4); ring.material.opacity = m * .8; ring.position.x = lens.g.position.x * .3; });
  },
  k => { // Hidden planets
    const src = k.star({ r: .4, color: 0xffd060, pos: [0, 0, -3] });
    const lens = k.star({ r: .18, color: 0xff6a3a, glow: 0xff5a3a, spikes: .2 });
    const pl = k.planet({ r: .07, type: 'rocky', parent: lens.g, pos: [.6, .1, 0] });
    let s = 0; k.cam({ d: 8, el: 0, drift: 0, az: 15 });
    const f = u => clamp(1 / Math.sqrt(1 + Math.pow((u - .45) * 6, 2) * 4) + s * Math.exp(-Math.pow((u - .62) * 60, 2)) * .6);
    k.hud((g, w, h, t, n) => curve(g, w, h, f, { title: 'Brightness: the planet’s blip', until: (t * .12) % 1, color: '#6dff9e', note: 'time →' }));
    k.on((t, n) => { s = n; const u = (t * .12) % 1; lens.g.position.x = mix(-3, 3, u); pl.mesh.scale.setScalar(.04 + n * .1); src.setR(.4 + f(u) * .4); });
  },
  k => { // Seeing the unseen
    cluster(k, 50, 1.8, 9);
    const mass = k.cloud({ n: 9000, r: 3.4, seed: 70, colors: [P.purple, P.blue, 0x6a4aff], big: .3, haze: 3, bright: .7 });
    k.label('Galaxies: what we see', [-2.5, 2.6, 0], 'yellow'); const lm = k.label('Total mass: mostly invisible', [2.5, -2.8, 0], 'purple');
    k.cam({ d: 11, el: 6, drift: .01 });
    k.on((t, n) => { mass.u.uAlpha.value = n; lm.show = n > .2 ? 1 : 0; });
  },
  k => { // Mapping mass
    const w = k.web({ r: 7, nodes: 50, n: 26000, colors: [P.purple, 0x6a4aff, P.blue, P.pink], seed: 71 });
    k.cam({ d: 16, el: 20, drift: .03 });
    k.on((t, n) => { k.zoom = mix(1, .35, ease(n)); });
  },
  k => { // Bullet Cluster
    const A = k.group(), B = k.group();
    cluster(k, 30, .8, 10, A); cluster(k, 22, .6, 11, B);
    const mA = k.cloud({ n: 4000, r: 1.4, seed: 72, colors: [P.blue, 0x6a8aff], big: .3, haze: 3, parent: A, bright: .6 });
    const mB = k.cloud({ n: 3000, r: 1.1, seed: 73, colors: [P.blue, 0x6a8aff], big: .3, haze: 3, parent: B, bright: .6 });
    const gas = k.cloud({ n: 6000, r: 1.4, seed: 74, colors: [P.pink, P.red, 0xff8ac8], big: .3, haze: 3, bright: .7 });
    k.label('Hot gas (pink)', [0, -2.4, 0], 'pink'); k.label('Mass (blue)', [0, 2.6, 0], 'cyan');
    k.cam({ d: 13, el: 4, drift: 0 });
    k.on((t, n) => { const x = mix(-1, 4, ease(n)); A.position.x = -x; B.position.x = x; gas.obj.scale.set(1 + n * 1.2, 1 - n * .3, 1); gas.obj.position.x = 0; });
  },
  k => { // Black hole lenses
    k.noSky = true;
    const N = 2500; const R = rng(9); const base = []; for (let i = 0; i < N; i++) base.push([(R() - .5) * 12, (R() - .5) * 8, R()]);
    const pts = k.make(N * 2, (i) => [0, 0, -1, base[i % N][2] > .9 ? 0xbfd8ff : 0xffffff, .05, .8], { seed: 3 });
    const bh = k.bh({ r: .5, disk: 0, halo: .6, photon: 1.4 });
    let last = -1; k.cam({ d: 9, el: 0, drift: 0 });
    k.on((t, n) => { if (Math.abs(n - last) < .01) return; last = n; const e = mix(.5, 1.6, n); bh.setR(e * .52);
      const a = pts.geo.attributes.position; base.forEach(([x, y], i) => { const [[x1, y1], [x2, y2]] = images(x, y, e); a.setXYZ(i, x1, y1, -1); a.setXYZ(i + N, x2, y2, -1); }); a.needsUpdate = true; });
  },
  k => { // Move the source
    lensGalaxy(k, [0, 0, 0], 1);
    const src = k.galaxy({ r: .5, n: 2500, armColor: 0x6fa0ff, core: 0xffffff }); src.obj.rotation.x = Math.PI / 2; src.obj.position.z = -5;
    k.planet({ r: .2, type: 'earth', pos: [0, 0, 5], sun: [4, 4, 8] });
    k.cam({ d: 12, el: 18, drift: 0, az: 60 });
    k.hud((g, w, h, t, n) => lensView(g, w, h, mix(1.6, -1.6, n), .7, 'Live picture'));
    k.on((t, n) => { src.obj.position.x = mix(2.4, -2.4, n); });
  },
  k => { // Change the lens
    const lg = lensGalaxy(k, [0, 0, 0], 1);
    k.cam({ d: 9, el: 0, drift: 0, az: 30 });
    k.hud((g, w, h, t, n) => lensView(g, w, h, .25, mix(.35, 1.2, n), n < .5 ? 'Light lens' : 'Heavy lens'));
    k.on((t, n) => { lg.g.scale.setScalar(.6 + n * .8); });
  },
  k => { // What lensing teaches
    lensGalaxy(k, [0, 0, 0], 1); ringPoints(k, 1.6, { n: 4000 });
    const T = [['Weighing mass', P.yellow], ['Dark matter', P.purple], ['Early galaxies', P.cyan], ['Expansion', P.pink]];
    const L = T.map(([s, c], i) => { const a = i / 4 * TAU + Math.PI / 4; const p = V(Math.cos(a) * 3.8, Math.sin(a) * 2.6, 0); k.glow(p, 1.2, c, .7); return k.label(s, p, 'topic'); });
    k.cam({ d: 10, el: 0, drift: 0 });
    k.on((t, n) => { const i = step(n, 4); L.forEach((l, j) => l.el.classList.toggle('on', j === i)); });
  },
];

// ===================== UNIVERSE TOUR =====================
function logMap(k) { // The circular logarithmic map of the universe, Earth and Sun at the centre.
  const R0 = 6; const g = k.group();
  k.star({ r: .07, color: 0xffd060, parent: g, spikes: .6 });
  [.12, .18, .25, .33].forEach(r => k.orbit(r, 0x9ab8ff, .35, { parent: g }));
  const zone = (n, r0, r1, f, seed, pw = .9) => k.make(n, (i, R) => { const a = R() * TAU, r = mix(r0, r1, Math.pow(R(), pw)) * R0; return [Math.cos(a) * r, gauss(R) * .02, Math.sin(a) * r, ...f(i, R, r / R0)]; }, { seed, parent: g });
  zone(700, .02, .7, (i, R) => [[0x6a7ab0, 0x8a6aa0, 0x5a8ab0][i % 3], .5 + R() * 1.2, .05], 11, 1.4);
  zone(2500, .06, .3, (i, R) => [[0xffffff, 0xbfd8ff, 0xffe0b0][i % 3], .025, .5], 1);
  zone(5000, .2, .6, (i, R) => [i % 7 === 0 ? P.pink : 0x7a7ab8, .05, .22], 2);
  zone(4000, .3, .72, (i, R) => [[0xffd8b0, 0xbfd0ff, 0xffffff][i % 3], .035, .45], 3);
  k.galaxies(90, (i, R) => { const a = R() * TAU, r = mix(.34, .74, R()) * R0; return [V(Math.cos(a) * r, .02, Math.sin(a) * r), .18 + R() * .26, i % 6]; }, g);
  // Cosmic web: short wandering filaments packed into a band.
  const R1 = rng(4), web = [];
  for (let f = 0; f < 420; f++) { let a = R1() * TAU, r = mix(.76, .93, R1()), da = (R1() - .5) * .02, dr = (R1() - .5) * .006;
    for (let s = 0; s < 34; s++) { web.push([a, r]); a += da + (R1() - .5) * .01; r = Math.min(.95, Math.max(.74, r + dr + (R1() - .5) * .004)); } }
  k.make(22000, (i, R) => { const [a, r] = web[Math.floor(R() * web.length)]; const rr = (r + gauss(R) * .003) * R0, aa = a + gauss(R) * .003;
    return [Math.cos(aa) * rr, gauss(R) * .02, Math.sin(aa) * rr, [0xffe0c0, 0xffb880, 0xffffff, 0xff9ab0][i % 4], .03, .55]; }, { seed: 5, parent: g });
  zone(12000, .945, .995, (i, R) => [i % 3 ? P.red : 0xff8a6a, .045, .55], 6, 1);
  zone(4000, .995, 1.03, () => [0x5a2a40, .06, .35], 7, 1);
  return g;
}
const universe = [
  k => { // You are here
    const e = k.planet({ r: 1, type: 'earth', sun: [8, 3, 10], amb: .04 });
    k.glow([0, 0, 0], 3, 0x6fb0ff, .35);
    k.label('You are here', [0, 1.5, 0], 'big');
    k.cam({ d: 3.6, el: 10, drift: .03 });
    k.on((t, n) => { e.mesh.rotation.y = t * .15; k.zoom = mix(1, 4, ease(n)); });
  },
  k => { // The Moon
    const e = k.planet({ r: .6, type: 'earth', pos: [-4, 0, 0], sun: [0, 3, 20] });
    const m = k.planet({ r: .17, type: 'rocky', a: 0x6a6a6a, b: 0xc8c8c8, rim: 0x777777, pos: [4, 0, 0], sun: [0, 3, 20] });
    const ray = k.ray([V(-3.3, 0, 0), V(3.8, 0, 0)], P.yellow, { n: 600, size: .05, bright: .3 });
    const pulse = k.glow([-3.3, 0, 0], .6, 0xffffff, 1); const lab = k.label('', () => pulse.position.clone().add(V(0, .5, 0)), 'yellow');
    k.label('Moon', [4, -.5, 0], 'small');
    let x = 0; k.cam({ d: 10, el: 10, drift: .01 });
    k.on((t, n, dt) => { x = (x + dt / 1.28 * (.15 + n * 1.2)) % 1; pulse.position.x = mix(-3.3, 3.8, x); lab.set((x * 1.28).toFixed(2) + ' s'); e.mesh.rotation.y = t * .1; });
  },
  k => { // The Sun
    const sun = k.star({ r: 1.2, color: 0xffc04a, spikes: .4 });
    k.orbit(6, P.cyan, .4);
    const e = k.planet({ r: .12, type: 'earth', pos: [6, 0, 0] });
    const pulse = k.glow([1.2, 0, 0], .5, 0xffffff, 1); const lab = k.label('', () => pulse.position.clone().add(V(0, .4, 0)), 'yellow');
    let x = 0; k.cam({ d: 12, el: 20, drift: .02 });
    k.on((t, n, dt) => { x = (x + dt * .12) % 1; pulse.position.x = mix(1.2, 6, x); lab.set(Math.floor(x * 500 / 60) + ' min ' + Math.round(x * 500 % 60) + ' s'); k.zoom = mix(1, .45, ease(n)); k.camCfg.target.x = mix(0, 4, ease(n)); });
  },
  k => { // The Solar System
    solarSystem(k, { speed: .8 });
    k.cam({ d: 16, el: 30, drift: .03 });
    k.on((t, n) => { k.zoom = mix(.45, 1.15, ease(n)); });
  },
  k => { // The edge
    k.star({ r: .25, color: 0xffd060, spikes: .6 });
    const helio = k.shell({ r: 4, n: 14000, thick: .05, colors: [P.cyan, P.purple, P.blue], lumpy: .3 }); helio.obj.scale.set(1.5, 1, 1); helio.obj.position.x = 1.6;
    const probe = k.glow([0, 0, 0], .3, 0xffffff, 1); const lab = k.label('Voyager 1', () => probe.position.clone().add(V(0, .4, 0)), 'cyan');
    k.cam({ d: 15, el: 20, drift: .02 });
    k.on((t, n) => { const r = mix(2, 9, ((t * .05) % 1)); probe.position.set(-r * .7, r * .35, -r * .5); k.zoom = mix(.5, 1.2, ease(n)); });
  },
  k => { // The nearest star
    k.star({ r: .3, pos: [-6, 0, 0], color: 0xffd060 });
    k.star({ r: .14, pos: [6, 0, 0], color: 0xff5a3a, glow: 0xff3a2a, spikes: .4 });
    k.line([V(-6, -.8, 0), V(6, -.8, 0)], 0xffffff, .4);
    for (let i = 0; i <= 4; i++) k.label(i + ' ly', [mix(-6, 6, i / 4.24), -1.2, 0], 'small');
    k.label('Proxima Centauri', [6, .6, 0], 'pink');
    const probe = k.glow([-6, 0, 0], .4, P.cyan, 1);
    k.cam({ d: 12, el: 8, drift: 0 });
    k.hud((g, w, h, t, n) => { const v = mix(.0000567, 1, Math.pow(n, 3)); readout(g, w, h, [['Speed', v >= .99 ? 'light speed' : (v * 300000).toFixed(v < .001 ? 0 : 0) + ' km/s'], ['Trip time', (4.24 / v).toLocaleString(undefined, { maximumFractionDigits: v < .01 ? 0 : 1 }) + ' years', '#52e4ff']], 'Getting there'); });
    k.on((t, n) => { probe.position.x = mix(-6, 6, (t * mix(.01, .3, n)) % 1); });
  },
  k => { // A starry neighborhood
    k.star({ r: .18, color: 0xffd060, spikes: .4 }); k.label('Sun', [0, -.5, 0], 'yellow');
    const N = [['Alpha Centauri', 4.4, 0xffe8c0], ['Barnard’s Star', 6, 0xff6a3a], ['Sirius', 8.6, 0xd8e8ff], ['Epsilon Eridani', 10.5, 0xffb070], ['Procyon', 11.5, 0xfff8e0]];
    const R = rng(3);
    N.forEach(([name, d, c], i) => { const a = i * 1.3, s = d * .5; const p = V(Math.cos(a) * s, gauss(R) * 1.2, Math.sin(a) * s); k.star({ r: .12, pos: p, color: c, glow: c, spikes: .4 }); k.line([V(), p], 0xffffff, .12); k.label(name + ' · ' + d + ' ly', p.clone().add(V(0, .5, 0)), 'small'); });
    k.make(400, (i, R2) => { const a = R2() * TAU, r = 1 + R2() * 6, y = gauss(R2) * 2; return [Math.cos(a) * r, y, Math.sin(a) * r, i % 3 ? 0xffffff : 0xffb070, .1, .7]; }, { seed: 4 });
    k.cam({ d: 12, el: 25, drift: .03 });
    k.on((t, n) => { k.zoom = mix(.6, 1.3, ease(n)); });
  },
  k => { // The Orion Nebula
    const c = k.cloud({ n: 20000, r: 4, seed: 80, colors: [P.pink, 0xff7ab8, P.blue, P.cyan, 0xffb0d8], blobs: [[0, 0, 0, 1], [1.8, .6, -.6, .6], [-1.6, -.4, .4, .7]] });
    [[0, 0, 0], [.25, .12, .1], [-.2, .1, -.1], [.08, -.2, .15]].forEach(p => k.star({ r: .08, pos: p, color: 0xd8e8ff, glow: 0x9fc0ff, spikes: .9 }));
    k.cam({ d: 10, el: 6, drift: .03 });
    k.on((t, n) => { k.zoom = mix(1, .35, ease(n)); });
  },
  k => { // The Orion Arm
    const gal = k.galaxy({ r: 8, n: 30000, arms: 4, twist: 2.2 });
    const arm = k.make(3000, (i, R) => { const rr = 4.6 + gauss(R) * .25 + R() * .8; const th = Math.log(1 + rr) * 2.2 + 1.2 + gauss(R) * .1; return [Math.cos(th) * rr, gauss(R) * .05, Math.sin(th) * rr, P.cyan, .07, 1]; }, { seed: 6, u: { uSpin: .04, uSpinPow: .3 } });
    k.label('Orion Arm: we live here', [Math.cos(Math.log(6) * 2.2 + 1.2) * 5.2, .5, Math.sin(Math.log(6) * 2.2 + 1.2) * 5.2], 'cyan');
    k.cam({ d: 18, el: 60, drift: .01 });
    k.on((t, n) => { arm.u.uAlpha.value = .2 + n * 1.2; gal.u.uAlpha.value = 1 - n * .3; });
  },
  k => { // The Milky Way
    k.galaxy({ r: 8, n: 40000, arms: 4, twist: 2.2 });
    k.glow([0, 0, 0], 6, 0xffd8a0, .5);
    k.cam({ d: 20, el: 55, drift: .015 });
    k.on((t, n) => { k.zoom = mix(1.1, .5, ease(n)); });
  },
  k => { // Our place
    k.galaxy({ r: 8, n: 34000, arms: 4, twist: 2.2 });
    k.orbit(5.2, P.yellow, .5);
    const sun = k.glow([5.2, 0, 0], .8, P.yellow, 1); const lab = k.label('Sun', () => sun.position.clone().add(V(0, .6, 0)), 'yellow');
    k.cam({ d: 18, el: 55, drift: 0 });
    k.hud((g, w, h, t, n) => timeline(g, w, h, { title: 'One trip around the galaxy', fill: n, marker: n, markerText: Math.round(n * 230) + ' million years', ticks: [[0, 'Now'], [.5, '115 Myr'], [1, '230 Myr']], colors: ['#ffd45a', '#a070ff'] }));
    k.on((t, n) => { const a = n * TAU; sun.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2); });
  },
  k => { // The center
    k.make(9000, (i, R) => { const r = Math.abs(gauss(R)) * 2; const a = R() * TAU, b = Math.acos(R() * 2 - 1); return [Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r * .7, Math.sin(b) * Math.sin(a) * r, [0xffd8a0, 0xffffff, 0xffb070][i % 3], .035, .3]; }, { seed: 7, u: { uSpin: .05, uSpinPow: .5 } });
    k.bh({ r: .08, out: .4, disk: .6 }); k.label('Sagittarius A*', [0, -.4, 0], 'pink');
    k.cam({ d: 8, el: 15, drift: .02 });
    k.on((t, n) => { k.zoom = Math.pow(10, -ease(n) * 1.1); });
  },
  k => { // Nearby companions
    k.galaxy({ r: 6, n: 30000, arms: 4, twist: 2.2 });
    const lmc = k.cloud({ n: 3000, r: 1, seed: 90, colors: [0xbfd0ff, 0xffffff, P.pink] }); lmc.obj.position.set(9, -1.5, 3);
    const smc = k.cloud({ n: 1800, r: .7, seed: 91, colors: [0xbfd0ff, 0xffffff] }); smc.obj.position.set(10.5, -2.2, 5);
    k.label('Large Magellanic Cloud', [9, -.3, 3], 'cyan'); k.label('Small Magellanic Cloud', [10.5, -3.2, 5], 'cyan');
    k.cam({ d: 22, el: 25, drift: .01, target: [3, -.5, 1] });
    k.on((t, n) => { k.zoom = mix(1, .5, ease(n)); k.camCfg.target.x = mix(3, 9, ease(n)); });
  },
  k => { // Andromeda
    const mw = k.galaxy({ r: 3, n: 16000, arms: 4 }); const an = k.galaxy({ r: 4, n: 20000, arms: 2, seed: 9, armColor: 0xbfa8ff });
    an.obj.rotation.set(.9, 0, .4);
    const la = k.label('Milky Way', () => mw.obj.position.clone().add(V(0, -2, 0)), 'cyan'), lb = k.label('Andromeda', () => an.obj.position.clone().add(V(0, -2.4, 0)), 'pink');
    k.cam({ d: 22, el: 25, drift: .01 });
    k.hud((g, w, h, t, n) => timeline(g, w, h, { title: 'Heading toward each other', fill: n, marker: n, markerText: (n * 5).toFixed(1) + ' billion years', ticks: [[0, 'Now'], [.9, 'Merger'], [1, '5 Gyr']], colors: ['#52e4ff', '#ff5fae'] }));
    k.on((t, n) => { const d = mix(9, .3, ease(n)); mw.obj.position.x = -d; an.obj.position.x = d; mw.obj.rotation.z = n * .6; });
  },
  k => { // The Local Group
    const mw = k.galaxies(1, () => [V(-4, 0, 0), 2.2, 0, 1])[0]; const an = k.galaxies(1, () => [V(3, .5, -1), 2.6, 3, 1])[0];
    k.galaxies(40, (i, R) => [V(gauss(R) * 4, gauss(R) * 2, gauss(R) * 3), .3 + R() * .4, 2 + i % 3, .8]);
    k.label('Milky Way', [-4, -1.3, 0], 'cyan'); k.label('Andromeda', [3, -1, -1], 'pink'); k.label('Triangulum', [1, 2, 2], 'small');
    k.galaxies(1, () => [V(1, 1.5, 2), 1, 5, 1]);
    k.cam({ d: 14, el: 18, drift: .02 });
    k.on((t, n) => { k.zoom = mix(.7, 1.4, ease(n)); });
  },
  k => { // Galaxy clusters
    cluster(k, 160, 3, 12);
    k.glow([0, 0, 0], 10, 0xffc070, .25);
    k.cam({ d: 16, el: 12, drift: .02 });
    k.on((t, n) => { k.zoom = mix(1.2, .45, ease(n)); });
  },
  k => { // Superclusters (Laniakea-style flows)
    const R = rng(8); const streams = [];
    for (let i = 0; i < 18; i++) { const a = R() * TAU, b = (R() - .5) * 1.4, r = 6 + R() * 4; const p0 = V(Math.cos(a) * r, b * 3, Math.sin(a) * r); const mid = p0.clone().multiplyScalar(.5).add(V(gauss(R), gauss(R), gauss(R)).multiplyScalar(1.6));
      streams.push(k.ray([p0, mid, V(gauss(R) * .2, gauss(R) * .2, gauss(R) * .2)], i % 3 ? 0xffc890 : P.cyan, { n: 900, size: .08, speed: .18, bright: .9 })); }
    k.glow([0, 0, 0], 3, 0xffe0b0, .8); k.label('Great Attractor', [0, -1, 0], 'yellow');
    k.cam({ d: 20, el: 20, drift: .03 });
    k.on((t, n) => streams.forEach(s => s.u.uSpeed.value = .03 + n * .5));
  },
  k => { // The cosmic web (reel-style fly-through)
    k.web({ r: 26, nodes: 170, n: 60000, seed: 33 });
    k.cam({ d: 4, el: 4, drift: .02, target: [0, 0, 20], narrow: 1 });
    k.on((t, n) => { k.camCfg.target.z = 22 - ((t * mix(.4, 3, n)) % 44); });
  },
  k => { // Deep fields
    k.noSky = true;
    const list = k.galaxies(420, (i, R) => [V((R() - .5) * 12, (R() - .5) * 7.5, -R() * 2), .1 + Math.pow(R(), 4) * .9, i % 6, 1]);
    const order = list.map((s, i) => [s, (i * 7919 % 420) / 420]);
    k.cam({ d: 8, el: 0, drift: 0 });
    k.on((t, n) => order.forEach(([s, th]) => { s.material.opacity = clamp((n * 1.1 - th) * 6) * s.userData.op; }));
  },
  k => { // Looking back in time
    const gal = k.galaxy({ r: 2, n: 14000, arms: 2, armColor: 0x9fbfff });
    k.cam({ d: 9, el: 30, drift: .02 });
    k.hud((g, w, h, t, n) => timeline(g, w, h, { title: 'Light left this galaxy', fill: n, marker: n, markerText: (n * 13).toFixed(1) + ' billion years ago', ticks: [[0, 'Now'], [.5, '6.5 Gyr'], [1, '13 Gyr']], colors: ['#ffffff', '#ff5fae'] }));
    k.on((t, n) => { gal.obj.position.z = -n * 12; gal.tint(P.red, n * .8); gal.obj.scale.setScalar(1 - n * .4); });
  },
  k => { // The observable universe (the logarithmic map)
    const g = logMap(k);
    k.label('Us', [0, .35, 0], 'yellow'); const L = [k.label('Nearby galaxies', [0, .1, -3.2], 'small'), k.label('Cosmic web', [-5.1, .1, 0], 'small'), k.label('Oldest light', [4.3, .1, 4.3], 'pink')];
    k.cam({ d: 15, el: 62, drift: .015 });
    k.on((t, n) => { k.zoom = Math.pow(10, -(1 - ease(n)) * 1.6); g.rotation.y = t * .01; L.forEach(l => l.show = n > .5 ? 1 : 0); });
  },
  k => { // The oldest light
    k.noSky = true;
    const c = k.cmb(3);
    k.cam({ d: 8, el: 10, drift: .04 });
    k.on((t, n) => { c.u.uC.value = .15 + n * 1.3; c.mesh.rotation.y = t * .03; });
  },
  k => { // Why there's an edge
    const e = k.planet({ r: .3, type: 'earth', sun: [5, 3, 5] });
    const sph = k.sphereWire(2, P.cyan, .25); const glow = k.cmb(2, { op: .12, side: 1 });
    const R = rng(4); const rays = []; for (let i = 0; i < 16; i++) { const d = V(gauss(R), gauss(R), gauss(R)).normalize(); rays.push([k.ray([d.clone().multiplyScalar(9), d.clone().multiplyScalar(.4)], i % 2 ? P.yellow : P.pink, { n: 400, size: .06, speed: .25 }), d]); }
    const lab = k.label('', [0, -1, 0], 'big');
    k.cam({ d: 14, el: 15, drift: .03 });
    k.on((t, n) => { const r = mix(1.5, 7, n); sph.scale.setScalar(r / 2); glow.mesh.scale.setScalar(r / 2); rays.forEach(([ray, d], i) => ray.u.uAlpha.value = (i / 16 < n + .15) ? 1 : .15); lab.set('Universe age: ' + mix(3, 13.8, n).toFixed(1) + ' billion years'); });
  },
  k => { // Back home (one long fall)
    const web = k.web({ r: 900, nodes: 90, n: 30000, seed: 44 });
    const galG = k.group(); galG.position.set(-30, 0, 0); const gal = k.galaxy({ r: 50, n: 30000, arms: 4, parent: galG });
    const ssG = k.group(); const ss = solarSystem({ ...k, add: (o, p) => k.add(o, p || ssG), star: o => k.star({ ...o, parent: ssG }), planet: o => k.planet({ ...o, parent: ssG }), orbit: (r, c, op, o = {}) => k.orbit(r, c, op, { ...o, parent: ssG }), disk: o => k.disk({ ...o, parent: ssG }) }, { speed: .2 });
    ssG.scale.setScalar(.25);
    const earth = ss.bodies[2];
    const tag = k.label('', [0, 0, 0], 'big');
    k.cam({ d: 3000, el: 30, drift: .02, narrow: 1 });
    k.on((t, n) => { const D = Math.pow(10, mix(3.4, -.4, ease(n))); k.camCfg.d = D; k.camCfg.el = mix(35, 12, n);
      const ep = earth.mesh.position.clone().multiplyScalar(.25); ssG.position.copy(ep.negate());
      web.u.uAlpha.value = clamp((D - 120) / 400); gal.u.uAlpha.value = clamp((D - 4) / 40) * clamp((3000 - D) / 1500);
      tag.set(D > 600 ? 'The cosmic web' : D > 30 ? 'The Milky Way' : D > 2 ? 'The Solar System' : 'Home'); tag.pos = V(0, D * .12, 0); });
  },
];

export default { 'black-holes': blackHoles, lensing, universe };
