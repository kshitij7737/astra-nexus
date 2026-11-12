// Cinematic Three.js stage for the ASTRA mission environments.
// One fixed full-screen canvas sits behind the page. Each chapter names an
// "anchor" element; the world (or spacecraft) glides into that element's
// on-screen box as the visitor scrolls, which gives the scroll-led motion.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// ---------- procedural helpers (deterministic, so worlds look the same each load)
function hash(x, y, z, s) { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453; return v - Math.floor(v); }
function noise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = t => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  let r = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
    r += (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w) * hash(xi + a, yi + b, zi + c, s);
  return r;
}
function fbm(p, s, oct = 5) { let a = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { t += a * noise3(p.x * f, p.y * f, p.z * f, s); a *= 0.5; f *= 2; } return t; }
const craterCache = new Map();
function craters(v, s, n, size) { // depth contribution from n pseudo-random craters (centres cached per seed)
  const key = `${s}:${n}:${size}`;
  let list = craterCache.get(key);
  if (!list) {
    list = [];
    for (let i = 0; i < n; i++) {
      const x = hash(i, 1, 2, s) * 2 - 1, y = hash(i, 3, 4, s) * 2 - 1, z = hash(i, 5, 6, s) * 2 - 1, l = Math.hypot(x, y, z) || 1;
      list.push([x / l, y / l, z / l, size * (0.3 + hash(i, 7, 8, s))]);
    }
    craterCache.set(key, list);
  }
  let d = 0;
  for (const [cx, cy, cz, r] of list) {
    const dx = v.x - cx, dy = v.y - cy, dz = v.z - cz, dist2 = dx * dx + dy * dy + dz * dz;
    if (dist2 < r * r) { const x = Math.sqrt(dist2) / r; d += (x < 0.8 ? -0.6 * (1 - x * x / 0.64) : 0.5 * (1 - (x - 0.8) / 0.2)) * r * 0.25; }
  }
  return d;
}

export function latLonToVec(lat, lon, r = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function fresnelMaterial(color, power = 3, strength = 1.2) {
  // Rim glow, brighter on the side facing the main light so the night side is not lit up.
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uStrength: { value: strength }, uOpacity: { value: 1 }, uSun: { value: new THREE.Vector3(0, 0, 1) }, uSunOn: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uPower; uniform float uStrength; uniform float uOpacity; uniform vec3 uSun; uniform float uSunOn; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), uPower) * uStrength;
        float lit = mix(1.0, mix(0.12, 1.25, smoothstep(-0.35, 0.45, dot(vN, uSun))), uSunOn);
        gl_FragColor = vec4(uColor, f * lit * uOpacity); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function trackSun(mesh) {
  let light = null;
  mesh.onBeforeRender = (r, scene, cam) => {
    if (!light || !light.parent) { light = null; scene.traverse(o => { if (!light && (o.isDirectionalLight || (o.isPointLight && o.intensity > 50))) light = o; }); }
    const u = mesh.material.uniforms; if (!light) { u.uSunOn.value = 0; return; }
    light.getWorldPosition(_a);
    if (light.isDirectionalLight) { light.target.getWorldPosition(_b); _a.sub(_b); } else { mesh.getWorldPosition(_b); _a.sub(_b); }
    u.uSun.value.copy(_a.transformDirection(cam.matrixWorldInverse)); u.uSunOn.value = 1;
  };
}

// Shared texture cache. Colour maps are sRGB; data maps (bump, roughness, alpha) stay linear.
const TEX = new Map();
function tex(name, cb, srgb = true) {
  let e = TEX.get(name);
  if (!e) {
    e = { t: null, cbs: [] }; TEX.set(name, e);
    new THREE.TextureLoader().load(new URL(`../textures/${name}`, import.meta.url).href, t => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.shared = true; e.t = t; e.cbs.forEach(f => f(t)); e.cbs = [];
    });
  }
  if (e.t) cb(e.t); else e.cbs.push(cb);
}
// City lights only on the night side: fade the emissive map by the angle to the main light.
function nightSide(mat) {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float nxl = 1.0;
      #if NUM_DIR_LIGHTS > 0
        nxl = dot(normal, directionalLights[0].direction);
      #elif NUM_POINT_LIGHTS > 0
        nxl = dot(normal, normalize(pointLights[0].position + vViewPosition));
      #endif
      totalEmissiveRadiance *= smoothstep(0.12, -0.18, nxl);`);
  };
}

// Icosahedron geometry is non-indexed; merge shared corners so normals smooth.
function indexed(geo) {
  const pos = geo.attributes.position, map = new Map(), verts = [], idx = [];
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
    let j = map.get(key);
    if (j === undefined) { j = verts.length / 3; map.set(key, j); verts.push(pos.getX(i), pos.getY(i), pos.getZ(i)); }
    idx.push(j);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx);
  geo.dispose(); return g;
}

export function buildWorld(m) {
  const kind = m.world.kind, g = new THREE.Group();
  const geo = indexed(new THREE.IcosahedronGeometry(1, kind === 'asteroid' ? 40 : 2)); // textured worlds replace this below
  const pos = geo.attributes.position, cols = [], v = new THREE.Vector3(), base = new THREE.Color(m.color);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let h = 0; const c = base.clone();
    if (kind === 'asteroid') {
      const n = fbm(v.clone().multiplyScalar(2.2), 3);
      const lobe = Math.exp(-((v.x - 0.55) ** 2) * 4) + Math.exp(-((v.x + 0.55) ** 2) * 4); // soft two-lobed hint
      h = (n - 0.5) * 0.35 + craters(v, 9, 14, 0.35) + lobe * 0.12;
      v.multiply(new THREE.Vector3(1.32, 0.82, 0.86));
      c.multiplyScalar(0.8 + n * 0.6);
    } else if (kind === 'moon') {
      const n = fbm(v.clone().multiplyScalar(3), 7);
      const mare = fbm(v.clone().multiplyScalar(1.2), 11, 3);
      const cr = craters(v, 5, 70, 0.14) + craters(v, 6, 160, 0.05);
      h = (n - 0.5) * 0.03 + cr * 0.6;
      c.multiplyScalar(THREE.MathUtils.lerp(0.36 + n * 0.2, 0.8 + n * 0.35, THREE.MathUtils.smoothstep(mare, 0.42, 0.5)) * THREE.MathUtils.clamp(1 + cr * 14, 0.45, 1.5));
    } else if (kind === 'mars') {
      const n = fbm(v.clone().multiplyScalar(2.5), 21);
      const albedo = fbm(v.clone().multiplyScalar(1.1), 31, 3);
      const cr = craters(v, 13, 40, 0.1);
      h = (n - 0.5) * 0.05 + cr * 0.5;
      c.set(0xc0714a).lerp(new THREE.Color(0xe3a679), THREE.MathUtils.smoothstep(n, 0.45, 0.65));
      c.lerp(new THREE.Color(0x6b3a26), THREE.MathUtils.smoothstep(albedo, 0.5, 0.62) * 0.7); c.multiplyScalar(THREE.MathUtils.clamp(1 + cr * 9, 0.5, 1.4));
      c.lerp(new THREE.Color(0xf0e6dc), THREE.MathUtils.smoothstep(Math.abs(v.y) + (n - 0.5) * 0.08, 0.9, 0.96));
    } else if (kind === 'earth') {
      const n = fbm(v.clone().multiplyScalar(1.8), 42);
      const land = THREE.MathUtils.smoothstep(n, 0.5, 0.54);
      const ocean = new THREE.Color(0x0a2f6e).lerp(new THREE.Color(0x1b5fa8), THREE.MathUtils.smoothstep(n, 0.38, 0.5));
      const ground = new THREE.Color(0x2f6b34).lerp(new THREE.Color(0x9a8455), THREE.MathUtils.smoothstep(n, 0.58, 0.66));
      c.copy(ocean).lerp(ground, land); h = land * 0.008;
      c.lerp(new THREE.Color(0xeef4ff), THREE.MathUtils.smoothstep(Math.abs(v.y) + (n - 0.5) * 0.1, 0.86, 0.94));
    }
    c.convertSRGBToLinear(); // colours above are authored in sRGB
    v.multiplyScalar(1 + h); pos.setXYZ(i, v.x, v.y, v.z); cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  if (kind === 'asteroid') g.scale.setScalar(0.74); // elongated body: keep it inside its frame
  if (kind === 'earth' || kind === 'moon' || kind === 'mars') {
    // Real global maps: Earth from NASA Blue Marble and Black Marble, Moon and Mars from Solar System Scope (CC BY 4.0, built on NASA mission data).
    geo.dispose();
    const sphere = new THREE.SphereGeometry(1, 192, 128);
    const mat = new THREE.MeshStandardMaterial({ color: kind === 'earth' ? 0x1d5fa8 : m.color, roughness: kind === 'earth' ? 0.8 : 0.97, metalness: 0, transparent: true });
    if (kind === 'earth') {
      tex('earth-day.jpg', t => { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
      tex('earth-bump.jpg', t => { mat.bumpMap = t; mat.bumpScale = 1.6; mat.needsUpdate = true; }, false);
      tex('earth-rough.jpg', t => { mat.roughnessMap = t; mat.roughness = 1.25; mat.needsUpdate = true; }, false);
      tex('earth-night.jpg', t => { mat.emissiveMap = t; mat.emissive.set(0xffd9a0); mat.emissiveIntensity = 1.6; mat.needsUpdate = true; });
      nightSide(mat);
    } else {
      tex(`${kind}.jpg`, t => { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
      tex(`${kind}-bump.jpg`, t => { mat.bumpMap = t; mat.bumpScale = kind === 'moon' ? 2.2 : 1.8; mat.needsUpdate = true; }, false);
    }
    g.userData.surface = sphere; g.add(new THREE.Mesh(sphere, mat));
  } else {
    g.userData.surface = geo;
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false, transparent: true })));
  }

  if (kind === 'earth') {
    const cmat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, roughness: 1 });
    tex('earth-clouds.jpg', t => { cmat.alphaMap = t; cmat.opacity = 0.95; cmat.needsUpdate = true; }, false);
    const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.012, 128, 96), cmat);
    cloudMesh.userData.spin = 0.0004; cloudMesh.userData.baseOpacity = 0.95; cloudMesh.userData.layer = 'clouds'; g.add(cloudMesh);
    // exaggerated layer shells (illustrative scale)
    [[1.05, 0x7fc6ff, 0.07], [1.09, 0x9ad0ff, 0.045], [1.13, 0xb6c8ff, 0.03], [1.18, 0xc9b6ff, 0.022]].forEach(([r, col, op]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.BackSide, depthWrite: false }));
      s.userData.baseOpacity = op; s.userData.shell = true; g.add(s);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.003, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    ring.userData.baseOpacity = 0.35; ring.rotation.y = Math.PI / 2; ring.rotation.z = THREE.MathUtils.degToRad(8); g.add(ring);
    const sat = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.025), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0x553300, transparent: true }));
    sat.userData.orbit = { r: 1.32, tilt: THREE.MathUtils.degToRad(8) }; g.add(sat); g.userData.sat = sat;
  }
  if (kind !== 'asteroid') {
    if (kind === 'moon') return g; // the Moon has no real atmosphere, so no glow
    const atm = new THREE.Mesh(new THREE.SphereGeometry(kind === 'earth' ? 1.035 : 1.02, 96, 64), fresnelMaterial(kind === 'earth' ? 0x5fa8ff : 0xe8a070, kind === 'earth' ? 2.6 : 3.6, kind === 'earth' ? 1.1 : 0.45));
    trackSun(atm); atm.userData.layer = 'atm'; g.add(atm);
  }
  return g;
}

let cellTex = null;
function solarCells() {
  if (cellTex) return cellTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0b1a52'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const grd = g.createLinearGradient(x * 32, y * 32, x * 32 + 32, y * 32 + 32);
    grd.addColorStop(0, '#2a4fb8'); grd.addColorStop(1, '#14307e'); g.fillStyle = grd; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
  }
  g.strokeStyle = 'rgba(200,210,230,.55)'; g.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  cellTex = new THREE.CanvasTexture(c); cellTex.colorSpace = THREE.SRGBColorSpace; cellTex.wrapS = cellTex.wrapT = THREE.RepeatWrapping; cellTex.repeat.set(2, 1);
  return cellTex;
}
function dishGeo(r, depth) {
  const pts = []; for (let i = 0; i <= 16; i++) { const x = (i / 16) * r; pts.push(new THREE.Vector2(x, depth * (x / r) ** 2)); }
  return new THREE.LatheGeometry(pts, 48);
}
const PANEL = 0x3558c4;
function part(geo, color, name, idx, emissive = 0x000000) {
  const isPanel = color === PANEL, isFoil = color === 0xd4a94e;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: isPanel ? 0xffffff : color, map: isPanel ? solarCells() : null,
    metalness: isPanel ? 0.3 : isFoil ? 0.85 : 0.5, roughness: isPanel ? 0.35 : isFoil ? 0.32 : 0.45,
    emissive, transparent: true, side: THREE.DoubleSide }));
  m.userData = { type: 'part', index: idx, name }; return m;
}
export function buildSpacecraft(model, cfg) {
  const g = new THREE.Group(), parts = [];
  const gold = 0xd4a94e, panel = PANEL, white = 0xe8e8e8;
  const dish = (r, name, idx, x, y, z) => { const d = add(part(dishGeo(r, r * 0.35), white, name, idx), x, y, z); const f = part(new THREE.CylinderGeometry(0.012, 0.012, r * 0.6), 0x999999, name, idx); f.position.y = r * 0.3; d.add(f); return d; };
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); parts.push(m); return m; };
  const wingPair = (w, d, x, idx, name) => { add(part(new THREE.BoxGeometry(w, 0.04, d), panel, name, idx), x, 0, 0); add(part(new THREE.BoxGeometry(w, 0.04, d), panel, name, idx), -x, 0, 0); };
  if (model === 'apex') {
    add(part(new THREE.BoxGeometry(0.8, 0.9, 0.8), gold, 'Main bus', 0), 0, 0, 0);
    wingPair(1.2, 0.5, 1.05, 1, 'Solar arrays (2)');
    dish(0.42, 'High-gain antenna', 2, 0, 0.47, 0);
    add(part(new THREE.BoxGeometry(0.4, 0.2, 0.3), 0x8a8a8a, 'Instrument deck', 3), 0, -0.55, 0.15);
    add(part(new THREE.CylinderGeometry(0.02, 0.02, 0.9), 0xaaaaaa, 'Sampling arm', 4), 0.2, -0.75, -0.3).rotation.x = 0.6;
  } else if (model === 'lro') {
    add(part(new THREE.BoxGeometry(0.9, 1.2, 0.8), gold, 'Spacecraft bus', 0), 0, 0, 0);
    add(part(new THREE.BoxGeometry(0.04, 1.1, 1.6), panel, 'Solar array', 1), 0.9, 0.1, 0);
    add(part(new THREE.CylinderGeometry(0.02, 0.02, 0.5), 0x999999, 'High-gain antenna', 2), -0.3, 0.8, 0); dish(0.28, 'High-gain antenna', 2, -0.3, 1.05, 0);
    add(part(new THREE.BoxGeometry(0.7, 0.3, 0.6), 0x777777, 'Instrument module', 3), 0, -0.75, 0);
  } else if (model === 'aura') {
    add(part(new THREE.BoxGeometry(1.4, 0.6, 0.6), gold, 'Spacecraft bus', 0), 0, 0, 0);
    add(part(new THREE.CylinderGeometry(0.025, 0.025, 0.5), 0xaaaaaa, 'Solar array', 1), -0.95, 0.1, 0).rotation.z = Math.PI / 2;
    add(part(new THREE.BoxGeometry(1.5, 0.04, 0.7), panel, 'Solar array', 1), -1.95, 0.1, 0);
    add(part(new THREE.BoxGeometry(0.3, 0.25, 0.3), 0x999999, 'Nadir instrument (OMI-like)', 2), 0.2, -0.43, 0);
    add(part(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 24), white, 'Limb sounder (MLS-like)', 3), 0.75, 0.2, 0).rotation.z = Math.PI / 2;
  } else if (model === 'mro') {
    add(part(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 6), gold, 'HiRISE telescope', 2), 0, -0.2, 0);
    wingPair(1.3, 0.8, 1.15, 0, 'Solar arrays (2)');
    add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.35), 0x999999, 'High-gain antenna', 1), 0, 0.45, 0); dish(0.75, 'High-gain antenna', 1, 0, 0.62, 0);
    add(part(new THREE.BoxGeometry(0.15, 0.15, 0.15), 0x888888, 'Electra UHF', 3), 0.3, -0.75, 0.2);
  } else if (model === 'concept') {
    add(part(new THREE.BoxGeometry(0.9, 0.9, 0.9), 0xb0b6c4, 'Bus (conceptual)', 0), 0, 0, 0);
    const w = Math.min(Math.sqrt(cfg.area / 2) * 0.5, 2.2);
    wingPair(w, w * 0.6, 0.45 + w / 2, 1, 'Solar wings');
    dish(0.35, 'Antenna', 2, 0, 0.47, 0);
    cfg.instruments.forEach((n, i) => {
      const a = (i / Math.max(1, cfg.instruments.length)) * Math.PI * 2;
      add(part(new THREE.BoxGeometry(0.18, 0.18, 0.18), 0xff9a3c, n, 3 + i, 0x331400), Math.cos(a) * 0.3, -0.55, Math.sin(a) * 0.3);
    });
  }
  const box = new THREE.Box3().setFromObject(g), center = box.getCenter(new THREE.Vector3());
  g.children.forEach(c => c.position.sub(center));
  g.userData.radius = box.getSize(new THREE.Vector3()).length() / 2;
  return { group: g, parts };
}

function setOpacity(obj, k) {
  obj.traverse(o => {
    const mat = o.material; if (!mat) return;
    if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = k;
    else { if (o.userData.baseOpacity == null) o.userData.baseOpacity = mat.opacity ?? 1; mat.opacity = o.userData.baseOpacity * k; }
  });
  obj.visible = k > 0.01;
}
function dispose(obj) { obj.traverse(o => { o.geometry?.dispose(); if (o.material) { if (!o.material.map?.userData?.shared) o.material.map?.dispose(); o.material.dispose(); } }); }

export class Stage {
  constructor(container) {
    this.container = container;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.paused = this.reduced;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.D = 8; this.fov = 32;
    this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 200); this.camera.position.set(0, 0, this.D);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.1); this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xfff4e6, 3.2); key.position.set(5, 2.5, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb0ff, 0.3); rim.position.set(-4, 1, -3); this.scene.add(rim);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.dot = dotTexture();
    this.stars = this.makePoints(2200, 40, 90, 0xffffff, 0.16, 0.9); this.scene.add(this.stars);
    this.dust = this.makePoints(380, 3, 9, 0xffffff, 0.06, 0.7, true); this.scene.add(this.dust);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.glow);
    this.worldRoot = new THREE.Group(); this.scene.add(this.worldRoot);
    this.craftRoot = new THREE.Group(); this.scene.add(this.craftRoot);
    this.pivot = new THREE.Group(); this.worldRoot.add(this.pivot);
    this.markers = []; this.parts = [];
    this.spin = 0; this.focusQ = null; this.selected = -1; this.selectedPart = -1;
    this.wState = { x: 2, y: 0, s: 1, fade: 0 }; this.cState = { x: 0, y: 0, s: 1, fade: 0 };
    this.worldAnchor = null; this.craftAnchor = null; this.worldFade = 1; this.craftFade = 0; this.worldFill = 0.8;
    this.craftYaw = 0.7; this.craftPitch = 0.55;
    this.mouse = new THREE.Vector2(); this.par = new THREE.Vector2();
    window.addEventListener('pointermove', e => { this.mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); }, { passive: true });
    this.ray = new THREE.Raycaster();
    this.onResize = () => this.resize(); window.addEventListener('resize', this.onResize); this.resize();
    this.clock = new THREE.Clock(); this.first = true;
    this.renderer.setAnimationLoop(() => this.tick());
  }
  makePoints(n, rMin, rMax, color, size, opacity, dust = false) {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rMin + Math.random() * (rMax - rMin)); if (dust) v.z *= 0.5; p.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: this.dot, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  setMission(m) {
    dispose(this.pivot); this.worldRoot.remove(this.pivot);
    this.pivot = new THREE.Group(); this.worldRoot.add(this.pivot);
    this.world = buildWorld(m); this.pivot.add(this.world);
    const probe = new THREE.Mesh(this.world.userData.surface, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    probe.updateMatrixWorld(true);
    const rc = new THREE.Raycaster(), ws = this.world.scale.x;
    this.markers = m.targets.map((t, i) => {
      const dir = latLonToVec(t.lat, t.lon, 1);
      rc.set(dir.clone().multiplyScalar(4), dir.clone().negate());
      const hit = rc.intersectObject(probe)[0];
      const r = (hit ? hit.point.length() : 1) * ws * 1.02;
      const mk = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), new THREE.MeshBasicMaterial({ color: t.kind === 'fact' ? 0x7dffd0 : 0xffd77d, transparent: true }));
      mk.position.copy(dir.clone().multiplyScalar(r)); mk.userData = { type: 'target', index: i, dir: latLonToVec(t.lat, t.lon, 1) };
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.062, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      halo.lookAt(mk.position.clone().multiplyScalar(2)); mk.add(halo); mk.userData.halo = halo; halo.userData.baseOpacity = 0;
      const area = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      area.userData = { type: 'target', index: i, baseOpacity: 0 }; mk.add(area); mk.userData.hit = area; // larger, invisible click target
      this.pivot.add(mk); return mk;
    });
    const col = new THREE.Color(m.glow);
    this.glow.material.color.copy(col); this.dust.material.color.copy(col).lerp(new THREE.Color(0xffffff), 0.4);
    this.hemi.color.copy(col);
    this.focusQ = null; this.selected = -1; this.first = true;
  }
  setCraft(model, cfg) {
    dispose(this.craftRoot); this.scene.remove(this.craftRoot);
    this.craftRoot = new THREE.Group(); this.scene.add(this.craftRoot);
    const { group, parts } = buildSpacecraft(model, cfg);
    group.traverse(o => { if (o.material) { o.material.envMap = this.env; o.material.envMapIntensity = 0.9; } });
    this.craftInner = group; this.craftRoot.add(group); this.parts = parts; this.selectedPart = -1;
    setOpacity(this.craftRoot, this.cState.fade);
  }
  // Which on-screen element the world/craft should sit inside.
  setLayout({ worldAnchor, worldFill = 0.8, worldFade = 1, craftAnchor = null, craftFade = 0 }) {
    this.worldAnchor = worldAnchor; this.worldFill = worldFill; this.worldFade = worldFade;
    this.craftAnchor = craftAnchor; this.craftFade = craftFade;
  }
  focusTarget(i) {
    this.selected = i;
    if (i < 0 || !this.markers[i]) { this.focusQ = null; return; }
    const d = this.markers[i].userData.dir.clone().normalize();
    // yaw the target's longitude to face the camera, then pitch so it sits just above centre; north stays up
    const yaw = Math.atan2(-d.x, d.z), lat = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lat - 0.15)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    this.focusQ = q;
  }
  highlightPart(i) { this.selectedPart = i; }
  rotateCraft(dx, dy) { this.craftYaw += dx; this.craftPitch = THREE.MathUtils.clamp(this.craftPitch + dy, -1.2, 1.2); }
  pick(cx, cy) {
    const v = new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    if (this.cState.fade > 0.5) return this.ray.intersectObjects(this.parts, false)[0]?.object.userData || null;
    // markers behind the globe are hidden by its surface, so test the surface too
    const surface = this.world?.children[0];
    const hits = this.markers.map(m => m.userData.hit);
    const hit = this.ray.intersectObjects(surface ? [...hits, surface] : hits, false)[0];
    return hit && hit.object !== surface ? hit.object.userData : null;
  }
  rectToWorld(rect) {
    const visH = 2 * this.D * Math.tan(THREE.MathUtils.degToRad(this.fov / 2)), visW = visH * this.camera.aspect;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    return { x: (cx / innerWidth - 0.5) * visW, y: -(cy / innerHeight - 0.5) * visH, h: (Math.min(rect.height, rect.width * 1.1) / innerHeight) * visH };
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05), k = this.reduced || this.first ? 1 : 1 - Math.pow(0.002, dt);
    this.first = false;
    const lerp = (s, key, v) => { s[key] += (v - s[key]) * k; };
    // world placement
    let wFade = this.worldFade;
    const wr = this.worldAnchor?.getBoundingClientRect();
    if (!wr || wr.width < 1) wFade = 0; // anchor hidden (e.g. on small screens)
    else {
      const t = this.rectToWorld(wr);
      lerp(this.wState, 'x', t.x); lerp(this.wState, 'y', t.y); lerp(this.wState, 's', Math.max(0.05, t.h * this.worldFill / 2));
    }
    lerp(this.wState, 'fade', wFade);
    this.worldRoot.position.set(this.wState.x, this.wState.y, 0); this.worldRoot.scale.setScalar(this.wState.s);
    setOpacity(this.worldRoot, this.wState.fade);
    this.glow.position.set(this.wState.x, this.wState.y, -1); this.glow.scale.setScalar(this.wState.s * 5.2);
    this.glow.material.opacity = 0.85 * this.wState.fade;
    // craft placement
    if (this.craftAnchor) {
      const t = this.rectToWorld(this.craftAnchor.getBoundingClientRect());
      const r = this.craftInner?.userData.radius || 1;
      lerp(this.cState, 'x', t.x); lerp(this.cState, 'y', t.y); lerp(this.cState, 's', t.h * 0.5 / r);
    }
    lerp(this.cState, 'fade', this.craftFade);
    this.craftRoot.position.set(this.cState.x, this.cState.y, 0); this.craftRoot.scale.setScalar(this.cState.s);
    setOpacity(this.craftRoot, this.cState.fade);
    // motion
    const moving = !this.paused;
    if (moving) this.spin += dt * 0.06;
    if (this.craftInner) {
      if (moving && this.selectedPart < 0) this.craftYaw += dt * 0.12;
      this.craftInner.rotation.set(this.craftPitch, this.craftYaw, 0);
      this.parts.forEach(p => p.material.emissive?.setHex(p.userData.index === this.selectedPart ? 0x664400 : (p.userData.baseEm ??= p.material.emissive.getHex())));
    }
    const target = this.focusQ || new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22, this.spin, 0.08));
    this.pivot.quaternion.slerp(target, this.reduced ? 1 : 1 - Math.pow(0.02, dt));
    this.world?.children.forEach(c => { if (c.userData.spin && moving) c.rotation.y += c.userData.spin; });
    const sat = this.world?.userData.sat;
    if (sat && moving) { this.satT = (this.satT || 0) + dt * 0.5; const o = sat.userData.orbit; sat.position.set(0, Math.cos(this.satT) * o.r, Math.sin(this.satT) * o.r).applyAxisAngle(new THREE.Vector3(0, 0, 1), o.tilt); }
    const pulse = moving ? 0.5 + 0.5 * Math.sin(performance.now() / 400) : 1;
    this.markers.forEach((mk, i) => {
      const on = i === this.selected; mk.scale.setScalar(on ? 1.7 : 1);
      mk.userData.halo.material.opacity = on ? 0.4 + 0.6 * pulse : 0;
    });
    if (moving) { this.dust.rotation.y += dt * 0.02; this.dust.rotation.x += dt * 0.006; this.stars.rotation.y += dt * 0.003; }
    // subtle mouse parallax on the backdrop
    this.par.lerp(this.mouse, this.reduced ? 1 : 0.05);
    this.stars.position.set(-this.par.x * 1.2, this.par.y * 1.2, 0); this.dust.position.set(-this.par.x * 0.5, this.par.y * 0.5, 0);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.renderer.setAnimationLoop(null); window.removeEventListener('resize', this.onResize); dispose(this.scene); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
