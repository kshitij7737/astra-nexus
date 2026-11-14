// ASTRA NEXUS briefing: six slides over one continuous 3D space scene (three.js r128).
(function () {
  const canvas = document.getElementById('space-canvas');
  const stageEl = document.getElementById('stage-16x9');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050B18);
  scene.fog = new THREE.FogExp2(0x050B18, 0.0022);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 1200);
  camera.position.set(0, 2.2, 26);

  const sunLight = new THREE.DirectionalLight(0xFFF6EA, 2.35); sunLight.position.set(28, 14, 22); scene.add(sunLight);
  const rim = new THREE.DirectionalLight(0x36C8E8, 0.65); rim.position.set(-22, -8, -18); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x122B4A, 0.55));

  const loader = new THREE.TextureLoader();
  function photo(mat, file) { loader.load('textures/' + file, t => { t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; }); }
  function glowTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 4, 128, 128, 126); stops.forEach(([o, col]) => r.addColorStop(o, col));
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  }

  // 1. Nebula backdrop
  const nebulaGroup = new THREE.Group();
  const nebTex = glowTex([[0, 'rgba(54,200,232,.22)'], [.45, 'rgba(60,40,120,.16)'], [.78, 'rgba(11,23,48,.07)'], [1, 'rgba(5,11,24,0)']]);
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex, transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set((i - 3) * 32, Math.sin(i * 1.4) * 16, -95 - i * 8); s.scale.set(95, 65, 1); nebulaGroup.add(s);
  }
  scene.add(nebulaGroup);

  // 2. Starfield and dust
  function points(n, f, size, color, opacity) {
    const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) f(pos, i);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity })); scene.add(p); return p;
  }
  const stars = points(2600, (a, i) => { const r = 140 + Math.random() * 220, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    a[i * 3] = r * Math.sin(ph) * Math.cos(th); a[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); a[i * 3 + 2] = r * Math.cos(ph); }, .42, 0xEAF2FA, .65);
  const dust = points(340, (a, i) => { a[i * 3] = (Math.random() - .5) * 75; a[i * 3 + 1] = (Math.random() - .5) * 42; a[i * 3 + 2] = -25 + Math.random() * 58; }, .12, 0x36C8E8, .28);

  // 3. Twinkling stars
  const twinkle = []; const tg = new THREE.SphereGeometry(.14, 6, 6);
  for (let i = 0; i < 220; i++) {
    const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: i % 5 === 0 ? 0x36C8E8 : (i % 7 === 0 ? 0xFFB45C : 0xEAF2FA), transparent: true, opacity: .8 }));
    const r = 75 + Math.random() * 110, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    m.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
    m.userData = { phase: Math.random() * Math.PI * 2, speed: 1.4 + Math.random() * 2.6 }; scene.add(m); twinkle.push(m);
  }

  // 4. Worlds with NASA-derived colour maps (fallback colours until they load)
  function world(r, pos, color, file, rough, atmo) {
    const g = new THREE.Group(); g.position.copy(pos);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: .04 }); if (file) photo(mat, file);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), mat); g.add(mesh);
    if (atmo) g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 48, 48), new THREE.MeshBasicMaterial({ color: atmo, transparent: true, opacity: .14, side: THREE.BackSide })));
    scene.add(g); return { g, mesh };
  }
  const earth = world(4.4, new THREE.Vector3(7.5, -.8, 2.5), 0x1b4f8a, 'earth-day.jpg', .62, 0x36C8E8);
  const moon = world(1.75, new THREE.Vector3(17.5, 4.2, -10.5), 0x8c96a6, 'moon.jpg', .92);
  const mars = world(3.1, new THREE.Vector3(27.5, -2.5, -26), 0xb84a27, 'mars.jpg', .84, 0xFFB45C);
  const lunarRing = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.22, 64), new THREE.MeshBasicMaterial({ color: 0xFFB45C, side: THREE.DoubleSide, transparent: true, opacity: .45 }));
  lunarRing.rotation.x = Math.PI * .46; moon.g.add(lunarRing);

  // Apophis: two-lobed shape (illustrative; NASA says the exact shape is not fully known)
  const apophis = new THREE.Group(); apophis.position.set(-1.5, 4.6, 5.5);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: .95, metalness: .1 });
  [[0, .62, [1.2, .85, .9]], [.95, .48, [1, .9, .95]]].forEach(([x, r, s]) => {
    const geo = new THREE.IcosahedronGeometry(r, 3); const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const vx = pa.getX(i), vy = pa.getY(i), vz = pa.getZ(i); const n = 1 + .12 * Math.sin(vx * 7 + vy * 5) * Math.cos(vz * 6); pa.setXYZ(i, vx * n * s[0], vy * n * s[1], vz * n * s[2]); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, rockMat); m.position.x = x - .45; apophis.add(m);
  });
  scene.add(apophis);

  // 5. Hero orbiter
  const craft = new THREE.Group(); craft.position.set(2.2, 1.35, 10.2);
  const busMat = new THREE.MeshStandardMaterial({ color: 0x1A2B4C, roughness: .35, metalness: .75 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFB45C, roughness: .28, metalness: .85 });
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x36C8E8 });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1, 1), goldMat); craft.add(bus);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(.28, .34, .75, 20), busMat); scope.rotation.z = Math.PI / 2; scope.position.set(.95, .18, 0); craft.add(scope);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.24, 24), cyanMat); lens.rotation.y = Math.PI / 2; lens.position.set(1.33, .18, 0); craft.add(lens);
  const recorder = new THREE.Mesh(new THREE.BoxGeometry(.4, .28, .5), busMat); recorder.position.set(-.2, -.62, .1); craft.add(recorder);
  const led = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .06), cyanMat); led.position.set(-.2, -.62, .36); craft.add(led);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.52, 24, 16, 0, Math.PI * 2, 0, Math.PI * .42), new THREE.MeshStandardMaterial({ color: 0xEAF2FA, roughness: .3, metalness: .6, side: THREE.DoubleSide }));
  dish.rotation.x = Math.PI; dish.position.set(-.2, 1.1, 0); craft.add(dish);
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .42, 8), cyanMat); horn.position.set(-.2, 1.2, 0); craft.add(horn);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 8), busMat); mast.position.set(-.2, .7, 0); craft.add(mast);
  const solar = new THREE.Group();
  const panelTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#0d2350'; g.fillRect(0, 0, 64, 256); g.strokeStyle = '#3a6ab0'; g.lineWidth = 2; for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); } g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 256); g.stroke(); return new THREE.CanvasTexture(c); })();
  const wingMat = new THREE.MeshStandardMaterial({ map: panelTex, emissive: 0x0A1F42, roughness: .25, metalness: .7 });
  [1, -1].forEach(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(.68, .04, 2.6), wingMat); w.position.set(-.1, 0, s * 1.95); solar.add(w); });
  craft.add(solar);
  const battery = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: .6, roughness: .4 })); battery.position.set(-.55, -.62, -.2); craft.add(battery);
  scene.add(craft);

  // HALO observation satellite orbiting Earth
  const haloSat = new THREE.Group();
  const hb = new THREE.Mesh(new THREE.BoxGeometry(.32, .22, .22), goldMat); haloSat.add(hb);
  const hw = new THREE.Mesh(new THREE.BoxGeometry(.04, .02, 1), wingMat); hw.position.x = -.2; haloSat.add(hw);
  scene.add(haloSat);
  const haloOrbit = new THREE.Mesh(new THREE.TorusGeometry(5.3, .012, 6, 160), new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: .45 }));
  haloOrbit.position.copy(earth.g.position); haloOrbit.rotation.x = Math.PI / 2 - .35; scene.add(haloOrbit);

  // Routes between the worlds
  function arc(pts, color, op) {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .032, 8, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op }));
    scene.add(m); return m;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lunarArc = arc([V(7.5, -.8, 2.5), V(12.2, 2.6, -3.5), V(17.5, 4.2, -10.5)], 0x9fe0ea, .42);
  const marsArc = arc([V(7.5, -.8, 2.5), V(17.8, -3.4, -12), V(27.5, -2.5, -26)], 0xFFB45C, .38);
  const neaArc = arc([V(-8.5, 6.2, 8), V(-1.5, 4.6, 5.5), V(6, 2.4, 1.5)], 0x4aa8ff, .36);

  const slideCams = [
    { pos: V(0, 1.8, 24.5), look: V(3.8, .2, 2) },
    { pos: V(4.5, 3.2, 22), look: V(12.5, .5, -6) },
    { pos: V(2.4, 2.1, 14.2), look: V(2.2, 1.35, 10.2) },
    { pos: V(6.2, 7.5, 25.5), look: V(11, .2, -4) },
    { pos: V(14.5, 2.8, 8.5), look: V(19.5, 1.2, -14) },
    { pos: V(-3.5, 4.2, 31), look: V(8.5, 0, -4) },
  ];
  const targetPos = slideCams[0].pos.clone(), targetLook = slideCams[0].look.clone(), curLook = slideCams[0].look.clone();

  let drag = null, off = { yaw: 0, pitch: 0 };
  canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    off.yaw = Math.max(-.65, Math.min(.65, off.yaw + (e.clientX - drag[0]) * .0045));
    off.pitch = Math.max(-.4, Math.min(.4, off.pitch + (e.clientY - drag[1]) * .0035));
    drag = [e.clientX, e.clientY];
  });

  function resize() {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); new ResizeObserver(resize).observe(canvas); resize();

  let current = 0, activeSub = 0; const clock = new THREE.Clock(); const pin = document.getElementById('sc-callout-pin');
  const anchors = [V(1.33, .18, 0), V(-.2, -.62, .3), V(-.2, 1.2, 0), V(-.1, 0, 1.95)];
  const tmp = new THREE.Vector3();
  let visible = true; document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = reduced ? 0 : clock.getElapsedTime();
    nebulaGroup.rotation.z = t * .002; stars.rotation.y = t * .0055; dust.rotation.y = -t * .009; dust.position.y = Math.sin(t * .22) * .35;
    for (const s of twinkle) s.material.opacity = .25 + .72 * (.5 + .5 * Math.sin(t * s.userData.speed + s.userData.phase));
    moon.mesh.rotation.y = t * .028; mars.mesh.rotation.y = t * .036; earth.mesh.rotation.y = t * .06;
    apophis.rotation.x = t * .14; apophis.rotation.y = t * .19;
    craft.position.y = 1.35 + Math.sin(t * 1.1) * .14; craft.rotation.y = Math.sin(t * .35) * .22 + off.yaw * .5; craft.rotation.z = Math.cos(t * .45) * .06;
    solar.rotation.x = Math.sin(t * .4) * .18; led.visible = Math.sin(t * 6) > 0;
    const a = t * .35; const ob = V(Math.cos(a) * 5.3, 0, Math.sin(a) * 5.3).applyEuler(haloOrbit.rotation).add(earth.g.position);
    haloSat.position.copy(ob); haloSat.lookAt(earth.g.position);
    lunarArc.material.opacity = .32 + .16 * Math.sin(t * 2.1); marsArc.material.opacity = .28 + .16 * Math.sin(t * 1.6 + 1.2); neaArc.material.opacity = .28 + .16 * Math.sin(t * 2.4 + 2.4);
    const want = targetPos.clone(); want.x += Math.sin(off.yaw) * 6.5; want.y += off.pitch * 5.5;
    camera.position.lerp(want, reduced ? 1 : .045); curLook.lerp(targetLook, reduced ? 1 : .055); camera.lookAt(curLook);
    if (current === 2) {
      tmp.copy(anchors[activeSub]); craft.localToWorld(tmp); tmp.project(camera);
      const r = canvas.getBoundingClientRect();
      pin.style.left = (tmp.x * .5 + .5) * r.width + 'px'; pin.style.top = (-tmp.y * .5 + .5) * r.height + 'px'; pin.classList.add('visible');
    } else pin.classList.remove('visible');
    renderer.render(scene, camera);
  }
  animate();

  // ---------- Slides
  const slides = document.querySelectorAll('.slide'), dots = document.querySelectorAll('.dot-btn'), tag = document.getElementById('slide-telemetry-tag');
  function goToSlide(i) {
    if (i < 0 || i >= slides.length) return;
    current = i; off = { yaw: 0, pitch: 0 };
    slides.forEach((s, j) => s.classList.toggle('active', j === i)); dots.forEach((d, j) => d.classList.toggle('active', j === i));
    tag.textContent = slides[i].dataset.tag;
    document.getElementById('btn-prev').disabled = i === 0; document.getElementById('btn-next').disabled = i === slides.length - 1;
    targetPos.copy(slideCams[i].pos); targetLook.copy(slideCams[i].look);
    try { history.replaceState(null, '', '#slide-' + (i + 1)); } catch (e) {}
  }
  addEventListener('keydown', e => {
    if (document.body.classList.contains('edit-mode') && document.activeElement && document.activeElement.hasAttribute('data-editable')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goToSlide(current + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goToSlide(current - 1); }
  });

  // Slide 2: missions (text matches js/data.js on the site)
  const missions = {
    astra: { code: 'SELECTED · MISSION 01', metric: '99942 APOPHIS', title: 'ASTRA · Asteroid Apophis encounter',
      detail: 'A 340 metre asteroid will pass about 32,000 km from Earth on 13 April 2029, close enough to see without a telescope. OSIRIS-APEX arrives just after the pass.',
      ref: 'Science reference: NASA OSIRIS-APEX at asteroid 99942 Apophis', pos: V(-4.2, 4.8, 15.5), look: V(-1.5, 4.6, 5.5) },
    lunaris: { code: 'SELECTED · MISSION 02', metric: 'LUNAR POLAR ORBITER', title: 'LUNARIS · Reading the coldest craters',
      detail: 'Mapping the Moon from orbit, modelled on NASA’s LRO, in orbit since 2009. The darkest craters reach about 35 K. Water ice has been searched for but not confirmed.',
      ref: 'Science reference: NASA Lunar Reconnaissance Orbiter (LRO)', pos: V(12.2, 4.8, .5), look: V(17.5, 4.2, -10.5) },
    halo: { code: 'SELECTED · MISSION 03', metric: '705 KM SUN-SYNCHRONOUS', title: 'HALO · Watching Earth’s atmosphere',
      detail: 'Four layers of air, watched from 705 km up. Aerosols, gases and clouds as seen by NASA’s Terra, Aqua and Aura. MODIS sees the whole Earth every one to two days.',
      ref: 'Science reference: NASA Terra, Aqua and Aura, plus NASA POWER', pos: V(2.5, 3.6, 20.5), look: V(7.5, -.8, 2.5) },
    jezero: { code: 'SELECTED · MISSION 04', metric: 'JEZERO CRATER', title: 'JEZERO ECHO · An ancient lake from orbit',
      detail: 'An orbiter modelled on NASA’s MRO studies Jezero crater. HiRISE reaches up to 25 cm per pixel, and the orbiter relays rover data back to Earth.',
      ref: 'Science reference: NASA Mars Reconnaissance Orbiter (MRO)', pos: V(20.5, -1.2, -13.5), look: V(27.5, -2.5, -26) },
  };
  function selectMission(key, el) {
    document.querySelectorAll('.missions-grid .glass-card').forEach(c => c.classList.remove('selected')); el.classList.add('selected');
    const d = missions[key];
    document.getElementById('mf-code').textContent = d.code; document.getElementById('mf-metric').textContent = d.metric;
    document.getElementById('mf-title').textContent = d.title; document.getElementById('mf-detail').textContent = d.detail;
    document.getElementById('mf-verified').textContent = d.ref; targetPos.copy(d.pos); targetLook.copy(d.look);
  }

  // Slide 3: spacecraft systems
  const subLabels = ['01 · SCIENCE INSTRUMENTS', '02 · RECORDER AND FLIGHT COMPUTER', '03 · RADIO AND HIGH-GAIN ANTENNA', '04 · SOLAR ARRAYS AND BATTERY'];
  const subCams = [V(3.6, 2.2, 13.4), V(2.2, .3, 13.6), V(1.8, 2.9, 13.5), V(.4, 2, 14.5)];
  function focusSubsystem(i, el) {
    document.querySelectorAll('.subsystem-list .glass-card').forEach(c => c.classList.remove('selected')); el.classList.add('selected');
    activeSub = i; document.getElementById('sub-callout-pill').textContent = 'HIGHLIGHTED: ' + subLabels[i];
    document.getElementById('sc-pin-label').textContent = subLabels[i]; targetPos.copy(subCams[i]); targetLook.set(2.2, 1.35, 10.2);
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
    if (step === 'mission') { orbitPills(); syncPills(); const m = missions[GAME[val].cam]; targetPos.copy(m.pos); targetLook.copy(m.look); }
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
    viz();
  }
  // Live numbers from the game's own model (js/sim.js + js/game-data.js)
  const INFO = {
    astra: ['asteroid', 'OSIRIS-APEX', 'How does a close Earth pass change an asteroid?', '340 m wide · passes ~32,000 km from Earth on 13 Apr 2029'],
    lunaris: ['moon', 'LRO', 'Where could water ice survive on the Moon?', 'Polar craters near 35 K that sunlight never reaches'],
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
    document.getElementById('gviz-0').innerHTML = `<img class="gviz-orb" src="textures/orbs/${info[0]}.webp" alt="${m.world}">
      <div class="gviz-txt"><div class="gviz-k">${m.world} · modelled on ${info[1]}</div><b>${info[2]}</b><br>${info[3]}<br><span style="color:rgba(234,242,250,.5)">${m.objectives.length} science objectives · ${m.instruments.length} instruments to choose from</span></div>`;
    // 02 orbit diagram
    const R = m.body.radiusKm, a = d.a || (R + (c.orbit === 'near' ? 5 : 20));
    const ro = 48, rb = Math.max(7, ro * R / a), half = (d.eclipseFrac || 0) * Math.PI;
    const arc = half ? `<path d="M${60 + ro * Math.cos(-half)} ${60 + ro * Math.sin(-half)} A${ro} ${ro} 0 0 1 ${60 + ro * Math.cos(half)} ${60 + ro * Math.sin(half)}" stroke="#a78bfa" stroke-width="4" fill="none" stroke-linecap="round"/>` : '';
    const col = { astra: '#a08a74', lunaris: '#b8bcc4', earth: '#3f7fd8', mars: '#d0674c' }[cfg.mission];
    document.getElementById('gviz-1').innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="60" y="${60 - rb}" width="60" height="${rb * 2}" fill="rgba(10,6,30,.75)"/>
      <circle cx="60" cy="60" r="${ro}" stroke="rgba(54,200,232,.45)" stroke-dasharray="3 3" fill="none"/>${arc}
      <circle cx="60" cy="60" r="${rb}" fill="${col}"/><path d="M60 ${60 - rb} A${rb} ${rb} 0 0 1 60 ${60 + rb}Z" fill="rgba(0,0,0,.55)"/>
      <circle cx="${60 + ro * Math.cos(-2.3)}" cy="${60 + ro * Math.sin(-2.3)}" r="4" fill="#ffb45c"/>
      <text x="4" y="12" fill="#ffb45c" font-size="8" font-family="IBM Plex Mono,monospace">SUN ←</text></svg>
      <div class="gviz-stats">
        <span class="gviz-k">Period</span><span class="gviz-k">${d.eclipseMin ? 'In shadow' : 'Shadow'}</span>
        <span class="gviz-big">${fmt(d.periodMin)} min</span><span class="gviz-big" style="color:${d.eclipseMin ? '#c4b0ff' : '#7fe6b0'}">${d.eclipseMin ? fmt(d.eclipseMin) + ' min' : 'none'}</span>
        <span class="gviz-k" style="margin-top:6px">Target pass</span><span class="gviz-k" style="margin-top:6px">Ground contact</span>
        <span class="gviz-big">${fmt(d.passMin)} min</span><span class="gviz-big">${fmt(d.contactMin)} min</span>
      </div>`;
    // 03 power
    document.getElementById('gviz-2').innerHTML = `<div class="gviz-meters">
      ${meter('ARRAYS IN SUNLIGHT', d.solarW, d.sunLoad, 'W', 0, 'Arrays carry every load at once.', 'Arrays cannot run everything together.')}
      ${d.eclipseWh ? meter('BATTERY IN SHADOW', d.battWh, d.eclipseWh, 'Wh', 0, 'Battery lasts through each eclipse.', 'Battery runs flat in every eclipse.') : '<div class="meter-note ok">No eclipse on this orbit, so the battery only covers faults.</div>'}
      ${cfg.mission === 'mars' ? '<div class="meter-note">Mars is 1.52 AU from the Sun: arrays give 43% of their Earth output.</div>' : ''}</div>`;
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

  // Slide 5: Cosmic Explorer chapters
  const chapters = [
    ['nebula', 'Inside a Nebula', 'How clouds of gas and dust collapse into new stars.'],
    ['stars', 'A Star Through Time', 'From ignition to red giant, white dwarf or supernova.'],
    ['planets', 'Worlds From Dust', 'How dust in a young disk grows into planets.'],
    ['black-holes', 'A Closer Look at a Black Hole', 'Event horizons, glowing disks, jets and the first pictures.'],
    ['lensing', 'Light Bent by Gravity', 'How mass bends light into rings, arcs and multiple images.'],
    ['universe', 'A Journey Across Cosmic Scales', 'From Earth out to the oldest light we can see.'],
  ];
  function selectDomain(i, el) {
    document.querySelectorAll('.domain-tag').forEach(t => t.classList.remove('active')); el.classList.add('active');
    const [id, t, d] = chapters[i]; const r = document.getElementById('domain-readout');
    r.innerHTML = '<strong></strong> <span></span> <a style="color:var(--cyan)">Play Nova’s quest ↗</a>';
    r.querySelector('strong').textContent = t + ':'; r.querySelector('span').textContent = d;
    r.querySelector('a').href = 'nova.html' + (id === 'nebula' ? '' : '?quest=' + id);
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
  document.getElementById('btn-orbit-toggle').addEventListener('click', () => { off = { yaw: 0, pitch: 0 }; toast('View recentred. Drag the space background to look around.'); });
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
    for (let i = 0; i < 6; i++) { camera.position.copy(slideCams[i].pos); camera.lookAt(slideCams[i].look); renderer.render(scene, camera); shots.push(canvas.toDataURL('image/jpeg', .88)); }
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Team ASTRA NEXUS'; pptx.title = 'ASTRA NEXUS briefing';
    const C = { navy: '050B18', mid: '0B1730', cos: '122B4A', cyan: '36C8E8', white: 'EAF2FA', amber: 'FFB45C' };
    const box = (s, x, y, w, h, line) => s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: .08, fill: { color: C.mid, transparency: 16 }, line: { color: line || C.cyan, width: 1 } });
    const t = (s, text, o) => s.addText(text, Object.assign({ fontFace: 'Arial', color: C.white, fontSize: 11 }, o));
    const nav = ['01 LAUNCH', '02 MISSIONS', '03 SPACECRAFT', '04 GAME', '05 SCIENCE', '06 IMPACT'];
    function frame(s, i, tagText, title) {
      s.background = { color: C.navy }; s.addImage({ data: shots[i], x: 0, y: 0, w: 13.333, h: 7.5 });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.navy, transparency: 38 } });
      t(s, 'ASTRA NEXUS', { x: .5, y: .28, w: 2.4, h: .35, fontSize: 13, bold: true });
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
    goToSlide(current);
    await pptx.writeFile({ fileName: 'ASTRA_NEXUS_Briefing.pptx' });
    toast('Downloaded ASTRA_NEXUS_Briefing.pptx (6 editable slides).');
  }
  document.getElementById('btn-export-pptx').addEventListener('click', exportToPPTX);

  Object.assign(window, { goToSlide, nextSlide: () => goToSlide(current + 1), prevSlide: () => goToSlide(current - 1), selectMission, focusSubsystem, setCfg, runMissionSimulation, selectDomain });
  const start = parseInt((location.hash.match(/slide-(\d)/) || [])[1], 10);
  if (start) goToSlide(start - 1);
})();
