// NEXUS//04 game visuals: spacecraft builder model, launch cinematic, mission-control orbit view.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { buildWorld, latLonToVec } from './scene.js';
import { MISSIONS } from './data.js';

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// ---------- materials
let foilTex, cellTex;
function foil() {
  if (foilTex) return foilTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 256); grd.addColorStop(0, '#f6c862'); grd.addColorStop(0.5, '#b8822a'); grd.addColorStop(1, '#f2c15a');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i++) { // crinkles
    g.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,240,200' : '90,55,10'},${0.15 + Math.random() * 0.25})`; g.lineWidth = 1 + Math.random() * 2;
    g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke();
  }
  foilTex = new THREE.CanvasTexture(c); foilTex.colorSpace = THREE.SRGBColorSpace; return foilTex;
}
function cells() {
  if (cellTex) return cellTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#0a1638'; g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
    const grd = g.createLinearGradient(x * 32, y * 32, x * 32 + 32, y * 32 + 32); grd.addColorStop(0, '#2f56c4'); grd.addColorStop(1, '#152f80');
    g.fillStyle = grd; g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29);
  }
  g.strokeStyle = 'rgba(210,220,240,.6)'; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
  for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  cellTex = new THREE.CanvasTexture(c); cellTex.colorSpace = THREE.SRGBColorSpace; return cellTex;
}
const M = {
  foil: () => new THREE.MeshStandardMaterial({ map: foil(), metalness: 0.9, roughness: 0.32 }),
  panel: () => new THREE.MeshStandardMaterial({ map: cells(), metalness: 0.4, roughness: 0.3, side: THREE.DoubleSide }),
  white: () => new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide }),
  grey: () => new THREE.MeshStandardMaterial({ color: 0x8b9099, metalness: 0.7, roughness: 0.35 }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x22252b, metalness: 0.6, roughness: 0.4 }),
  lens: () => new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 1, roughness: 0.05, emissive: 0x0a1a3a }),
};
function dish(r) {
  const pts = []; for (let i = 0; i <= 20; i++) { const x = (i / 20) * r; pts.push(new THREE.Vector2(x, 0.4 * r * (x / r) ** 2)); }
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), M.white()); g.add(d);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, r * 0.7), M.grey()); feed.position.y = r * 0.35; g.add(feed);
  return g;
}

// Build a spacecraft from a game configuration. Returns {group, labels:[{obj,text}]}
export function buildCraft(cfg, mission) {
  const g = new THREE.Group(), labels = [];
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), M.foil()); g.add(bus);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.82), M.grey()); deck.position.y = 0.42; g.add(deck);
  // solar wings
  const nPanels = cfg.solar === 'L' ? 3 : 2;
  for (const side of [-1, 1]) {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35), M.grey()); boom.rotation.z = Math.PI / 2; boom.position.set(side * 0.62, 0.05, 0); g.add(boom);
    for (let i = 0; i < nPanels; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.5), M.panel()); p.position.set(side * (0.82 + 0.31 + i * 0.64), 0.05, 0); p.rotation.x = 0.25; g.add(p);
      if (i === nPanels - 1 && side === 1) labels.push({ obj: p, text: 'Solar arrays' });
    }
  }
  // antenna
  const dr = cfg.radio === 'L' ? 0.42 : 0.26;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), M.grey()); mast.position.set(0.1, 0.58, 0); g.add(mast);
  const d = dish(dr); d.position.set(0.1, 0.72, 0); d.rotation.z = -0.35; g.add(d); labels.push({ obj: d, text: 'High-gain antenna' });
  // propellant tank (visible on the anti-sun side) and thrusters
  const tr = 0.16 + 0.12 * Math.min(1, cfg.propKg / 150);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(tr, 24, 16), M.grey()); tank.position.set(-0.2, -0.4 - tr * 0.6, -0.15); g.add(tank);
  labels.push({ obj: tank, text: `Propellant ${cfg.propKg} kg` });
  for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) {
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 12, 1, true), M.dark()); n.position.set(x, -0.46, z); n.rotation.x = Math.PI; g.add(n);
  }
  // battery and recorder boxes on the side face, sized by option
  const bat = new THREE.Mesh(new THREE.BoxGeometry(0.06, cfg.battery === 'L' ? 0.32 : 0.18, 0.22), M.dark()); bat.position.set(-0.48, 0, 0.18); g.add(bat);
  labels.push({ obj: bat, text: cfg.battery === 'L' ? 'Battery 500 Wh' : 'Battery 100 Wh' });
  const recb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, cfg.recorder === 'L' ? 0.3 : 0.16), M.grey()); recb.position.set(-0.48, 0.1, -0.2); g.add(recb);
  // instruments on the nadir (front, +z) face
  const insts = mission.instruments.filter(i => cfg.inst.includes(i.id));
  insts.forEach((ins, k) => {
    const x = -0.28 + (k % 3) * 0.28, y = k < 3 ? -0.12 : 0.22;
    let o;
    if (/camera|Imager/i.test(ins.name)) {
      const big = /High-res/i.test(ins.name);
      o = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.15 : 0.09, big ? 0.15 : 0.09, big ? 0.5 : 0.28, 24), M.white()); tube.rotation.x = Math.PI / 2; o.add(tube);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(big ? 0.13 : 0.075, 24), M.lens()); lens.position.z = big ? 0.251 : 0.141; o.add(lens);
    } else if (/Radar/i.test(ins.name)) {
      o = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.03), M.dark());
    } else if (/Relay/i.test(ins.name)) {
      o = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.24, 12), M.white()); o.rotation.x = Math.PI / 2;
    } else {
      o = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.16), M.dark()); o.add(box);
      const ap = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), M.lens()); ap.position.z = 0.081; o.add(ap);
    }
    o.position.set(x, y, 0.48); g.add(o);
    labels.push({ obj: o, text: `${ins.name} (${ins.heritage}-type)` });
  });
  return { group: g, labels };
}

const starTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
starTex.userData.shared = true;
// Layered starfield: faint dust, a Milky Way band, and a few bright coloured stars.
function stars() {
  const grp = new THREE.Group();
  const band = new THREE.Vector3(0.3, 1, 0.2).normalize();
  const layer = (n, size, op, inBand, tint) => {
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      let v = new THREE.Vector3().randomDirection();
      if (inBand) { v.addScaledVector(band, -v.dot(band) * (0.85 + Math.random() * 0.15)).normalize(); }
      v.multiplyScalar(80 + Math.random() * 40); p.set([v.x, v.y, v.z], i * 3);
      const k = Math.random(); col.setHSL(k < 0.25 ? 0.6 : k < 0.5 ? 0.1 : 0, tint ? 0.6 : 0.25, 0.8 + Math.random() * 0.2); c.set([col.r, col.g, col.b], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    grp.add(new THREE.Points(g, new THREE.PointsMaterial({ map: starTex, vertexColors: true, size, sizeAttenuation: true, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })));
  };
  layer(4000, 0.35, 0.55, false, false); layer(5000, 0.3, 0.35, true, false); layer(220, 1.1, 0.95, false, true);
  return grp;
}
function disposeTree(o) { o.traverse(x => { x.geometry?.dispose(); if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => { if (!m.map?.userData?.shared) m.map?.dispose?.(); m.dispose(); }); }); }

const missionWorld = id => MISSIONS.find(m => m.id === id);

export class GameStage {
  constructor(el) {
    this.el = el;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.r.outputColorSpace = THREE.SRGBColorSpace; this.r.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(this.r.domElement);
    const pm = new THREE.PMREMGenerator(this.r); this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.cam = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
    this.clock = new THREE.Clock();
    this.labelLayer = document.createElement('div'); this.labelLayer.className = 'g3-labels'; el.appendChild(this.labelLayer);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
    this.drag = { yaw: 0.6, pitch: 0.35, active: false };
    this.ctl = { rot: 1, zoom: 1, invert: false, shake: true };
    this.opsView = { yaw: 0, pitch: 0, zoom: 1 };
    this.shakeT = 0;
    const can = () => this.mode === 'build' || this.mode === 'ops';
    el.addEventListener('pointerdown', e => { if (!can()) return; this.drag.active = true; this.drag.x = e.clientX; this.drag.y = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!this.drag.active) return;
      const dx = (e.clientX - this.drag.x) * this.ctl.rot, dy = (e.clientY - this.drag.y) * this.ctl.rot * (this.ctl.invert ? -1 : 1);
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      if (this.mode === 'ops') { this.opsView.yaw += dx * 0.006; this.opsView.pitch = Math.max(-0.9, Math.min(0.9, this.opsView.pitch + dy * 0.005)); return; }
      this.drag.yaw += dx * 0.008; this.drag.pitch = Math.max(-1, Math.min(1.2, this.drag.pitch + dy * 0.006)); this.userTurned = true;
    });
    el.addEventListener('pointerup', () => { this.drag.active = false; });
    el.addEventListener('pointercancel', () => { this.drag.active = false; });
    el.addEventListener('wheel', e => {
      if (!can()) return; e.preventDefault();
      const k = 1 + Math.sign(e.deltaY) * 0.08 * this.ctl.zoom;
      if (this.mode === 'ops') this.opsView.zoom = Math.max(0.45, Math.min(2.2, this.opsView.zoom * k));
      else this.zoom = Math.max(0.6, Math.min(1.6, (this.zoom || 1) * k));
    }, { passive: false });
    this.paused = false;
    this.resize();
    this.r.setAnimationLoop(() => this.tick());
  }
  setControls(c) { Object.assign(this.ctl, c); }
  shake(amount = 0.6) { if (this.ctl.shake && !this.reduced) this.shakeT = Math.max(this.shakeT, amount); }
  resetView() { this.opsView = { yaw: 0, pitch: 0, zoom: 1 }; this.userTurned = false; this.zoom = 1; }
  resize() { const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  clear() {
    if (this.scene) disposeTree(this.scene);
    this.scene = new THREE.Scene(); this.labels = []; this.labelLayer.innerHTML = ''; this.update = null;
    this.starField = stars(); this.scene.add(this.starField);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.05));
    this.sun = new THREE.DirectionalLight(0xfff1dd, 3); this.sun.position.set(5, 3, 4); this.scene.add(this.sun);
    const rim = new THREE.DirectionalLight(0x9ab4ff, 0.3); rim.position.set(-4, 1, -3); this.scene.add(rim);
  }
  world(id, radius, plain = true) {
    const w = buildWorld(missionWorld(id)); w.scale.setScalar(radius);
    if (plain) { // drop the decorative orbit ring and satellite that the explorer view adds to Earth
      [...w.children].forEach(c => { if (c.geometry?.type === 'TorusGeometry' || c === w.userData.sat) { w.remove(c); c.geometry.dispose(); } });
      w.userData.sat = null;
    }
    return w;
  }
  setLabels(list) {
    this.labelLayer.innerHTML = '';
    this.labels = list.map(l => { const d = document.createElement('span'); d.className = 'g3-label'; d.textContent = l.text; this.labelLayer.appendChild(d); return { ...l, el: d }; });
  }

  // ---------------- builder: planet below, spacecraft centre stage
  showBuild(mission, cfg, offsetX = 0, hideCraft = false) {
    const keepView = this.mode === 'build' && this.missionId === mission.id;
    this.offsetX = offsetX;
    this.mode = 'build'; this.missionId = mission.id;
    if (!keepView) {
      this.clear();
      const wr = mission.id === 'astra' ? 1.2 : 6;
      const planet = this.world(mission.id, wr);
      planet.position.set(mission.id === 'astra' ? 2.4 : 0, mission.id === 'astra' ? -0.6 : -7.4, mission.id === 'astra' ? -3 : -2);
      this.scene.add(planet); this.planet = planet;
      this.craftHolder = new THREE.Group(); this.scene.add(this.craftHolder);
      this.cam.position.set(0, 0.5, 6.2); this.cam.lookAt(0, 0.1, 0); this.zoom = 1;
    }
    this.craftHolder.children.forEach(c => { this.craftHolder.remove(c); disposeTree(c); });
    const { group, labels } = buildCraft(cfg, mission);
    group.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.9; } });
    group.scale.setScalar(1.25);
    this.craftHolder.add(group); this.craft = group;
    this.craftHolder.visible = !hideCraft;
    this.setLabels(hideCraft ? [] : labels);
    this.update = dt => {
      if (!this.userTurned && !this.paused && !this.reduced) this.drag.yaw += dt * 0.15;
      this.craft.rotation.set(this.drag.pitch * 0.5, this.drag.yaw, 0);
      this.craftHolder.position.y = Math.sin(this.clock.elapsedTime * 0.8) * (this.reduced ? 0 : 0.05);
      this.craftHolder.position.x += ((this.offsetX || 0) - this.craftHolder.position.x) * Math.min(1, dt * 4);
      if (this.planet && !this.paused) this.planet.rotation.y += dt * 0.02;
      this.cam.position.setLength(6.4 * (this.zoom || 1));
    };
  }

  // ---------------- launch cinematic. onDone(success) fires at the end.
  playLaunch(mission, success, onDone, cues = {}, opts = {}) {
    const boomAt = opts.explodeAt || 0; let boom = null;
    this.mode = 'launch'; this.clear(); this.setLabels([]);
    const s = this.scene;
    const earthR = 40;
    const earth = this.world('earth', earthR); earth.position.set(0, -earthR, 0); s.add(earth);
    // at pad scale the cloud and glow shells sit just above the ground, so drop them
    [...earth.children].forEach(c => { if (c.userData.layer) earth.remove(c); });
    // put Cape Canaveral (28.5 N, 80.6 W) under the rocket
    earth.quaternion.setFromUnitVectors(latLonToVec(28.5, -80.6, 1).normalize(), new THREE.Vector3(0, 1, 0));
    // launch pad: concrete apron, flame trench and a service tower
    const pad = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x5e5b56, roughness: 1 });
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.08, 48), concrete); apron.position.y = -0.04; pad.add(apron);
    const trench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 2.2), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 })); trench.position.set(0, 0.005, 0.9); pad.add(trench);
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.6, metalness: 0.4 });
    const tower = new THREE.Group(); tower.position.set(-0.55, 0, -0.1);
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.5, 0.03), steel); leg.position.set(x, 1.25, z); tower.add(leg); }
    for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.02, 0.27), steel); r.position.y = 0.1 + i * 0.2; tower.add(r); }
    for (const y of [0.8, 1.5]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.05), steel); arm.position.set(0.3, y, 0); tower.add(arm); }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020 })); beacon.position.y = 2.55; tower.add(beacon);
    pad.add(tower);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x55704a, roughness: 1, transparent: true, opacity: 0.85 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.085; pad.add(ground);
    pad.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.12; } });
    s.add(pad);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ color: 0x5b8fd8, side: THREE.BackSide, transparent: true, opacity: 1, depthWrite: false })); s.add(sky);
    // rocket
    const rocket = new THREE.Group();
    const white = M.white(), dark = M.dark();
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 24), white); s1.position.y = 0.6; rocket.add(s1);
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 24), white); s2.position.y = 1.45; rocket.add(s2);
    const fairL = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.14, 0.5, 24, 1, false, 0, Math.PI), white); fairL.position.y = 1.95;
    const fairR = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.14, 0.5, 24, 1, false, Math.PI, Math.PI), white); fairR.position.y = 1.95;
    rocket.add(fairL, fairR);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 24), dark); band.position.y = 1.2; rocket.add(band);
    for (let i = 0; i < 4; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.14), dark); fin.position.set(Math.cos(i * Math.PI / 2) * 0.13, 0.12, Math.sin(i * Math.PI / 2) * 0.13); fin.rotation.y = -i * Math.PI / 2; rocket.add(fin); }
    // payload inside the fairing
    const { group: sat } = buildCraft({ solar: 'S', battery: 'S', radio: 'S', recorder: 'S', propKg: 80, inst: [] }, mission);
    sat.scale.setScalar(0.12); sat.position.y = 1.9; sat.visible = false; rocket.add(sat);
    rocket.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.8; } });
    s.add(rocket);
    // exhaust particles
    const N = 500, pos = new Float32Array(N * 3), vel = [], life = new Float32Array(N);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flame = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffb35c, size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(flame);
    for (let i = 0; i < N; i++) { vel.push(new THREE.Vector3()); life[i] = 0; pos[i * 3 + 1] = -999; }
    const glow = new THREE.PointLight(0xff9a40, 0, 6); s.add(glow);
    this.cam.position.set(3.4, 1.4, 6.5); this.cam.lookAt(0, 1.3, 0);
    // transfer scene objects (built lazily)
    let t = 0, stage = 0, transfer = null, s1Fall = null, ended = false;
    const T = { lift: 2.2, sep: 7.5, deploy: 9, transfer: 10.5, arrive: 15.5, end: 18 };
    const target = mission.id === 'earth' ? null : mission.id;
    cues.countdown?.();
    this.update = dt => {
      t += dt;
      const fly = Math.max(0, t - T.lift);
      if (boomAt && t > boomAt) {
        if (!boom) {
          cues.boom?.(); this.shake(1.4);
          const p0 = new THREE.Vector3(0, 1.2, 0).applyMatrix4(rocket.matrixWorld);
          const n = 700, bp = new Float32Array(n * 3), bv = [];
          for (let i = 0; i < n; i++) { bp.set([p0.x, p0.y, p0.z], i * 3); bv.push(new THREE.Vector3().randomDirection().multiplyScalar(1 + Math.random() * 4)); }
          const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
          const pts = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xffa040, size: 0.32, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
          const soft = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.45)'); r.addColorStop(0.7, 'rgba(255,255,255,.08)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
          const smoke = new THREE.Group(); smoke.position.copy(p0);
          for (let i = 0; i < 70; i++) {
            const fire = i < 16;
            const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: fire ? 0xffb050 : 0x6a625c, transparent: true, depthWrite: false, opacity: fire ? 1 : 0.7, blending: fire ? THREE.AdditiveBlending : THREE.NormalBlending }));
            sp.userData = { v: new THREE.Vector3().randomDirection().multiplyScalar(fire ? 0.9 : 0.5 + Math.random() * 0.9), fire, s0: fire ? 0.3 : 0.25, grow: fire ? 0.9 : 0.25 + Math.random() * 0.3 };
            sp.position.copy(sp.userData.v).multiplyScalar(0.1); smoke.add(sp);
          }
          s.add(pts, smoke);
          const debris = [];
          rocket.children.slice().forEach(c => { const wp = new THREE.Vector3(); c.getWorldPosition(wp); rocket.remove(c); s.add(c); c.position.copy(wp); debris.push({ o: c, v: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3), r: (Math.random() - 0.5) * 6 }); });
          glow.intensity = 200; glow.position.copy(p0); glow.distance = 20;
          boom = { t: 0, bp, bv, bg, pts, smoke, debris };
        }
        boom.t += dt; const b = boom;
        for (let i = 0; i < b.bv.length; i++) { b.bp[i * 3] += b.bv[i].x * dt; b.bp[i * 3 + 1] += (b.bv[i].y - b.t * 1.5) * dt; b.bp[i * 3 + 2] += b.bv[i].z * dt; }
        b.bg.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / 2.2);
        b.smoke.children.forEach(sp => { const u = sp.userData; sp.position.addScaledVector(u.v, dt * (u.fire ? 1 : 0.6)); u.v.y += dt * 0.25; sp.scale.setScalar(u.s0 + b.t * u.grow); sp.material.opacity = u.fire ? Math.max(0, 1 - b.t * 1.1) : Math.max(0, 0.35 - b.t * 0.1); });
        glow.intensity = Math.max(0, 200 - b.t * 220);
        b.debris.forEach(d => { d.v.y -= dt * 2.5; d.o.position.addScaledVector(d.v, dt); d.o.rotation.z += d.r * dt; d.o.rotation.x += d.r * 0.5 * dt; });
        for (let i = 0; i < N; i++) pos[i * 3 + 1] = -999; pg.attributes.position.needsUpdate = true;
        this.cam.position.lerp(b.smoke.position.clone().add(new THREE.Vector3(2.6, 0.8, 5.5)), dt * 0.8); this.cam.lookAt(b.smoke.position);
        if (b.t > 3.2 && !ended) { ended = true; onDone?.(false, 'launch'); }
        return;
      }
      if (t < T.transfer) {
        const y = 0.5 * 0.9 * fly * fly; // accelerating climb
        rocket.position.y = y; rocket.rotation.z = -Math.min(0.5, fly * 0.06); rocket.position.x = Math.min(6, fly * fly * 0.06);
        // camera chases and pulls back
        const back = 6.5 + fly * 1.4;
        this.cam.position.set(rocket.position.x + 3.4, y + 1.4 + fly * 0.5, back); this.cam.lookAt(rocket.position.x, y + 1.3, 0);
        sky.material.opacity = Math.max(0, 1 - fly / 6); // blue sky fades to black as we climb
        this.starField.visible = sky.material.opacity < 0.45; // no stars in a daytime sky
        // exhaust
        const firing = t > T.lift - 0.6 && t < T.sep + 1.5;
        glow.intensity = firing ? (fly < 1.5 ? 6 + fly * 16 : 30) : 0; glow.position.set(rocket.position.x, y - 0.1, 0);
        const base = new THREE.Vector3(0, stage === 0 ? 0 : 1.2, 0).applyMatrix4(rocket.matrixWorld);
        for (let i = 0; i < N; i++) {
          life[i] -= dt;
          if (life[i] <= 0 && firing && Math.random() < 0.6) {
            life[i] = 0.6 + Math.random() * 0.6; pos[i * 3] = base.x + (Math.random() - 0.5) * 0.1; pos[i * 3 + 1] = base.y; pos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 0.1;
            vel[i].set((Math.random() - 0.5) * 0.6, -2.5 - Math.random() * 2, (Math.random() - 0.5) * 0.6);
          }
          if (life[i] > 0) { pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; } else pos[i * 3 + 1] = -999;
        }
        pg.attributes.position.needsUpdate = true;
        if (t > T.sep && stage === 0) { // stage separation + fairing
          stage = 1; cues.sep?.();
          s1Fall = s1; const wp = new THREE.Vector3(); s1.getWorldPosition(wp); rocket.remove(s1); s.add(s1); s1.position.copy(wp);
        }
        if (s1Fall) { s1Fall.position.y -= dt * 2.5; s1Fall.rotation.z += dt * 0.8; }
        if (t > T.sep + 0.8) { fairL.position.x -= dt * 0.6; fairR.position.x += dt * 0.6; fairL.rotation.z += dt; fairR.rotation.z -= dt; sat.visible = true; }
        if (t > T.deploy) { sat.scale.setScalar(Math.min(0.2, 0.12 + (t - T.deploy) * 0.1)); }
      } else {
        if (!transfer) {
          cues.transfer?.();
          this.starField.visible = true;
          // clear launch objects, build schematic transfer view
          [earth, sky, rocket, flame, glow, s1Fall, pad].forEach(o => { if (o) { s.remove(o); } });
          transfer = new THREE.Group(); s.add(transfer);
          const e = this.world('earth', 1); e.position.set(-4, 0, 0); transfer.add(e);
          let dest;
          if (target) { dest = this.world(target, target === 'astra' ? 0.35 : target === 'lunaris' ? 0.5 : 0.8); dest.position.set(4, 0.4, 0); transfer.add(dest); }
          const destPos = target ? new THREE.Vector3(4, 0.4, 0) : new THREE.Vector3(-4, 0, 0);
          const curve = target ? new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3, 0.3, 0), new THREE.Vector3(0, 2.6, 0), destPos.clone().add(new THREE.Vector3(-0.9, 0.2, 0)))
            : new THREE.EllipseCurve(-4, 0, 1.6, 1.6, 0, Math.PI * 1.6);
          const pts = target ? curve.getPoints(80) : curve.getPoints(80).map(p => new THREE.Vector3(p.x, p.y, 0));
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: new THREE.Color(mission.accent), dashSize: 0.12, gapSize: 0.08 }));
          line.computeLineDistances(); transfer.add(line);
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); transfer.add(dot);
          const trail = new THREE.PointLight(new THREE.Color(mission.accent), 4, 2); dot.add(trail);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(target ? (target === 'astra' ? 0.6 : 0.95) : 1.6, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(mission.accent), transparent: true, opacity: 0 }));
          ring.position.copy(destPos); ring.rotation.x = Math.PI / 2.3; transfer.add(ring);
          transfer.userData = { pts, dot, ring, destPos, dest };
          this.cam.position.set(0, 1.5, 9.5); this.cam.lookAt(0, 0.4, 0);
        }
        const u = Math.min(1, (t - T.transfer) / (T.arrive - T.transfer));
        const { pts, dot, ring, destPos } = transfer.userData;
        if (u < 1 || !success) {
          const k = Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)));
          dot.position.copy(pts[k]);
          if (!success && u >= 1) dot.position.add(new THREE.Vector3((t - T.arrive) * 1.6, (t - T.arrive) * 0.4, 0)); // sails past
        } else {
          // circle in orbit
          const a = (t - T.arrive) * 2.2, rr = ring.geometry.parameters.radius;
          const local = new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr).applyEuler(ring.rotation);
          dot.position.copy(destPos).add(local);
          ring.material.opacity = Math.min(1, (t - T.arrive) * 1.5);
          if (!this._insertCue) { this._insertCue = true; cues.insert?.(); }
        }
        if (!this.reduced) this.cam.position.x = Math.sin(t * 0.1) * 0.6;
        this.cam.lookAt(0, 0.4, 0);
      }
      if (t > T.end && !ended) { ended = true; this._insertCue = false; onDone?.(success); }
    };
    this.skipLaunch = () => { if (!ended) { if (boomAt && !boom) { t = boomAt; return; } ended = true; this._insertCue = false; onDone?.(success); } };
  }

  // ---------------- operations: orbit view driven by the simulation
  showOps(mission, derived) {
    this.mode = 'ops'; this.clear(); this.setLabels([]);
    const s = this.scene;
    const isAst = mission.id === 'astra';
    const R = isAst ? 0.8 : 1.15;
    const body = this.world(mission.id, R); s.add(body); this.body = body;
    const orbitR = isAst ? 2.6 : R * (derived.a ? Math.max(1.12, Math.min(1.6, derived.a / mission.body.radiusKm)) : 1.3) * 1.25;
    const tilt = new THREE.Group(); tilt.rotation.set(0.35, 0, 0.15); s.add(tilt);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(orbitR, 0.006, 8, 200), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    ring.rotation.x = Math.PI / 2; tilt.add(ring);
    // coloured arcs for pass and contact windows
    const arc = (w, color, r, op) => {
      const [a0, a1] = w; const len = ((a1 - a0 + 1) % 1) || 1;
      const g = new THREE.TorusGeometry(r, 0.02, 6, 80, len * Math.PI * 2);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op }));
      m.rotation.x = Math.PI / 2; m.rotation.z = -a0 * Math.PI * 2; return m;
    };
    if (derived.orbit.contact[1] - derived.orbit.contact[0] < 1) tilt.add(arc(derived.orbit.contact, 0x6fffd0, orbitR * 1.04, 0.5));
    tilt.add(arc(derived.orbit.pass, new THREE.Color(mission.accent).getHex(), orbitR * 0.97, 0.9));
    if (derived.eclipseFrac > 0) tilt.add(arc([0.75 - derived.eclipseFrac / 2, 0.75 + derived.eclipseFrac / 2], 0x334466, orbitR, 0.9));
    // craft
    const { group: craft } = buildCraft(this.lastCfg || { solar: 'S', battery: 'S', radio: 'S', recorder: 'S', propKg: 80, inst: [] }, mission);
    craft.scale.setScalar(0.15); craft.traverse(o => { if (o.material) { o.material.envMap = this.env; } });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: new THREE.Color(mission.accent), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() }));
    halo.scale.setScalar(4); craft.add(halo);
    tilt.add(craft); this.opsCraft = craft;
    // instrument beam and data link
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(mission.accent), transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    tilt.add(beam);
    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const link = new THREE.Line(linkGeo, new THREE.LineDashedMaterial({ color: 0x6fffd0, dashSize: 0.08, gapSize: 0.06, transparent: true }));
    s.add(link);
    // where Earth is (for contact): off to the side; for the Earth mission it is the ground station on the surface
    const earthDir = new THREE.Vector3(-8, 3, 6);
    let earthMarker = null;
    if (mission.id !== 'earth') { earthMarker = this.world('earth', 0.35); earthMarker.position.copy(earthDir); s.add(earthMarker); }
    // shadow side tint: sun from +z
    this.sun.position.set(0.5, 0.6, 6);
    // flyby Earth for ASTRA
    let flyEarth = null;
    if (isAst) { flyEarth = this.world('earth', 2.2); flyEarth.visible = false; s.add(flyEarth); }
    const camBase = new THREE.Vector3(orbitR * 3.0, orbitR * 1.15, orbitR * 0.15); // side-on so the day/night line is in view
    this.cam.position.copy(camBase); this.cam.lookAt(0, 0, 0);
    this.opsState = null; this.opsView = { yaw: 0, pitch: 0, zoom: 1 };
    let lostT = -1;
    this.loseCraft = () => { lostT = 0; };
    this.update = dt => {
      const st = this.opsState; if (!st) return;
      const ang = st.phase * Math.PI * 2;
      // eclipse centred at phase 0.75 => craft on the -z side (away from the Sun at +z)
      // phase 0.75 sits on the -z side, away from the Sun at +z: that is where the eclipse is
      const cp = new THREE.Vector3(Math.cos(ang) * orbitR, 0, Math.sin(ang) * orbitR);
      // camera: player-controlled orbit around the body
      const sph = new THREE.Spherical().setFromVector3(camBase);
      sph.theta += this.opsView.yaw; sph.phi = Math.max(0.15, Math.min(Math.PI - 0.15, sph.phi - this.opsView.pitch)); sph.radius *= this.opsView.zoom;
      this.cam.position.setFromSpherical(sph); this.cam.lookAt(0, 0, 0);
      if (lostT >= 0) { // spacecraft lost: tumble away and fade
        lostT += dt; craft.rotation.x += dt * 3; craft.rotation.z += dt * 2.2;
        craft.position.addScaledVector(cp.clone().normalize(), dt * 0.4 * lostT);
        halo.material.opacity = Math.max(0, 0.9 - lostT); beam.visible = false; link.visible = false; return;
      }
      craft.position.copy(cp);
      craft.lookAt(0, 0, 0);
      halo.material.color.set(st.alert ? 0xff3b3b : mission.accent);
      halo.scale.setScalar(st.alert ? 4 + Math.sin(this.clock.elapsedTime * 10) * 1.2 : 4);
      beam.visible = st.observing;
      if (st.observing) { // cone from the craft down to the surface
        const len = orbitR - R;
        beam.scale.set(1, len, 1);
        beam.position.copy(cp.clone().setLength(R + len / 2));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cp.clone().normalize());
      }
      const wp = new THREE.Vector3(); craft.getWorldPosition(wp);
      const tgt = mission.id === 'earth' ? new THREE.Vector3(0, R * 0.8, R * 0.6) : earthDir;
      link.visible = st.transmitting; if (st.transmitting) { linkGeo.setFromPoints([wp, tgt]); link.computeLineDistances(); link.material.dashOffset = -this.clock.elapsedTime * 0.5; }
      if (!this.paused) body.rotation.y += dt * 0.05;
      if (flyEarth) {
        const fo = mission.flybyOrbit, o = st.orbitFloat;
        const k = (o - (fo - 1.2)) / 2.4; flyEarth.visible = k > 0 && k < 1;
        if (flyEarth.visible) flyEarth.position.set(-14 + k * 28, -2.5, -9);
      }
    };
  }
  setOps(st) { this.opsState = st; }

  tick() {
    const raw = this.clock.getDelta();
    // the launch cinematic follows the wall clock so slow devices still finish on time
    const dt = Math.min(raw, this.mode === 'launch' ? 0.25 : 0.05);
    if (this.update && !(this.paused && this.mode !== 'launch')) this.update(dt);
    if (!this.scene) return;
    let off = null;
    if (this.shakeT > 0) { this.shakeT = Math.max(0, this.shakeT - raw * 1.5); const a = this.shakeT * 0.08; off = new THREE.Vector3((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, 0).applyQuaternion(this.cam.quaternion); this.cam.position.add(off); }
    this.r.render(this.scene, this.cam);
    if (off) this.cam.position.sub(off);
    // project labels
    if (this.labels.length) {
      const w = this.el.clientWidth, h = this.el.clientHeight, v = new THREE.Vector3();
      for (const l of this.labels) {
        l.obj.getWorldPosition(v); v.project(this.cam);
        const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        l.el.style.opacity = vis ? 1 : 0;
        l.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
      }
    }
  }
  dispose() { this.r.setAnimationLoop(null); this.ro.disconnect(); if (this.scene) disposeTree(this.scene); this.r.dispose(); }
}
