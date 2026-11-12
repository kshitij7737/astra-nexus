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
  const supportMaterial = M.grey();
  const focus = new THREE.Vector3(0, r * 0.6, 0);
  const axis = new THREE.Vector3(0, 1, 0);
  const legGeometry = new THREE.CylinderGeometry(0.007, 0.007, 1, 8);
  for (let i = 0; i < 3; i++) {
    const angle = i * 2 * Math.PI / 3;
    const anchor = new THREE.Vector3(Math.cos(angle) * r * 0.78, r * 0.24, Math.sin(angle) * r * 0.78);
    const leg = new THREE.Mesh(legGeometry, supportMaterial);
    const direction = focus.clone().sub(anchor);
    leg.position.copy(anchor).addScaledVector(direction, 0.5);
    leg.scale.y = direction.length();
    leg.quaternion.setFromUnitVectors(axis, direction.normalize());
    g.add(leg);
  }
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.019, 0.045, 12), supportMaterial);
  feed.position.copy(focus);
  g.add(feed);
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
let glowTexC;
function glowSprite() {
  if (glowTexC) return glowTexC;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  glowTexC = new THREE.CanvasTexture(c); glowTexC.userData.shared = true; return glowTexC;
}
export function lightCraft(craft, environment) {
  craft.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.envMap = environment;
      material.envMapIntensity = 0.9;
    }
  });
}

export function buildCraft(cfg, mission) {
  const g = new THREE.Group(), labels = [];
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), M.foil());
  g.add(bus);
  const alloy = M.grey();
  const deckGeometry = new THREE.BoxGeometry(0.94, 0.045, 0.84);
  for (const y of [-0.4, 0.42]) {
    const deck = new THREE.Mesh(deckGeometry, alloy);
    deck.position.y = y;
    g.add(deck);
  }
  // A continuous spar connects the hinged sections back to the bus.
  const nPanels = cfg.solar === 'L' ? 3 : 2;
  const panelGeometry = new THREE.BoxGeometry(0.62, 0.024, 0.5);
  const back = M.panelBack();
  const face = M.panel();
  const panelMaterials = [back, back, face, back, back, back];
  const edgeGeometry = new THREE.EdgesGeometry(panelGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xb1bccb });
  const sparLength = 0.37 + (nPanels - 1) * 0.64 + 0.53;
  const sparGeometry = new THREE.BoxGeometry(sparLength, 0.028, 0.055);
  const hingeGeometry = new THREE.CylinderGeometry(0.044, 0.044, 0.13, 12);
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.45, 0.05, 0);
    wing.rotation.x = 0.25;
    const spar = new THREE.Mesh(sparGeometry, alloy);
    spar.position.set(side * sparLength / 2, -0.025, 0);
    wing.add(spar);
    for (let i = 0; i < nPanels; i++) {
      const panel = new THREE.Mesh(panelGeometry, panelMaterials);
      panel.position.x = side * (0.68 + i * 0.64);
      panel.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      wing.add(panel);
      if (i === nPanels - 1 && side === 1) labels.push({ obj: panel, text: 'Solar arrays' });
    }
    const hinge = new THREE.Mesh(hingeGeometry, alloy);
    hinge.position.x = side * 0.07;
    hinge.rotation.x = Math.PI / 2;
    wing.add(hinge);
    g.add(wing);
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
  // main engine with a blue-white plume (shown only while it fires)
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.22, 32, 1, true), M.dark()); bell.position.set(0, -0.55, 0); g.add(bell);
  const plume = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xbfe0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  plume.scale.set(0.5, 1.1, 1); plume.position.set(0, -1.05, 0); g.add(plume); g.userData.plume = plume;
  // star trackers and sun sensor
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.1, 16), M.dark()); st.position.set(sx * 0.3, 0.5, -0.32); st.rotation.x = -0.5; g.add(st); }
  const rad = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.55), new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.3, metalness: 0.1 })); rad.position.set(0.461, 0, 0); g.add(rad);
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
    lightCraft(group, this.env);
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
    for (const [x, z] of [[1.6, -1.4], [-1.9, 1.2], [1.4, 1.7]]) { // lightning masts and a water tower
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 3.4, 8), grey); mast.position.set(x, 1.7, z); pad.add(mast);
    }
    const wt = new THREE.Group(); wt.position.set(-2.1, 0, -1.6);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.4, metalness: 0.4 })); tank.position.y = 1.1; wt.add(tank);
    for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0), grey); l.position.set(Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12); wt.add(l); }
    pad.add(wt);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ map: grassTex(), color: 0x7a8a62, roughness: 1, transparent: true, opacity: 0.92 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.085; pad.add(ground);
    pad.traverse(o => { if (o.material && !o.material.envMap) { o.material.envMap = this.env; o.material.envMapIntensity = 0.15; } });
    s.add(pad);
    // sky dome with a horizon gradient
    const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
      uniforms: { uO: { value: 1 } }, side: THREE.BackSide, transparent: true, depthWrite: false,
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float uO; varying vec3 vW; void main(){ float h = clamp(vW.y*1.6+0.08, 0.0, 1.0); vec3 c = mix(vec3(0.78,0.86,0.95), vec3(0.22,0.45,0.82), pow(h,0.6)); gl_FragColor = vec4(c, uO); }',
    })); s.add(sky);
    // ----- launch vehicle: generic two-stage rocket, no markings
    const rocket = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ map: hullTex(), color: 0xf2f2f0, roughness: 0.42, metalness: 0.15 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.6, metalness: 0.3 });
    const nozzleM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.35, metalness: 0.85 });
    const R = 0.12;
    const s1 = new THREE.Group();
    const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.5, 40), body); tank1.position.y = 0.85; s1.add(tank1);
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
    const { group: sat, labels: _l } = buildCraft({ solar: 'S', battery: 'S', radio: 'S', recorder: 'S', propKg: 80, inst: [] }, mission);
    sat.scale.setScalar(0.1); sat.position.y = 2.48; sat.visible = false; rocket.add(sat);
    rocket.traverse(o => { if (o.material && !o.material.envMap) { o.material.envMap = this.env; o.material.envMapIntensity = 0.7; } });
    s.add(rocket);
    // ----- exhaust: bright core, outer plume, shock glow
    const plumeMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uHot: { value: new THREE.Color(0xfff2c8) }, uCool: { value: new THREE.Color(0xff6a10) } },
      transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; varying float vF; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vec3 n = normalize(normalMatrix*normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }',
      fragmentShader: `uniform float uT; uniform float uA; uniform vec3 uHot; uniform vec3 uCool; varying vec2 vUv; varying float vF;
        void main(){ float y = vUv.y; float flick = 0.85 + 0.15*sin(uT*60.0 + y*30.0);
          vec3 c = mix(uHot, uCool, smoothstep(0.0, 0.7, y));
          float a = (1.0 - smoothstep(0.05, 1.0, y)) * flick * uA * pow(vF, 1.4);
          gl_FragColor = vec4(min(c * 1.25, vec3(1.0)), a); }`,
    });
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.3, 24, 1, true), plumeMat); plume.rotation.x = Math.PI; plume.position.y = -0.85; rocket.add(plume);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 16, 1, true), plumeMat.clone()); core.material.uniforms.uCool.value = new THREE.Color(0xffd9a0); core.rotation.x = Math.PI; core.position.y = -0.28; rocket.add(core);
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
        q.v.multiplyScalar(Math.pow(q.kind === 'ground' ? 0.55 : 0.8, dt)); q.v.y += dt * (q.kind === 'vent' ? 0.05 : 0.12);
        q.p.addScaledVector(q.v, dt); q.sp.position.copy(q.p);
        q.sp.scale.setScalar(q.s0 + q.grow * Math.sqrt(age));
        const fade = Math.min(1, age * 6) * (1 - Math.pow(age, 2.2));
        q.sp.material.opacity = (q.kind === 'vent' ? 0.35 : 0.85) * fade;
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
        sky.material.uniforms.uO.value = Math.max(0, 1 - alt / 24);
        this.starField.visible = sky.material.uniforms.uO.value < 0.35;
        const firing = t > T.ignite && t < T.meco;
        const s2fire = t > T.ses;
        const thin = Math.min(1, alt / 20); // plume widens in thin air
        plumeMat.uniforms.uT.value = t; core.material.uniforms.uT.value = t;
        if (firing) {
          const ramp = Math.min(1, (t - T.ignite) / 0.5);
          plumeMat.uniforms.uA.value = ramp; core.material.uniforms.uA.value = ramp;
          plume.scale.set(1 + thin * 2.4, 1 + thin * 1.2 + Math.random() * 0.06, 1 + thin * 2.4); plume.position.y = -0.65 * plume.scale.y - 0.04;
          flare.material.opacity = 0.9 * ramp; flare.scale.setScalar(1.2 + thin * 1.5 + Math.random() * 0.1);
        } else if (s2fire) {
          plumeMat.uniforms.uA.value = 0.32; core.material.uniforms.uA.value = 0.7;
          plume.scale.set(3.2, 1.6, 3.2); plume.position.y = 1.86 - 0.22 - 0.65 * 1.6; core.position.y = 1.86 - 0.22 - 0.28; flare.position.y = 1.86 - 0.22; flare.material.opacity = 0.6; flare.scale.setScalar(1.6);
        } else { plumeMat.uniforms.uA.value = 0; core.material.uniforms.uA.value = 0; flare.material.opacity = 0; }
        const noz = new THREE.Vector3(0, s2fire ? 1.62 : -0.05, 0).applyMatrix4(rocket.matrixWorld);
        glow.position.copy(noz); glow.intensity = (firing ? 40 : s2fire ? 10 : 0) * (alt < 3 ? 1 : 0.6);
        // ground cloud pours out of both ends of the flame trench
        // ground cloud pours out of both ends of the flame trench (rates are per second, so slow devices get the same cloud)
        emit.g += firing && fly < 3.4 ? dt * 70 : 0; emit.t += firing && fly > 0 && fly < 6.5 ? dt * 45 : 0;
        while (emit.g >= 1) { emit.g--;
          const dir = Math.random() < 0.62 ? 1 : -1, fresh = t - T.ignite < 0.6;
          spawn(new THREE.Vector3(dir * (0.3 + Math.random() * 0.4), 0.1, (Math.random() - 0.5) * 0.4),
            fresh ? new THREE.Vector3().randomDirection().setY(Math.random() * 0.6).multiplyScalar(1.6) : new THREE.Vector3(dir * (1.8 + Math.random() * 2.6), 0.25 + Math.random() * 0.5, (Math.random() - 0.5) * 1.6),
            6 + Math.random() * 4, 0.4, 2.2 + Math.random() * 1.8, 'ground');
        }
        while (emit.t >= 1) { emit.t--; spawn(noz.clone().add(new THREE.Vector3(0, -0.25 - Math.random() * 0.3, 0)), new THREE.Vector3((Math.random() - 0.5) * 0.15, -Math.min(2, vy * 0.15), (Math.random() - 0.5) * 0.15), 7 + Math.random() * 3, 0.2 + thin * 0.25, 0.9 + thin * 1.4, 'trail'); }
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
        // ----- camera: pad wide → ground tracking → chase → staging close-up
        if (t < T.lift + 0.4) { camGoal.p.set(5.2 - t * 0.35, 1.0 + t * 0.05, 7.2 - t * 0.5); camGoal.l.set(0, 1.4 + Math.max(0, y), 0); }
        else if (t < T.maxq - 0.6) { camGoal.p.set(1.6, 0.35, 6.4); camGoal.l.copy(rocket.position).add(new THREE.Vector3(0, 1.1, 0)); }
        else if (t < T.meco) { camGoal.p.copy(rocket.position).add(new THREE.Vector3(2.2, -0.6, 4.4)); camGoal.l.copy(rocket.position).add(new THREE.Vector3(0, 1.0, 0)); }
        else { camGoal.p.copy(rocket.position).add(new THREE.Vector3(1.4, 1.2, 2.6)); camGoal.l.copy(rocket.position).add(new THREE.Vector3(0, 1.9, 0)); }
        // fixed offsets while chasing a fast rocket; smooth blends only at the start of each shot
        const kc = 1 - Math.pow(0.02, dt);
        const shotStart = t < T.lift + 0.4 ? 0 : t < T.maxq - 0.6 ? T.lift + 0.4 : t < T.meco ? T.maxq - 0.6 : T.meco;
        const blend = t < T.lift + 0.4 ? kc : Math.min(1, (t - shotStart) * 2.5);
        if (shotStart && blend >= 1) this.cam.position.copy(camGoal.p); else this.cam.position.lerp(camGoal.p, shotStart ? Math.max(kc, blend) : kc);
        if (shotStart) camL.copy(camGoal.l); else camL.lerp(camGoal.l, kc); this.cam.lookAt(camL);
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
          const { group: craft } = buildCraft({ solar: 'L', battery: 'S', radio: 'S', recorder: 'S', propKg: 80, inst: [] }, mission);
          lightCraft(craft, this.env);
          craft.scale.setScalar(0.55); orbitShot.add(craft);
          const wings = craft.children.filter(c => c.material && (Array.isArray(c.material) || c.material.map === cells()) || (c.isLineSegments));
          craft.position.set(0, 1.35, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.25);
          orbitShot.userData = { upper, craft, wings, c0: craft.position.clone() };
          this.cam.fov = 40; this.cam.updateProjectionMatrix();
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
        u.wings.forEach(w => { if (w.userData.x0 === undefined) w.userData.x0 = w.position.x; w.scale.x = Math.max(0.02, ease); w.position.x = Math.sign(w.userData.x0) * (0.62 + (Math.abs(w.userData.x0) - 0.62) * ease); });
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
          const { group: mini } = buildCraft({ solar: 'L', battery: 'S', radio: 'S', recorder: 'S', propKg: 80, inst: [] }, mission); mini.scale.setScalar(0.14); transfer.add(mini);
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
    this.skipLaunch = () => { if (!ended) { if (boomAt && !boom) { t = boomAt; return; } ended = true; this._insertCue = false; onDone?.(success); } };
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
    const { group: craft } = buildCraft(this.lastCfg || { solar: 'S', battery: 'S', radio: 'S', recorder: 'S', propKg: 80, inst: [] }, mission);
    craft.scale.setScalar(0.15); lightCraft(craft, this.env);
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
    // slow device: drop render resolution a step at a time until frames are smooth
    this._ft = (this._ft ?? 0.016) * 0.95 + Math.min(raw, 0.2) * 0.05; this._fn = (this._fn || 0) + 1;
    if (this._fn > 90 && this._ft > 0.038 && this.r.getPixelRatio() > 0.75) { this.r.setPixelRatio(Math.max(0.75, this.r.getPixelRatio() - 0.25)); this.resize(); this._fn = 0; this._ft = 0.02; }
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
  dispose() { this.r.setAnimationLoop(null); this.ro.disconnect(); if (this.scene) disposeTree(this.scene); this.r.dispose(); }
}
