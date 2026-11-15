// NEXUS briefing: six slides over one 3D space scene (three.js r128).
// Each section has its own "station": a separate, self-contained composition far from the others.
// All models are illustrative. Spacecraft are "inspired by" NASA missions, not flight hardware.
(function () {
  const canvas = document.getElementById('space-canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x03060f);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 6000);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // One distant Sun for every station, so light agrees across all models
  const SUN_DIR = V(-0.78, 0.36, 0.52).normalize();
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.6); sun.position.copy(SUN_DIR).multiplyScalar(100); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x36c8e8, 0.55); rim.position.set(40, -10, -60); scene.add(rim);
  const warm = new THREE.DirectionalLight(0xffb45c, 0.25); warm.position.set(30, -20, 40); scene.add(warm);
  scene.add(new THREE.AmbientLight(0x1a2a44, 0.35));

  const loader = new THREE.TextureLoader();
  const texCache = {};
  function tex(file, srgb = true) {
    if (texCache[file]) return texCache[file];
    const t = loader.load('textures/' + file); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return (texCache[file] = t);
  }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  const glow = canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.22, 'rgba(255,255,255,.55)'); r.addColorStop(.55, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
  function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const puffTex = canvasTex(256, 256, (g) => {
    const R = rand(7);
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2, d = Math.pow(R(), .7) * 70, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, r = 22 + R() * 46;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    const m = g.createRadialGradient(128, 128, 60, 128, 128, 128); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = m; g.fillRect(0, 0, 256, 256);
  });
  function sprite(map, color, scale, opacity = 1, additive = true) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.scale.set(scale, scale, 1); return s;
  }
  function pointsCloud(n, fn, size, opacity = 1, additive = true) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color(), p = V(0, 0, 0);
    for (let i = 0; i < n; i++) { fn(i, p, c); pos.set([p.x, p.y, p.z], i * 3); col.set([c.r, c.g, c.b], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glow, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
  }
  function ring(r, color, opacity, width = .012, dashed = false) {
    const pts = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * Math.PI * 2; pts.push(V(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: r * .05, gapSize: r * .035 }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const l = new THREE.Line(geo, mat); if (dashed) l.computeLineDistances(); l.userData.r = r; return l;
  }

  // ---------- Stars: a sky sphere that travels with the camera, so every station has the same quiet sky
  const sky = new THREE.Group(); scene.add(sky);
  sky.add(pointsCloud(3200, (i, p, c) => { const R = Math.random, th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1), r = 2400;
    p.set(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); const t = R(); c.setRGB(.85 + t * .15, .88 + t * .1, 1).multiplyScalar(.25 + Math.pow(R(), 4) * 1.1); }, 9, .9));

  // ---------- Planet builders
  const atmoShader = (color, power, strength) => new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, s: { value: strength } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float p; uniform float s; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.-max(dot(vN,vV),0.), p); gl_FragColor = vec4(c*f*s, f*s); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
  const nightShader = () => new THREE.ShaderMaterial({
    uniforms: { map: { value: tex('earth-night.jpg') }, sunDir: { value: SUN_DIR } },
    vertexShader: 'varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vW = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform sampler2D map; uniform vec3 sunDir; varying vec2 vU; varying vec3 vW; void main(){ float d = dot(vW, sunDir); float m = smoothstep(.05,-.25,d); vec3 n = texture2D(map,vU).rgb; gl_FragColor = vec4(n*vec3(1.,.82,.55)*m*1.4, 1.); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  function makeEarth(r, detail = 64) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: tex('earth-day.jpg'), roughness: .7, metalness: 0, color: 0xffffff });
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, detail, detail * .75), mat); g.add(body);
    const night = new THREE.Mesh(new THREE.SphereGeometry(r * 1.001, detail, detail * .75), nightShader()); g.add(night);
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(r * 1.012, detail, detail * .75), new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: tex('earth-clouds.jpg', false), transparent: true, opacity: .85, depthWrite: false, roughness: 1 }));
    g.add(clouds);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, detail, detail * .75), atmoShader(0x4fc3ff, 3.2, 1.15)));
    g.userData = { spin: [body, night], clouds }; g.rotation.z = .41; return g;
  }
  function makeMoon(r, psr = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), new THREE.MeshStandardMaterial({ map: tex('moon.jpg'), bumpMap: tex('moon-bump.jpg', false), bumpScale: .035 * r, roughness: .95, metalness: 0 }));
    g.add(body);
    if (psr) { // darker, permanently shadowed region around the south pole (illustrative extent)
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.003, 64, 12, 0, Math.PI * 2, Math.PI * .855, Math.PI * .145), new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: .72, depthWrite: false }));
      g.add(cap);
    }
    g.userData = { spin: [body] }; return g;
  }
  function latLon(lat, lon, r) { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return V(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); }
  function makeMars(r, jezero = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), new THREE.MeshStandardMaterial({ map: tex('mars.jpg'), bumpMap: tex('mars-bump.jpg', false), bumpScale: .03 * r, roughness: .93, metalness: 0 }));
    g.add(body); g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.025, 48, 36), atmoShader(0xffa070, 4, .6)));
    if (jezero) { // simplified landmark: crater rim and fan-shaped delta at Jezero (18.4 N, 77.5 E). Not map-accurate geometry.
      const p = latLon(18.4, 77.5, r * 1.004), mark = new THREE.Group(); mark.position.copy(p); mark.lookAt(p.clone().multiplyScalar(2));
      mark.add(new THREE.Mesh(new THREE.RingGeometry(r * .055, r * .066, 48), new THREE.MeshBasicMaterial({ color: 0xffb45c, transparent: true, opacity: .95, side: THREE.DoubleSide })));
      const fan = new THREE.Mesh(new THREE.CircleGeometry(r * .03, 24, Math.PI * .85, Math.PI * .5), new THREE.MeshBasicMaterial({ color: 0x9fe0ea, transparent: true, opacity: .8, side: THREE.DoubleSide }));
      fan.position.set(-r * .022, 0, .001); mark.add(fan);
      const halo = sprite(glow, 0xffb45c, r * .4, .5); mark.add(halo);
      g.add(mark); g.userData.jezero = p;
    }
    g.userData.spin = [body]; return g;
  }

  // ---------- Apophis-like asteroid (illustrative; the true shape is only known roughly from radar)
  function hash(x, y, z, s) { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453; return v - Math.floor(v); }
  function noise3(x, y, z, s) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = t => t * t * (3 - 2 * t), u = f(x - xi), v = f(y - yi), w = f(z - zi); let r = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) r += (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w) * hash(xi + a, yi + b, zi + c, s); return r; }
  function fbm(x, y, z, s, o = 4) { let a = .5, f = 1, t = 0; for (let i = 0; i < o; i++) { t += a * noise3(x * f, y * f, z * f, s); a *= .5; f *= 2; } return t; }
  const craterList = (s, n, size) => Array.from({ length: n }, (_, i) => { const x = hash(i, 1, 2, s) * 2 - 1, y = hash(i, 3, 4, s) * 2 - 1, z = hash(i, 5, 6, s) * 2 - 1, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l, size * (.3 + hash(i, 7, 8, s))]; });
  const CR = [craterList(9, 8, .34), craterList(19, 26, .12), craterList(23, 60, .05)];
  function crater(vx, vy, vz, list) { let d = 0; for (const [cx, cy, cz, r] of list) { const dd = (vx - cx) ** 2 + (vy - cy) ** 2 + (vz - cz) ** 2; if (dd < r * r) { const x = Math.sqrt(dd) / r; d += (x < .8 ? -.6 * (1 - x * x / .64) : .5 * (1 - (x - .8) / .2)) * r * .25; } } return d; }
  let rockGeo = null;
  function asteroidGeo() {
    if (rockGeo) return rockGeo;
    const src = new THREE.IcosahedronGeometry(1, 40).attributes.position, map = new Map(), verts = [], idx = [];
    for (let i = 0; i < src.count; i++) { const x = src.getX(i), y = src.getY(i), z = src.getZ(i), key = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4);
      let k = map.get(key); if (k === undefined) { k = verts.length / 3; map.set(key, k); verts.push(x, y, z); } idx.push(k); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(idx);
    const pa = geo.attributes.position, cols = new Float32Array(pa.count * 3);
    const dark = new THREE.Color(0x4f4a44), brown = new THREE.Color(0x6e5e4e), grey = new THREE.Color(0x8a847b), c = new THREE.Color();
    for (let i = 0; i < pa.count; i++) {
      let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      const n = fbm(x * 2.2, y * 2.2, z * 2.2, 3), mid = fbm(x * 7, y * 7, z * 7, 5, 3), fine = fbm(x * 20, y * 20, z * 20, 8, 2);
      const ridge = 1 - Math.abs(fbm(x * 11, y * 11, z * 11, 12, 3) * 2 - 1);
      const lobe = Math.exp(-((x - .55) ** 2) * 4) * 1.1 + Math.exp(-((x + .6) ** 2) * 4) * .85, neck = Math.exp(-(x * x) * 12) * .09;
      const c1 = crater(x, y, z, CR[0]), c2 = crater(x, y, z, CR[1]), c3 = crater(x, y, z, CR[2]);
      const h = 1 + (n - .5) * .36 + (mid - .5) * .09 + (fine - .5) * .02 + Math.pow(ridge, 6) * .04 + c1 * .9 + c2 * .65 + c3 * .4 + lobe * .14 - neck;
      let X = x * h * 1.48, Y = y * h * .8, Z = z * h * .88; Y += .07 * X * X - .05; Z += .04 * Math.sin(X * 2.2);
      pa.setXYZ(i, X, Y, Z);
      c.copy(dark).lerp(brown, THREE.MathUtils.smoothstep(mid, .38, .62)).lerp(grey, THREE.MathUtils.smoothstep(fine, .45, .7) * .55);
      c.multiplyScalar(.42 * THREE.MathUtils.clamp(.85 + n * .35 + (c1 + c2) * 3.2, .5, 1.3)); cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    return (rockGeo = geo);
  }
  function makeAsteroid(s) { const m = new THREE.Mesh(asteroidGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xa69d92, roughness: .97, metalness: .02 })); m.scale.setScalar(s); return m; }

  // ---------- Spacecraft kit (illustrative concept models, not NASA flight hardware)
  const foil = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c99a3c'; g.fillRect(0, 0, w, h); const R = rand(3);
    for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(${R() > .5 ? '255,236,170' : '110,70,20'},${.15 + R() * .3})`; g.lineWidth = 1 + R() * 3; g.beginPath(); g.moveTo(R() * w, R() * h); g.lineTo(R() * w, R() * h); g.stroke(); } });
  const cells = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#0b1f4a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32 + y / 32) % 2 ? '#123a7a' : '#0f2f66'; g.fillRect(x + 1.5, y + 1.5, 29, 29); }
    g.strokeStyle = '#7fa6d8'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); });
  const M = {
    foil: new THREE.MeshStandardMaterial({ map: foil, roughness: .35, metalness: .85 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: .45, metalness: .25 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: .5, metalness: .7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: .3, metalness: .9 }),
    cells: new THREE.MeshStandardMaterial({ map: cells, roughness: .25, metalness: .55, emissive: 0x061633 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x0c1a2a, roughness: .05, metalness: .9, emissive: 0x0a3a4a }),
  };
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r1, r2, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
  function dish(r, depth, m = M.white) { const pts = []; for (let i = 0; i <= 16; i++) { const x = i / 16 * r; pts.push(new THREE.Vector2(x, depth * (x / r) ** 2)); } const d = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: .35, metalness: .3, side: THREE.DoubleSide })); const g = new THREE.Group(); g.add(d); const feed = cyl(.02 * r * 3, .02 * r * 3, depth * 1.6, M.steel, 8); feed.position.y = depth * .8; g.add(feed); return g; }
  function wing(len, wid, panels = 3) { // solar array on a yoke; extends along +z
    const g = new THREE.Group(); const yoke = cyl(.025, .025, .45, M.steel, 8); yoke.rotation.x = Math.PI / 2; yoke.position.z = .22; g.add(yoke);
    const pl = len / panels; for (let i = 0; i < panels; i++) { const p = box(wid, .035, pl * .96, M.cells); p.position.z = .45 + pl * (i + .5); g.add(p); } return g;
  }
  function makeCraft(kind) {
    const g = new THREE.Group(), A = {}; // A: anchor points for callouts
    if (kind === 'apex') { // OSIRIS-APEX-inspired: box bus, two straight wings, top dish, sampling arm
      g.add(box(1.1, 1.1, 1.1, M.foil));
      [1, -1].forEach(s => { const w = wing(2.2, .75, 2); w.rotation.y = s > 0 ? 0 : Math.PI; w.position.z = s * .5; g.add(w); });
      const d = dish(.6, .16); d.position.y = .58; g.add(d);
      const arm = cyl(.03, .03, 1.1, M.steel, 8); arm.rotation.z = Math.PI / 2.6; arm.position.set(.75, -.55, 0); g.add(arm);
      const head = cyl(.1, .14, .12, M.steel); head.position.set(1.18, -.98, 0); g.add(head);
      const cam = cyl(.11, .13, .3, M.dark); cam.rotation.z = Math.PI / 2; cam.position.set(.66, .22, .2); g.add(cam);
    } else if (kind === 'lro') { // LRO-inspired: tall bus, one large wing on a boom, dish on a boom, instrument deck facing down
      g.add(box(.9, 1.3, .9, M.foil)); const deck = box(.95, .18, .95, M.white); deck.position.y = -.74; g.add(deck);
      for (let i = 0; i < 4; i++) { const ins = cyl(.09, .09, .22, i % 2 ? M.dark : M.white, 16); ins.position.set(-.25 + (i % 2) * .5, -.92, -.22 + (i > 1) * .44); g.add(ins); }
      const w = wing(2.6, 1.3, 2); w.position.set(0, .3, .45); w.rotation.x = -.15; g.add(w);
      const boom = cyl(.025, .025, 1.1, M.steel, 8); boom.rotation.z = Math.PI / 2; boom.position.set(-.95, .45, 0); g.add(boom);
      const d = dish(.38, .1); d.rotation.z = Math.PI / 2; d.position.set(-1.5, .45, 0); g.add(d);
    } else if (kind === 'eos') { // Earth-observation satellite: long bus, single long wing, sensor cluster facing Earth
      g.add(box(2.2, .8, .8, M.foil)); const front = box(.5, .6, .6, M.white); front.position.x = 1.3; g.add(front);
      for (let i = 0; i < 3; i++) { const s = box(.28, .2, .28, i === 1 ? M.dark : M.white); s.position.set(-.6 + i * .6, -.52, 0); g.add(s); }
      const lens = cyl(.08, .08, .08, M.lens, 16); lens.position.set(0, -.66, 0); g.add(lens);
      const w = wing(3.2, .95, 4); w.rotation.y = Math.PI / 2; w.position.set(-1.1, 0, 0); g.add(w);
      const d = dish(.22, .06); d.position.set(.6, .48, .25); g.add(d);
    } else if (kind === 'mro') { // MRO-inspired: large dish, two wings, camera on the nadir side
      g.add(box(.9, 1.1, .9, M.foil)); const d = dish(1.15, .32); d.rotation.x = Math.PI; d.position.y = 1.0; d.rotation.z = .2; g.add(d);
      const mast = cyl(.03, .03, .45, M.steel, 8); mast.position.y = .66; g.add(mast);
      [1, -1].forEach(s => { const w = wing(1.6, .95, 2); w.rotation.y = s > 0 ? 0 : Math.PI; w.position.z = s * .45; w.rotation.x = .25 * s; g.add(w); });
      const cam = cyl(.2, .2, .55, M.white); cam.position.set(.1, -.8, 0); g.add(cam); const l = cyl(.15, .15, .03, M.lens); l.position.set(.1, -1.08, 0); g.add(l);
    } else { // NEXUS concept orbiter for the spacecraft section
      const bus = box(1.5, 1.05, 1.05, M.foil); g.add(bus);
      const top = box(1.52, .06, 1.07, M.white); top.position.y = .55; g.add(top);
      const scope = cyl(.3, .36, .85, M.white); scope.rotation.z = Math.PI / 2; scope.position.set(1.15, .15, 0); g.add(scope);
      const lens = cyl(.25, .25, .04, M.lens); lens.rotation.z = Math.PI / 2; lens.position.set(1.59, .15, 0); g.add(lens);
      const spec = box(.34, .3, .34, M.dark); spec.position.set(.95, -.32, .3); g.add(spec);
      const rec = box(.5, .3, .42, M.dark); rec.position.set(-.25, -.68, .15); g.add(rec);
      const led = box(.06, .06, .02, new THREE.MeshBasicMaterial({ color: 0x36c8e8 })); led.position.set(-.05, -.68, .37); g.add(led); A.led = led;
      const batt = box(.3, .26, .3, M.steel); batt.position.set(-.55, -.65, -.25); g.add(batt);
      const mast = cyl(.035, .035, .55, M.steel, 8); mast.position.set(-.3, .85, 0); g.add(mast);
      const d = dish(.62, .17); d.position.set(-.3, 1.1, 0); d.rotation.z = -.35; g.add(d);
      [1, -1].forEach(s => { const w = wing(2.9, .8, 3); w.rotation.y = s > 0 ? 0 : Math.PI; w.position.z = s * .52; g.add(w); });
      for (let i = 0; i < 4; i++) { const t = cyl(.04, .07, .12, M.steel, 10); t.position.set(-.76, .38 - (i > 1) * .76, .38 - (i % 2) * .76); t.rotation.z = Math.PI / 2; g.add(t); }
      Object.assign(A, { instruments: V(1.62, .15, 0), recorder: V(-.25, -.84, .15), antenna: V(-.42, 1.32, 0), solar: V(0, 0, 1.7) });
    }
    g.userData.anchors = A; return g;
  }

  // ---------- Stations
  const stations = {}; const STEP = 900;
  function station(key, x, y = 0) { const g = new THREE.Group(); g.position.set(x, y, 0); scene.add(g); stations[key] = g; g.userData.anim = []; return g; }
  const anim = (st, f) => st.userData.anim.push(f);
  function orbitTube(r, color, opacity, tilt = 0) { const o = ring(r, color, opacity); o.rotation.x = tilt; return o; }

  // HERO: Earth focal (right of centre), Moon nearby, Mars behind, asteroid away from the Moon, satellite in front
  const hero = station('hero', 0);
  { const e = makeEarth(4.2); e.position.set(4.6, -.3, 0); hero.add(e);
    const m = makeMoon(1.05); m.position.set(10.6, 3.1, -3); hero.add(m);
    const ma = makeMars(2.2); ma.position.set(16, -1.6, -24); hero.add(ma);
    const ast = makeAsteroid(.55); ast.position.set(2.4, 5.6, 2); hero.add(ast);
    const sat = makeCraft('concept'); sat.scale.setScalar(.42); sat.position.set(9.6, -3.7, 6.5); sat.rotation.set(.3, -.9, .12); hero.add(sat);
    const o1 = orbitTube(6.4, 0x36c8e8, .28, Math.PI / 2 - .32); o1.position.copy(e.position); o1.rotation.z = .25; hero.add(o1);
    const o2 = ring(9.5, 0xffb45c, .16, 0, true); o2.position.copy(e.position); o2.rotation.set(Math.PI / 2 - .18, 0, -.1); hero.add(o2);
    anim(hero, t => { e.userData.spin.forEach(s => s.rotation.y = t * .03); e.userData.clouds.rotation.y = t * .036; m.userData.spin[0].rotation.y = t * .01; ma.userData.spin[0].rotation.y = t * .02;
      ast.rotation.set(t * .09, t * .13, .3); sat.position.y = -3.7 + Math.sin(t * .8) * .08; sat.rotation.y = -.9 + Math.sin(t * .3) * .12; });
    hero.userData.parts = { earth: e };
  }

  // MISSIONS: one complete scene per mission
  function missionStation(key, x, build) { const st = station(key, x); build(st); return st; }
  const MS = {};
  MS.astra = missionStation('astra', STEP, st => {
    const ast = makeAsteroid(1.8); st.add(ast);
    const e = makeEarth(1.5, 48); e.position.set(9, -3.2, -26); st.add(e);
    const c = makeCraft('apex'); c.scale.setScalar(.55); st.add(c);
    const path = ring(5.2, 0x4aa8ff, .35, 0, true); path.rotation.x = Math.PI / 2 - .5; st.add(path);
    st.userData.craft = c; st.userData.path = path; st.userData.target = ast;
    anim(st, t => { ast.rotation.set(.2 + t * .05, t * .08, .15); e.userData.spin.forEach(s => s.rotation.y = t * .03); });
  });
  MS.lunaris = missionStation('lunaris', STEP * 2, st => {
    const m = makeMoon(3.4, true); m.rotation.x = -.55; st.add(m);
    const c = makeCraft('lro'); c.scale.setScalar(.42); st.add(c);
    const path = ring(5.0, 0x9fe0ea, .35, 0, true); path.rotation.set(.2, 0, Math.PI / 2 - .2); st.add(path);
    st.userData.craft = c; st.userData.path = path; st.userData.target = m;
    anim(st, t => { m.userData.spin[0].rotation.y = t * .015; });
  });
  MS.earth = missionStation('earth', STEP * 3, st => {
    const e = makeEarth(3.4); st.add(e);
    const haze = new THREE.Mesh(new THREE.SphereGeometry(3.4 * 1.075, 64, 48), atmoShader(0xa78bfa, 2.2, .55)); st.add(haze); // aerosol / haze cue
    const c = makeCraft('eos'); c.scale.setScalar(.3); st.add(c);
    const path = ring(4.6, 0xa78bfa, .4, 0, true); path.rotation.x = Math.PI / 2 - .35; path.rotation.z = .3; st.add(path);
    st.userData.craft = c; st.userData.path = path; st.userData.target = e;
    anim(st, t => { e.userData.spin.forEach(s => s.rotation.y = t * .03); e.userData.clouds.rotation.y = t * .04; });
  });
  MS.mars = missionStation('mars', STEP * 4, st => {
    const m = makeMars(3.4, true); st.add(m);
    // turn Mars so Jezero faces the camera side
    const j = m.userData.jezero.clone().normalize(), want = V(-.35, .25, 1).normalize(); m.quaternion.setFromUnitVectors(j, want);
    const c = makeCraft('mro'); c.scale.setScalar(.36); st.add(c);
    const path = ring(4.9, 0xd0674c, .38, 0, true); path.rotation.x = Math.PI / 2 - .45; path.rotation.z = -.25; st.add(path);
    st.userData.craft = c; st.userData.path = path; st.userData.target = m;
  });
  // craft flying its mission orbit (slide 2) or the chosen game orbit (slide 4)
  const gameOrbit = { mission: 'astra', radii: [], active: 1 };
  Object.entries(MS).forEach(([k, st]) => anim(st, t => {
    const c = st.userData.craft; let r, rot;
    if (view.slide === 3) { const gr = st.userData.gameRings; if (!gr) return; const R = gr.children[gameOrbit.active]; r = R.userData.r; rot = gr.rotation; }
    else { r = st.userData.path.userData.r; rot = st.userData.path.rotation; }
    const a = t * .16 + 2.1; const p = V(Math.cos(a) * r, 0, Math.sin(a) * r).applyEuler(rot); c.position.copy(p);
    c.lookAt(st.userData.target.getWorldPosition(V(0, 0, 0))); c.rotateX(-Math.PI / 2);
  }));
  // Game orbit choices: two complete paths per mission (not to scale)
  const ORB = { astra: [3.9, 5.7], lunaris: [4.3, 5.8], earth: [4.2, 5.6], mars: [4.3, 5.8] };
  Object.entries(MS).forEach(([k, st]) => {
    const g = new THREE.Group(); ORB[k].forEach(r => { const l = ring(r, 0x36c8e8, .5); l.userData.r = r; g.add(l); });
    g.rotation.x = Math.PI / 2 - .42; g.rotation.z = .12; g.visible = false; st.add(g); st.userData.gameRings = g;
  });

  // SPACECRAFT: concept orbiter alone, with a distant Earth off to the side
  const craftSt = station('craft', STEP * 5);
  const hero3 = makeCraft('concept'); craftSt.add(hero3); hero3.rotation.set(.18, -.62, .05);
  { const e = makeEarth(6, 48); e.position.set(-30, -14, -60); craftSt.add(e); }
  anim(craftSt, t => { hero3.rotation.y = -.62 + Math.sin(t * .25) * .18 + view.yaw * .6; hero3.position.y = Math.sin(t * .7) * .05; hero3.userData.anchors.led.visible = Math.sin(t * 6) > 0; });

  // SCIENCE: six chapter scenes
  const CH = [];
  function chapter(i, build) { const st = station('ch' + i, STEP * (6 + i)); build(st); CH[i] = st; }
  const col = (h, s, l) => new THREE.Color().setHSL(h, s, l);
  chapter(0, st => { // Nebula: layered gas and dust with a protostar inside a dense knot
    const R = rand(11), g = new THREE.Group(); g.scale.setScalar(.72); st.add(g);
    for (let i = 0; i < 150; i++) { const u = R(), v = R(), w = R(); const p = V((u - .5) * 16, (v - .5) * 7 + Math.sin(u * 6) * 1.2, (w - .5) * 8);
      const hue = R() < .55 ? .52 + R() * .06 : (R() < .6 ? .9 + R() * .06 : .07); const s = sprite(puffTex, col(hue, .7, .5), 2.5 + R() * 4.5, .14 + R() * .18); s.position.copy(p); s.material.rotation = R() * 6; g.add(s); }
    for (let i = 0; i < 45; i++) { const p = V((R() - .5) * 12, (R() - .5) * 2.4 + 0.2, 1.5 + R() * 3); const s = sprite(puffTex, 0x02030a, 2 + R() * 3.5, .55 + R() * .3, false); s.position.copy(p); g.add(s); } // dust lanes in front
    for (let i = 0; i < 26; i++) { const a = i / 26; const p = V(-6 + a * 11, Math.sin(a * 9) * 1.4 + 1.2, -1 + Math.cos(a * 5)); const s = sprite(glow, 0xffc890, .7 + R() * .6, .35); s.position.copy(p); g.add(s); } // bright filament
    const core = sprite(glow, 0xfff1d6, 2.2, 1); core.position.set(1.6, .4, .6); g.add(core);
    const coreHalo = sprite(glow, 0xffb45c, 6, .45); coreHalo.position.copy(core.position); g.add(coreHalo);
    const knot = sprite(puffTex, 0xff9a6a, 4.5, .4); knot.position.set(1.6, .4, .2); g.add(knot);
    g.add(pointsCloud(400, (i, p, c) => { p.set((Math.random() - .5) * 18, (Math.random() - .5) * 9, (Math.random() - .5) * 8); c.setRGB(1, .95, .9).multiplyScalar(.4 + Math.random() * .6); }, .09));
    anim(st, t => { g.rotation.y = Math.sin(t * .05) * .25; core.scale.setScalar(2.1 + Math.sin(t * 2.2) * .15); });
  });
  chapter(1, st => { // Star life: separate stages, one shown at a time
    const stages = [];
    const proto = new THREE.Group(); { const R = rand(5); for (let i = 0; i < 70; i++) { const s = sprite(puffTex, col(R() < .5 ? .05 : .55, .6, .4), 2 + R() * 3, .1); s.position.set((R() - .5) * 7, (R() - .5) * 4, (R() - .5) * 4); proto.add(s); }
      proto.add(sprite(glow, 0xffe2b8, 1.5, .9)); const disk = new THREE.Mesh(new THREE.RingGeometry(.4, 1.6, 64), new THREE.MeshBasicMaterial({ color: 0xff9a5a, transparent: true, opacity: .45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); disk.rotation.x = Math.PI / 2.3; proto.add(disk);
      [1, -1].forEach(s => { const j = new THREE.Mesh(new THREE.ConeGeometry(.18, 3.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe0ea, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false })); j.position.y = s * 1.9; j.rotation.z = s > 0 ? Math.PI : 0; j.rotation.x = .15; proto.add(j); }); }
    const starTex = (a, b) => canvasTex(512, 256, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); const R = rand(9); for (let i = 0; i < 260; i++) { const x = R() * w, y = R() * h, r = 6 + R() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, R() > .5 ? b : 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
    const ms = new THREE.Group(); { ms.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 32), new THREE.MeshBasicMaterial({ map: starTex('#fff3c8', 'rgba(255,255,255,.5)') }))); ms.add(sprite(glow, 0xffe6a0, 7, .75)); ms.add(sprite(glow, 0xffffff, 3.6, .6)); }
    const rg = new THREE.Group(); { rg.add(new THREE.Mesh(new THREE.SphereGeometry(3.4, 48, 32), new THREE.MeshBasicMaterial({ map: starTex('#d9502a', 'rgba(255,160,80,.35)') }))); rg.add(sprite(glow, 0xff6a3a, 13, .55)); }
    const wd = new THREE.Group(); { wd.add(sprite(glow, 0xd8ecff, 1.1, 1)); wd.add(new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })));
      const R = rand(21); for (let i = 0; i < 90; i++) { const a = R() * Math.PI * 2, r = 2.6 + (R() - .5) * .7, h = (R() - .5) * 1.6; const s = sprite(puffTex, i % 3 ? 0x36c8e8 : 0xff6aa8, 1.2 + R(), .22); s.position.set(Math.cos(a) * r, h, Math.sin(a) * r * .55); wd.add(s); } wd.rotation.x = .5; }
    const sn = new THREE.Group(); { const R = rand(33); sn.add(pointsCloud(2600, (i, p, c) => { const th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1), n = fbm(Math.cos(th) * 2, Math.sin(th) * 2, Math.cos(ph) * 2, 4); const r = 3.2 + (n - .5) * 1.6 + (R() - .5) * .3;
        p.set(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); c.copy(n > .5 ? new THREE.Color(0xff8a4a) : new THREE.Color(0x6ad8ff)).multiplyScalar(.6 + R() * .5); }, .16, .85)); sn.add(sprite(glow, 0xbfe6ff, 1.1, 1)); }
    [proto, ms, rg, wd, sn].forEach(s => { s.visible = false; st.add(s); stages.push(s); });
    st.userData.stages = stages; stages[0].visible = true;
    anim(st, t => { stages.forEach(s => s.rotation.y += reduced ? 0 : .002); });
  });
  chapter(2, st => { // Planet formation: young star, flared disk with rings and gaps, protoplanets
    const g = new THREE.Group(); g.rotation.set(.42, 0, -.12); g.scale.setScalar(.68); st.add(g);
    g.add(sprite(glow, 0xfff0c8, 3.2, 1)); g.add(sprite(glow, 0xffb45c, 8, .35));
    const gaps = [2.7, 4.6], R = rand(17);
    g.add(pointsCloud(16000, (i, p, c) => { let r; do { r = 1 + Math.pow(R(), .8) * 7.5; } while (gaps.some(gp => Math.abs(r - gp) < .28 && R() > .06)); const a = R() * Math.PI * 2, h = (R() - .5) * .06 * r * r * .25;
      const band = .7 + .3 * Math.sin(r * 5.3); p.set(Math.cos(a) * r, h, Math.sin(a) * r); c.setRGB(1, .72 - r * .045, .45 - r * .045).multiplyScalar(band * (.4 + R() * .45)); }, .26, .75));
    const planets = gaps.map((r, i) => { const pl = new THREE.Mesh(new THREE.SphereGeometry(.22 - i * .05, 24, 16), new THREE.MeshStandardMaterial({ color: i ? 0x8a6a52 : 0xb07a5a, roughness: .9 })); pl.userData = { r, a: i * 2.4 }; g.add(pl); return pl; });
    const clumps = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.06 + R() * .07, 0), new THREE.MeshStandardMaterial({ color: 0x7a6656, roughness: 1 })); m.userData = { r: 3.2 + R() * 3.6, a: R() * 6.28 }; g.add(m); clumps.push(m); }
    anim(st, t => { g.children[2].rotation.y = t * .05; [...planets, ...clumps].forEach(p => { const a = p.userData.a + t * .4 / Math.pow(p.userData.r, 1.5); p.position.set(Math.cos(a) * p.userData.r, 0, Math.sin(a) * p.userData.r); }); });
  });
  chapter(3, st => { // Black hole: shadow, inclined hot disk, lensed far side, photon ring and a warped background
    const diskTex = canvasTex(512, 512, (g) => { const r = g.createRadialGradient(256, 256, 70, 256, 256, 256); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,236,190,1)'); r.addColorStop(.35, 'rgba(255,150,60,.85)'); r.addColorStop(.7, 'rgba(160,50,20,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512);
      const R = rand(4); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(0,0,0,${.15 + R() * .25})`; g.lineWidth = 1 + R() * 3; g.beginPath(); g.arc(256, 256, 80 + R() * 170, R() * 6, R() * 6 + 1.5); g.stroke(); } });
    const dm = () => new THREE.MeshBasicMaterial({ map: diskTex, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const disk = new THREE.Mesh(new THREE.RingGeometry(1.5, 6.5, 160, 4), dm()); disk.rotation.x = Math.PI / 2 - .2; st.add(disk);
    const back = new THREE.Group(); st.add(back);
    const arcTop = new THREE.Mesh(new THREE.RingGeometry(1.25, 2.6, 128, 2, 0, Math.PI), dm()); back.add(arcTop); // lensed image of the far side of the disk
    const arcBot = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 128, 2, Math.PI, Math.PI), dm()); arcBot.material.opacity = .5; back.add(arcBot);
    const photon = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.17, 128), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); back.add(photon);
    st.add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    // background stars pushed outward around the shadow (lensing), drawn on a plane behind
    const R = rand(8), E = 2.4; const bg = pointsCloud(1400, (i, p, c) => { let x = (R() - .5) * 60, y = (R() - .5) * 34; const b = Math.hypot(x, y) || .01, b2 = (b + Math.sqrt(b * b + 4 * E * E)) / 2; x *= b2 / b; y *= b2 / b; p.set(x, y, 0); c.setRGB(.9, .93, 1).multiplyScalar(.35 + R() * .8); }, .22);
    back.add(bg); bg.position.z = -30;
    st.userData.billboard = back;
    anim(st, t => { disk.rotation.z = t * .12; back.quaternion.copy(camera.quaternion); });
  });
  chapter(4, st => { // Gravitational lensing: foreground cluster, distant galaxy behind, bent light paths and arcs
    const R = rand(13), lens = new THREE.Group(); st.add(lens);
    lens.add(sprite(glow, 0xffe2a8, 5, .9)); lens.add(sprite(glow, 0xffb45c, 12, .3));
    for (let i = 0; i < 12; i++) { const s = sprite(glow, i % 3 ? 0xffd9a0 : 0xffc070, .9 + R() * 1.6, .6); s.position.set((R() - .5) * 5, (R() - .5) * 3.5, (R() - .5) * 2); s.scale.x *= 1.4; lens.add(s); }
    const src = new THREE.Group(); src.position.set(.7, .4, -40); st.add(src); // distant source galaxy
    src.add(pointsCloud(900, (i, p, c) => { const arm = i % 2, r = R() * 3, a = r * 1.6 + arm * Math.PI + (R() - .5) * .5; p.set(Math.cos(a) * r, Math.sin(a) * r * .7, 0); c.setRGB(.55, .75, 1).multiplyScalar(.6 + R() * .5); }, .22));
    src.add(sprite(glow, 0xbfe0ff, 2.6, .8));
    const RE = 4.1; const arcs = new THREE.Group(); st.add(arcs);
    [[.5, 1.1], [2.3, .7], [3.9, .5], [5.0, .35]].forEach(([a0, len]) => { for (let k = 0; k < 40; k++) { const a = a0 + (k / 39 - .5) * len, w = Math.sin(k / 39 * Math.PI); const s = sprite(glow, 0x5fb0ff, .3 + w * .4, .12 + w * .3); s.position.set(Math.cos(a) * RE, Math.sin(a) * RE * .92, .3); arcs.add(s); } });
    const cam = V(0, 0, 40); // light paths: source -> bend near the lens -> towards the viewer
    [[.5, 0x7fc8ff], [3.6, 0x7fc8ff], [2.1, 0x4aa8ff]].forEach(([a, c]) => { const bend = V(Math.cos(a) * RE, Math.sin(a) * RE * .92, 0);
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([src.position.clone(), bend, cam]), new THREE.LineDashedMaterial({ color: c, transparent: true, opacity: .45, dashSize: .6, gapSize: .45 })); l.computeLineDistances(); st.add(l); });
    anim(st, t => { arcs.children.forEach((s, i) => s.material.opacity = (.22 + .18 * Math.sin(t * 1.2 + i * .15))); });
  });
  chapter(5, st => { // Universe tour: nested scales, one at a time (sizes and distances compressed, not to scale)
    const S = [];
    const s0 = new THREE.Group(); { const e = makeEarth(1.6, 48); s0.add(e); const m = makeMoon(.45); m.position.set(4.6, .6, -1); s0.add(m); const o = ring(4.7, 0x9fe0ea, .3, 0, true); o.rotation.x = .12; s0.add(o); s0.userData.spin = e; }
    const s1 = new THREE.Group(); { s1.add(sprite(glow, 0xfff0c8, 2.2, 1)); s1.add(sprite(glow, 0xffb45c, 5, .4)); const cols = [0x9a8f86, 0xe0c08a, 0x4f8fe0, 0xd0674c, 0xd9b48a, 0xe6d3a0, 0x9fe0ea, 0x4a6fe0];
      cols.forEach((c, i) => { const r = 1.3 + i * .85; const o = ring(r, 0x36c8e8, .22); o.rotation.x = .35; s1.add(o); const p = new THREE.Mesh(new THREE.SphereGeometry(.08 + (i > 3 ? .1 : .04), 16, 12), new THREE.MeshBasicMaterial({ color: c })); const a = i * 1.7; p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyEuler(o.rotation); s1.add(p); }); }
    const s2 = new THREE.Group(); { const a = sprite(glow, 0xfff0c8, 1.2, 1); a.position.x = -5; s2.add(a); const b = sprite(glow, 0xffd8a0, 1.4, 1); b.position.set(5, .6, -1); s2.add(b); const c2 = sprite(glow, 0xff8a6a, .5, 1); c2.position.set(5.5, .2, -1); s2.add(c2);
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.position, b.position]), new THREE.LineDashedMaterial({ color: 0xffb45c, transparent: true, opacity: .6, dashSize: .3, gapSize: .2 })); l.computeLineDistances(); s2.add(l); }
    const galaxy = (n, r, tw, hue) => pointsCloud(n, (i, p, c) => { const arm = i % 2, d = Math.pow(Math.random(), 1.6) * r, a = d * tw + arm * Math.PI + (Math.random() - .5) * .6; p.set(Math.cos(a) * d, (Math.random() - .5) * .12 * r * (1 - d / r), Math.sin(a) * d); c.copy(col(hue + (d / r) * .5, .6, .65 - d / r * .25)); }, .16 * r / 6 + .05, .9);
    const s3 = new THREE.Group(); { const gx = galaxy(9000, 6, 1.1, .08); s3.add(gx); s3.add(sprite(glow, 0xffe0b0, 2.4, .7)); const sunDot = sprite(glow, 0xffb45c, .5, 1); sunDot.position.set(3.6, 0, 1.2); s3.add(sunDot); s3.rotation.x = 1.0; }
    const s4 = new THREE.Group(); { const mw = galaxy(2500, 1.6, 1.3, .08); mw.position.set(-3.2, 0, 0); mw.rotation.x = .5; s4.add(mw); const an = galaxy(3000, 2.2, 1.1, .6); an.position.set(3.4, .8, -1); an.rotation.set(1.1, 0, .5); s4.add(an); const m33 = galaxy(900, .8, 1.5, .55); m33.position.set(1.4, -1.6, 1); s4.add(m33);
      for (let i = 0; i < 30; i++) { const d = sprite(glow, 0xcfe0ff, .2 + Math.random() * .2, .7); d.position.set((Math.random() - .5) * 11, (Math.random() - .5) * 5, (Math.random() - .5) * 4); s4.add(d); } }
    const s5 = new THREE.Group(); { s5.add(pointsCloud(9000, (i, p, c) => { const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = Math.pow(Math.random(), .33) * 5.6; const n = fbm(Math.cos(th) * 3 * r / 5, Math.sin(th) * 3 * r / 5, Math.cos(ph) * 3, 2);
        p.set(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); c.copy(col(.6 + n * .3, .55, .45 + Math.max(0, n - .45) * 1.4)); }, .15, .95));
      s5.add(new THREE.Mesh(new THREE.SphereGeometry(6, 64, 48), atmoShader(0xffb45c, 3.5, .7))); const here = sprite(glow, 0x9fe0ea, .6, 1); s5.add(here); s5.children.forEach(c => c.scale.multiplyScalar(.72)); s5.children[0].geometry.scale(1,1,1); }
    [s0, s1, s2, s3, s4, s5].forEach(g => { g.visible = false; st.add(g); S.push(g); }); S[0].visible = true; st.userData.stages = S;
    anim(st, t => { S[0].userData.spin.userData.spin.forEach(s => s.rotation.y = t * .05); S[1].rotation.y = t * .05; S[3].rotation.y = t * .03; S[5].rotation.y = t * .02; });
  });

  // ---------- Views: where the camera sits for each slide or selection.
  // fx = where the subject should sit across the screen (0 left, 1 right), so cards never cover it.
  const VIEWS = {
    hero: { st: 'hero', cam: V(3.2, 1.0, 25), look: V(6.2, .4, 0), fx: .66 },
    impact: { st: 'hero', cam: V(-2, 4.5, 30), look: V(6, -.5, -2), fx: .55 },
    astra: { st: 'astra', cam: V(2, 2.6, 15), look: V(0, 0, 0), fx: .7 },
    lunaris: { st: 'lunaris', cam: V(3, 1.2, 15.5), look: V(0, -.4, 0), fx: .7 },
    earth: { st: 'earth', cam: V(3, 2.4, 15), look: V(0, 0, 0), fx: .7 },
    mars: { st: 'mars', cam: V(3, 2, 15), look: V(0, 0, 0), fx: .7 },
    craft: { st: 'craft', cam: V(1.2, 1.4, 8.8), look: V(.2, .15, 0), fx: .5 },
  };
  ['astra', 'lunaris', 'earth', 'mars'].forEach(k => VIEWS['g_' + k] = { st: k, cam: V(1.5, 6.5, 19.5), look: V(0, -.6, 0), fx: .5 });
  CH.forEach((_, i) => VIEWS['ch' + i] = { st: 'ch' + i, cam: i === 3 ? V(0, 1.3, 15) : i === 4 ? V(0, 0, 16) : V(0, 2.2, 16), look: V(0, 0, 0), fx: .64 });
  const view = { key: 'hero', slide: 0, fx: .5, yaw: 0, pitch: 0 };
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0); let fxNow = .5;
  function setView(key, instant) {
    const v = VIEWS[key]; if (!v) return; const st = stations[v.st]; const far = !stations[VIEWS[view.key].st] || st !== stations[VIEWS[view.key].st];
    view.key = key; view.fx = v.fx;
    if (instant || far) { camPos.copy(v.cam).add(st.position); camLook.copy(v.look).add(st.position); fxNow = v.fx; camera.position.copy(camPos); canvas.classList.remove('warp'); void canvas.offsetWidth; canvas.classList.add('warp'); }
    Object.values(stations).forEach(s => s.visible = s === st);
  }

  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', e => { if (!drag) return; view.yaw = Math.max(-.6, Math.min(.6, view.yaw + (e.clientX - drag[0]) * .004)); view.pitch = Math.max(-.35, Math.min(.35, view.pitch + (e.clientY - drag[1]) * .003)); drag = [e.clientX, e.clientY]; });

  let W = 1, H = 1;
  function resize() { const r = canvas.getBoundingClientRect(); if (!r.width) return; W = r.width; H = r.height; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); new ResizeObserver(resize).observe(canvas); resize();

  // ---------- Screen overlay for orbit labels (game) and spacecraft callouts
  const overlay = document.createElement('div'); overlay.id = 'scene-overlay'; canvas.parentElement.insertBefore(overlay, canvas.nextSibling);
  overlay.innerHTML = '<svg id="callout-lines"></svg>';
  const lines = overlay.querySelector('svg');
  const project = (p) => { const q = p.clone().project(camera); return [(q.x * .5 + .5) * W, (-q.y * .5 + .5) * H, q.z < 1]; };
  const SUBS = [['instruments', '01 · Science instruments', 1, -1], ['recorder', '02 · Recorder and flight computer', 1, 1], ['antenna', '03 · Radio and high-gain antenna', -1, -1], ['solar', '04 · Solar arrays and battery', -1, 1]];
  const callouts = SUBS.map(([k, label], i) => { const d = document.createElement('div'); d.className = 'callout'; d.textContent = label; d.onclick = () => window.focusSubsystem && window.focusSubsystem(i, document.querySelectorAll('.subsystem-list .glass-card')[i]); overlay.append(d); return d; });
  const orbitLabels = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'orbit-label'; overlay.append(d); return d; });
  let activeSub = 0;

  const clock = new THREE.Clock(); let visible = true; document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  function animate() { requestAnimationFrame(animate); if (visible) frame(false); }
  function frame(snap) {
    const t = reduced ? 0 : clock.getElapsedTime(); const k = (reduced || snap) ? 1 : 0;
    const v = VIEWS[view.key], st = stations[v.st];
    st.userData.anim.forEach(f => f(t));
    const want = v.cam.clone().add(st.position); const sph = new THREE.Spherical().setFromVector3(v.cam.clone().sub(v.look)); sph.theta += view.yaw * .9; sph.phi = Math.max(.2, Math.min(Math.PI - .2, sph.phi - view.pitch * .8));
    want.copy(v.look).add(new THREE.Vector3().setFromSpherical(sph)).add(st.position);
    camPos.lerp(want, k || .05); camLook.lerp(v.look.clone().add(st.position), k || .06); fxNow += (view.fx - fxNow) * (k || .06);
    camera.position.copy(camPos); camera.lookAt(camLook); camera.setViewOffset(W, H, (.5 - fxNow) * W, 0, W, H);
    sky.position.copy(camera.position);
    // spacecraft callouts
    const showCall = view.slide === 2; let svg = '';
    callouts.forEach((d, i) => { d.style.display = showCall ? '' : 'none'; if (!showCall) return;
      const [k, , sx, sy] = SUBS[i]; const a = hero3.userData.anchors[k].clone(); hero3.localToWorld(a); const [x, y] = project(a);
      const lx = Math.max(W * (sx < 0 ? .5 : .33), Math.min(W * (sx > 0 ? .6 : .74), x + sx * W * .07)), ly = Math.max(H * .3, Math.min(H * .82, y + sy * H * .09)); d.style.left = lx + 'px'; d.style.top = ly + 'px'; d.style.transform = `translate(${sx > 0 ? '0' : '-100%'}, -50%)`;
      d.classList.toggle('on', i === activeSub);
      svg += `<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" class="${i === activeSub ? 'on' : ''}"/><circle cx="${x}" cy="${y}" r="${i === activeSub ? 4.5 : 3}" class="${i === activeSub ? 'on' : ''}"/>`; });
    // orbit option labels on the game slide
    const showOrb = view.slide === 3 && MS[gameOrbit.mission];
    orbitLabels.forEach((d, i) => { d.style.display = showOrb ? '' : 'none'; if (!showOrb) return;
      const gr = MS[gameOrbit.mission].userData.gameRings, r = gr.children[i].userData.r; let best = null;
      for (let a = 0; a < 6.28; a += .13) { const p = V(Math.cos(a) * r, 0, Math.sin(a) * r).applyEuler(gr.rotation).add(MS[gameOrbit.mission].position); const q = project(p); if (q[0] > W * .33 && q[0] < W * .62 && q[1] < H * .8 && (!best || q[1] > best[1])) best = q; }
      if (!best) { d.style.display = 'none'; return; } const [x, y] = best; d.style.left = x + 'px'; d.style.top = y + 'px'; d.classList.toggle('on', i === gameOrbit.active);
      if (i === gameOrbit.active) svg += `<circle cx="${x}" cy="${y}" r="3.5" class="on"/>`; });
    lines.innerHTML = svg;
    renderer.render(scene, camera);
  }
  setView('hero', true); animate();

  // ---------- Slides
  const slides = document.querySelectorAll('.slide'), dots = document.querySelectorAll('.dot-btn'), tag = document.getElementById('slide-telemetry-tag');
  let current = 0, missionKey = 'astra', chapterIdx = 0;
  const slideView = i => [() => 'hero', () => missionKey, () => 'craft', () => 'g_' + gameOrbit.mission, () => 'ch' + chapterIdx, () => 'impact'][i]();
  function goToSlide(i) {
    if (i < 0 || i >= slides.length) return;
    current = i; view.slide = i; view.yaw = 0; view.pitch = 0;
    slides.forEach((s, j) => s.classList.toggle('active', j === i)); dots.forEach((d, j) => d.classList.toggle('active', j === i));
    tag.textContent = slides[i].dataset.tag;
    document.getElementById('btn-prev').disabled = i === 0; document.getElementById('btn-next').disabled = i === slides.length - 1;
    Object.values(MS).forEach(st => { st.userData.gameRings.visible = i === 3; st.userData.path.visible = i !== 3; });
    setView(slideView(i));
    try { history.replaceState(null, '', '#slide-' + (i + 1)); } catch (e) {}
  }
  addEventListener('keydown', e => {
    if (document.body.classList.contains('edit-mode') && document.activeElement && document.activeElement.hasAttribute('data-editable')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goToSlide(current + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goToSlide(current - 1); }
  });

  // Slide 2: missions (text matches js/data.js on the site)
  const missions = {
    astra: { code: 'SELECTED · MISSION 01', metric: '99942 APOPHIS', title: 'ASTRA · Asteroid Apophis encounter', view: 'astra',
      detail: 'A 340 metre asteroid will pass about 32,000 km from Earth on 13 April 2029, close enough to see without a telescope. OSIRIS-APEX arrives just after the pass.',
      ref: 'Science reference: NASA OSIRIS-APEX at asteroid 99942 Apophis. Spacecraft shown is an illustrative, OSIRIS-APEX-inspired model.' },
    lunaris: { code: 'SELECTED · MISSION 02', metric: 'LUNAR POLAR ORBITER', title: 'LUNARIS · Reading the coldest craters', view: 'lunaris',
      detail: 'Mapping the Moon from orbit, modelled on NASA’s LRO, in orbit since 2009. The darkest craters reach about 25 K in winter. Water ice has been searched for but not confirmed.',
      ref: 'Science reference: NASA Lunar Reconnaissance Orbiter (LRO). Darkened south pole and orbiter are illustrative.' },
    halo: { code: 'SELECTED · MISSION 03', metric: '705 KM SUN-SYNCHRONOUS', title: 'HALO · Watching Earth’s atmosphere', view: 'earth',
      detail: 'Four layers of air, watched from 705 km up. Aerosols, gases and clouds as seen by NASA’s Terra, Aqua and Aura. MODIS sees the whole Earth every one to two days.',
      ref: 'Science reference: NASA Terra, Aqua and Aura, plus NASA POWER. Satellite and haze layer are illustrative.' },
    jezero: { code: 'SELECTED · MISSION 04', metric: 'JEZERO CRATER', title: 'JEZERO ECHO · An ancient lake from orbit', view: 'mars',
      detail: 'An orbiter modelled on NASA’s MRO studies Jezero crater. HiRISE reaches up to 25 cm per pixel, and the orbiter relays rover data back to Earth.',
      ref: 'Science reference: NASA Mars Reconnaissance Orbiter (MRO). Jezero marker is a simplified landmark; orbiter is MRO-inspired.' },
  };
  function selectMission(key, el) {
    document.querySelectorAll('.missions-grid .glass-card').forEach(c => c.classList.remove('selected')); el.classList.add('selected');
    const d = missions[key];
    document.getElementById('mf-code').textContent = d.code; document.getElementById('mf-metric').textContent = d.metric;
    document.getElementById('mf-title').textContent = d.title; document.getElementById('mf-detail').textContent = d.detail;
    document.getElementById('mf-verified').textContent = d.ref; missionKey = d.view; setView(d.view);
  }

  // Slide 3: spacecraft systems
  const subLabels = ['01 · SCIENCE INSTRUMENTS', '02 · RECORDER AND FLIGHT COMPUTER', '03 · RADIO AND HIGH-GAIN ANTENNA', '04 · SOLAR ARRAYS AND BATTERY'];
  function focusSubsystem(i, el) {
    document.querySelectorAll('.subsystem-list .glass-card').forEach(c => c.classList.remove('selected')); if (el) el.classList.add('selected');
    activeSub = i; const pill = document.getElementById('sub-callout-pill'); if (pill) pill.textContent = 'HIGHLIGHTED: ' + subLabels[i];
  }
  // Slide 4: NEXUS//04 choices. Values copied from js/game-data.js.
  const GAME = {
    astra: { name: 'ASTRA', world: 'Apophis', budget: 1200, tagline: 'Watch an asteroid change as Earth pulls on it.', orbits: [['near', '5 km standoff'], ['far', '20 km standoff']], cam: 'astra' },
    lunaris: { name: 'LUNARIS', world: 'Moon', budget: 1300, tagline: 'Read the coldest craters on the Moon.', orbits: [['50', '50 km orbit'], ['100', '100 km orbit']], cam: 'lunaris' },
    earth: { name: 'HALO', world: 'Earth', budget: 1100, tagline: 'Watch the thin blue line that keeps us alive.', orbits: [['705', '705 km sun-synchronous'], ['500', '500 km']], cam: 'halo' },
    mars: { name: 'JEZERO ECHO', world: 'Mars', budget: 1400, tagline: 'Read an ancient lake from orbit.', orbits: [['300', '300 km orbit'], ['400', '400 km orbit']], cam: 'jezero' },
  };
  const PARTS = { solar: { S: 'Small solar: 1,200 W, 20 kg, 80 credits', L: 'Large solar: 1,800 W, 30 kg, 140 credits' },
    radio: { S: 'Small radio: 2 Mb/s, 15 kg, 60 credits', L: 'Large radio: 20 Mb/s, 20 kg, 120 credits' } };
  // Each mission opens on the game's recommended Cadet build (RECOMMENDED in js/game-data.js)
  const REC = { astra: { orbit: 1, solar: 'S', radio: 'L' }, lunaris: { orbit: 1, solar: 'S', radio: 'L' }, earth: { orbit: 0, solar: 'S', radio: 'L' }, mars: { orbit: 1, solar: 'S', radio: 'L' } };
  const cfg = Object.assign({ mission: 'astra' }, REC.astra);
  function syncPills() {
    [['gcard-2', 'solar'], ['gcard-3', 'radio']].forEach(([id, k]) => document.querySelectorAll('#' + id + ' .cfg-pill').forEach((p, i) => p.classList.toggle('active', (i ? 'L' : 'S') === cfg[k])));
  }
  function orbitPills() {
    const box = document.getElementById('orbit-pills'); box.textContent = '';
    GAME[cfg.mission].orbits.forEach(([, label], i) => {
      const b = document.createElement('button'); b.className = 'cfg-pill' + (i === cfg.orbit ? ' active' : ''); b.textContent = label;
      b.onclick = () => setCfg('orbit', i, b); box.append(b);
    });
  }
  function setCfg(step, val, el) {
    cfg[step] = val; if (step === 'mission') Object.assign(cfg, REC[val]);
    el.parentElement.querySelectorAll('.cfg-pill').forEach(p => p.classList.remove('active')); el.classList.add('active');
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('focused-card')); el.closest('.game-card').classList.add('focused-card');
    if (step === 'mission') { orbitPills(); syncPills(); }
    summary();
  }
  function summary() {
    const m = GAME[cfg.mission], orbit = m.orbits[cfg.orbit][1];
    document.getElementById('cfg-match-name').textContent = m.name + ' · ' + m.world;
    document.getElementById('cfg-budget').textContent = m.budget.toLocaleString('en') + ' CREDITS';
    document.getElementById('cfg-summary-text').textContent = m.tagline;
    document.getElementById('cfg-specs').innerHTML = '<span><b>Orbit</b> ' + orbit + '</span><span><b>Power</b> ' + PARTS.solar[cfg.solar] + '</span><span><b>Radio</b> ' + PARTS.radio[cfg.radio] + '</span>';
    document.getElementById('sim-s1-val').textContent = m.name; document.getElementById('sim-s2-val').textContent = orbit.toUpperCase();
    document.getElementById('sim-s3-val').textContent = cfg.solar === 'L' ? 'LARGE SOLAR' : 'SMALL SOLAR';
    document.getElementById('sim-s4-val').textContent = cfg.radio === 'L' ? 'LARGE RADIO' : 'SMALL RADIO';
    document.getElementById('cfg-play').href = 'play.html?mission=' + cfg.mission;
    sync3D(); viz();
  }
  // 3D: show the chosen mission's target, both orbit paths (not to scale) and highlight the chosen one
  function sync3D() {
    const opts = GAME[cfg.mission].orbits, inner = cfg.mission === 'earth' ? [1, 0] : [0, 1]; // ring 0 is the inner (lower) path
    gameOrbit.mission = cfg.mission; gameOrbit.active = inner.indexOf(cfg.orbit);
    orbitLabels.forEach((d, i) => { d.textContent = (i ? 'OUTER · ' : 'INNER · ') + opts[inner[i]][1]; });
    if (current === 3) setView('g_' + cfg.mission);
  }
  // Live numbers from the game's own model (js/sim.js + js/game-data.js)
  const INFO = {
    astra: ['asteroid', 'OSIRIS-APEX', 'How does a close Earth pass change an asteroid?', '340 m wide · passes ~32,000 km from Earth on 13 Apr 2029'],
    lunaris: ['moon', 'LRO', 'Where could water ice survive on the Moon?', 'Polar craters as cold as 25 K that sunlight never reaches'],
    earth: ['earth', 'Terra, Aqua and Aura', 'What do haze, ozone and clouds look like from orbit?', 'Aura flies a 705 km sun-synchronous orbit'],
    mars: ['mars', 'Mars Reconnaissance Orbiter', 'What traces remain of an ancient lake?', 'Jezero is a 45 km crater with a river delta'],
  };
  let engine = null;
  const fmt = (v, d = 0) => Number(v).toLocaleString('en', { maximumFractionDigits: d, minimumFractionDigits: d });
  const meter = (label, have, need, unit, scale, okText, badText, d = 0) => {
    const ok = have >= need, max = Math.max(have, need) * 1.18 || 1;
    return `<div class="meter-row"><div class="meter-lab"><span>${label}</span><span><b>${fmt(have, d)}</b> / ${fmt(need, d)} ${unit}</span></div>
      <div class="meter${ok ? '' : ' bad'}"><i style="width:${(have / max * 100).toFixed(1)}%"></i><u style="left:${(need / max * 100).toFixed(1)}%"></u></div>
      <div class="meter-note ${ok ? 'ok' : 'bad'}">${ok ? okText : badText}</div></div>`;
  };
  async function viz() {
    if (!engine) {
      try { const [sim, data] = await Promise.all([import('./sim.js'), import('./game-data.js')]); engine = { sim, data }; }
      catch (e) { return; }
    }
    const { sim, data } = engine, m = data.GAME[cfg.mission], info = INFO[cfg.mission];
    const c = Object.assign(sim.defaultConfig(m), data.RECOMMENDED[cfg.mission].cadet);
    c.orbit = GAME[cfg.mission].orbits[cfg.orbit][0]; c.solar = cfg.solar; c.radio = cfg.radio;
    const d = sim.derive(m, c, 'cadet');
    // 01 mission
    document.getElementById('gviz-0').innerHTML = `<div class="gviz-txt"><div class="gviz-k">${m.world} · modelled on ${info[1]}</div><b>${info[2]}</b><br>${info[3]}</div>`;
    // 02 orbit diagram
    document.getElementById('gviz-1').innerHTML = `<div class="gviz-stats">
        <span class="gviz-k">Period</span><span class="gviz-k">${d.eclipseMin ? 'In shadow' : 'Shadow'}</span><span class="gviz-k">Pass</span><span class="gviz-k">Contact</span>
        <span class="gviz-big">${fmt(d.periodMin)}<small> min</small></span><span class="gviz-big" style="color:${d.eclipseMin ? '#c4b0ff' : '#7fe6b0'}">${d.eclipseMin ? fmt(d.eclipseMin) + '<small> min</small>' : 'none'}</span><span class="gviz-big">${fmt(d.passMin)}<small> min</small></span><span class="gviz-big">${fmt(d.contactMin)}<small> min</small></span>
      </div>`;
    // 03 power
    document.getElementById('gviz-2').innerHTML = `<div class="gviz-meters">
      ${meter('ARRAYS IN SUNLIGHT', d.solarW, d.sunLoad, 'W', 0, 'Arrays carry every load at once.', 'Arrays cannot run everything together.')}
      ${d.eclipseWh ? meter('BATTERY IN SHADOW', d.battWh, d.eclipseWh, 'Wh', 0, 'Battery lasts through each eclipse.', 'Battery runs flat in every eclipse.') : '<div class="meter-note ok">No eclipse on this orbit, so the battery only covers faults.</div>'}
      </div>`;
    // 04 radio
    document.getElementById('gviz-3').innerHTML = `<div class="gviz-meters">
      ${meter('SENT HOME PER CONTACT', d.perContactGbit, d.perPassGbit, 'Gbit', 0, 'Every pass of data gets home.', 'Data piles up faster than it can be sent home.', 1)}
      <div class="meter-note">Link rate here: <b style="color:#fff">${fmt(d.rateMbps, 1)} Mb/s</b>${m.radioMul !== 1 ? ` (distance cuts it to ${Math.round(m.radioMul * 100)}%)` : ''} · recorder ${fmt(d.storage)} Gbit</div></div>`;
    // checklist
    const ok = d.checks.every(x => x.ok), v = document.getElementById('cfg-verdict');
    v.textContent = ok ? 'GO FOR LAUNCH' : 'NO-GO'; v.className = 'go-verdict ' + (ok ? 'go' : 'nogo');
    document.getElementById('cfg-checks').innerHTML = d.checks.map(x => `<div class="go-row ${x.ok ? 'ok' : 'bad'}"><span>${x.ok ? '✓' : '✕'}</span><span>${x.label}</span><em>${x.detail}</em></div>`).join('');
  }
  function runMissionSimulation() {
    document.querySelectorAll('#cfg-checks .go-row').forEach((r, i) => setTimeout(() => { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }, 300 + i * 220));
    const ids = ['sim-s1', 'sim-s2', 'sim-s3', 'sim-s4'];
    ids.forEach(id => document.getElementById(id).classList.remove('done', 'running'));
    ids.forEach((id, i) => setTimeout(() => {
      document.querySelectorAll('.game-card').forEach(c => c.classList.remove('focused-card')); document.getElementById('gcard-' + i).classList.add('focused-card');
      const el = document.getElementById(id); el.classList.add('running');
      setTimeout(() => { el.classList.remove('running'); el.classList.add('done'); if (i === 3) toast('Checklist done. Press "Fly it in NEXUS//04" to launch ' + GAME[cfg.mission].name + '.'); }, 360);
    }, i * 420));
  }
  orbitPills(); syncPills(); summary();


  // Slide 5: Cosmic Explorer chapters, each with its own 3D model (illustrative)
  const chapters = [
    ['nebula', 'Inside a Nebula', 'How clouds of gas and dust collapse into new stars.', 'A cloud of gas and dust with dark dust lanes. A protostar glows inside the densest knot.'],
    ['stars', 'A Star Through Time', 'From ignition to red giant, white dwarf or supernova.', 'One stage at a time. A star’s mass decides its ending: Sun-like stars become white dwarfs, massive stars explode.'],
    ['planets', 'Worlds From Dust', 'How dust in a young disk grows into planets.', 'A young star inside a flared disk. Growing protoplanets clear gaps as they orbit.'],
    ['black-holes', 'A Closer Look at a Black Hole', 'Event horizons, glowing disks, jets and the first pictures.', 'A dark shadow, a hot tilted disk, and the far side of the disk bent up and over by gravity. Stars behind are pushed outward.'],
    ['lensing', 'Light Bent by Gravity', 'How mass bends light into rings, arcs and multiple images.', 'A foreground galaxy cluster bends light from a more distant galaxy into blue arcs. Dashed lines show the bent paths.'],
    ['universe', 'A Journey Across Cosmic Scales', 'From Earth out to the oldest light we can see.', 'Step outward one scale at a time. Sizes and distances are compressed.'],
  ];
  const SUBSTAGES = {
    1: ['Protostar', 'Main sequence', 'Red giant', 'Sun-like end: white dwarf', 'Massive-star end: supernova remnant'],
    5: ['Earth and Moon', 'Solar System', 'Nearest star', 'Milky Way', 'Local Group', 'Observable universe'],
  };
  function showStage(i, j) {
    const st = CH[i]; if (!st || !st.userData.stages) return;
    st.userData.stages.forEach((g, k) => { g.visible = k === j; if (k === j && !reduced) { g.scale.setScalar(i === 5 ? 2.2 : .6); g.userData.grow = true; } });
    document.querySelectorAll('#stage-tags .stage-tag').forEach((b, k) => b.classList.toggle('active', k === j));
  }
  // ease newly shown stages into place
  CH.forEach(st => anim(st, () => (st.userData.stages || []).forEach(g => { if (g.userData.grow) { g.scale.lerp(V(1, 1, 1), .07); if (Math.abs(g.scale.x - 1) < .01) { g.scale.setScalar(1); g.userData.grow = false; } } })));
  function selectDomain(i, el) {
    document.querySelectorAll('.domain-tag').forEach(t => t.classList.remove('active')); if (el) el.classList.add('active');
    chapterIdx = i; const [id, t, d, model] = chapters[i]; const r = document.getElementById('domain-readout');
    r.innerHTML = '<strong></strong> <span></span> <a style="color:var(--cyan)">Play Nova’s quest ↗</a><em class="model-note"></em>';
    r.querySelector('strong').textContent = t + ':'; r.querySelector('span').textContent = d;
    r.querySelector('a').href = 'nova.html' + (id === 'nebula' ? '' : '?quest=' + id);
    r.querySelector('.model-note').textContent = 'Model: ' + model + ' Illustrative, not to scale.';
    const box = document.getElementById('stage-tags'); box.textContent = '';
    (SUBSTAGES[i] || []).forEach((label, j) => { const b = document.createElement('button'); b.className = 'stage-tag'; b.textContent = label; b.onclick = () => showStage(i, j); box.append(b); });
    box.hidden = !SUBSTAGES[i]; if (SUBSTAGES[i]) showStage(i, 0);
    if (current === 4) setView('ch' + i);
  }
  selectDomain(0, document.querySelector('.domain-tag'));
  // Edit mode, recenter, toast
  const btnEdit = document.getElementById('btn-edit-mode');
  btnEdit.addEventListener('click', () => {
    const on = document.body.classList.toggle('edit-mode');
    document.querySelectorAll('[data-editable]').forEach(el => { el.contentEditable = on ? 'true' : 'false'; });
    btnEdit.textContent = on ? 'EDIT TEXT: ON' : 'EDIT TEXT: OFF'; btnEdit.classList.toggle('active', on);
    toast(on ? 'Click any heading or card text to change it. Changes last until you reload.' : 'Editing off.');
  });
  document.getElementById('btn-orbit-toggle').addEventListener('click', () => { view.yaw = 0; view.pitch = 0; toast('View recentred. Drag the space background to look around.'); });
  let toastTimer;
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200); }

  // ---------- Editable PowerPoint export (PptxGenJS loaded only when needed)
  function loadPptx() {
    if (window.PptxGenJS) return Promise.resolve();
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'; s.onload = ok; s.onerror = fail; document.head.append(s); });
  }
  const txt = sel => (document.querySelector(sel)?.innerText || '').trim();
  async function exportToPPTX() {
    toast('Building the PowerPoint file…');
    try { await loadPptx(); } catch (e) { toast('Could not load the PowerPoint builder. Check your internet connection and try again.'); return; }
    const shots = [];
    const keep = current; for (let i = 0; i < 6; i++) { goToSlide(i); frame(true); frame(true); shots.push(canvas.toDataURL('image/jpeg', .88)); } goToSlide(keep);
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Team NEXUS'; pptx.title = 'NEXUS briefing';
    const C = { navy: '050B18', mid: '0B1730', cos: '122B4A', cyan: '36C8E8', white: 'EAF2FA', amber: 'FFB45C' };
    const box = (s, x, y, w, h, line) => s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: .08, fill: { color: C.mid, transparency: 16 }, line: { color: line || C.cyan, width: 1 } });
    const t = (s, text, o) => s.addText(text, Object.assign({ fontFace: 'Arial', color: C.white, fontSize: 11 }, o));
    const nav = ['01 LAUNCH', '02 MISSIONS', '03 SPACECRAFT', '04 GAME', '05 SCIENCE', '06 IMPACT'];
    function frame(s, i, tagText, title) {
      s.background = { color: C.navy }; s.addImage({ data: shots[i], x: 0, y: 0, w: 13.333, h: 7.5 });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.navy, transparency: 38 } });
      t(s, 'NEXUS', { x: .5, y: .28, w: 2.4, h: .35, fontSize: 13, bold: true });
      t(s, tagText, { x: 2.6, y: .28, w: 6, h: .35, fontFace: 'Courier New', fontSize: 10, color: C.cyan });
      nav.forEach((l, n) => t(s, l, { x: 3.1 + n * 1.2, y: 7.02, w: 1.14, h: .28, align: 'center', fontFace: 'Courier New', fontSize: 8, color: n === i ? C.navy : C.white, fill: { color: n === i ? C.cyan : C.mid }, hyperlink: { slide: n + 1 } }));
      if (title) t(s, title, { x: .55, y: .95, w: 11, h: .55, fontSize: 28, bold: true });
    }
    const s1 = pptx.addSlide(); frame(s1, 0, 'SLIDE 01 / 06 · MISSION LAUNCH');
    t(s1, txt('[data-slide="0"] .kicker'), { x: .55, y: 1.15, w: 8, h: .35, fontFace: 'Courier New', color: C.cyan });
    t(s1, txt('[data-slide="0"] .hero-title'), { x: .55, y: 1.5, w: 8, h: 1, fontSize: 46, bold: true });
    t(s1, txt('[data-slide="0"] .s1-tagline'), { x: .55, y: 2.55, w: 8, h: .4, fontSize: 16, bold: true, color: C.amber });
    t(s1, txt('[data-slide="0"] .s1-desc'), { x: .55, y: 3.05, w: 7, h: 1.1, fontSize: 13 });
    document.querySelectorAll('[data-slide="0"] .team-grid .glass-card').forEach((c, i) => {
      const x = .55 + i * 3.1; box(s1, x, 5.2, 2.92, 1.5);
      t(s1, c.querySelector('.team-num').innerText, { x: x + .15, y: 5.32, w: 2.6, h: .25, fontFace: 'Courier New', fontSize: 9.5, color: C.cyan });
      t(s1, c.querySelector('.team-name').innerText, { x: x + .15, y: 5.6, w: 2.6, h: .38, fontSize: 15, bold: true });
      t(s1, c.querySelector('.team-scope').innerText, { x: x + .15, y: 6.0, w: 2.6, h: .6, fontSize: 10 });
    });
    const s2 = pptx.addSlide(); frame(s2, 1, 'SLIDE 02 / 06 · FOUR MISSIONS', txt('[data-slide="1"] .slide-title'));
    t(s2, txt('[data-slide="1"] .slide-subtitle'), { x: .55, y: 1.5, w: 10, h: .35, fontSize: 12 });
    document.querySelectorAll('[data-slide="1"] .missions-grid .glass-card').forEach((c, i) => {
      const x = .55 + (i % 2) * 3.85, y = 2.1 + Math.floor(i / 2) * 2.35, acc = i % 2 ? C.amber : C.cyan; box(s2, x, y, 3.65, 2.15, acc);
      t(s2, c.querySelector('.mission-badge').innerText.replace(/\n/g, '  ·  '), { x: x + .18, y: y + .14, w: 3.3, h: .25, fontFace: 'Courier New', fontSize: 8.5, color: acc });
      t(s2, c.querySelector('.mission-name').innerText, { x: x + .18, y: y + .42, w: 3.3, h: .38, fontSize: 18, bold: true });
      t(s2, c.querySelector('.mission-metric').innerText, { x: x + .18, y: y + .82, w: 3.3, h: .32, fontSize: 13, bold: true, color: C.amber });
      t(s2, c.querySelector('.mission-text').innerText, { x: x + .18, y: y + 1.18, w: 3.3, h: .82, fontSize: 10.5 });
    });
    const s3 = pptx.addSlide(); frame(s3, 2, 'SLIDE 03 / 06 · SPACECRAFT', txt('[data-slide="2"] .slide-title'));
    document.querySelectorAll('[data-slide="2"] .subsystem-list .glass-card').forEach((c, i) => {
      const y = 1.85 + i * 1.22; box(s3, .55, y, 4.45, 1.08);
      t(s3, c.querySelector('.sub-title span').innerText, { x: .72, y: y + .12, w: 4.1, h: .3, fontSize: 12, bold: true, color: C.cyan });
      t(s3, c.querySelector('.sub-desc').innerText, { x: .72, y: y + .45, w: 4.1, h: .55, fontSize: 10.5 });
    });
    box(s3, 9.2, 1.85, 3.55, 4.74, C.amber); t(s3, 'HOW DATA GETS HOME', { x: 9.4, y: 2.02, w: 3.2, h: .3, fontFace: 'Courier New', fontSize: 10.5, bold: true, color: C.amber });
    document.querySelectorAll('[data-slide="2"] .flow-node').forEach((n, i) => t(s3, n.innerText.replace(/\n+/g, ' · '), { x: 9.4, y: 2.5 + i * 1.0, w: 3.15, h: .85, fontSize: 10.5, fill: { color: C.cos }, margin: 6 }));
    const s4 = pptx.addSlide(); frame(s4, 3, 'SLIDE 04 / 06 · NEXUS//04', 'NEXUS//04 · BUILD AND FLY A MISSION');
    [['01', 'Pick a mission', 'ASTRA  •  LUNARIS  •  HALO  •  JEZERO ECHO'], ['02', 'Choose the orbit', 'Two orbits per mission: closer and sharper, or safer and cheaper to hold'],
      ['03', 'Size the power', 'Small solar 1,200 W  •  Large solar 1,800 W'], ['04', 'Size the radio', 'Small radio 2 Mb/s  •  Large radio 20 Mb/s']].forEach((st, i) => {
      const x = .55 + (i % 2) * 3.92, y = 1.6 + Math.floor(i / 2) * 2.25; box(s4, x, y, 3.74, 2.05);
      t(s4, st[0], { x: x + .18, y: y + .15, w: .7, h: .35, fontSize: 16, bold: true, color: C.cyan });
      t(s4, st[1], { x: x + .18, y: y + .55, w: 3.4, h: .35, fontSize: 13.5, bold: true });
      t(s4, st[2], { x: x + .18, y: y + 1.0, w: 3.4, h: .85, fontSize: 10.5, color: C.cyan });
    });
    box(s4, 8.55, 1.6, 4.2, 4.3, C.amber); t(s4, 'YOUR MISSION', { x: 8.75, y: 1.75, w: 3.8, h: .28, fontFace: 'Courier New', fontSize: 10, color: C.amber });
    t(s4, txt('#cfg-match-name'), { x: 8.75, y: 2.1, w: 3.8, h: .42, fontSize: 16, bold: true, color: C.cyan });
    t(s4, txt('#cfg-summary-text') + '\n\n' + txt('#cfg-specs').replace(/\n+/g, '\n'), { x: 8.75, y: 2.6, w: 3.8, h: 2.4, fontSize: 10.5 });
    t(s4, 'Play it: kshitij7737.github.io/astra-nexus/play.html', { x: .55, y: 6.2, w: 7.5, h: .4, fontFace: 'Courier New', fontSize: 10, color: C.amber, hyperlink: { url: 'https://kshitij7737.github.io/astra-nexus/play.html' } });
    const s5 = pptx.addSlide(); frame(s5, 4, 'SLIDE 05 / 06 · SCIENCE AND DATA', txt('[data-slide="4"] .slide-title'));
    box(s5, .55, 1.75, 6.1, 2.9); t(s5, 'ONE NUMBER PER MISSION (NASA SOURCES)', { x: .75, y: 1.88, w: 5.7, h: .28, fontFace: 'Courier New', fontSize: 10, color: C.amber });
    document.querySelectorAll('[data-slide="4"] .fact-big').forEach((f, i) => {
      const x = .75 + (i % 2) * 2.95, y = 2.3 + Math.floor(i / 2) * 1.15;
      t(s5, f.innerText, { x, y, w: 2.8, h: .4, fontSize: 18, bold: true, color: C.amber });
      t(s5, f.nextElementSibling.innerText, { x, y: y + .4, w: 2.8, h: .6, fontSize: 9.5 });
    });
    box(s5, .55, 4.85, 6.1, 1.8); t(s5, 'COSMIC EXPLORER · SIX CHAPTERS', { x: .75, y: 4.98, w: 5.7, h: .28, fontFace: 'Courier New', fontSize: 10, color: C.amber });
    t(s5, chapters.map(c => c[1]).join('  •  '), { x: .75, y: 5.3, w: 5.7, h: 1.2, fontSize: 11 });
    document.querySelectorAll('[data-slide="4"] .s5-grid > div:last-child .glass-card').forEach((c, i) => {
      const y = 1.85 + i * 1.22; box(s5, 7, y, 5.75, 1.08);
      t(s5, c.querySelector('.sub-title').innerText.replace(/\n/g, '  ·  '), { x: 7.2, y: y + .14, w: 5.3, h: .3, fontSize: 12, bold: true, color: C.cyan });
      t(s5, c.querySelector('.sub-desc').innerText, { x: 7.2, y: y + .48, w: 5.3, h: .5, fontSize: 10.5 });
    });
    const s6 = pptx.addSlide(); frame(s6, 5, 'SLIDE 06 / 06 · WHY IT MATTERS', txt('[data-slide="5"] .slide-title'));
    document.querySelectorAll('[data-slide="5"] .impact-grid .glass-card').forEach((c, i) => {
      const x = .55 + i * 4.15, acc = i === 2 ? C.amber : C.cyan; box(s6, x, 1.95, 3.92, 2.55, acc);
      t(s6, c.querySelector('.sub-title').innerText, { x: x + .18, y: 2.15, w: 3.55, h: .42, fontSize: 14, bold: true, color: acc });
      t(s6, c.querySelector('.sub-desc').innerText, { x: x + .18, y: 2.7, w: 3.55, h: 1.5, fontSize: 11 });
    });
    box(s6, .55, 4.95, 12.2, 1.35, C.amber);
    t(s6, txt('[data-slide="5"] .closing-quote p'), { x: .8, y: 5.12, w: 11.7, h: 1, fontSize: 15, italic: true });
    await pptx.writeFile({ fileName: 'NEXUS_Briefing.pptx' });
    toast('Downloaded NEXUS_Briefing.pptx (6 editable slides).');
  }
  document.getElementById('btn-export-pptx').addEventListener('click', exportToPPTX);

  Object.assign(window, { goToSlide, nextSlide: () => goToSlide(current + 1), prevSlide: () => goToSlide(current - 1), selectMission, focusSubsystem, setCfg, runMissionSimulation, selectDomain });
  const start = parseInt((location.hash.match(/slide-(\d)/) || [])[1], 10);
  if (start) goToSlide(start - 1);
})();
