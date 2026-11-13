// NEXUS//04 Part 1: Inside a Nebula. An observation-informed artistic visualization (Three.js).
// The cloud is built from layered billboards (gas: additive light; dust: occluding plum silhouettes),
// with local light sources, a protostar with disk and jets, and two separate remnant mini-scenes.
import * as THREE from '../vendor/three.module.min.js';

const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const C = hex => new THREE.Color(hex);
const PAL = { indigo: '#18264F', navy: '#263A70', violet: '#6259B8', orchid: '#9B78D1', rose: '#D96FA9', coral: '#F08A83', amber: '#F4B766', ivory: '#FFF0D0', turq: '#58C7D1' };

// ---------- story
const STEPS = [
  { id: 'approach', t: 'A nebula is a vast cloud of gas and dust.', p: 'Some are nurseries where new stars begin. Others hold material that older stars gave back to space. Drift closer.',
    cam: [0, 14, 430], look: [0, 0, 0], drift: [0, 0, -40] },
  { id: 'depth', t: 'The bright image is only one view through a much larger structure.', p: 'Dust blocks the stars behind it. Gas glows where hot young stars light it. Pick a marker, or choose a story.',
    cam: [70, 18, 175], look: [-10, 4, -20], drift: [-6, 0, -10], labels: ['gas', 'dust', 'cavity'], paths: true },
  { id: 'pn', t: 'Stars return gas and dust to space in different ways.', p: 'A Sun-like star near the end of its life puffs off its outer layers. They drift out as glowing shells around the small hot core left behind: a planetary nebula.',
    cam: [640, 132, -205], look: [600, 120, -300], drift: [4, 0, 4], labels: ['pnstar', 'pnshell'], path: 'a' },
  { id: 'snr', t: 'A massive star ends differently.', p: 'When it runs out of fuel, its core collapses and an explosion drives a fast, ragged shell of gas and dust outward: a supernova remnant. Its material can later join new clouds.',
    cam: [-560, -50, -110], look: [-650, -80, -260], drift: [-4, 0, 6], labels: ['snr'], path: 'a', time: true },
  { id: 'nursery', t: 'Gravity can pull a dense pocket of a cold cloud inward.', p: 'Not the whole cloud. Only the densest knots collapse, while the rest keeps drifting. The density view briefly marks the pocket that is falling in.',
    cam: [10, -4, 128], look: [-40, -20, 40], drift: [-3, 0, -6], labels: ['knot'], density: true, time: true },
  { id: 'protostar', t: 'A protostar is a star in the making.', p: 'A warm core glows inside its dusty cocoon. A spinning disk feeds it, and two narrow jets shoot out along its poles. In nature this takes a million years or more.',
    cam: [-22, -12, 66], look: [-40, -20, 40], drift: [-2, 1, -2], labels: ['proto', 'disk', 'jets'], proto: true, time: true },
  { id: 'handoff', t: 'Next: how a star changes through its life.', p: 'The protostar is still wrapped in the cloud that made it. Part 2 picks up its story from here.',
    cam: [90, 40, 300], look: [-30, -5, 0], drift: [0, 0, 10], labels: ['proto'], end: true },
];
const INFO = {
  gas: ['Glowing gas', 'Mostly hydrogen. It glows where ultraviolet light from nearby hot stars energizes it, so bright regions sit next to their light sources.'],
  dust: ['Dust ridge', 'Tiny grains of carbon and silicates. Dust absorbs and scatters starlight, so dense ridges hide the stars behind them. Infrared light passes through more easily.'],
  cavity: ['Lit cavity', 'Young massive stars blow out a hollow with their light and winds. Its walls glow where that light hits them.'],
  pnstar: ['Small hot core', 'What remains after a Sun-like star sheds its outer layers. Its light makes the shells glow.'],
  pnshell: ['Glowing shells', 'Layers released at different times, so they sit at different distances. Uneven shapes are normal.'],
  snr: ['Supernova shell', 'An irregular shock front with knots and filaments, still expanding outward from the explosion site.'],
  knot: ['Collapsing pocket', 'A dense, cold knot. Its own gravity wins over the gas pressure, so it begins to fall inward.'],
  proto: ['Protostar', 'A star in the making. It shines from the heat of infalling material, not yet from steady fusion like the Sun.'],
  disk: ['Disk', 'Material that falls in keeps spinning, so it flattens into a disk that feeds the young star.'],
  jets: ['Jets', 'Narrow streams launched along the poles. They carry spin away and carve the cloud around them.'],
};

// ---------- WebGL check
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); } catch { renderer = null; }
if (!renderer) {
  document.body.classList.add('nb-no3d');
  $('#nb-panel').insertAdjacentHTML('beforeend', '<p class="nb-muted">3D is not available on this device. The story text still works: use Next to read each scene.</p>');
}

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 6000);
let DPR = Math.min(devicePixelRatio, small ? 1 : 1.25);
if (renderer) {
  renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  $('#nb-sky').appendChild(renderer.domElement);
}
// tileable fbm noise baked once into a texture, so cloud sprites sample it instead of computing noise per pixel
const noiseTex = (() => {
  const N = 256, data = new Uint8Array(N * N * 4), lat = (g, seedN) => { const a = new Float32Array(g * g); let x = seedN; for (let i = 0; i < a.length; i++) { x = (x * 16807) % 2147483647; a[i] = x / 2147483647; } return a; };
  const octs = [4, 8, 16, 32, 64].map((g, i) => ({ g, a: lat(g, 97 + i * 13), w: 0.5 ** (i + 1) })), octs2 = [6, 12, 24, 48].map((g, i) => ({ g, a: lat(g, 311 + i * 7), w: 0.5 ** (i + 1) }));
  const sample = (o, u, v) => { const x = u * o.g, y = v * o.g, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = o.g, at = (i, j) => o.a[((j % g + g) % g) * g + ((i % g + g) % g)]; return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; let a = 0, b = 0; for (const o of octs) a += sample(o, u, v) * o.w; for (const o of octs2) b += sample(o, u, v) * o.w; const i = (y * N + x) * 4; data[i] = Math.min(255, a * 255 * 1.03); data[i + 1] = Math.min(255, b * 255 * 1.07); data[i + 2] = 0; data[i + 3] = 255; }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
})();
const U = { uTime: { value: 0 }, uIR: { value: 0 }, uDens: { value: 0 }, uNoise: { value: noiseTex } };

// background: coloured depth, never black
scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { uIR: U.uIR },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uIR; varying vec3 vP;
    void main(){ float y = vP.y*0.5+0.5; float band = exp(-pow(dot(vP, normalize(vec3(0.3,0.25,-1.0)))-0.6,2.0)*3.0);
      vec3 a = vec3(0.055,0.08,0.18), b = vec3(0.10,0.13,0.27), plum = vec3(0.16,0.08,0.2);
      vec3 c = mix(a, b, y) + plum*band*0.6; c = mix(c, c*vec3(1.25,0.85,0.75), uIR*0.6);
      gl_FragColor = vec4(c, 1.0); }`,
})));

// ---------- seeded random
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + (b - a) * rnd();

// ---------- stars at several depths
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
function stars(n, rMin, rMax, size, op) {
  const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(rr(rMin, rMax)); p.set([v.x, v.y, v.z], i * 3); const w = rnd(); const col = w < 0.15 ? [1, 0.85, 0.7] : w < 0.35 ? [0.8, 0.88, 1] : [1, 1, 1]; c.set(col, i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, opacity: op, sizeAttenuation: true, depthWrite: false }));
  scene.add(pts); return pts;
}
stars(small ? 1600 : 3200, 1200, 2600, 3.2, 0.85);
stars(small ? 500 : 900, 500, 1100, 2.2, 0.8);
const near = stars(120, 320, 600, 2.4, 0.95); // a few nearby stars for parallax

// ---------- billboard cloud material (one draw call per layer)
const NOISE = `
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }`;
function cloudLayer(items, { dust = false } = {}) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
  const n = items.length, off = new Float32Array(n * 3), col = new Float32Array(n * 3), sc = new Float32Array(n), sd = new Float32Array(n), al = new Float32Array(n), dn = new Float32Array(n), rim = new Float32Array(n * 3);
  items.forEach((it, i) => { off.set(it.p, i * 3); col.set(it.c, i * 3); sc[i] = it.s; sd[i] = it.seed ?? rnd(); al[i] = it.a; dn[i] = it.d || 0; rim.set(it.rim || [0, 0, 0], i * 3); });
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 3));
  g.setAttribute('aScale', new THREE.InstancedBufferAttribute(sc, 1)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 1));
  g.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(al, 1)); g.setAttribute('aDens', new THREE.InstancedBufferAttribute(dn, 1));
  g.setAttribute('aRim', new THREE.InstancedBufferAttribute(rim, 3));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    blending: dust ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aOff; attribute vec3 aCol; attribute float aScale; attribute float aSeed; attribute float aAlpha; attribute float aDens; attribute vec3 aRim;
      uniform float uTime; varying vec2 vUv; varying vec3 vCol; varying float vSeed; varying float vA; varying float vDens; varying vec3 vRim;
      void main(){ vec3 o = aOff + vec3(sin(uTime*0.05+aSeed*40.0), cos(uTime*0.04+aSeed*31.0), sin(uTime*0.03+aSeed*17.0))*aScale*0.04;
        vec4 mv = modelViewMatrix*vec4(o,1.0); float ang = aSeed*6.283 + uTime*0.01*(aSeed-0.5);
        vec2 q = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*position.xy; mv.xy += q*aScale;
        float d = -mv.z; vA = aAlpha*smoothstep(aScale*0.15, aScale*0.9, d)*(1.0 - smoothstep(2200.0, 3000.0, d));
        vUv = uv; vCol = aCol; vSeed = aSeed; vDens = aDens; vRim = aRim; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform float uIR; uniform float uDens; uniform sampler2D uNoise; varying vec2 vUv; varying vec3 vCol; varying float vSeed; varying float vA; varying float vDens; varying vec3 vRim;
      void main(){ vec2 p = vUv-0.5; float r = length(p)*2.0; if (r > 1.0 || vA < 0.003) discard;
        float n = texture2D(uNoise, vUv*0.55 + vec2(vSeed*3.1, vSeed*7.7) + vec2(uTime*0.004, -uTime*0.003)).r;
        float w = texture2D(uNoise, vUv*1.3 - vec2(vSeed*5.3, vSeed*2.9) + n*0.35).g;
        float shape = smoothstep(1.0, 0.15, r + (n-0.5)*0.55);
        ${dust ? `
        float a = shape*smoothstep(0.32, 0.62, n*0.75 + w*0.45)*vA;
        a *= (1.0 - 0.78*uIR);
        float edge = smoothstep(0.25, 0.0, a) * shape;
        vec3 c = vCol*(0.55 + 0.6*w) + vRim*edge*1.6;
        gl_FragColor = vec4(c, clamp(a*0.95, 0.0, 0.82));`
        : `
        float a = shape*(0.35 + 0.95*n*w)*vA;
        vec3 c = vCol*(0.65 + 0.7*w);
        vec3 ir = vec3(c.r*1.25 + c.b*0.35, c.g*0.85 + 0.05, c.b*0.45);
        c = mix(c, ir, uIR*0.85);
        vec3 heat = mix(vec3(0.25,0.55,0.75), vec3(1.0,0.95,0.85), vDens);
        c = mix(c, heat*(0.4+vDens*1.4), uDens*smoothstep(0.05, 0.6, vDens + 0.15));
        gl_FragColor = vec4(c*a, a);`}
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; scene.add(mesh); return mesh;
}

// ---------- the cloud: ridges, pillars, a lit cavity, a dense nursery knot
const LIGHTS = [ // local light sources: colour and reach
  { p: new THREE.Vector3(0, 0, -60), c: C(PAL.amber), r: 160 },     // cavity cluster
  { p: new THREE.Vector3(-110, 50, -140), c: C(PAL.rose), r: 170 },
  { p: new THREE.Vector3(120, -30, -90), c: C(PAL.coral), r: 140 },
];
const KNOT = new THREE.Vector3(-40, -20, 40);
function lit(p, baseHex) {
  const c = C(baseHex); let w = 0;
  for (const L of LIGHTS) { const k = Math.max(0, 1 - p.distanceTo(L.p) / L.r); if (k > 0) { c.lerp(L.c, k * 0.8); w += k; } }
  return [c, Math.min(1, w)];
}
const gas = [], dust = [], gasFront = [];
const SCALE = small ? 0.5 : 0.8;
// broad ridges as curves through the volume
const ridges = [
  [[-260, 60, -220], [-150, 20, -120], [-60, -10, -40], [40, 10, 10], [180, 40, -60], [280, 90, -200]],
  [[-220, -90, -60], [-120, -60, 20], [-30, -40, 70], [70, -60, 40], [200, -90, -40]],
  [[-80, 140, -260], [0, 90, -180], [90, 60, -140], [200, 110, -240]],
  [[-300, 10, 60], [-200, 30, 120], [-90, 60, 130], [10, 40, 90]],
].map(pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))));
ridges.forEach((cv, ri) => {
  const N = Math.round((ri < 2 ? 130 : 80) * SCALE);
  for (let i = 0; i < N; i++) {
    const p = cv.getPoint(rnd()).add(new THREE.Vector3(rr(-45, 45), rr(-30, 30), rr(-45, 45)));
    const base = [PAL.violet, PAL.orchid, PAL.navy, PAL.violet][(i + ri) % 4];
    const [c, w] = lit(p, base);
    if (rnd() < 0.18 + w * 0.3) c.lerp(C(rnd() < 0.5 ? PAL.rose : PAL.coral), 0.35);
    gas.push({ p: p.toArray(), c: c.toArray().map(v => v * (0.85 + w * 0.8)), s: rr(55, 140), a: rr(0.26, 0.46) * (0.75 + w * 0.7) });
  }
});
// broad, faint envelope so the cloud reads as one volume
for (let i = 0; i < 70 * SCALE; i++) { const p = new THREE.Vector3(rr(-320, 320), rr(-160, 180), rr(-320, 120)); const [c] = lit(p, rnd() < 0.6 ? PAL.navy : PAL.violet); gas.push({ p: p.toArray(), c: c.toArray().map(v => v * 0.7), s: rr(170, 280), a: rr(0.12, 0.2) }); }
// cavity walls: a bright shell around the cluster, open toward the viewer
for (let i = 0; i < 90 * SCALE; i++) {
  const d = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 0.25)).normalize(); const p = LIGHTS[0].p.clone().addScaledVector(d, rr(55, 80));
  const c = C(PAL.amber).lerp(C(rnd() < 0.5 ? PAL.coral : PAL.rose), rr(0.2, 0.7));
  gas.push({ p: p.toArray(), c: c.toArray().map(v => v * 0.9), s: rr(30, 70), a: rr(0.25, 0.42) });
}
// nursery: turbulent wisps around a dense knot (density attribute drives the density view)
for (let i = 0; i < 110 * SCALE; i++) {
  const r = Math.pow(rnd(), 1.6) * 60, d = new THREE.Vector3(rr(-1, 1), rr(-0.6, 0.6), rr(-1, 1)).normalize();
  const p = KNOT.clone().addScaledVector(d, r);
  const [c] = lit(p, rnd() < 0.5 ? PAL.orchid : PAL.violet);
  gasFront.push({ p: p.toArray(), c: c.toArray().map(v => v * 0.85), s: rr(18, 50), a: rr(0.24, 0.42), d: Math.max(0, 1 - r / 30) });
}
// dust: ridges and pillars in front of the light, with lit rims
const DUST = C('#4a3878'), DUST2 = C('#5b3d88');
const pillar = (base, h, w) => { for (let y = 0; y < h; y += 7) { const p = base.clone().add(new THREE.Vector3(rr(-w, w) * (1 - y / h * 0.5), y, rr(-w, w) * 0.6)); const [, k] = lit(p, PAL.violet); dust.push({ p: p.toArray(), c: (rnd() < 0.5 ? DUST : DUST2).toArray(), s: rr(18, 34) * (1 - y / h * 0.4), a: rr(0.55, 0.85), rim: C(PAL.coral).lerp(C(PAL.amber), 0.4).multiplyScalar(0.25 + k).toArray() }); } };
pillar(new THREE.Vector3(30, -70, 20), 120, 16); pillar(new THREE.Vector3(70, -80, -10), 90, 12); pillar(new THREE.Vector3(-90, -90, -20), 140, 20);
// foreground veil and a dark ridge across the cavity
for (let i = 0; i < 70 * SCALE; i++) { const p = new THREE.Vector3(rr(-140, 180), rr(-50, 60), rr(140, 230)); dust.push({ p: p.toArray(), c: DUST2.toArray(), s: rr(30, 70), a: rr(0.12, 0.28), rim: C(PAL.orchid).multiplyScalar(0.25).toArray() }); }
for (let i = 0; i < 60 * SCALE; i++) { const t = rnd(); const p = new THREE.Vector3(-120 + t * 220, 20 + Math.sin(t * 5) * 18 + rr(-8, 8), -10 + rr(-12, 12)); const [, k] = lit(p, PAL.violet); dust.push({ p: p.toArray(), c: DUST.toArray(), s: rr(22, 46), a: rr(0.5, 0.8), rim: C(PAL.amber).multiplyScalar(0.2 + k * 0.9).toArray() }); }
// cocoon around the protostar
for (let i = 0; i < 40 * SCALE; i++) { const d = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(); const p = KNOT.clone().addScaledVector(d, rr(6, 16)); dust.push({ p: p.toArray(), c: DUST2.toArray(), s: rr(6, 12), a: rr(0.18, 0.32), rim: C(PAL.amber).multiplyScalar(0.8).toArray() }); }
const gasMesh = cloudLayer(gas), dustMesh = cloudLayer(dust, { dust: true });
gasMesh.renderOrder = 1; dustMesh.renderOrder = 2;
cloudLayer(gasFront).renderOrder = 3; // the nursery sits in front of the far dust, so draw it after

// glow sprites (cluster stars, light sources)
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,250,235,.85)'); gr.addColorStop(0.35, 'rgba(255,220,170,.22)'); gr.addColorStop(1, 'rgba(255,200,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const glow = (p, s, hex, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C(hex), blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false })); sp.position.copy(p); sp.scale.setScalar(s); sp.renderOrder = 3; scene.add(sp); return sp; };
for (let i = 0; i < 7; i++) glow(LIGHTS[0].p.clone().add(new THREE.Vector3(rr(-14, 14), rr(-10, 10), rr(-14, 14))), rr(8, 16), i % 3 ? '#dfe8ff' : PAL.ivory);
glow(LIGHTS[1].p, 14, '#ffd9ef'); glow(LIGHTS[2].p, 12, '#ffe2cf');
glow(LIGHTS[0].p, 150, PAL.amber, 0.22); glow(LIGHTS[1].p, 130, PAL.rose, 0.2); glow(LIGHTS[2].p, 110, PAL.coral, 0.16);
// embedded stars only infrared reveals
const irStars = stars(60, 1, 1, 3, 0); { const pos = irStars.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setXYZ(i, rr(-200, 200), rr(-80, 90), rr(-200, 80)); pos.needsUpdate = true; irStars.material.size = 3.6; }

// ---------- protostar: core, disk, jets
const proto = new THREE.Group(); proto.position.copy(KNOT); scene.add(proto);
const core = glow(new THREE.Vector3(), 9, PAL.ivory, 0); core.renderOrder = 5; proto.add(core);
const coreHalo = glow(new THREE.Vector3(), 26, PAL.amber, 0); proto.add(coreHalo);
const disk = new THREE.Mesh(new THREE.RingGeometry(1.2, 9, 96, 1), new THREE.ShaderMaterial({
  uniforms: { uTime: U.uTime, uOn: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uTime; uniform float uOn; varying vec2 vP; ${NOISE}
    void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float sp = fbm(vec2(a*2.0 + r*0.9 - uTime*0.6, r*0.6));
      float fall = smoothstep(9.0, 3.0, r)*smoothstep(1.0, 2.2, r); vec3 c = mix(vec3(1.0,0.72,0.42), vec3(1.0,0.94,0.82), smoothstep(6.0, 1.5, r));
      gl_FragColor = vec4(c*fall*(0.35+0.9*sp)*uOn, 1.0); }`,
}));
disk.rotation.set(-Math.PI / 2 + 0.35, 0, 0.3); proto.add(disk);
const jetMat = new THREE.ShaderMaterial({
  uniforms: { uTime: U.uTime, uOn: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uTime; uniform float uOn; varying vec2 vUv; ${NOISE}
    void main(){ float along = vUv.y; float knots = 0.6 + 0.6*n2(vec2(along*14.0 - uTime*1.6, vUv.x*3.0));
      float a = smoothstep(1.0, 0.75, along)*smoothstep(0.0, 0.06, along)*knots; gl_FragColor = vec4(vec3(0.35,0.78,0.82)*a*uOn*0.45, 1.0); }`,
});
const jets = new THREE.Group(); proto.add(jets); jets.rotation.copy(disk.rotation);
for (const s of [1, -1]) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.5, 26, 16, 1, true), jetMat); j.position.z = s * 14; j.rotation.x = s > 0 ? Math.PI / 2 : -Math.PI / 2; jets.add(j); }
// infall motes toward the knot during the nursery scene
const motes = (() => { const n = small ? 160 : 320, p = new Float32Array(n * 3), seedArr = []; for (let i = 0; i < n; i++) { const d = new THREE.Vector3(rr(-1, 1), rr(-0.5, 0.5), rr(-1, 1)).normalize(); seedArr.push({ d, r: rr(10, 46), v: rr(0.6, 1.6) }); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: C(PAL.orchid), map: dotTex, size: 0.45, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.userData.s = seedArr; m.position.copy(KNOT); scene.add(m); return m; })();

// ---------- remnant mini-scenes, placed apart from the nursery
const PN = new THREE.Vector3(600, 120, -300), SNR = new THREE.Vector3(-650, -80, -260);
const pn = new THREE.Group(); pn.position.copy(PN); scene.add(pn);
pn.add(glow(new THREE.Vector3(), 7, '#eaf6ff')); pn.add(glow(new THREE.Vector3(), 20, PAL.turq, 0.35));
const shellMat = (hex, op) => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: C(hex) }, uOp: { value: op } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uCol; uniform float uOp; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.4); gl_FragColor = vec4(uCol*(0.12 + f)*uOp, 1.0); }',
});
[[14, PAL.turq, 0.55], [22, PAL.amber, 0.5], [31, PAL.coral, 0.4], [42, PAL.rose, 0.28]].forEach(([r, hex, op], i) => {
  const geo = new THREE.IcosahedronGeometry(r, 5), pos = geo.attributes.position, v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k); const n = Math.sin(v.x * 0.21 + i) * Math.cos(v.y * 0.17) * 0.12 + Math.sin(v.z * 0.13 + i * 2) * 0.08; v.multiplyScalar(1 + n + (i % 2 ? 0.18 : 0) * Math.abs(v.y) / r); pos.setXYZ(k, v.x, v.y, v.z); }
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, shellMat(hex, op)); m.rotation.set(rr(0, 3), rr(0, 3), 0); m.userData.spin = rr(-0.02, 0.02); pn.add(m);
});
const snr = new THREE.Group(); snr.position.copy(SNR); scene.add(snr);
{ const n = small ? 5000 : 11000, p = new Float32Array(n * 3), c = new Float32Array(n * 3), cols = [C(PAL.coral), C(PAL.turq), C(PAL.amber), C(PAL.rose)];
  const strands = Array.from({ length: 90 }, () => ({ a: new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(), b: new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(), c: cols[Math.floor(rnd() * 4)] }));
  for (let i = 0; i < n; i++) { const s = strands[i % strands.length], t = rnd(); const d = s.a.clone().lerp(s.b, t * 0.35).normalize(); const R = 60 * (1 + 0.18 * Math.sin(d.x * 7 + d.y * 5) + rr(-0.06, 0.06));
    d.multiplyScalar(R).add(new THREE.Vector3(rr(-1.5, 1.5), rr(-1.5, 1.5), rr(-1.5, 1.5))); p.set([d.x, d.y, d.z], i * 3); const k = rr(0.5, 1); c.set([s.c.r * k, s.c.g * k, s.c.b * k], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  snr.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, map: dotTex, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
  snr.add(glow(new THREE.Vector3(), 5, '#cfe8ff')); snr.add(glow(new THREE.Vector3(), 90, PAL.coral, 0.12)); }

// dust motes riding with the camera for scale
const motesNear = (() => { const n = 70, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([rr(-30, 30), rr(-20, 20), rr(-60, -8)], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb9b3e6, map: dotTex, size: 0.1, transparent: true, opacity: 0.5, depthWrite: false })); cam.add(m); scene.add(cam); return m; })();

// ---------- labels anchored to features
const ANCH = { gas: new THREE.Vector3(-110, 50, -140), dust: new THREE.Vector3(30, -10, 20), cavity: LIGHTS[0].p, pnstar: PN, pnshell: PN.clone().add(new THREE.Vector3(26, 22, 6)), snr: SNR.clone().add(new THREE.Vector3(40, 38, 20)), knot: KNOT, proto: KNOT, disk: KNOT.clone().add(new THREE.Vector3(-8, 0, 1)), jets: KNOT.clone().add(new THREE.Vector3(-4, 16, 6)) };
const labelBox = $('#nb-labels'), labelEls = {};
for (const k of Object.keys(ANCH)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'nb-lbl'; b.dataset.k = k; b.innerHTML = `<i></i><span>${esc(INFO[k][0])}</span>`; b.hidden = true; b.onclick = () => showInfo(k, b); labelBox.appendChild(b); labelEls[k] = b; }
function showInfo(k, from) {
  const box = $('#nb-info'); box.innerHTML = `<h2>${esc(INFO[k][0])}</h2><p>${esc(INFO[k][1])}</p><button type="button">Close</button>`; box.hidden = false;
  const close = () => { box.hidden = true; from?.focus(); }; box.querySelector('button').onclick = close; box.onkeydown = e => { if (e.key === 'Escape') close(); }; box.querySelector('button').focus();
  hold = 12;
}

// ---------- state, camera and controls
let step = 0, paused = reduced, free = false, ir = false, hold = 0, stepT = 0, t = 0, densT = 0, protoOn = 0;
const camPos = new THREE.Vector3(...STEPS[0].cam), camLook = new THREE.Vector3(...STEPS[0].look);
const goal = { pos: camPos.clone(), look: camLook.clone() };
let yaw = 0, pitch = 0, fwd = 0;
const v = new THREE.Vector3();
function go(i, instant) {
  step = Math.max(0, Math.min(STEPS.length - 1, i)); stepT = 0; const s = STEPS[step];
  goal.pos.set(...s.cam); goal.look.set(...s.look);
  if (instant || reduced) { camPos.copy(goal.pos); camLook.copy(goal.look); document.body.classList.remove('nb-fade'); void document.body.offsetWidth; document.body.classList.add('nb-fade'); }
  $('#nb-step').textContent = `${String(step + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`;
  $('#nb-title').textContent = s.t; $('#nb-text').textContent = s.p;
  $('#nb-paths').hidden = !s.paths; $('#nb-badge').hidden = !s.time;
  $('#nb-back').disabled = step === 0;
  $('#nb-next').textContent = s.end ? 'Back to NEXUS//04' : s.id === 'snr' ? 'Back to the nursery →' : 'Next →';
  $$dots();
  Object.entries(labelEls).forEach(([k, el]) => { el.hidden = !(s.labels || []).includes(k); });
  $('#nb-info').hidden = true; densT = s.density ? 0.001 : 0;
  if (s.end) $('#nb-text').insertAdjacentHTML('beforeend', ' <a href="#nb-sources" class="nb-inl">Sources</a>');
}
function $$dots() { $('#nb-dots').innerHTML = STEPS.map((x, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join(''); }
function next() {
  const s = STEPS[step];
  if (s.end) { location.href = 'index.html'; return; }
  go(s.paths ? step + 1 : step + 1);
}
$('#nb-next').onclick = () => { hold = 0; next(); };
$('#nb-back').onclick = () => { hold = 0; const s = STEPS[step]; go(s.id === 'nursery' ? 1 : step - 1); };
document.querySelectorAll('[data-path]').forEach(b => b.onclick = () => { hold = 0; go(b.dataset.path === 'a' ? 2 : 4); });
$('#nb-pause').onclick = e => { paused = !paused; e.currentTarget.setAttribute('aria-pressed', String(paused)); e.currentTarget.textContent = paused ? 'Resume' : 'Pause'; };
if (reduced) { $('#nb-pause').setAttribute('aria-pressed', 'true'); $('#nb-pause').textContent = 'Resume'; }
$('#nb-layer').onclick = e => { ir = !ir; e.currentTarget.setAttribute('aria-pressed', String(ir)); e.currentTarget.textContent = ir ? 'Visible view' : 'Infrared view'; toast(ir ? 'Infrared-inspired view: dust turns see-through and hidden young stars appear. A representation of different data.' : 'Visible-light-inspired view: dust blocks what lies behind it.'); };
const setFree = on => { free = on; $('#nb-mode').setAttribute('aria-pressed', String(on)); $('#nb-return').hidden = !on; if (!on) { yaw = 0; pitch = 0; fwd = 0; } };
$('#nb-mode').onclick = () => setFree(!free);
$('#nb-return').onclick = () => setFree(false);
$('#nb-srclink').onclick = e => { e.preventDefault(); $('#nb-sources').hidden = false; $('#nb-srcclose').focus(); };
document.addEventListener('click', e => { if (e.target.closest('.nb-inl')) { e.preventDefault(); $('#nb-sources').hidden = false; $('#nb-srcclose').focus(); } });
$('#nb-srcclose').onclick = () => { $('#nb-sources').hidden = true; };
// drag / touch / keys to look
let drag = null;
const canvas = renderer?.domElement;
canvas?.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas?.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY }; if (!free && Math.abs(dx) + Math.abs(dy) > 2) setFree(true); yaw -= dx * 0.004; pitch = Math.max(-1.1, Math.min(1.1, pitch - dy * 0.004)); hold = 10; });
canvas?.addEventListener('pointerup', () => { drag = null; });
canvas?.addEventListener('wheel', e => { e.preventDefault(); if (!free) setFree(true); fwd = Math.max(-60, Math.min(80, fwd - e.deltaY * 0.05)); hold = 10; }, { passive: false });
addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea')) return;
  const k = { ArrowLeft: [0.08, 0], ArrowRight: [-0.08, 0], ArrowUp: [0, 0.06], ArrowDown: [0, -0.06] }[e.key];
  if (k) { e.preventDefault(); if (!free) setFree(true); yaw += k[0]; pitch = Math.max(-1.1, Math.min(1.1, pitch + k[1])); hold = 10; }
  else if (e.key === 'w' || e.key === 'W') { if (!free) setFree(true); fwd = Math.min(80, fwd + 6); }
  else if (e.key === 's' || e.key === 'S') { if (!free) setFree(true); fwd = Math.max(-60, fwd - 6); }
  else if (e.key === 'n' || e.key === 'N' || e.key === 'PageDown') { hold = 0; next(); }
  else if (e.key === 'b' || e.key === 'B' || e.key === 'PageUp') $('#nb-back').click();
  else if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); $('#nb-pause').click(); }
  else if (e.key === 'Escape') { $('#nb-sources').hidden = true; if (free) setFree(false); }
});
// sound: designed atmosphere, off until asked
let music = null;
$('#nb-sound').onclick = async e => { const b = e.currentTarget; if (!music) { const { Music } = await import('./music.js'); music = new Music(); } const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); if (on) { music.start(); music.setVolume(0.4); music.setMood('calm'); toast('Designed atmosphere. Space itself is silent.'); } else music.stop(); };
let toastT = 0; function toast(msg) { let el = $('#nb-toast'); if (!el) { el = document.createElement('p'); el.id = 'nb-toast'; el.className = 'nb-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 4200); }

// on tall, narrow screens the text panel covers the lower half, so shift the picture up
const frameView = () => { cam.aspect = innerWidth / innerHeight; if (innerWidth < 720) cam.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.2, innerWidth, innerHeight); else cam.clearViewOffset(); cam.updateProjectionMatrix(); };
frameView();
addEventListener('resize', () => { if (!renderer) return; renderer.setSize(innerWidth, innerHeight); frameView(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta(); });

// ---------- loop
const clock = new THREE.Clock(); let ft = 0, fn = 0;
const AUTO = [14, 0, 16, 16, 15, 17, 0]; // seconds per scene in guided mode (0 = wait for the visitor)
function frame() {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  ft += raw; fn++; if (fn >= 90) { if (ft / fn > 0.034 && DPR > 0.75) { DPR -= 0.25; renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight); } ft = 0; fn = 0; }
  if (!paused) { t += dt; stepT += dt; }
  U.uTime.value = t;
  hold = Math.max(0, hold - dt);
  const s = STEPS[step];
  if (!paused && !free && hold === 0 && AUTO[step] && stepT > AUTO[step]) next();
  // camera: ease toward the scene's pose, with a slow drift while the scene plays
  const driftK = paused ? 0 : Math.min(1, stepT / 30);
  v.set(...s.drift).multiplyScalar(driftK);
  const k = reduced ? 1 : 1 - Math.exp(-dt * 0.75);
  camPos.lerp(v.clone().add(goal.pos), k); camLook.lerp(goal.look, k);
  const dir = camLook.clone().sub(camPos).normalize();
  if (free) { dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(); dir.applyAxisAngle(side, pitch); }
  cam.position.copy(camPos).addScaledVector(dir, free ? fwd : 0); cam.lookAt(cam.position.clone().add(dir));
  // scene states
  U.uIR.value += ((ir ? 1 : 0) - U.uIR.value) * Math.min(1, dt * 2);
  irStars.material.opacity = U.uIR.value * 0.95;
  if (s.density && densT > 0) { densT += reduced ? Math.max(dt, raw) : dt; } const dv = densT > 0 ? Math.min(1, densT / 1.5) * (1 - Math.min(1, Math.max(0, densT - 6) / 2.5)) : 0;
  U.uDens.value += (dv - U.uDens.value) * Math.min(1, dt * 3);
  const wantProto = s.proto || s.end ? 1 : s.id === 'nursery' ? 0.15 : 0;
  protoOn = reduced ? wantProto : protoOn + (wantProto - protoOn) * Math.min(1, dt * (s.proto ? 0.35 : 1.5)); // brightness rises gradually
  core.material.opacity = protoOn; coreHalo.material.opacity = protoOn * 0.32; core.scale.setScalar(6 + protoOn * 4 + Math.sin(t * 2) * 0.3 * protoOn);
  disk.material.uniforms.uOn.value = Math.max(0, protoOn - 0.2) * 1.25; jetMat.uniforms.uOn.value = Math.max(0, protoOn - 0.45) * 1.4;
  disk.rotation.z += dt * 0.25;
  // infall motes in the nursery
  const mo = motes.geometry.attributes.position, showMotes = s.density || s.proto;
  motes.material.opacity += ((showMotes ? 0.65 : 0) - motes.material.opacity) * Math.min(1, dt * 2);
  if (motes.material.opacity > 0.01) motes.userData.s.forEach((m, i) => { m.r -= dt * m.v * (paused ? 0 : 1); if (m.r < 2) m.r = rr(30, 46); const sw = t * 0.3 * (40 / m.r); mo.setXYZ(i, (m.d.x * Math.cos(sw) - m.d.z * Math.sin(sw)) * m.r, m.d.y * m.r * 0.5, (m.d.x * Math.sin(sw) + m.d.z * Math.cos(sw)) * m.r); });
  mo.needsUpdate = true;
  pn.children.forEach(c => { if (c.userData.spin) { c.rotation.y += c.userData.spin * dt * 3; c.rotation.x += c.userData.spin * dt; } });
  const snrGrow = s.id === 'snr' ? 0.75 + 0.25 * (1 - Math.exp(-stepT / 5)) : 1;
  snr.scale.setScalar(snrGrow); snr.rotation.y += dt * 0.01;
  near.rotation.y += dt * 0.002;
  renderer.render(scene, cam);
  // labels
  const W = innerWidth, H = innerHeight;
  for (const [key, el] of Object.entries(labelEls)) { if (el.hidden) continue; v.copy(ANCH[key]).project(cam); const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; el.style.opacity = vis ? 1 : 0; el.style.pointerEvents = vis ? 'auto' : 'none'; const px = (v.x * 0.5 + 0.5) * W; el.classList.toggle('nb-lbl--l', px > W - 150); el.style.transform = `translate(${px}px, ${(-v.y * 0.5 + 0.5) * H}px)`; }
}
go(0, true);
if (renderer) renderer.setAnimationLoop(frame);
import('./status.js').then(async ({ mountStatus }) => { mountStatus({}); }).catch(() => {});
