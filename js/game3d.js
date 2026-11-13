// NEXUS//04 game visuals: spacecraft builder model, launch cinematic, mission-control orbit view.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { buildWorld, latLonToVec } from './scene.js';
import { MISSIONS } from './data.js';
import { buildCraft, setCraftEnv, fullCfg } from './craft.js';
export { buildCraft };

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// ---------- materials
let foilTex, cellTex;
// Locked spacecraft palette: gray-white thermal blanket hull, blue solar cells, blue-white engine light.
function foil() {
  if (foilTex) return foilTex;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 512, 512); grd.addColorStop(0, '#eef0f2'); grd.addColorStop(0.5, '#cfd3d8'); grd.addColorStop(1, '#e8eaed');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { // blanket crinkles
    g.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '120,128,140'},${0.08 + Math.random() * 0.18})`; g.lineWidth = 1 + Math.random() * 2.5;
    g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 90; y += (Math.random() - 0.5) * 90; g.quadraticCurveTo(x + 20, y - 15, x, y); } g.stroke();
  }
  g.strokeStyle = 'rgba(90,96,106,.45)'; g.lineWidth = 2; g.setLineDash([6, 5]); // stitched blanket seams
  for (const v of [170, 340]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.stroke(); g.beginPath(); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
  g.setLineDash([]); g.fillStyle = 'rgba(70,76,86,.6)';
  for (const [x, y] of [[170, 170], [340, 170], [170, 340], [340, 340]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  foilTex = new THREE.CanvasTexture(c); foilTex.colorSpace = THREE.SRGBColorSpace; foilTex.anisotropy = 8; foilTex.userData.shared = true; return foilTex;
}
function cells() {
  if (cellTex) return cellTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#0b1a44'; g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
    const grd = g.createLinearGradient(x * 32, y * 32, x * 32 + 32, y * 32 + 32); grd.addColorStop(0, '#3a6ee0'); grd.addColorStop(0.55, '#1d44a8'); grd.addColorStop(1, '#2a58c8');
    g.fillStyle = grd; g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29);
  }
  g.strokeStyle = 'rgba(210,220,240,.6)'; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
  for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  cellTex = new THREE.CanvasTexture(c); cellTex.colorSpace = THREE.SRGBColorSpace; cellTex.anisotropy = 8; cellTex.userData.shared = true; return cellTex;
}
const M = {
  foil: () => new THREE.MeshStandardMaterial({ map: foil(), metalness: 0.25, roughness: 0.55 }),
  panel: () => new THREE.MeshStandardMaterial({ map: cells(), metalness: 0.55, roughness: 0.22, side: THREE.DoubleSide }),
  panelBack: () => new THREE.MeshStandardMaterial({ color: 0xd9dce0, metalness: 0.3, roughness: 0.6 }),
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
let smokeTexC, concreteC, grassC, hullC;
function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.shared = true; return t; }
function smokeTex() {
  return smokeTexC ||= canvasTex(128, 128, (g, w) => {
    for (let i = 0; i < 26; i++) { // overlapping soft blobs make an irregular billow
      const x = 64 + (Math.random() - 0.5) * 50, y = 64 + (Math.random() - 0.5) * 50, r = 18 + Math.random() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }
    const m = g.createRadialGradient(64, 64, 30, 64, 64, 64); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = m; g.fillRect(0, 0, w, w);
  });
}
function concreteTex() {
  if (concreteC) return concreteC;
  concreteC = canvasTex(256, 256, (g, w) => { g.fillStyle = '#9a978f'; g.fillRect(0, 0, w, w); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,40,40'},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
    g.strokeStyle = 'rgba(40,40,40,.35)'; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,55,50,${Math.random() * 0.06})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * w, 10 + Math.random() * 30, 6 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); } });
  concreteC.wrapS = concreteC.wrapT = THREE.RepeatWrapping; concreteC.repeat.set(3, 3); return concreteC;
}
function grassTex() {
  if (grassC) return grassC;
  grassC = canvasTex(256, 256, (g, w) => { g.fillStyle = '#6f7f55'; g.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { const k = Math.random(); g.fillStyle = k < 0.4 ? 'rgba(80,100,55,.5)' : k < 0.7 ? 'rgba(150,150,100,.35)' : 'rgba(50,70,40,.45)'; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); } });
  grassC.wrapS = grassC.wrapT = THREE.RepeatWrapping; grassC.repeat.set(8, 8); return grassC;
}
function hullTex() {
  return hullC ||= canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,120,120,.28)'; g.lineWidth = 1.5; for (const y of [80, 200, 330, 450]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(150,150,150,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 8); }
    const sm = g.createLinearGradient(0, h, 0, h * 0.75); sm.addColorStop(0, 'rgba(60,55,50,.35)'); sm.addColorStop(1, 'rgba(60,55,50,0)'); g.fillStyle = sm; g.fillRect(0, h * 0.75, w, h * 0.25); });
}
// first-stage skin: panel seams, stringers, frost on the oxygen tank before launch, soot near the engines
let stage1C, finC;
function stage1Tex() {
  return stage1C ||= canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#f3f3f1'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(110,110,110,.22)'; g.lineWidth = 1.2;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } // stringers
    g.strokeStyle = 'rgba(90,90,90,.35)'; g.lineWidth = 2;
    for (const y of [70, 210, 360, 520, 640, 790, 930]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } // tank rings
    for (const y of [70, 360, 640, 930]) for (let x = 4; x < w; x += 9) { g.fillStyle = 'rgba(80,80,80,.35)'; g.fillRect(x, y - 4, 2, 2); g.fillRect(x, y + 3, 2, 2); } // rivets
    // frost: the liquid-oxygen tank sits in the lower half
    for (let i = 0; i < 2600; i++) { const y = 560 + Math.random() * 360, a = Math.random() * 0.18; g.fillStyle = `rgba(214,226,238,${a})`; g.fillRect(Math.random() * w, y, 2 + Math.random() * 10, 1 + Math.random() * 3); }
    const fr = g.createLinearGradient(0, 520, 0, 940); fr.addColorStop(0, 'rgba(225,235,245,0)'); fr.addColorStop(0.3, 'rgba(225,235,245,.25)'); fr.addColorStop(1, 'rgba(225,235,245,.1)'); g.fillStyle = fr; g.fillRect(0, 520, w, 420);
    // soot from earlier flights and engine heat near the base
    const sm = g.createLinearGradient(0, h, 0, h * 0.82); sm.addColorStop(0, 'rgba(45,40,36,.55)'); sm.addColorStop(1, 'rgba(45,40,36,0)'); g.fillStyle = sm; g.fillRect(0, h * 0.82, w, h * 0.18);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,55,50,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, h * 0.86 + Math.random() * h * 0.14, 1 + Math.random() * 3, 4 + Math.random() * 18); }
  });
}
function finTex() {
  return finC ||= canvasTex(64, 64, (g, w) => { g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, w, w); g.strokeStyle = '#18181a'; g.lineWidth = 3;
    for (let i = -w; i < w * 2; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + w, w); g.stroke(); g.beginPath(); g.moveTo(i + w, 0); g.lineTo(i, w); g.stroke(); } });
}
// map the compressed cinematic onto a typical two-stage ascent (real mission seconds, km/h, km)
const ASCENT = [[0, 0, 0], [20, 230, 0.6], [45, 900, 4.5], [72, 1650, 12], [100, 3000, 24], [130, 5600, 46], [150, 8100, 66], [160, 7900, 77], [200, 9600, 112], [300, 14000, 160], [420, 21000, 190], [520, 27000, 200]];
function telemetry(t, T) {
  const keys = [[0, -3], [T.lift, 0], [T.maxq, 72], [T.meco, 150], [T.sep, 153], [T.ses, 160], [T.fair, 200], [T.orbit, 520]];
  let m = -3;
  for (let i = 0; i < keys.length - 1; i++) { const [a, ra] = keys[i], [b, rb] = keys[i + 1]; if (t >= a && t <= b) { m = ra + (rb - ra) * (t - a) / (b - a); break; } if (t > b) m = rb; }
  let v = 0, h = 0;
  if (m > 0) for (let i = 0; i < ASCENT.length - 1; i++) { const [a, va, ha] = ASCENT[i], [b, vb, hb] = ASCENT[i + 1]; if (m <= b) { const k = (m - a) / (b - a); v = va + (vb - va) * k; h = ha + (hb - ha) * k; break; } }
  return { m, v, h, stage: t < T.sep ? 1 : 2 };
}
let glowTexC;
function glowSprite() {
  if (glowTexC) return glowTexC;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  glowTexC = new THREE.CanvasTexture(c); glowTexC.userData.shared = true; return glowTexC;
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
  constructor(el, onError, context) {
    this.el = el;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.r = new THREE.WebGLRenderer({ canvas:context?.canvas, context, antialias:true, alpha:true });
    this.renderScale = innerWidth < 760 ? 1.1 : 1.5;
    this.frameInterval = innerWidth < 760 || (navigator.hardwareConcurrency || 8) < 5 ? 1000 / 30 : 1000 / 60;
    this.lastDraw = -Infinity;
    this.onError = onError;
    this.r.outputColorSpace = THREE.SRGBColorSpace; this.r.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(this.r.domElement);
    const pm = new THREE.PMREMGenerator(this.r);
    const room = new RoomEnvironment();
    this.environment = pm.fromScene(room,.04);
    room.dispose();
    pm.dispose();
    this.env = this.environment.texture;
    setCraftEnv(this.env);
    this.cam = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
    this.clock = new THREE.Clock();
    this.labelLayer = document.createElement('div'); this.labelLayer.className = 'g3-labels'; el.appendChild(this.labelLayer);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
    this.drag = { yaw: 0.45, pitch: 0.32, active: false };
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
    this.setRunning(true);
  }
  setControls(c) { Object.assign(this.ctl, c); }
  shake(amount = 0.6) { if (this.ctl.shake && !this.reduced) this.shakeT = Math.max(this.shakeT, amount); }
  resetView() { this.opsView = { yaw: 0, pitch: 0, zoom: 1 }; this.userTurned = false; this.zoom = 1; }
  setRunning(on) {
    this.lastDraw = -Infinity;
    this.clock.getDelta();
    this.r.setAnimationLoop(on ? now => {
      try { this.tick(now); }
      catch (error) { this.onError?.(error); }
    } : null);
  }
  resize() {
    const w = this.el.clientWidth || innerWidth, h = this.el.clientHeight || innerHeight;
    const ratio = Math.min(devicePixelRatio, this.renderScale, Math.sqrt(1900000 / (w*h)));
    if (ratio !== this.r.getPixelRatio()) this.r.setPixelRatio(ratio);
    this.r.setSize(w,h,false);
    this.cam.aspect = w/h;
    this.cam.updateProjectionMatrix();
  }
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
      [...w.children].forEach(c => { if (c.geometry?.type === 'TorusGeometry' || c === w.userData.sat || c.userData.shell) { w.remove(c); c.geometry.dispose(); } });
      w.userData.sat = null;
    }
    return w;
  }
  setLabels(list) {
    this.labelLayer.innerHTML = '';
    this.labels = list.map(l => { const d = document.createElement('span'); d.className = 'g3-label'; d.textContent = l.text; this.labelLayer.appendChild(d); return { ...l, el: d }; });
  }

  // ---------------- builder: planet below, spacecraft centre stage
  // builder inspection: glow one part and pick out its label
  inspect(id) {
    this.craft?.userData.highlight?.(id);
    (this.labels || []).forEach(l => { l.el.classList.toggle('on', !!id && l.id === id); l.el.classList.toggle('dim', !!id && l.id !== id); });
  }
  showBuild(mission, cfg, offsetX = 0, hideCraft = false) {
    this.lastCfg = cfg;
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
    for (const child of [...this.craftHolder.children]) {
      this.craftHolder.remove(child);
      disposeTree(child);
    }
    if (hideCraft) {
      this.craft = null;
      this.craftHolder.visible = false;
      this.setLabels([]);
      this.update = dt => { if (!this.reduced) this.planet.rotation.y += dt * .02; };
      return;
    }
    const { group, labels } = buildCraft(cfg, mission);
    group.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.9; } });
    group.scale.setScalar(0.78);
    this.craftHolder.add(group); this.craft = group;
    this.craftHolder.visible = true;
    this.setLabels(labels);
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
    const s = this.scene, say = (txt, k) => cues.say?.(txt, k);
    const earthR = 40;
    const earth = this.world('earth', earthR); earth.position.set(0, -earthR, 0); s.add(earth);
    [...earth.children].forEach(c => { if (c.userData.layer) earth.remove(c); }); // cloud and glow shells sit too close to the ground at pad scale
    earth.quaternion.setFromUnitVectors(latLonToVec(28.5, -80.6, 1).normalize(), new THREE.Vector3(0, 1, 0)); // Cape Canaveral under the rocket
    // ----- launch complex
    const pad = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ map: concreteTex(), color: 0x8a8780, roughness: 1 });
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.08, 64), concrete); apron.position.y = -0.04; pad.add(apron);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.62), concrete); plinth.position.y = 0.04; pad.add(plinth);
    const trench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.42), new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 1 })); trench.position.set(0.95, 0.002, 0); pad.add(trench);
    const steel = new THREE.MeshStandardMaterial({ color: 0x9a4a32, roughness: 0.55, metalness: 0.5 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.5, metalness: 0.6 });
    const tower = new THREE.Group(); tower.position.set(-0.62, 0, -0.08);
    const H = 3.0;
    for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, H, 0.035), steel); leg.position.set(x, H / 2, z); tower.add(leg); }
    for (let i = 0; i < 15; i++) {
      const y = 0.1 + i * 0.2; const r = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.018, 0.31), steel); r.position.y = y; tower.add(r);
      for (const [rx, rz, ry] of [[0, 0.14, 0], [0, -0.14, 0], [0.14, 0, Math.PI / 2], [-0.14, 0, Math.PI / 2]]) { // cross bracing
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.012), steel); br.position.set(rx, y + 0.1, rz); br.rotation.set(0, ry, 0.78 * (i % 2 ? 1 : -1)); if (ry) br.rotation.set(0.78 * (i % 2 ? 1 : -1), 0, 0); tower.add(br);
      }
    }
    const arms = [];
    for (const y of [1.05, 1.75, 2.45]) { const arm = new THREE.Group(); arm.position.set(0.15, y, 0); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.06), grey); bar.position.x = 0.21; arm.add(bar); tower.add(arm); arms.push(arm); }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020 })); beacon.position.y = H + 0.05; tower.add(beacon);
    pad.add(tower);
    for (const [x, z] of [[1.6, -1.4], [-1.9, 1.2], [-0.9, -2.1]]) { // lightning masts (kept out of the camera's line of sight) and a water tower
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 3.4, 8), grey); mast.position.set(x, 1.7, z); pad.add(mast);
    }
    const wt = new THREE.Group(); wt.position.set(-2.1, 0, -1.6);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.4, metalness: 0.4 })); tank.position.y = 1.1; wt.add(tank);
    for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0), grey); l.position.set(Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12); wt.add(l); }
    pad.add(wt);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(34, 96), new THREE.MeshStandardMaterial({ map: grassTex(), color: 0x7a8a62, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(6, -0.085, 20); pad.add(ground);
    const sand = new THREE.Mesh(new THREE.RingGeometry(33.6, 35.2, 128), new THREE.MeshStandardMaterial({ color: 0xcdbb94, roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(6, -0.09, 20); pad.add(sand);
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x23506e, roughness: 0.18, metalness: 0.35 })); ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.12; pad.add(ocean);
    // roads, a crawlerway and the rest of the complex: assembly building, propellant spheres, service structures
    const road = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 1 });
    const rd1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 30), road); rd1.rotation.x = -Math.PI / 2; rd1.position.set(2.4, -0.075, 14); pad.add(rd1);
    const rd2 = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.3), road); rd2.rotation.x = -Math.PI / 2; rd2.position.set(-6, -0.075, 3.6); pad.add(rd2);
    const shed = new THREE.MeshStandardMaterial({ color: 0xc9cbcc, roughness: 0.8 });
    const vab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 2.0), shed); vab.position.set(-9.5, 1.5, 6); pad.add(vab);
    const vabDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.6), new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.9 })); vabDoor.position.set(-8.29, 1.3, 6); vabDoor.rotation.y = Math.PI / 2; pad.add(vabDoor);
    for (const [x, z, r] of [[2.6, -2.4, 0.32], [3.4, -2.0, 0.26], [-2.8, 2.6, 0.3]]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ color: 0xeceeef, roughness: 0.35, metalness: 0.3 })); sp.position.set(x, r + 0.1, z); pad.add(sp); }
    for (const [x, z, w, h, d] of [[4.6, -3.5, 0.8, 0.4, 0.5], [-3.4, -1.2, 0.6, 0.3, 0.9], [-5.5, -4.5, 1.2, 0.5, 0.7]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shed); b.position.set(x, h / 2 - 0.05, z); pad.add(b); }
    // catenary wires between the lightning masts
    const tops = [[1.6, -1.4], [-1.9, 1.2], [-0.9, -2.1]].map(([x, z]) => new THREE.Vector3(x, 3.4, z));
    for (let i = 0; i < 3; i++) { const a = tops[i], b = tops[(i + 1) % 3]; const mid = a.clone().lerp(b, 0.5); mid.y -= 0.5;
      pad.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(24)), new THREE.LineBasicMaterial({ color: 0x55585c, transparent: true, opacity: 0.6 }))); }
    // flame deflector at the trench mouth
    const defl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), new THREE.MeshStandardMaterial({ color: 0x3b3936, roughness: 0.9 })); defl.position.set(0.2, 0.0, 0); defl.rotation.z = -0.5; pad.add(defl);
    s.fog = new THREE.FogExp2(0xb7cbe0, 0.022);
    const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x5d6a48, 1.1); s.add(hemi);
    this.sun.position.set(-6, 5, 3); this.sun.intensity = 3.4;
    const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xfff1d6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9, fog: false })); sunDisc.position.set(-90, 60, 40); sunDisc.scale.setScalar(26); s.add(sunDisc);
    pad.traverse(o => { if (o.material && !o.material.envMap) { o.material.envMap = this.env; o.material.envMapIntensity = 0.15; } });
    s.add(pad);
    // sky dome with a horizon gradient
    const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false,
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      uniforms: { uO: { value: 1 }, uAlt: { value: 0 } }, fog: false,
      fragmentShader: 'uniform float uO; uniform float uAlt; varying vec3 vW; void main(){ float h = clamp(vW.y*1.6+0.08, 0.0, 1.0); vec3 low = mix(vec3(0.82,0.88,0.94), vec3(0.55,0.62,0.78), uAlt); vec3 top = mix(vec3(0.20,0.43,0.80), vec3(0.03,0.07,0.20), uAlt); vec3 c = mix(low, top, pow(h,0.55)); float sd = max(0.0, dot(vW, normalize(vec3(-0.78,0.52,0.34)))); c += vec3(1.0,0.86,0.62)*pow(sd,18.0)*0.55*(1.0-uAlt); gl_FragColor = vec4(c, uO); }',
    })); s.add(sky);
    // ----- launch vehicle: generic two-stage rocket, no markings
    const rocket = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ map: hullTex(), color: 0xf2f2f0, roughness: 0.42, metalness: 0.15 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.6, metalness: 0.3 });
    const nozzleM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.35, metalness: 0.85, emissive: 0xff6a20, emissiveIntensity: 0, side: THREE.DoubleSide });
    const R = 0.12;
    const s1 = new THREE.Group();
    const s1Mat = new THREE.MeshStandardMaterial({ map: stage1Tex(), color: 0xffffff, roughness: 0.48, metalness: 0.12 });
    const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.5, 48), s1Mat); tank1.position.y = 0.85; s1.add(tank1);
    // grid fins (stowed), folded landing legs, engine heat shield, cold-gas thruster pods
    const fin = new THREE.MeshStandardMaterial({ map: finTex(), color: 0xffffff, roughness: 0.55, metalness: 0.6 });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, gf = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.008), fin); gf.position.set(Math.cos(a) * (R + 0.006), 1.52, Math.sin(a) * (R + 0.006)); gf.rotation.y = -a + Math.PI / 2; s1.add(gf); }
    const legM = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.5, metalness: 0.4 });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, lg = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.46, 0.014), legM); lg.position.set(Math.cos(a) * (R + 0.007), 0.3, Math.sin(a) * (R + 0.007)); lg.rotation.y = -a + Math.PI / 2; s1.add(lg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.02), legM); foot.position.set(Math.cos(a) * (R + 0.01), 0.08, Math.sin(a) * (R + 0.01)); foot.rotation.y = -a + Math.PI / 2; s1.add(foot); }
    for (let i = 0; i < 2; i++) { const a = i * Math.PI, rcs = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), legM); rcs.position.set(Math.cos(a) * (R + 0.01), 1.66, Math.sin(a) * (R + 0.01)); rcs.rotation.y = -a; s1.add(rcs); }
    const shield = new THREE.Mesh(new THREE.CircleGeometry(R * 1.04, 40), new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.9, side: THREE.DoubleSide })); shield.rotation.x = Math.PI / 2; shield.position.y = 0.0; s1.add(shield);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, 0.12, 40), black); skirt.position.y = 0.06; s1.add(skirt);
    const raceway = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.5, 0.02), body); raceway.position.set(0, 0.85, R + 0.008); s1.add(raceway);
    for (const [x, z] of [[0, 0], [0.065, 0], [-0.065, 0], [0, 0.065], [0, -0.065], [0.046, 0.046], [-0.046, 0.046], [0.046, -0.046], [-0.046, -0.046]]) {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.026, 0.07, 16, 1, true), nozzleM); bell.position.set(x, -0.03, z); s1.add(bell);
    }
    const inter = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.26, 40), black); inter.position.y = 1.73; s1.add(inter);
    rocket.add(s1);
    const s2 = new THREE.Group(); s2.position.y = 1.86;
    const tank2 = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.5, 40), body); tank2.position.y = 0.25; s2.add(tank2);
    const mvac = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.085, 0.24, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide })); mvac.position.y = -0.1; s2.add(mvac);
    rocket.add(s2);
    // fairing: two ogive halves
    const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24; prof.push(new THREE.Vector2(0.135 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.2))) + 0.002, u * 0.62)); }
    const fairL = new THREE.Mesh(new THREE.LatheGeometry(prof, 32, 0, Math.PI), body);
    const fairR = new THREE.Mesh(new THREE.LatheGeometry(prof, 32, Math.PI, Math.PI), body);
    const fair = new THREE.Group(); fair.position.y = 2.36; fair.add(fairL, fairR); rocket.add(fair);
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.13, R * 1.13, 0.012, 40), black); seam.position.y = 2.365; rocket.add(seam);
    const { group: sat, labels: _l } = buildCraft(this.lastCfg || fullCfg(mission), mission);
    sat.scale.setScalar(0.04); sat.userData.setDeploy(0); sat.position.y = 2.48; sat.visible = false; rocket.add(sat);
    rocket.traverse(o => { if (o.material && !o.material.envMap) { o.material.envMap = this.env; o.material.envMapIntensity = 0.7; } });
    s.add(rocket);
    // ----- exhaust: bright core, outer plume, shock glow
    const plumeMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uThin: { value: 0 }, uHot: { value: new THREE.Color(0xfff2c8) }, uCool: { value: new THREE.Color(0xff6a10) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; varying float vF; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vec3 n = normalize(normalMatrix*normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }',
      fragmentShader: `uniform float uT; uniform float uA; uniform float uThin; uniform vec3 uHot; uniform vec3 uCool; varying vec2 vUv; varying float vF;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ float y = vUv.y; // 0 at the nozzle, 1 at the tail
          float turb = n2(vec2(vUv.x*9.0, y*7.0 - uT*16.0))*0.6 + n2(vec2(vUv.x*21.0, y*15.0 - uT*31.0))*0.4;
          // Mach diamonds: bright standing shocks in the core, only in thick air near the ground
          float dia = pow(max(0.0, sin(y*46.0 - 1.2)), 10.0) * (1.0 - smoothstep(0.0, 0.42, y)) * (1.0 - uThin);
          vec3 c = mix(uHot, uCool, smoothstep(0.0, 0.75, y + (turb-0.5)*0.3));
          c += vec3(1.0,0.92,0.75) * dia * 1.6;
          float body = (1.0 - smoothstep(0.02, 1.0, y + (turb-0.5)*0.22)) * smoothstep(0.0, 0.03, y + 0.02);
          float a = body * (0.65 + 0.6*turb) * uA * pow(vF, 1.1);
          gl_FragColor = vec4(c * a * 1.7, a); }`,
    });
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.3, 24, 1, true), plumeMat); plume.rotation.x = Math.PI; plume.position.y = -0.85; rocket.add(plume);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 24, 1, true), plumeMat.clone()); core.material.uniforms.uCool.value = new THREE.Color(0xffd9a0); core.rotation.x = Math.PI; core.position.y = -0.28; rocket.add(core);
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); flare.scale.setScalar(1.4); flare.position.y = -0.15; rocket.add(flare);
    const glow = new THREE.PointLight(0xffa050, 0, 9, 1.5); s.add(glow);
    // ----- smoke: ground cloud from the flame trench, trail, venting
    const smokeMat = () => new THREE.SpriteMaterial({ map: smokeTex(), color: 0xf0eeea, transparent: true, depthWrite: false, opacity: 0 });
    const puffs = []; const smokeGrp = new THREE.Group(); s.add(smokeGrp);
    const spawn = (p, v, life, s0, grow, kind) => {
      let q = puffs.find(x => x.life <= 0);
      if (!q) { if (puffs.length > 700) return; q = { sp: new THREE.Sprite(smokeMat()) }; q.sp.material.rotation = Math.random() * 6.28; smokeGrp.add(q.sp); puffs.push(q); }
      Object.assign(q, { p: p.clone(), v, life, max: life, s0, grow, kind }); q.sp.visible = true;
    };
    const tickSmoke = (dt, nearFire) => {
      for (const q of puffs) {
        if (q.life <= 0) { q.sp.visible = false; continue; }
        q.life -= dt; const age = 1 - q.life / q.max;
        q.v.multiplyScalar(Math.pow(q.kind === 'ground' ? 0.55 : q.kind === 'water' ? 0.9 : 0.8, dt)); q.v.y += dt * (q.kind === 'vent' ? 0.05 : q.kind === 'water' ? -3.2 : 0.12);
        q.p.addScaledVector(q.v, dt); q.sp.position.copy(q.p);
        q.sp.scale.setScalar(q.s0 + q.grow * Math.sqrt(age));
        const fade = Math.min(1, age * 6) * (1 - Math.pow(age, 2.2));
        q.sp.material.opacity = (q.kind === 'vent' ? 0.35 : q.kind === 'vapor' ? 0.55 : q.kind === 'water' ? 0.6 : 0.85) * fade;
        const warm = q.kind !== 'vent' && nearFire ? Math.max(0, 1 - q.p.distanceTo(glow.position) / 2.2) : 0;
        q.sp.material.color.setRGB(0.93 + warm * 0.07, 0.92 - warm * 0.12, 0.9 - warm * 0.35);
      }
    };
    this.cam.fov = 38; this.cam.updateProjectionMatrix();
    const camGoal = { p: new THREE.Vector3(5.2, 1.0, 7.2), l: new THREE.Vector3(0, 1.4, 0) };
    this.cam.position.copy(camGoal.p); this.cam.lookAt(camGoal.l);
    const camL = camGoal.l.clone();
    // ----- timeline (seconds)
    const T = { ignite: 2.0, lift: 2.6, maxq: 5.6, meco: 8.0, sep: 8.3, ses: 8.9, fair: 9.6, orbit: 11.2, deploy: 12.0, arrays: 12.8, burn: 14.6, transfer: 15.2, arrive: 19.6, end: 21.6 };
    const isEarth = mission.id === 'earth', target = isEarth ? null : mission.id;
    if (isEarth) { T.end = 17.2; }
    const said = new Set(); const at = (time, txt, k) => { if (t >= time && !said.has(txt)) { said.add(txt); say(txt, k); } };
    let t = 0, stage1Gone = null, orbitShot = null, transfer = null, ended = false, prevY = 0; const emit = { g: 0, t: 0 };
    this.update = dt => {
      t += dt;
      at(0, 'T-3', 'count'); at(0.7, 'T-2', 'count'); at(1.4, 'T-1', 'count'); at(T.ignite, 'Ignition', 'ignite'); at(T.lift, 'Liftoff', 'lift');
      // ----- explosion branch
      if (boomAt && t > boomAt && !orbitShot) {
        if (!boom) {
          cues.boom?.(); this.shake(1.4);
          const p0 = new THREE.Vector3(0, 1.4, 0).applyMatrix4(rocket.matrixWorld);
          const debris = [];
          [s1, s2, fair, sat].forEach(c => { const wp = new THREE.Vector3(); c.getWorldPosition(wp); const q = new THREE.Quaternion(); c.getWorldQuaternion(q); rocket.remove(c); s.add(c); c.position.copy(wp); c.quaternion.copy(q); c.visible = true;
            debris.push({ o: c, v: new THREE.Vector3((Math.random() - 0.5) * 2.4, Math.random() * 1.6, (Math.random() - 0.5) * 2.4), r: (Math.random() - 0.5) * 4 }); });
          plume.visible = core.visible = false; flare.material.opacity = 0;
          for (let i = 0; i < 90; i++) spawn(p0, new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 2.2), 4 + Math.random() * 3, 0.3, 2.4 + Math.random() * 2, 'boom');
          const fb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fb.position.copy(p0); fb.scale.setScalar(0.5); s.add(fb);
          glow.position.copy(p0); glow.intensity = 300; glow.distance = 30;
          boom = { t: 0, debris, fb, p0 };
        }
        const b = boom; b.t += dt;
        b.fb.scale.setScalar(0.5 + Math.min(1, b.t * 3) * 4); b.fb.material.opacity = Math.max(0, 1 - b.t * 0.7);
        glow.intensity = Math.max(0, 300 - b.t * 260);
        b.debris.forEach(d => { d.v.y -= dt * 2.2; d.o.position.addScaledVector(d.v, dt); d.o.rotation.z += d.r * dt; d.o.rotation.x += d.r * 0.4 * dt; if (Math.random() < 0.5) spawn(d.o.position, new THREE.Vector3(0, 0.1, 0), 2.5, 0.08, 0.5, 'trail'); });
        tickSmoke(dt, true);
        this.cam.position.lerp(b.p0.clone().add(new THREE.Vector3(3.2, 0.6, 7)), dt * 0.6); this.cam.lookAt(b.p0);
        if (b.t > 3.6 && !ended) { ended = true; onDone?.(false, 'launch'); }
        return;
      }
      if (!orbitShot) {
        // ----- ascent
        const fly = Math.max(0, t - T.lift);
        const y = 0.06 * fly * fly * fly + 0.25 * fly * fly; // slow off the pad, then faster
        const pitch = Math.min(0.75, Math.max(0, fly - 1.6) * 0.12); // gravity turn
        rocket.position.set(Math.max(0, y - 2.5) * 0.35, y, 0); rocket.rotation.z = -pitch;
        const alt = y; const vy = (y - prevY) / Math.max(dt, 1e-3); prevY = y;
        sky.material.uniforms.uO.value = Math.max(0, 1 - alt / 24); sky.material.uniforms.uAlt.value = Math.min(1, alt / 20);
        if (s.fog) s.fog.density = 0.022 * Math.max(0, 1 - alt / 7);
        plumeMat.uniforms.uThin.value = core.material.uniforms.uThin.value = Math.min(1, alt / 9);
        this.starField.visible = sky.material.uniforms.uO.value < 0.35;
        const firing = t > T.ignite && t < T.meco;
        const s2fire = t > T.ses;
        const thin = Math.min(1, alt / 20); // plume widens in thin air
        plumeMat.uniforms.uT.value = t; core.material.uniforms.uT.value = t;
        if (firing) {
          const ramp = Math.min(1, (t - T.ignite) / 0.5);
          plumeMat.uniforms.uA.value = ramp; core.material.uniforms.uA.value = ramp;
          plume.scale.set(1 + thin * 4, 1.15 + thin * 6 + Math.random() * 0.08, 1 + thin * 4); plume.position.y = -0.65 * plume.scale.y - 0.04;
          flare.material.opacity = 0.9 * ramp; flare.scale.setScalar(1.2 + thin * 1.5 + Math.random() * 0.1);
          nozzleM.emissiveIntensity = 1.6 * ramp;
        } else if (s2fire) {
          plumeMat.uniforms.uA.value = 0.32; core.material.uniforms.uA.value = 0.7;
          plume.scale.set(3.2, 1.6, 3.2); plume.position.y = 1.86 - 0.22 - 0.65 * 1.6; core.position.y = 1.86 - 0.22 - 0.28; flare.position.y = 1.86 - 0.22; flare.material.opacity = 0.6; flare.scale.setScalar(1.6);
        } else { plumeMat.uniforms.uA.value = 0; core.material.uniforms.uA.value = 0; flare.material.opacity = 0; }
        if (!firing) nozzleM.emissiveIntensity = Math.max(0, nozzleM.emissiveIntensity - dt * 0.8); // bells glow, then cool after cutoff
        const noz = new THREE.Vector3(0, s2fire ? 1.62 : -0.05, 0).applyMatrix4(rocket.matrixWorld);
        glow.position.copy(noz); glow.intensity = (firing ? 40 : s2fire ? 10 : 0) * (alt < 3 ? 1 : 0.6);
        // ground cloud pours out of both ends of the flame trench
        // ground cloud pours out of both ends of the flame trench (rates are per second, so slow devices get the same cloud)
        emit.g += firing && fly < 3.4 ? dt * 70 : 0; emit.t += firing && fly > 0 && fly < 6.5 ? dt * 70 : 0;
        while (emit.g >= 1) { emit.g--;
          const dir = Math.random() < 0.62 ? 1 : -1, fresh = t - T.ignite < 0.6;
          spawn(new THREE.Vector3(dir * (0.3 + Math.random() * 0.4), 0.1, (Math.random() - 0.5) * 0.4),
            fresh ? new THREE.Vector3().randomDirection().setY(Math.random() * 0.6).multiplyScalar(1.6) : new THREE.Vector3(dir * (1.8 + Math.random() * 2.6), 0.25 + Math.random() * 0.5, (Math.random() - 0.5) * 1.6),
            6 + Math.random() * 4, 0.4, 2.2 + Math.random() * 1.8, 'ground');
        }
        // sound-suppression water: spray bursts off the deck at ignition
        if (t > T.ignite - 0.3 && fly < 1.2) for (let i = 0; i < 3; i++) spawn(new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.08, (Math.random() - 0.5) * 0.9), new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2), 0.9 + Math.random() * 0.5, 0.05, 0.25, 'water');
        // Max-Q: a brief condensation collar where the air is squeezed around the vehicle
        if (Math.abs(t - T.maxq) < 0.55) for (let i = 0; i < 4; i++) { const yy = 1.0 + Math.random() * 1.1, a = Math.random() * 6.28; spawn(new THREE.Vector3(Math.cos(a) * 0.15, yy, Math.sin(a) * 0.15).applyMatrix4(rocket.matrixWorld), new THREE.Vector3(Math.cos(a) * 0.3, -vy * 0.05, Math.sin(a) * 0.3), 0.35, 0.12, 0.25, 'vapor'); }
        while (emit.t >= 1) { emit.t--; spawn(noz.clone().add(new THREE.Vector3(0, -0.25 - Math.random() * 0.3, 0)), new THREE.Vector3((Math.random() - 0.5) * 0.15, -Math.min(2, vy * 0.15), (Math.random() - 0.5) * 0.15), 8 + Math.random() * 4, 0.25 + thin * 0.4, 1.1 + thin * 2.6, 'trail'); }
        if (t < T.ignite && Math.random() < 0.25) spawn(new THREE.Vector3(0.1, 1.95 + Math.random() * 0.3, 0.05), new THREE.Vector3(0.12 + Math.random() * 0.1, -0.05, 0.05), 2.5, 0.06, 0.35, 'vent'); // cryogenic venting
        tickSmoke(dt, firing);
        // tower arms swing away just before liftoff
        arms.forEach((a, i) => { a.rotation.y = Math.min(1.4, Math.max(0, t - 1.2 - i * 0.15) * 1.6); });
        beacon.material.color.setHex(Math.sin(t * 6) > 0 ? 0xff3020 : 0x400806);
        // staging events
        at(T.maxq, 'Max-Q: peak aerodynamic pressure'); at(T.meco, 'Main engine cutoff');
        if (t > T.sep && !stage1Gone) {
          at(T.sep, 'Stage separation', 'sep');
          const wp = new THREE.Vector3(), q = new THREE.Quaternion(); s1.getWorldPosition(wp); s1.getWorldQuaternion(q);
          rocket.remove(s1); s.add(s1); s1.position.copy(wp); s1.quaternion.copy(q); stage1Gone = { v: new THREE.Vector3(0.2, -0.6, 0) };
          for (let i = 0; i < 14; i++) spawn(new THREE.Vector3(0, 1.8, 0).applyMatrix4(rocket.matrixWorld), new THREE.Vector3().randomDirection().multiplyScalar(0.5), 1.4, 0.05, 0.3, 'vent');
        }
        if (stage1Gone) { stage1Gone.v.y -= dt * 0.8; s1.position.addScaledVector(stage1Gone.v, dt); s1.rotation.z += dt * 0.35; }
        at(T.ses, 'Second stage ignition');
        if (t > T.fair) {
          at(T.fair, 'Fairing separation'); sat.visible = true;
          const k = t - T.fair; fairL.position.x = -k * 0.35; fairR.position.x = k * 0.35; fairL.rotation.z = k * 0.6; fairR.rotation.z = -k * 0.6;
        }
        // ----- camera, like a launch broadcast: pad wide → tracking camera → long lens from the ground → onboard view down the stage → chase for fairing
        const lens = deg => { if (Math.abs(this.cam.fov - deg) > 0.05) { this.cam.fov = deg; this.cam.updateProjectionMatrix(); } };
        const shot = t < T.lift + 0.4 ? 0 : t < T.maxq - 0.6 ? 1 : t < T.meco - 0.15 ? 2 : t < T.fair + 0.7 ? 3 : 4;
        if (shot === 0) { lens(38); camGoal.p.set(5.2 - t * 0.35, 1.0 + t * 0.05, 7.2 - t * 0.5); camGoal.l.set(0, 1.4 + Math.max(0, y), 0); this.cam.position.lerp(camGoal.p, 1 - Math.pow(0.02, dt)); camL.lerp(camGoal.l, 1 - Math.pow(0.02, dt)); this.cam.lookAt(camL); }
        else if (shot === 1) { // tracking camera at the pad perimeter, zooming in as the rocket climbs
          this.cam.position.set(3.4, 0.25, 9.5); camL.copy(rocket.position).add(new THREE.Vector3(0, 1.0, 0)); this.cam.lookAt(camL);
          const dist = this.cam.position.distanceTo(camL); lens(THREE.MathUtils.clamp(2 * Math.atan(2.6 / dist) * 180 / Math.PI, 9, 38));
        } else if (shot === 2) { // long lens from a ground station far away: haze, the full trail, a small bright flame
          this.cam.position.set(16, 0.6, 30); camL.copy(rocket.position).add(new THREE.Vector3(0, 0.6, 0)); this.cam.lookAt(camL);
          const dist = this.cam.position.distanceTo(camL); lens(THREE.MathUtils.clamp(2 * Math.atan(4.2 / dist) * 180 / Math.PI, 4, 30));
        } else if (shot === 3) { // onboard camera on the second stage, looking down past the first stage at Earth
          lens(62);
          this.cam.position.copy(new THREE.Vector3(R + 0.05, 2.02, 0.03).applyMatrix4(rocket.matrixWorld));
          camL.copy(new THREE.Vector3(R * 0.4, -3.2, 0.3).applyMatrix4(rocket.matrixWorld)); this.cam.up.set(0, 1, 0).applyQuaternion(rocket.quaternion); this.cam.lookAt(camL);
        } else { // chase for the fairing
          lens(38); this.cam.up.set(0, 1, 0);
          camGoal.p.copy(rocket.position).add(new THREE.Vector3(1.4, 1.2, 2.6)); camGoal.l.copy(rocket.position).add(new THREE.Vector3(0, 1.9, 0));
          if (this._lastShot !== 4) { this.cam.position.copy(camGoal.p); camL.copy(camGoal.l); } else { this.cam.position.lerp(camGoal.p, 1 - Math.pow(0.02, dt)); camL.lerp(camGoal.l, 0.2); }
          this.cam.lookAt(camL);
        }
        this._lastShot = shot;
        pad.visible = ground.visible = shot !== 3; smokeGrp.visible = shot !== 3; // from 80 km up the pad is far below the haze
        // simulated broadcast telemetry (time compressed): mission clock, speed, altitude
        cues.tele?.(telemetry(t, T), shot);
        if (firing && fly < 2.5) this.shake(0.25);
        if (t > T.orbit) {
          // ----- cut to orbit: payload separation above Earth
          at(T.orbit, 'Orbit reached');
          [earth, sky, rocket, glow, pad, smokeGrp, s1].forEach(o => s.remove(o));
          this.starField.visible = true;
          orbitShot = new THREE.Group(); s.add(orbitShot);
          const big = this.world('earth', 26); big.position.set(0, -30.5, -6); big.rotation.set(0.5, 2.2, 0.2); orbitShot.add(big);
          const upper = new THREE.Group();
          const ut = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 40), body); upper.add(ut);
          const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.36, 0.25, 32), black); adapter.position.y = 0.87; upper.add(adapter);
          const ub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.8, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide })); ub.position.y = -1.15; upper.add(ub);
          upper.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.7; } });
          upper.rotation.z = -0.25; orbitShot.add(upper);
          const { group: craft } = buildCraft(this.lastCfg || fullCfg(mission), mission);
          craft.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.9; } });
          craft.scale.setScalar(0.55); orbitShot.add(craft);
          craft.userData.setDeploy(0);
          craft.position.set(0, 1.35, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.25);
          orbitShot.userData = { upper, craft, c0: craft.position.clone() };
          this.cam.fov = 40; this.cam.updateProjectionMatrix();
          this.cam.up.set(0, 1, 0); cues.tele?.(null);
          this.cam.position.set(2.6, 1.3, 3.6); camL.set(0, 0.9, 0); this.cam.lookAt(camL);
        }
        return;
      }
      // ----- in orbit: deployment, then transfer or orbit raising
      if (!transfer) {
        const u = orbitShot.userData, k = Math.max(0, t - T.deploy);
        at(T.deploy, 'Spacecraft separation', 'sep');
        u.craft.position.copy(u.c0).add(new THREE.Vector3(0.08, 0.32, 0.05).multiplyScalar(k)); u.craft.rotation.y = k * 0.12; u.craft.rotation.z = -0.25 + k * 0.03;
        const open = Math.min(1, Math.max(0, (t - T.arrays) / 1.2)); const ease = open * open * (3 - 2 * open);
        u.craft.userData.setDeploy(ease);
        if (t > T.arrays) at(T.arrays, 'Solar arrays deployed', 'arrays');
        u.upper.position.y -= dt * 0.04; u.upper.rotation.x += dt * 0.02;
        if (isEarth && t > T.burn) { at(T.burn, 'Raising to final orbit'); const pl = u.craft.userData.plume; if (pl) pl.material.opacity = 0.85 + Math.random() * 0.15; }
        this.cam.position.x = 2.6 - k * 0.12; this.cam.position.z = 3.6 + k * 0.1; camL.lerp(u.craft.position, 0.04); this.cam.lookAt(camL);
        if (!isEarth && t > T.transfer) {
          at(T.transfer, `Transfer to ${mission.world}`);
          s.remove(orbitShot);
          transfer = new THREE.Group(); s.add(transfer);
          const e = this.world('earth', 1); e.position.set(-4, 0, 0); transfer.add(e);
          const dest = this.world(target, target === 'astra' ? 0.35 : target === 'lunaris' ? 0.5 : 0.8); dest.position.set(4, 0.4, 0); transfer.add(dest);
          const destPos = new THREE.Vector3(4, 0.4, 0);
          const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3, 0.3, 0), new THREE.Vector3(0, 2.6, 0), destPos.clone().add(new THREE.Vector3(-0.9, 0.2, 0)));
          const pts = curve.getPoints(120);
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: new THREE.Color(mission.accent), dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.8 }));
          line.computeLineDistances(); transfer.add(line);
          const { group: mini } = buildCraft(this.lastCfg || fullCfg(mission), mission); mini.scale.setScalar(0.14); transfer.add(mini);
          const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xd8ecff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); halo.scale.setScalar(0.5); mini.add(halo); halo.scale.setScalar(4);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(target === 'astra' ? 0.6 : 0.95, 0.01, 8, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(mission.accent), transparent: true, opacity: 0 }));
          ring.position.copy(destPos); ring.rotation.x = Math.PI / 2.3; transfer.add(ring);
          transfer.userData = { pts, mini, ring, destPos };
          this.cam.position.set(0, 1.5, 9.5); this.cam.lookAt(0, 0.4, 0);
        }
      } else {
        const u = Math.min(1, (t - T.transfer) / (T.arrive - T.transfer));
        const { pts, mini, ring, destPos } = transfer.userData;
        if (u < 1 || !success) {
          const f = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
          mini.position.lerpVectors(pts[k], pts[k + 1], f - k); mini.lookAt(pts[k + 1]);
          if (!success && u >= 1) { mini.position.add(new THREE.Vector3((t - T.arrive) * 1.6, (t - T.arrive) * 0.4, 0)); at(T.arrive, 'Insertion burn… propellant exhausted', 'bad'); }
          if (u > 0.9) { at(T.arrive - 0.45, 'Orbit insertion burn'); const pl = mini.userData.plume; if (pl) pl.material.opacity = 0.9; }
        } else {
          const a = (t - T.arrive) * 2.2, rr = ring.geometry.parameters.radius;
          mini.position.copy(destPos).add(new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr).applyEuler(ring.rotation));
          ring.material.opacity = Math.min(1, (t - T.arrive) * 1.5);
          const pl = mini.userData.plume; if (pl) pl.material.opacity = Math.max(0, 0.9 - (t - T.arrive));
          if (!this._insertCue) { this._insertCue = true; cues.insert?.(); }
        }
        if (!this.reduced) this.cam.position.x = Math.sin(t * 0.1) * 0.6;
        this.cam.lookAt(0, 0.4, 0);
      }
      if (t > T.end && !ended) { ended = true; this._insertCue = false; onDone?.(success); }
    };
    this.skipLaunch = () => { if (!ended) { if (boomAt && !boom) { t = boomAt; return; } ended = true; this._insertCue = false; onDone?.(success && !boomAt, boomAt ? 'launch' : undefined); } };
  }

  // ---------------- operations: orbit view driven by the simulation
  showOps(mission, derived) {
    this.mode = 'ops'; this.clear(); this.setLabels([]);
    const s = this.scene;
    const isAst = mission.id === 'astra';
    const R = isAst ? 0.8 : 1.15;
    const body = this.world(mission.id, R); s.add(body); this.body = body;
    // the Sun, far away along the light direction, so the player can see where the sunlight comes from
    const sunSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xfff0c8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sunSp.position.copy(this.sun.position).normalize().multiplyScalar(60); sunSp.scale.setScalar(9); s.add(sunSp);
    const sunHalo = sunSp.clone(); sunHalo.material = sunSp.material.clone(); sunHalo.material.opacity = 0.25; sunHalo.material.color.set(0xffb060); sunHalo.scale.setScalar(30); s.add(sunHalo);
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
    const { group: craft } = buildCraft(this.lastCfg || fullCfg(mission), mission);
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
      halo.material.color.set(st.alert ? 0xff3b3b : 0xdfeaff); // neutral glow: the craft itself is never tinted by the mission accent
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

  tick(now) {
    if (document.hidden || !this.scene) {
      this.clock.getDelta();
      return;
    }
    if (now - this.lastDraw < this.frameInterval - 1.5) return;
    this.lastDraw = now;
    const raw = this.clock.getDelta();
    // slow device: drop render resolution a step at a time until frames are smooth
    this._ft = (this._ft ?? 0.016) * 0.95 + Math.min(raw, 0.2) * 0.05; this._fn = (this._fn || 0) + 1;
    if (this._fn > 90 && this._ft > this.frameInterval / 1000 * 1.38 && this.renderScale > .75) { this.renderScale = Math.max(.75, this.renderScale - .2); this.resize(); this._fn = 0; this._ft = 0.02; }
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
      const placed = [];
      for (const l of this.labels) {
        l.obj.getWorldPosition(v); v.project(this.cam);
        l.vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; l.x = (v.x * 0.5 + 0.5) * w; l.y = (-v.y * 0.5 + 0.5) * h;
        if (l.vis) placed.push(l);
      }
      // keep labels from sitting on top of each other: push later ones down
      placed.sort((a, b) => a.y - b.y);
      for (let i = 1; i < placed.length; i++) for (let k = 0; k < i; k++) { const a = placed[k], b = placed[i]; if (Math.abs(a.x - b.x) < 170 && b.y - a.y < 26) b.y = a.y + 26; }
      for (const l of this.labels) { l.el.style.opacity = l.vis ? 1 : 0; l.el.style.transform = `translate(${l.x}px, ${l.y}px)`; }
    }
  }
  dispose() { this.r.setAnimationLoop(null); this.ro.disconnect(); if (this.scene) disposeTree(this.scene); this.environment.dispose(); this.r.dispose(); }
}
