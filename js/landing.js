// NEXUS//04 landing: intro, eight-planet solar system, the spacecraft's route story, mission dashboard, archive.
import { GAME, ORDER } from './game-data.js';
import { SOURCES } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = k => SOURCES[k] ? `<a class="lx-src" href="${SOURCES[k].url}" target="_blank" rel="noopener">${esc(SOURCES[k].title)}</a>` : '';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let handingOff = false, handoffTimer;
let preloadedGame = false;
function preloadGame() {
  if (preloadedGame || navigator.connection?.saveData) return;
  preloadedGame = true;
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = 'js/game.js?v=2';
  document.head.append(link);
}
const store = () => { try { return JSON.parse(localStorage.getItem('nexus04') || '{}'); } catch { return {}; } };

// Stop copy follows the locked design handoff. Facts are reference values from NASA missions, each with its source.
const CH = {
  astra: { label: 'ASTRA · Apophis flyby', world: 'Apophis', h: 'Watch Earth change Apophis’s path.', sub: 'Track Apophis before and after its 2029 flyby. ASTRA’s early arrival is a game “what if.”',
    facts: [['340 m', 'mean diameter', 'apophisFacts'], ['13 Apr 2029', 'closest approach', 'apophisFacts'], ['~32,000 km', 'from Earth’s surface', 'apophisFacts']], note: 'NASA facts about Apophis. The shape shown is illustrative.' },
  earth: { label: 'HALO · Earth observation', world: 'Earth', h: 'Read Earth’s atmosphere from orbit.', sub: 'Track dust, ozone, and water vapour across the atmosphere.',
    facts: [['705 km', 'Aura: orbit altitude', 'aura'], ['1 to 2 days', 'MODIS: whole-Earth coverage', 'modis'], ['13 × 24 km', 'OMI: ground pixel size', 'omiData']], note: 'Reference facts from three NASA instruments and missions. They are not specifications of the HALO concept craft.' },
  lunaris: { label: 'LUNARIS · Moon', world: 'Moon', h: 'Some polar craters never receive direct sunlight.', sub: 'Map their temperatures and search for signs of ice.',
    facts: [['~35 K', 'Diviner: coldest crater readings', 'lroSys'], ['2009', 'LRO launched', 'lro'], ['7', 'LRO instruments', 'lroNtrs']], note: 'Reference facts from NASA’s Lunar Reconnaissance Orbiter, not LUNARIS specifications.' },
  mars: { label: 'JEZERO ECHO · Mars', world: 'Mars', h: 'Trace the ancient river delta at Jezero.', sub: 'Map the terrain and look for minerals formed in water.',
    facts: [['0.3 m', 'HiRISE: pixel scale, best case', 'mroHuman'], ['~6 m', 'CTX: pixel scale', 'ctxMsss'], ['6 Mb/s', 'MRO: peak downlink', 'mroHuman']], note: 'Reference facts from NASA’s Mars Reconnaissance Orbiter, not JEZERO ECHO specifications.' },
};

// ---------- intro
let introTimer, introExitTimer;
function intro(force) {
  clearInterval(introTimer);
  clearTimeout(introExitTimer);
  const el = $('#lx-intro');
  let seen = false; try { seen = sessionStorage.getItem('nx-intro') === '1'; } catch { /* ignore */ }
  if (seen && !force) { el.hidden = true; return; }
  el.hidden = false; el.classList.remove('is-out'); document.body.classList.add('lx-locked');
  $('#lx-enter').focus();
  const clk = $('#lx-clock'), t0 = performance.now();
  introTimer = setInterval(() => { const sec = Math.floor((performance.now() - t0) / 1000); clk.textContent = `T+ 00:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }, 250);
  $('#lx-enter').onclick = () => {
    clearInterval(introTimer);
    try { sessionStorage.setItem('nx-intro', '1'); } catch { /* ignore */ }
    el.classList.add('is-out'); document.body.classList.remove('lx-locked');
    introExitTimer = setTimeout(() => { el.hidden = true; }, reduced ? 0 : 550);
  };
}

// ---------- chapters: the spacecraft's route is asteroid → Earth → Moon → Mars
const STORY = ['astra', 'earth', 'lunaris', 'mars'];
const ROLE = { astra: 'Asteroid flyby', lunaris: 'Moon orbiter', earth: 'Earth observer', mars: 'Mars orbiter' };
const GOAL = { astra: 'See how Earth\'s pull changes an asteroid', lunaris: 'Find the coldest craters and hints of ice', earth: 'Measure dust, ozone and water vapour', mars: 'Read the story of an ancient lake' };
const CHAL = { earth: 1, astra: 2, mars: 2, lunaris: 3 };
function chapters() {
  $('#missions').innerHTML = STORY.map((id, i) => {
    const m = GAME[id], c = CH[id];
    return `<section class="lx-ch" id="ch-${id}" data-focus="${id}" style="--acc:${m.accent}">
      <div class="lx-ch__copy">
        <p class="lx-k">Stop ${i + 1} of 4</p>
        <p class="lx-ch__name">${esc(c.label)}</p>
        <h2>${esc(c.h)}</h2>
        <p class="lx-sub">${esc(c.sub)}</p>
        <ul class="lx-facts">${c.facts.map(([v, l, s]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span>${s && SOURCES[s] ? `<a class="lx-src" href="${SOURCES[s].url}" target="_blank" rel="noopener">Source: ${esc(SOURCES[s].title)}</a>` : ''}</li>`).join('')}</ul>
        <p class="lx-note">${esc(c.note)}</p>
        <div class="lx-row"><a class="lx-btn lx-btn--go" href="play.html?mission=${id}">Play ${esc(m.name)}</a><a class="lx-btn" href="explore.html?mission=${id}">Explore ${esc(m.world)}</a></div>
      </div>
    </section>`;
  }).join('') + `<section class="lx-ch lx-handoff" data-focus="exit"><div class="lx-ch__copy"><p class="lx-k">End of the tour</p><h2>The fleet is yours to fly.</h2><p class="lx-lede">Choose a destination and build the spacecraft for your mission.</p><a class="lx-btn lx-btn--go" href="#dash">To mission control ↓</a></div></section>
  <section class="lx-dash" id="dash" data-focus="dash">
    <p class="lx-k">Mission control</p><h2>Choose a mission.</h2>
    <p class="lx-lede">Each run goes Brief → Build → Launch → Operate → Debrief. First time? Start with HALO on Cadet.</p>
    <div class="lx-cards">${STORY.map(id => { const m = GAME[id], best = store().best?.[id]; return `<article class="lx-card" style="--acc:${m.accent}${m.accent2 ? `;--acc2:${m.accent2}` : ''}">
      <p class="lx-card__k"><span class="lx-dot" aria-hidden="true"></span>${esc(m.world)} · ${ROLE[id]}</p>
      <h3>${esc(m.name)}</h3><p>${esc(GOAL[id])}</p>
      <p class="lx-card__meta"><span>Challenge ${'●'.repeat(CHAL[id])}${'○'.repeat(3 - CHAL[id])}</span><span>${best != null ? `Best score ${best}` : 'Not flown yet'}</span></p>
      <div class="lx-row"><a class="lx-btn lx-btn--go" href="play.html?mission=${id}">Start mission</a><a class="lx-btn" href="explore.html?mission=${id}">Explore</a></div></article>`; }).join('')}</div>
  </section>`;
  const ORB = { astra: 'moon', earth: 'earth-day', lunaris: 'moon', mars: 'mars' };
  $('.lx-bodies').innerHTML = STORY.map((id, i) => `<li><a href="#ch-${id}" data-sheet="${id}" style="--acc:${GAME[id].accent}">
    <i class="lx-orb lx-orb--${id}" style="background-image:url(textures/sm/${ORB[id]}.jpg)" aria-hidden="true"></i>
    <span class="lx-card__n">0${i + 1}</span><b>${esc(GAME[id].name)}</b><em>${esc(GAME[id].world)}</em><small>${esc(CH[id].h)}</small></a></li>`).join('');
}

// ---------- archive
const ACHN = { first: 'First light', clean: 'Clean sheet', full: 'Full house', quiz: 'Know your stuff', tough: 'Iron hull', cheap: 'Shoestring', cmdr: 'Commander', perfect: 'Flight Director', grand: 'Four frontiers' };
function archive() {
  const s = store(), got = new Set(s.disc || []), best = s.best || {}, ach = new Set(s.ach || []);
  const total = ORDER.reduce((n, id) => n + GAME[id].discoveries.length, 0);
  $('#lx-stats').innerHTML = `<li><b>${s.flights || 0}</b><span>flights flown</span></li><li><b>${s.wins || 0}</b><span>missions succeeded</span></li><li><b>${got.size} / ${total}</b><span>discoveries</span></li><li><b>${ach.size} / ${Object.keys(ACHN).length}</b><span>achievements</span></li>`;
  $('#lx-ach').innerHTML = Object.entries(ACHN).map(([k, v]) => `<span class="${ach.has(k) ? 'on' : ''}">${esc(v)}</span>`).join('');
  $('#lx-arch').innerHTML = ORDER.map(id => {
    const m = GAME[id];
    return `<div class="lx-arch__m" style="--acc:${m.accent}"><h3>${esc(m.name)} <small>${best[id] != null ? `best score ${best[id]}` : 'not flown yet'}</small></h3>
      ${m.discoveries.map(x => got.has(x.id) ? `<article class="on"><b>${esc(x.title)}</b><p>${esc(x.text)}</p>${src(x.src)}</article>` : `<article><b>Locked</b><p>Complete "${esc(m.objectives.find(o => o.id === x.unlock)?.label || '')}" in ${esc(m.name)}.</p></article>`).join('')}</div>`;
  }).join('');
}

// ---------- 3D solar system that follows the story
async function sky() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2',{antialias:true,alpha:true});
  if (!context) return;
  const [THREE, {buildWorld,latLonToVec}, craftModule, {MISSIONS}, {RoomEnvironment}] = await Promise.all([
    import('../vendor/three.module.min.js'), import('./scene.js'), import('./craft.js'),
    import('./data.js'), import('../vendor/RoomEnvironment.js')
  ]);
  const {buildCraft,fullCfg} = craftModule;
  craftModule.setCraftEnv(null);
  const el = $('#lx-sky');
  const r = new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true});
  let resolution = innerWidth < 760 ? 1.1 : 1.5;
  const pixelRatio = () => Math.min(devicePixelRatio, resolution, Math.sqrt(2300000 / (innerWidth * innerHeight)));
  r.setPixelRatio(pixelRatio());
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  el.appendChild(r.domElement);
  const fallBack = () => {
    r.setAnimationLoop(null);
    el.replaceChildren();
    document.body.classList.add('lx-no3d');
    document.body.classList.remove('lx-pick');
    lbBox.classList.remove('on');
    tgt.classList.remove('on');
    mk.classList.remove('on');
  };
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.02, 3000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const sunLight = new THREE.PointLight(0xfff0dd, 2600, 0, 1.6); scene.add(sunLight);
  const pmrem = new THREE.PMREMGenerator(r); const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // stars
  const n = 4000, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(600 + Math.random() * 600); p.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0.75 })));
  // Milky Way: a soft band of dense, slightly tinted stars plus faint glow clouds along one great circle (illustrative)
  {
    const m = 9000, mp = new Float32Array(m * 3), mc = new Float32Array(m * 3), axis = new THREE.Vector3(0.35, 1, -0.25).normalize();
    const bA = new THREE.Vector3(1, 0, 0).cross(axis).normalize(), bB = axis.clone().cross(bA), tint = [[1, .92, .85], [.8, .87, 1], [1, 1, 1], [.95, .8, 1]];
    for (let i = 0; i < m; i++) {
      const a = Math.random() * Math.PI * 2, h = (Math.random() + Math.random() + Math.random() - 1.5) * 0.16, R = 900 + Math.random() * 200;
      const v = bA.clone().multiplyScalar(Math.cos(a)).addScaledVector(bB, Math.sin(a)).addScaledVector(axis, h).normalize().multiplyScalar(R);
      mp.set([v.x, v.y, v.z], i * 3); const c = tint[i % 4], k = 0.45 + Math.random() * 0.55; mc.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('color', new THREE.BufferAttribute(mc, 3));
    scene.add(new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false })));
    const cloud = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const hues = [0x6a5acd, 0x3a6ea5, 0xb07a5a, 0x7a4a9a, 0x2f5f8a];
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 + Math.random() * 0.2, v = bA.clone().multiplyScalar(Math.cos(a)).addScaledVector(bB, Math.sin(a)).addScaledVector(axis, (Math.random() - 0.5) * 0.12).normalize().multiplyScalar(1150);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, color: hues[i % hues.length], transparent: true, opacity: 0.16 + Math.random() * 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.copy(v); sp.scale.setScalar(260 + Math.random() * 260); scene.add(sp);
    }
  }
  // sun
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.2, 'rgba(255,190,110,.6)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uB: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uT; uniform float uB; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float mu = max(dot(vN,vV),0.0);
        float g = n(vP*4.0+uT*0.15)*0.6 + n(vP*10.0-uT*0.25)*0.4;
        vec3 core = vec3(1.0,0.96,0.86), limb = vec3(1.0,0.42,0.08);
        vec3 c = mix(limb, core, pow(mu, 0.45)) * (0.82 + 0.3*g);
        gl_FragColor = vec4(c*1.15*uB, 1.0); }`,
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 64, 48), sunMat); scene.add(sun);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a50, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })); corona.scale.setScalar(44); scene.add(corona);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sunGlow.scale.setScalar(24); scene.add(sunGlow);
  // illustrative scale: inner planets 20 units per AU, outer planets squeezed (log) so all eight fit one frame
  const dist = au => au <= 1.6 ? 20 * au : 30.5 + 14 * Math.log(au / 1.524);
  const orbitLines = [];
  const orbitLine = (a, e, color, op = 0.3, inc = 0) => {
    const pts = []; for (let i = 0; i <= 256; i++) { const t = i / 256 * Math.PI * 2; const rr = a * (1 - e * e) / (1 + e * Math.cos(t)); pts.push(new THREE.Vector3(Math.cos(t) * rr, Math.sin(t) * rr * Math.sin(inc), Math.sin(t) * rr * Math.cos(inc))); }
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })); l.userData.op = op; scene.add(l); orbitLines.push(l); return l;
  };
  const W = id => { const w = buildWorld(MISSIONS.find(m => m.id === id)); [...w.children].forEach(c => { if (c.geometry?.type === 'TorusGeometry' || c === w.userData.sat || c.userData.shell) w.remove(c); }); return w; };
  const loader = new THREE.TextureLoader();
  const planet = (name, size, extra) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    loader.load(`textures/planets/${name}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mat.map = t; mat.color.set(name === 'mercury' ? 0x5a5a5a : name === 'venus' ? 0x6a6458 : 0xffffff); mat.needsUpdate = true; });
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(size, 64, 48), mat)); extra?.(g, size); scene.add(g); return g;
  };
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 8; const g = c.getContext('2d');
    for (let x = 0; x < 512; x++) { const u = x / 512; const a = u < 0.08 ? 0 : (0.35 + 0.5 * Math.abs(Math.sin(u * 40) * Math.sin(u * 13))) * (u > 0.62 && u < 0.67 ? 0.1 : 1) * (u > 0.97 ? 0 : 1);
      g.fillStyle = `rgba(${210 + u * 30 | 0},${190 + u * 20 | 0},${150 + u * 10 | 0},${a})`; g.fillRect(x, 0, 1, 8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const PL = [ // name, AU, size (squeezed), period (relative), phase
    ['Mercury', 0.387, 0.5, 0.24, 1.2], ['Venus', 0.723, 0.9, 0.62, 3.0], ['Earth', 1, 1.1, 1, 0], ['Mars', 1.524, 0.8, 1.88, 2.1],
    ['Jupiter', 5.2, 3.2, 11.9, 4.2], ['Saturn', 9.58, 2.7, 29.5, 0.9], ['Uranus', 19.2, 1.8, 84, 2.6], ['Neptune', 30.1, 1.75, 165, 5.1]];
  const bodies = {}, labels = [];
  const lbBox = document.createElement('div'); lbBox.className = 'lx-plabels'; lbBox.setAttribute('aria-hidden', 'true'); document.body.appendChild(lbBox);
  PL.forEach(([name, au, size]) => {
    orbitLine(dist(au), 0, name === 'Earth' ? 0xa78bfa : name === 'Mars' ? 0xd0674c : 0x9aa3b2, name === 'Earth' || name === 'Mars' ? 0.45 : 0.18);
    let b;
    if (name === 'Earth') { b = W('earth'); b.scale.setScalar(size); scene.add(b); }
    else if (name === 'Mars') { b = W('mars'); b.scale.setScalar(size); scene.add(b); }
    else b = planet(name.toLowerCase(), size, name === 'Saturn' ? (g, s) => { const ring = new THREE.Mesh(new THREE.RingGeometry(s * 1.25, s * 2.3, 128, 1), new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
      const uv = ring.geometry.attributes.uv, pos = ring.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const rr = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (rr - s * 1.25) / (s * 1.05), 0.5); }
      ring.rotation.x = -Math.PI / 2 + 0.47; g.add(ring); } : null);
    bodies[name] = b;
    const lb = document.createElement('span'); lb.textContent = name; lbBox.appendChild(lb); labels.push({ b, lb, size });
  });
  // main asteroid belt between Mars and Jupiter (illustrative density)
  const belt = (() => { const m = 2600, bp = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) { const a = Math.random() * Math.PI * 2, rr = dist(2.1 + Math.random() * 1.2) + (Math.random() - 0.5) * 1.2; bp.set([Math.cos(a) * rr, (Math.random() - 0.5) * 0.9, Math.sin(a) * rr], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb8a58c, size: 0.16, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(pts); return pts; })();
  orbitLine(0.922 * 20, 0.191, 0x4aa8ff, 0.5, 0.06); // Apophis orbit, approximate (JPL Small-Body Database)
  const moon = W('lunaris'); moon.scale.setScalar(0.32); scene.add(moon);
  const apo = W('astra'); apo.scale.setScalar(0.32); scene.add(apo);
  const earth = bodies.Earth, mars = bodies.Mars;
  const focusBody = { astra: apo, earth, lunaris: moon, mars };
  const sizeOf = { astra: 0.32, earth: 1.1, lunaris: 0.32, mars: 0.8 };
  // Earth: thin, natural blue edge and less glare, so the surface reads (violet stays in the interface)
  const atmos = [];
  earth.traverse(o => { const u = o.material?.uniforms; if (u?.uStrength) { u.uStrength.value = 0.6; u.uPower.value = 3.6; atmos.push(u); } });
  const clouds = earth.children.find(c => c.userData.layer === 'clouds');
  // intro only: a thin sunrise limb, orange where the Sun is about to break through, fading to blue along the horizon
  const limb = new THREE.Mesh(new THREE.SphereGeometry(1.03, 128, 96), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(0, 0, 1) }, uI: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform vec3 uSun; uniform float uI; varying vec3 vN; varying vec3 vV;
      void main(){ float d = dot(vN, vV); float g = pow(clamp(1.0 + d, 0.0, 1.0), 14.0);
        float sf = clamp(dot(vN, uSun) * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(vec3(0.18, 0.42, 1.0), vec3(1.0, 0.62, 0.28), pow(sf, 6.0));
        gl_FragColor = vec4(col * g * (0.35 + 3.2 * pow(sf, 5.0)) * uI, 1.0); }`,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  limb.visible = false; earth.add(limb);
  const india = latLonToVec(23, 79, 1);
  const surf = earth.children.find(c => c.geometry?.parameters?.radius === 1), _ws = new THREE.Vector3();
  const earthR = () => (surf || earth).getWorldScale(_ws).x;
  // Targets marked on the surface: Jezero crater and the lunar south polar region (approximate positions, labelled as such)
  const marker = (body, lat, lon, color) => {
    const g = new THREE.Group(); g.position.copy(latLonToVec(lat, lon, 1.004));
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.position.clone().normalize());
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.095, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
    g.add(ring, dot); g.visible = false; body.add(g); return g;
  };
  const marks = { mars: marker(mars, 18.4, 77.5, 0xa9d4ff), lunaris: marker(moon, -88.5, 0, 0x9fe0ea) };
  const markLbl = { mars: 'Jezero crater (approximate)', lunaris: 'South polar region (marker approximate)' };
  // each stop shows its own mission spacecraft, in the locked spacecraft palette (never the mission accent)
  const crafts = {};
  for (const id of STORY) {
    const { group } = buildCraft(fullCfg(GAME[id]), GAME[id]);
    group.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.envMap = env; m.envMapIntensity = 0.8; }); });
    group.visible = false; scene.add(group); crafts[id] = group;
  }
  // one purposeful orbit cue per stop: a thin ring the spacecraft rides on
  const cue = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * Math.PI * 2), 0, Math.sin(i / 160 * Math.PI * 2)))), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  scene.add(cue);
  // large target name, placed in open space beside the body (never behind it, never cropped)
  const tgt = document.createElement('p'); tgt.className = 'lx-target'; tgt.setAttribute('aria-hidden', 'true'); document.body.appendChild(tgt); let tgtW = 0, tgtH = 0; addEventListener('resize', () => { tgt.dataset.k = ''; mk.dataset.k = ''; }); document.fonts?.ready.then(() => { tgt.dataset.k = ''; mk.dataset.k = ''; });
  const mk = document.createElement('p'); mk.className = 'lx-marklbl'; mk.setAttribute('aria-hidden', 'true'); document.body.appendChild(mk); let mkW = 0;
  let t0 = 0.9, focus = 'sun', shown = 'earth';
  const HERO = new THREE.Vector3(0, 62, 96);
  const camPos = HERO.clone(), camLook = new THREE.Vector3();
  const goal = { pos: camPos.clone(), look: new THREE.Vector3() };
  const craftPos = new THREE.Vector3(), craftGoal = new THREE.Vector3(), lastCraft = new THREE.Vector3();
  const resize = () => { r.setPixelRatio(pixelRatio()); r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { focus = e.target.dataset.focus; document.body.dataset.focus = focus; document.body.style.setProperty('--acc', GAME[focus]?.accent || '#ff7a3d'); } }), { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-focus]').forEach(s => io.observe(s));
  const clock = new THREE.Clock(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0), camUp = Y.clone(), flare = $('#lx-flare'), flareEls = flare ? [...flare.children] : [];
  let introT = 0, outT = 99, introWas = false, introRise = 0.1, introAlt = 0, sunS = 1;
  let first = true, frameN = 0, copyBox = null, cardBox = null, spin = {};
  const project = p => { v4.copy(p).project(cam); return { x: (v4.x * 0.5 + 0.5) * innerWidth, y: (-v4.y * 0.5 + 0.5) * innerHeight, z: v4.z }; };
  // click a mission world in the overview to preview its mission
  const pickBody = (x, y) => {
    if (document.body.classList.contains('lx-no3d') || focus !== 'sun' || document.body.classList.contains('lx-locked') || scrollY > innerHeight * 0.6) return null;
    let best = null, bd = 1e9;
    for (const [id, bb] of Object.entries(focusBody)) { if (!bb.visible) continue; const q = project(bb.position); if (q.z > 1) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < 38 && d < bd) { bd = d; best = id; } }
    return best;
  };
  const busy = t => t.closest?.('a,button,input,label,summary,select,.nx-status,.lx-sheet,.lx-brief,.lx-hero__copy');
  document.addEventListener('click', e => { if (busy(e.target)) return; const id = pickBody(e.clientX, e.clientY); if (id) window.__nxSheet?.(id); });
  let hov = null;
  document.addEventListener('pointermove', e => { const id = busy(e.target) ? null : pickBody(e.clientX, e.clientY); if (id !== hov) { hov = id; document.body.classList.toggle('lx-pick', !!id); } }, { passive: true });
  let aFt = 0, aFn = 0, lastFrame = -Infinity;
  const frameInterval = innerWidth < 760 || (navigator.hardwareConcurrency || 8) < 5 ? 1000 / 30 : 1000 / 60;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;fallBack();},{once:true});
  let lastFocus = '';
  const draw = now => {
    if (document.hidden || handingOff || document.querySelector('.lx-brief')) {
      clock.getDelta();
      return;
    }
    if (focus === 'dash' && focus === lastFocus && now-lastFrame < 1000/20) return;
    if (now - lastFrame < frameInterval - 1.5) return;
    lastFocus = focus;
    lastFrame = now;
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.06);
    aFt += Math.min(rawDt, .1); aFn++;
    if (aFn >= 60) {
      if (focus !== 'dash' && aFt / aFn > frameInterval / 1000 * 1.35 && resolution > .8) {
        resolution = Math.max(.8, resolution - .2);
        resize();
      }
      aFt = 0; aFn = 0;
    }
    if (!reduced) t0 += dt * 0.03;
    sunMat.uniforms.uT.value += dt;
    const key = focus === 'exit' ? 'mars' : focus, stop = !!focusBody[key];
    PL.forEach(([name, au, , period, phase]) => { const a = t0 / period + phase, d = dist(au); bodies[name].position.set(Math.cos(a) * d, 0, Math.sin(a) * d); });
    { const t = t0 / 0.886 + 0.25, a = 0.922 * 20, e = 0.191, rr = a * (1 - e * e) / (1 + e * Math.cos(t)); apo.position.set(Math.cos(t) * rr, Math.sin(t) * rr * Math.sin(0.06), Math.sin(t) * rr * Math.cos(0.06)); }
    moon.position.copy(earth.position).add(v3.set(Math.cos(t0 * 12) * 2.6, 0, Math.sin(t0 * 12) * 2.6));
    const narrow = innerWidth < 760, introOn = document.body.classList.contains('lx-locked');
    // at a stop only the target is drawn: no other planets, no heliocentric orbit lines
    Object.values(bodies).forEach(b => { b.visible = !stop || b === focusBody[key]; });
    moon.visible = !stop || key === 'lunaris'; apo.visible = !stop || key === 'astra';
    orbitLines.forEach(l => { l.visible = !stop && !introOn; }); belt.visible = !stop && !introOn;
    if (introOn) Object.entries(bodies).forEach(([nm, bd]) => { bd.visible = nm === 'Earth'; });
    [corona, sunGlow].forEach(o => { o.visible = !stop; });
    if (!stop && !introOn) { if (focus !== 'dash') [earth, mars, moon, apo, ...['Mercury', 'Venus', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map(n => bodies[n])].forEach(b => { b.rotation.y += dt * 0.15; }); }
    let b = null, size = 1, side = new THREE.Vector3(), off = new THREE.Vector3();
    if (!stop) {
      goal.pos.copy(HERO).multiplyScalar(narrow ? 1.5 : 1); goal.look.set(narrow ? 0 : -19, narrow ? 0 : 3, 0);
      craftGoal.copy(earth.position).add(v3.set(0, 2.5, 0));
    } else {
      b = focusBody[key]; size = sizeOf[key];
      // stand on the sunlit side, a little off the Sun line, so the target is mostly lit and the shading reads
      const toSun = b.position.clone().multiplyScalar(-1).normalize(), tangent = new THREE.Vector3(-toSun.z, 0, toSun.x);
      const lunar = key === 'lunaris';
      off.copy(toSun).multiplyScalar(lunar ? 0.42 : 0.75).addScaledVector(tangent, lunar ? 0.9 : 0.62).add(new THREE.Vector3(0, lunar ? -0.85 : 0.35, 0)).normalize()
        .multiplyScalar(size * (narrow ? (lunar ? 5.2 : 9) : (lunar ? 4.3 : key === 'astra' ? 8.2 : 6.5))); // the Moon is framed closer so crater relief and the shadow line read
      goal.pos.copy(b.position).add(off);
      side.crossVectors(off, new THREE.Vector3(0, 1, 0)).normalize();
      goal.look.copy(b.position).addScaledVector(side, narrow ? 0 : size * (lunar ? 1.1 : 2.2)).add(new THREE.Vector3(0, narrow ? -size * 0.9 : 0, 0));
      // turn the target so its marker faces the camera (Mars: Jezero; Moon: south pole is seen from below)
      const m = marks[key];
      if (m) { const d = off.clone().normalize(); const want = Math.atan2(m.position.z, m.position.x) - Math.atan2(d.z, d.x); spin[key] = spin[key] ?? b.rotation.y; spin[key] += Math.atan2(Math.sin(want - spin[key]), Math.cos(want - spin[key])) * Math.min(1, dt * 2); b.rotation.y = spin[key]; }
      else b.rotation.y += dt * 0.05;
      // the craft rides a thin ring around the target, on the side nearest the camera, payload pointed at the target
      const ringR = size * (key === 'astra' ? 1.7 : lunar ? 1.3 : 1.6), toCam = off.clone().normalize();
      // ring tilted toward the camera so it reads as an orbit; craft sits on its upper arc, clear of the copy card
      const n = toCam.clone().add(new THREE.Vector3(0, 1.4, 0)).normalize(), e1 = side.clone(), e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
      if (e2.y < 0) e2.negate();
      const a = focus === 'exit' ? 0 : lunar ? 1.25 : 0.5;
      craftGoal.copy(b.position).addScaledVector(e2, Math.cos(a) * ringR).addScaledVector(e1, Math.sin(a) * ringR).addScaledVector(toCam, ringR * 0.55); // in front of the body, never hidden behind it
      if (focus === 'exit') craftGoal.addScaledVector(side, -size * 30).add(new THREE.Vector3(0, size * 6, -size * 20));
      cue.position.copy(b.position); cue.scale.setScalar(ringR); cue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    }
    cue.visible = stop && focus !== 'exit'; cue.material.color.set(GAME[key]?.accent || '#ffffff'); cue.material.opacity = 0.35;
    Object.entries(marks).forEach(([k, m]) => { m.visible = stop && k === key; });
    if (introOn) {
      // orbital sunrise: low over Earth's night side, the Sun climbing over the limb (illustrative view)
      introT += Math.min(rawDt, 0.5); outT = 0; introWas = true;
      const R = earthR(), D = R * 1.12, dip = Math.acos(R / D), sDir = v3.copy(earth.position).negate().normalize();
      // the Sun's height above the limb eases from hidden to half its disc showing (measured each frame, so it works at any screen size)
      const wantAlt = reduced ? 0.01 : -0.07 + 0.08 * (1 - Math.exp(-introT / 2.4));
      introRise += (wantAlt - introAlt) * (first ? 1 : 0.7); const rise = introRise;
      const q = new THREE.Vector3().crossVectors(sDir, Y).normalize().multiplyScalar(narrow ? 0.9 : 0.9).addScaledVector(Y, 0.42).normalize();
      const el = -dip + rise, nUp = sDir.clone().multiplyScalar(Math.sin(el)).addScaledVector(q, Math.cos(el)).normalize();
      camPos.copy(earth.position).addScaledVector(nUp, D);
      const sC = sun.position.clone().sub(camPos).normalize(), f0 = sC.addScaledVector(nUp, -sC.dot(nUp)).normalize();
      const pitch = dip - (narrow ? 0.26 : 0.2), f = f0.multiplyScalar(Math.cos(pitch)).addScaledVector(nUp, -Math.sin(pitch));
      camLook.copy(camPos).add(f); camUp.copy(nUp);
      // turn Earth so the subcontinent's city lights sit under the camera, drifting slowly eastward
      earth.rotation.y = Math.atan2(india.z, india.x) - Math.atan2(nUp.z, nUp.x) - 0.32 + introT * 0.006;
    } else {
      outT += Math.min(rawDt, 0.5);
      const k = reduced || first ? 1 : 1 - Math.pow(outT < 3.2 && introWas ? 0.3 : 0.04, dt);
      camPos.lerp(goal.pos, k); camLook.lerp(goal.look, k); camUp.lerp(Y, k).normalize();
    }
    cam.position.copy(camPos); cam.up.copy(camUp); cam.lookAt(camLook); cam.updateMatrixWorld();
    { const sd = v3.copy(sun.position).sub(earth.position).normalize().transformDirection(cam.matrixWorldInverse); atmos.forEach(u => { u.uSun.value.copy(sd); u.uSunOn.value = 1; }); limb.material.uniforms.uSun.value.copy(sd); }
    limb.visible = introOn; if (clouds) clouds.visible = !introOn;
    if (surf) { const m = surf.material; // sunrise shot: no grazing glints or bump ridges flickering along the horizon
      m.roughness = introOn ? 4 : 2; if (m.bumpMap) m.bumpScale = introOn ? 0 : 1.6; if (m.map) m.color.setScalar(introOn ? 0.3 : 1); }
    atmos.forEach(u => { u.uStrength.value = introOn ? 0.22 : 0.6; });
    corona.material.opacity = introOn ? 0.3 : 0.5; sunS += ((introOn ? 0.28 : 1) - sunS) * (introOn ? 1 : Math.min(1, dt * 1.5)); sun.scale.setScalar(sunS); sunMat.uniforms.uB.value = introOn ? 4 : 1; sunGlow.scale.setScalar(24 * (0.5 + sunS * 0.5)); moon.visible = moon.visible && !introOn;
    // lens flare over the intro, strongest as the Sun clears the limb
    if (introOn && flare) {
      const sq = project(sun.position), toE = earth.position.clone().sub(cam.position), dE = toE.length(), angR = Math.asin(Math.min(1, earthR() / dE));
      const sep = toE.normalize().angleTo(sun.position.clone().sub(cam.position).normalize()); introAlt = sep - angR; const vis = Math.max(0, Math.min(1, (introAlt + 0.045) / 0.05));
      const cx = innerWidth / 2, cy = innerHeight / 2;
      // while the Sun's centre is still below the limb, anchor the flare at the horizon point beneath it
      let q = sq;
      if (introAlt < 0) { const vdir = earth.position.clone().sub(cam.position).normalize(), sdir = sun.position.clone().sub(cam.position).normalize(), ax = vdir.clone().cross(sdir).normalize(); q = project(cam.position.clone().addScaledVector(vdir.applyAxisAngle(ax, angR + 0.004), 5)); }
      flare.style.setProperty('--fl', (q.z < 1 ? vis : 0).toFixed(3));
      flareEls.forEach((e, i) => { const t = +e.dataset.k; e.style.transform = `translate(${q.x + (cx - q.x) * t}px, ${q.y + (cy - q.y) * t}px) translate(-50%, -50%)`; });
    }
    // craft: the current mission's own spacecraft; travels between stops, points along its motion, fires its engine while moving fast
    const want = stop ? key : 'earth';
    if (want !== shown) { crafts[shown].visible = false; shown = want; }
    const craft = crafts[shown]; craft.visible = !introOn;
    lastCraft.copy(craftPos);
    craftPos.lerp(craftGoal, reduced || first ? 1 : 1 - Math.pow(focus === 'exit' ? 0.3 : 0.15, dt));
    craft.position.copy(craftPos);
    const sp = craftPos.distanceTo(lastCraft) / Math.max(dt, 1e-3);
    const sc = stop ? 0.13 * size : 0.09;
    if (sp > sc * 6 || focus === 'exit') { const ahead = craftPos.clone().add(craftPos.clone().sub(lastCraft)); craft.up.set(0, 1, 0); craft.lookAt(ahead); }
    else if (b) { craft.up.set(0, 1, 0); craft.lookAt(b.position); } // payload (+z) toward the target
    else craft.rotation.y += dt * 0.2;
    const plume = craft.userData.plume; if (plume) plume.material.opacity = sp > sc * 8 ? Math.min(0.9, sp / (sc * 40)) : 0;
    craft.scale.setScalar(sc);
    // planet labels only on the overview
    const showLabels = focus === 'sun' && !introOn && !(introWas && outT < 3.4);
    if (showLabels && (frameN++ % 20 === 0)) { const a = $('.lx-hero__copy h2')?.getBoundingClientRect(), bb = $('.lx-hero .lx-row')?.getBoundingClientRect() || a, rg = document.createRange(); rg.selectNodeContents($('.lx-hero__copy .lx-lede')); const c = rg.getBoundingClientRect(); copyBox = a && { left: a.left, right: Math.max(c.right, a.left + 380), top: a.top - 30, bottom: Math.max(bb.bottom, c.bottom) }; }
    lbBox.classList.toggle('on', showLabels);
    if (showLabels) labels.forEach(({ b: pb, lb, size: ps }) => { v3.copy(pb.position); v3.y += ps + 0.8; const q = project(v3); lb.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, -100%)`; lb.style.opacity = q.z < 1 && !(copyBox && q.x > copyBox.left - 30 && q.x < copyBox.right + 30 && q.y > copyBox.top && q.y < copyBox.bottom + 16) ? 1 : 0; });
    // target name in open space: above the body if there is room, otherwise beside it, always inside the screen and clear of the text card
    if (stop && focus !== 'exit') {
      if (frameN++ % 15 === 0) cardBox = $(`#ch-${key} .lx-ch__copy`)?.getBoundingClientRect();
      const c = project(b.position); v3.copy(cam.up).applyQuaternion(cam.quaternion).normalize();
      const top = project(b.position.clone().add(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).multiplyScalar(size)));
      const rad = Math.abs(c.y - top.y);
      if (tgt.dataset.k !== key) { tgt.dataset.k = key; tgt.textContent = CH[key].world; tgt.style.setProperty('--acc', GAME[key].accent); tgtW = tgt.offsetWidth; tgtH = tgt.offsetHeight; }
      const w = tgtW, h = tgtH, pad = 14;
      let x = c.x - w / 2, y = c.y - rad - h - 18;
      if (y < 84) { y = Math.max(84, c.y - h / 2); x = c.x + rad + 24; if (x + w > innerWidth - pad) x = c.x - rad - 24 - w; }
      x = Math.max(pad, Math.min(innerWidth - w - pad, x)); y = Math.max(84, Math.min(innerHeight - h - pad, y));
      if (cardBox && x < cardBox.right + 12 && x + w > cardBox.left && y < cardBox.bottom && y + h > cardBox.top) { // move off the text card
        if (narrow) y = cardBox.top - h - 12; else x = Math.min(innerWidth - w - pad, cardBox.right + 24);
      }
      tgt.style.transform = `translate(${x}px, ${y}px)`; tgt.classList.toggle('on', y >= 70);
      const m = marks[key];
      if (m) { const mp = new THREE.Vector3(); m.getWorldPosition(mp); const q = project(mp); const facing = mp.clone().sub(b.position).normalize().dot(cam.position.clone().sub(mp).normalize()) > 0.15;
        if (mk.dataset.k !== key) { mk.dataset.k = key; mk.textContent = markLbl[key]; mkW = mk.offsetWidth; } const mw = mkW; mk.style.transform = `translate(${q.x + 14 + mw > innerWidth - 10 ? q.x - 14 - mw : q.x + 14}px, ${Math.min(innerHeight - 34, q.y - 10)}px)`; const qx = q.x + 14 + mw > innerWidth - 10 ? q.x - 14 - mw : q.x + 14, overCard = cardBox && qx < cardBox.right && qx + mw > cardBox.left && q.y < cardBox.bottom && q.y > cardBox.top - 20;
        mk.classList.toggle('on', facing && !overCard && qx > 4); }
      else mk.classList.remove('on');
    } else { tgt.classList.remove('on'); mk.classList.remove('on'); }
    first = false;
    try {
      r.render(scene, cam);
      document.body.classList.remove('lx-no3d');
    } catch(error) {
      console.warn('Using the static Solar System illustration.',error);
      fallBack();
      failed = true;
    }
  };
  let failed = false;
  r.setAnimationLoop(draw);
  addEventListener('pagehide', () => r.setAnimationLoop(null));
  // leaving for another page: stop drawing at once so the next page gets the whole GPU while it loads
  addEventListener('nx-leave', () => r.setAnimationLoop(null));
  document.addEventListener('click', e => { const a = e.target.closest?.('a[href]'); if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute('href'); if (!href || href.startsWith('#') || href.startsWith('http')) return;
    setTimeout(() => { if (!e.defaultPrevented) r.setAnimationLoop(null); }, 0); });
  addEventListener('pageshow', event => {
    if (event.persisted && !failed) {
      lastFrame = -Infinity;
      clock.getDelta();
      r.setAnimationLoop(draw);
    }
  });
}

// ---------- mission preview sheet (hero cards and the planets in the 3D view)
const DIFF_HINT = { earth: 'Good first mission. Try Cadet.', astra: 'Timing matters: map before and after the flyby.', lunaris: 'Hardest power budget. Long shadows.', mars: 'Data is the bottleneck. Plan your downlink.' };
let sheetExitTimer;
function openSheet(id) {
  const m = GAME[id], c = CH[id]; if (!m) return;
  let sh = $('#lx-sheet');
  if (!sh) { sh = document.createElement('aside'); sh.id = 'lx-sheet'; sh.className = 'lx-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'false'); document.body.appendChild(sh); }
  clearTimeout(sheetExitTimer);
  sh.style.setProperty('--acc', m.accent);
  sh.innerHTML = `<button class="lx-sheet__x" type="button" aria-label="Close">×</button>
    <p class="lx-sheet__k">${esc(c.label)}</p>
    <h3>${esc(m.name)}</h3>
    <p class="lx-sheet__q">${esc(c.h)}</p>
    <p class="lx-sheet__sub">${esc(c.sub)}</p>
    <h4>Objectives</h4>
    <ul class="lx-sheet__obj">${m.objectives.map(o => `<li>${esc(o.label)}</li>`).join('')}</ul>
    <p class="lx-sheet__meta"><span>Research lead · ${esc(m.owner)}</span><span>${esc(DIFF_HINT[id])}</span></p>
    <div class="lx-row"><button class="lx-btn lx-btn--go" type="button" data-brief="${id}">Start mission</button><a class="lx-btn" href="explore.html?mission=${id}">Explore ${esc(m.world)}</a><a class="lx-btn" href="#ch-${id}" data-close>See the stop</a></div>`;
  sh.hidden = false;
  const showFrame = requestAnimationFrame(() => sh.classList.add('on'));
  const close = () => {
    cancelAnimationFrame(showFrame);
    sh.classList.remove('on');
    clearTimeout(sheetExitTimer);
    sheetExitTimer = setTimeout(() => { sh.hidden = true; }, reduced ? 0 : 250);
  };
  sh.querySelector('.lx-sheet__x').onclick = close; sh.querySelector('[data-close]').onclick = close;
  sh.querySelector('[data-brief]').onclick = () => { close(); brief(id); };
  sh.querySelector('h3').setAttribute('tabindex', '-1'); sh.querySelector('h3').focus();
  sh.onkeydown = e => { if (e.key === 'Escape') close(); };
}
window.__nxSheet = openSheet;

// ---------- briefing (typed), then a skippable 3-2-1 countdown into the game
function brief(id) {
  const m = GAME[id], c = CH[id];
  if (!m || document.querySelector('.lx-brief')) return;
  preloadGame();
  const prev = document.activeElement;
  const mo = document.createElement('div'); mo.className = 'lx-brief'; mo.style.setProperty('--acc', m.accent);
  mo.innerHTML = `<div class="lx-brief__card" role="dialog" aria-modal="true" aria-labelledby="lx-brief-t">
    <p class="lx-brief__k"><i></i> Incoming briefing · VEGA, mission control</p>
    <h3 id="lx-brief-t">${esc(m.name)} <span>· ${esc(m.world)}</span></h3>
    <p class="lx-brief__txt"></p>
    <dl class="lx-brief__kv"><div><dt>Objective</dt><dd>${esc(m.objectives[0].label)}${m.objectives.length > 1 ? ` + ${m.objectives.length - 1} more` : ''}</dd></div><div><dt>Your role</dt><dd>Flight director: design, launch and fly the spacecraft</dd></div><div><dt>Research lead</dt><dd>${esc(m.owner)}</dd></div></dl>
    <div class="lx-row"><button class="lx-btn lx-btn--go" type="button" data-go>Start mission</button><button class="lx-btn" type="button" data-x>Not now</button></div>
  </div>`;
  document.body.appendChild(mo);
  const full = `${c.h} ${c.sub} ${m.tagline} Only data that reaches Earth counts. Good luck.`;
  const txt = mo.querySelector('.lx-brief__txt');
  txt.textContent = full;
  const close = () => { mo.remove(); prev?.focus?.({preventScroll:true}); };
  mo.querySelector('[data-x]').onclick = close;
  mo.addEventListener('click', e => { if (e.target === mo) close(); });
  mo.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const f = [...mo.querySelectorAll('button')]; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); } } });
  mo.querySelector('[data-go]').onclick = () => countdown(mo, id);
  mo.querySelector('[data-go]').focus();
}
function countdown(mo, id) {
  const url = `play.html?mission=${id}`;
  const go = () => {
    if (handingOff) return;
    handingOff = true;
    clearInterval(handoffTimer);
    dispatchEvent(new Event('nx-leave'));
    location.assign(url);
  };
  if (reduced) { go(); return; }
  mo.classList.add('lx-brief--handoff');
  mo.innerHTML = `<div class="lx-count"><b aria-hidden="true">3</b><p role="status">Systems go</p><button class="lx-btn" type="button">Skip countdown</button></div>`;
  const b = mo.querySelector('b'), p = mo.querySelector('p');
  let n = 3;
  const pulse = () => b.animate([{opacity:.5,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:550,easing:'ease-out'});
  const skip = mo.querySelector('button');
  skip.onclick = go;
  skip.focus();
  pulse();
  handoffTimer = setInterval(() => {
    n--;
    if (n === 0) { go(); return; }
    b.textContent = n;
    p.textContent = n === 2 ? 'Arrays stowed' : 'Handing over to you';
    pulse();
  }, 620);
}
// every "play this mission" link on the home page opens the briefing first
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href^="play.html?mission="]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
  const id = new URL(a.href, location.href).searchParams.get('mission'); if (!GAME[id]) return;
  e.preventDefault(); brief(id);
});

for (const event of ['pointerover','focusin']) {
  document.addEventListener(event, e => {
    if(e.target.closest?.('a[href^="play.html"]')) preloadGame();
  },{passive:true});
}
chapters(); archive();
if (location.hash === '#team') {
  $('#lx-intro').hidden = true;
  $('#team').scrollIntoView();
} else {
  intro();
}
sky().catch(error=>{
  console.warn('Using the static Solar System illustration.',error);
  $('#lx-sky').replaceChildren();
});
document.querySelectorAll('[data-sheet]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openSheet(a.dataset.sheet); }));
import('./status.js').then(async ({ mountStatus }) => { const { Music } = await import('./music.js'); mountStatus({ music: new Music() }); });
$('#lx-replay').onclick = () => intro(true);
addEventListener('pagehide', () => clearInterval(handoffTimer));
addEventListener('pageshow', event => {
  handingOff = false;
  if (event.persisted) document.querySelector('.lx-brief')?.remove();
  archive();
});
