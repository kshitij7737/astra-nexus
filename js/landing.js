// NEXUS//04 landing: intro, eight-planet solar system, the spacecraft's route story, mission dashboard, archive.
import { GAME, ORDER } from './game-data.js';
import { SOURCES } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = k => SOURCES[k] ? `<a class="lx-src" href="${SOURCES[k].url}" target="_blank" rel="noopener">${esc(SOURCES[k].title)}</a>` : '';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = () => { try { return JSON.parse(localStorage.getItem('nexus04') || '{}'); } catch { return {}; } };

const CH = {
  astra: { k: 'The close pass', h: 'A 340 metre asteroid will pass closer than our satellites.', facts: [['340 m', 'mean width', 'apophisFacts'], ['13 Apr 2029', 'closest pass', 'apophis'], ['~32,000 km', 'from Earth\'s surface', 'apophis']] },
  lunaris: { k: 'The coldest ground', h: 'Some Moon craters have never seen the Sun.', facts: [['~35 K', 'measured by Diviner', 'lroSys'], ['2009', 'LRO launched', 'lro'], ['7', 'LRO instruments', 'lroNtrs']] },
  earth: { k: 'The thin blue line', h: 'Watch the air that keeps us alive.', facts: [['705 km', 'Aura\'s orbit', 'aura'], ['1 to 2 d', 'MODIS whole-Earth coverage', 'modis'], ['13 x 24 km', 'OMI pixel', 'omiData']] },
  mars: { k: 'The dry lake', h: 'An ancient lake, read from orbit.', facts: [['0.3 m', 'HiRISE pixel scale, best case', 'mroHuman'], ['~6 m', 'CTX pixel scale', 'ctxMsss'], ['6 Mb/s', 'MRO peak downlink', 'mroHuman']] },
};

// ---------- intro
function intro(force) {
  const el = $('#lx-intro');
  let seen = false; try { seen = sessionStorage.getItem('nx-intro') === '1'; } catch { /* ignore */ }
  if (seen && !force) { el.hidden = true; return; }
  el.hidden = false; el.classList.remove('is-out'); document.body.classList.add('lx-locked');
  $('#lx-enter').focus();
  $('#lx-enter').onclick = () => {
    try { sessionStorage.setItem('nx-intro', '1'); } catch { /* ignore */ }
    el.classList.add('is-out'); document.body.classList.remove('lx-locked');
    setTimeout(() => { el.hidden = true; }, reduced ? 0 : 900);
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
        <p class="lx-k">Stop ${i + 1} of 4 · ${esc(c.k)}</p>
        <p class="lx-ch__name">${esc(m.name)} <span>· ${esc(m.world)} · research lead ${esc(m.owner)}</span></p>
        <h2>${esc(c.h)}</h2>
        <ul class="lx-facts">${c.facts.map(([v, l, s]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span>${src(s)}</li>`).join('')}</ul>
        <div class="lx-row"><a class="lx-btn lx-btn--go" href="play.html?mission=${id}">Play ${esc(m.name)}</a><a class="lx-btn" href="explore.html?mission=${id}">Explore ${esc(m.world)}</a></div>
      </div>
      <p class="lx-giant" aria-hidden="true">${esc(m.world)}</p>
    </section>`;
  }).join('') + `<section class="lx-ch lx-handoff" data-focus="exit"><div class="lx-ch__copy"><p class="lx-k">End of the tour</p><h2>The spacecraft is yours now.</h2><p class="lx-lede">It leaves Mars behind. Mission control takes over below: pick where it goes next.</p><a class="lx-btn lx-btn--go" href="#dash">To mission control ↓</a></div></section>
  <section class="lx-dash" id="dash" data-focus="dash">
    <p class="lx-k">Mission control</p><h2>Choose a mission.</h2>
    <p class="lx-lede">Each run goes Brief → Build → Launch → Operate → Debrief. First time? Start with HALO on Cadet.</p>
    <div class="lx-cards">${STORY.map(id => { const m = GAME[id], best = store().best?.[id]; return `<article class="lx-card" style="--acc:${m.accent}${m.accent2 ? `;--acc2:${m.accent2}` : ''}">
      <p class="lx-card__k"><span class="lx-dot" aria-hidden="true"></span>${esc(m.world)} · ${ROLE[id]}</p>
      <h3>${esc(m.name)}</h3><p>${esc(GOAL[id])}</p>
      <p class="lx-card__meta"><span>Challenge ${'●'.repeat(CHAL[id])}${'○'.repeat(3 - CHAL[id])}</span><span>${best != null ? `Best score ${best}` : 'Not flown yet'}</span></p>
      <div class="lx-row"><a class="lx-btn lx-btn--go" href="play.html?mission=${id}">Start mission</a><a class="lx-btn" href="explore.html?mission=${id}">Explore</a></div></article>`; }).join('')}</div>
  </section>`;
  $('.lx-bodies').innerHTML = STORY.map((id, i) => `<li><a href="#ch-${id}" style="--acc:${GAME[id].accent}"><span>0${i + 1}</span><b>${esc(GAME[id].name)}</b><em>${esc(GAME[id].world)}</em></a></li>`).join('');
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
  let THREE, buildWorld, buildCraft, lightCraft;
  try {
    THREE = await import('../vendor/three.module.min.js');
    ({ buildWorld } = await import('./scene.js'));
    ({ buildCraft, lightCraft } = await import('./game3d.js'));
    const c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
  } catch (e) { document.body.classList.add('lx-no3d'); return; }
  const { MISSIONS } = await import('./data.js');
  const el = $('#lx-sky');
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; el.appendChild(r.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.02, 3000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const sunLight = new THREE.PointLight(0xfff0dd, 2600, 0, 1.6); scene.add(sunLight);
  const { RoomEnvironment } = await import('../vendor/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(r); const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // stars
  const n = 4000, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(600 + Math.random() * 600); p.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0.75 })));
  // sun
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.2, 'rgba(255,190,110,.6)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float mu = max(dot(vN,vV),0.0);
        float g = n(vP*4.0+uT*0.15)*0.6 + n(vP*10.0-uT*0.25)*0.4;
        vec3 core = vec3(1.0,0.96,0.86), limb = vec3(1.0,0.42,0.08);
        vec3 c = mix(limb, core, pow(mu, 0.45)) * (0.82 + 0.3*g);
        gl_FragColor = vec4(c*1.15, 1.0); }`,
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 64, 48), sunMat); scene.add(sun);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a50, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })); corona.scale.setScalar(44); scene.add(corona);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sunGlow.scale.setScalar(24); scene.add(sunGlow);
  // illustrative scale: inner planets 20 units per AU, outer planets squeezed (log) so all eight fit one frame
  const dist = au => au <= 1.6 ? 20 * au : 30.5 + 14 * Math.log(au / 1.524);
  const orbitLine = (a, e, color, op = 0.3, inc = 0) => {
    const pts = []; for (let i = 0; i <= 256; i++) { const t = i / 256 * Math.PI * 2; const rr = a * (1 - e * e) / (1 + e * Math.cos(t)); pts.push(new THREE.Vector3(Math.cos(t) * rr, Math.sin(t) * rr * Math.sin(inc), Math.sin(t) * rr * Math.cos(inc))); }
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })); scene.add(l); return l;
  };
  const W = id => { const w = buildWorld(MISSIONS.find(m => m.id === id)); [...w.children].forEach(c => { if (c.geometry?.type === 'TorusGeometry' || c === w.userData.sat || c.userData.shell) w.remove(c); }); return w; };
  const loader = new THREE.TextureLoader();
  const planet = (name, size, extra) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    loader.load(`textures/planets/${name}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
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
  orbitLine(0.922 * 20, 0.191, 0x4aa8ff, 0.5, 0.06); // Apophis orbit, approximate (JPL Small-Body Database)
  const moon = W('lunaris'); moon.scale.setScalar(0.32); scene.add(moon);
  const apo = W('astra'); apo.scale.setScalar(0.32); scene.add(apo);
  const earth = bodies.Earth, mars = bodies.Mars;
  const focusBody = { astra: apo, earth, lunaris: moon, mars };
  const sizeOf = { astra: 0.32, earth: 1.1, lunaris: 0.32, mars: 0.8 };
  // the spacecraft (same model and colours as in the game)
  const { group: craft } = buildCraft({ solar: 'L', battery: 'S', radio: 'L', recorder: 'S', propKg: 80, inst: [] }, GAME.earth);
  lightCraft(craft, env);
  // A neutral fill makes the antenna and blue arrays legible against the dark sky.
  const craftFill = new THREE.PointLight(0xe3eeff, 0.1);
  craftFill.distance = 0.8;
  scene.add(craftFill);
  craft.scale.setScalar(0.09);
  scene.add(craft);
  const plume = craft.userData.plume;
  let t0 = 0.9, focus = 'sun';
  const HERO = new THREE.Vector3(0, 62, 96);
  const camPos = HERO.clone(), camLook = new THREE.Vector3();
  const goal = { pos: camPos.clone(), look: new THREE.Vector3() };
  const craftPos = new THREE.Vector3(), craftGoal = new THREE.Vector3(), lastCraft = new THREE.Vector3();
  const resize = () => { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { focus = e.target.dataset.focus; document.body.dataset.focus = focus; document.body.style.setProperty('--acc', GAME[focus]?.accent || '#ff7a3d'); } }), { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-focus]').forEach(s => io.observe(s));
  const clock = new THREE.Clock(), v3 = new THREE.Vector3();
  let first = true, frameN = 0, copyBox = null;
  r.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) t0 += dt * 0.03;
    sunMat.uniforms.uT.value += dt;
    PL.forEach(([name, au, , period, phase]) => { const a = t0 / period + phase, d = dist(au); bodies[name].position.set(Math.cos(a) * d, 0, Math.sin(a) * d); bodies[name].rotation.y += dt * 0.15; });
    { const t = t0 / 0.886 + 0.25, a = 0.922 * 20, e = 0.191, rr = a * (1 - e * e) / (1 + e * Math.cos(t)); apo.position.set(Math.cos(t) * rr, Math.sin(t) * rr * Math.sin(0.06), Math.sin(t) * rr * Math.cos(0.06)); }
    moon.position.copy(earth.position).add(v3.set(Math.cos(t0 * 12) * 2.6, 0, Math.sin(t0 * 12) * 2.6));
    [moon, apo].forEach(b => b.rotation.y += dt * 0.2);
    // camera and spacecraft goals per section
    const narrow = innerWidth < 760;
    if (focus === 'sun' || focus === 'dash') {
      goal.pos.copy(HERO).multiplyScalar(narrow ? 1.5 : 1); goal.look.set(narrow ? 0 : -14, 0, 0);
      craftGoal.copy(earth.position).add(v3.set(0, 2.5, 0));
    } else {
      const key = focus === 'exit' ? 'mars' : focus, b = focusBody[key], size = sizeOf[key];
      // stand on the sunlit side, a little off the Sun line, so each world is mostly lit and the Sun stays behind the camera
      const toSun = b.position.clone().multiplyScalar(-1).normalize(), tangent = new THREE.Vector3(-toSun.z, 0, toSun.x);
      const off = v3.copy(toSun).multiplyScalar(0.75).addScaledVector(tangent, 0.62).add(new THREE.Vector3(0, 0.35, 0)).normalize().multiplyScalar(size * (narrow ? 9 : 6.5));
      goal.pos.copy(b.position).add(off);
      const side = new THREE.Vector3().crossVectors(off, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(narrow ? 0 : size * 2.2);
      goal.look.copy(b.position).add(side);
      if (focus === 'exit') craftGoal.copy(goal.pos).add(side.clone().normalize().multiplyScalar(-size * 30)).add(new THREE.Vector3(0, size * 6, -size * 20)); // flies out of frame
      else craftGoal.copy(b.position).addScaledVector(off, 0.3).addScaledVector(side.clone().normalize(), size * 1.25).add(new THREE.Vector3(0, size * 0.55, 0));
    }
    const k = reduced || first ? 1 : 1 - Math.pow(0.04, dt);
    camPos.lerp(goal.pos, k); camLook.lerp(goal.look, k);
    cam.position.copy(camPos); cam.lookAt(camLook);
    // craft: travels between stops, points along its motion, fires its engine while moving fast
    lastCraft.copy(craftPos);
    craftPos.lerp(craftGoal, reduced || first ? 1 : 1 - Math.pow(focus === 'exit' ? 0.3 : 0.15, dt));
    craft.position.copy(craftPos);
    craftFill.position.copy(craftPos).add(v3.set(-0.14, 0.23, 0.18));
    const sp = craftPos.distanceTo(lastCraft) / Math.max(dt, 1e-3);
    if (reduced || first) craft.rotation.set(0.42, -0.5, -0.12);
    else if (sp > 0.05) { const ahead = craftPos.clone().add(craftPos.clone().sub(lastCraft)); craft.up.set(0, 1, 0); craft.lookAt(ahead); craft.rotateX(Math.PI / 2); }
    else craft.rotation.y += dt * 0.2;
    if (plume) plume.material.opacity = !reduced && !first && sp > 1.5 ? Math.min(0.9, (sp - 1.5) * 0.2) : 0;
    const near = focus !== 'sun' && focus !== 'dash';
    craft.scale.setScalar(near ? 0.14 * Math.max(0.75, sizeOf[focus === 'exit' ? 'mars' : focus]) / 0.6 : 0.09);
    ['Jupiter', 'Saturn', 'Uranus', 'Neptune'].forEach(nm => { bodies[nm].visible = !near; });
    // planet labels only on the overview
    const showLabels = focus === 'sun';
    if (showLabels && (frameN++ % 20 === 0)) { const a = $('.lx-hero__copy h2')?.getBoundingClientRect(), b = $('.lx-hero .lx-row')?.getBoundingClientRect() || a, r = document.createRange(); r.selectNodeContents($('.lx-hero__copy .lx-lede')); const c = r.getBoundingClientRect(); copyBox = a && { left: a.left, right: Math.max(c.right, a.left + 380), top: a.top - 30, bottom: Math.max(b.bottom, c.bottom) }; }
    lbBox.classList.toggle('on', showLabels);
    if (showLabels) labels.forEach(({ b, lb, size }) => { v3.copy(b.position); v3.y += size + 0.8; v3.project(cam); lb.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`; const px = (v3.x * 0.5 + 0.5) * innerWidth, py = (-v3.y * 0.5 + 0.5) * innerHeight; lb.style.opacity = v3.z < 1 && !(copyBox && px > copyBox.left - 30 && px < copyBox.right + 30 && py > copyBox.top && py < copyBox.bottom + 16) ? 1 : 0; });
    first = false;
    r.render(scene, cam);
  });
}

chapters(); archive(); intro(); sky();
$('#lx-replay').onclick = () => intro(true);
addEventListener('pageshow', archive);
