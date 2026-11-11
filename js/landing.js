// NEXUS//04 landing: intro, solar-system scene that follows the story, mission chapters, archive.
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

// ---------- chapters
function chapters() {
  $('#missions').innerHTML = ORDER.map((id, i) => {
    const m = GAME[id], c = CH[id];
    return `<section class="lx-ch" id="ch-${id}" data-focus="${id}" style="--acc:${m.accent}">
      <div class="lx-ch__copy">
        <p class="lx-k">Chapter 0${i + 1} / ${esc(c.k)}</p>
        <p class="lx-ch__name">${esc(m.name)} <span>· ${esc(m.world)} · research lead ${esc(m.owner)}</span></p>
        <h2>${esc(c.h)}</h2>
        <ul class="lx-facts">${c.facts.map(([v, l, s]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span>${src(s)}</li>`).join('')}</ul>
        <div class="lx-row"><a class="lx-btn lx-btn--go" href="play.html?mission=${id}">Play ${esc(m.name)}</a><a class="lx-btn" href="explore.html?mission=${id}">Explore ${esc(m.world)}</a></div>
      </div>
      <p class="lx-giant" aria-hidden="true">${esc(m.world)}</p>
    </section>`;
  }).join('');
  $('.lx-bodies').innerHTML = ORDER.map((id, i) => `<li><a href="#ch-${id}" style="--acc:${GAME[id].accent}"><span>0${i + 1}</span><b>${esc(GAME[id].name)}</b><em>${esc(GAME[id].world)}</em></a></li>`).join('');
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
  let THREE, buildWorld;
  try {
    THREE = await import('../vendor/three.module.min.js');
    ({ buildWorld } = await import('./scene.js'));
    const c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
  } catch (e) { document.body.classList.add('lx-no3d'); return; }
  const { MISSIONS } = await import('./data.js');
  const el = $('#lx-sky');
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; el.appendChild(r.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.05, 2000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  const sunLight = new THREE.PointLight(0xfff0dd, 900, 0, 1.6); scene.add(sunLight);
  // stars
  const n = 3000, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(300 + Math.random() * 400); p.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
  // sun with glow
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.2, 'rgba(255,190,110,.6)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); scene.add(sun);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sunGlow.scale.setScalar(18); scene.add(sunGlow);
  // illustrative scale: 1 AU = 20 units
  const AU = 20;
  const orbitLine = (a, e, color, op = 0.35, inc = 0) => {
    const pts = []; for (let i = 0; i <= 256; i++) { const t = i / 256 * Math.PI * 2; const rr = a * (1 - e * e) / (1 + e * Math.cos(t)); pts.push(new THREE.Vector3(Math.cos(t) * rr, Math.sin(t) * rr * Math.sin(inc), Math.sin(t) * rr * Math.cos(inc))); }
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })); scene.add(l); return l;
  };
  const W = id => { const w = buildWorld(MISSIONS.find(m => m.id === id)); [...w.children].forEach(c => { if (c.geometry?.type === 'TorusGeometry' || c === w.userData.sat) w.remove(c); }); return w; };
  orbitLine(AU, 0.017, 0x6fb4ff); orbitLine(1.524 * AU, 0.093, 0xff7a3d);
  orbitLine(0.922 * AU, 0.191, 0xe8a85c, 0.5, 0.06); // Apophis orbit, approximate (JPL SBDB)
  const earth = W('earth'); earth.scale.setScalar(1.1); scene.add(earth);
  const moon = W('lunaris'); moon.scale.setScalar(0.36); scene.add(moon);
  const mars = W('mars'); mars.scale.setScalar(0.8); scene.add(mars);
  const apo = W('astra'); apo.scale.setScalar(0.35); scene.add(apo);
  const moonRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2) * 2.6, 0, Math.sin(i / 96 * Math.PI * 2) * 2.6))), new THREE.LineBasicMaterial({ color: 0xb9c8e8, transparent: true, opacity: 0.4 }));
  scene.add(moonRing);
  const bodies = { sun, earth, lunaris: moon, mars, astra: apo };
  let t0 = 0.9, focus = 'sun';
  const camPos = new THREE.Vector3(0, 34, 62), camLook = new THREE.Vector3();
  const goal = { pos: camPos.clone(), look: new THREE.Vector3() };
  const resize = () => { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { focus = e.target.dataset.focus; document.body.style.setProperty('--acc', focus === 'sun' ? '#ff7a3d' : GAME[focus].accent); } }), { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-focus]').forEach(s => io.observe(s));
  const clock = new THREE.Clock();
  r.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) t0 += dt * 0.03;
    const pos = (a, e, period, phase, inc = 0) => { const t = t0 / period + phase; const rr = a * (1 - e * e) / (1 + e * Math.cos(t)); return new THREE.Vector3(Math.cos(t) * rr, Math.sin(t) * rr * Math.sin(inc), Math.sin(t) * rr * Math.cos(inc)); };
    earth.position.copy(pos(AU, 0.017, 1, 0));
    mars.position.copy(pos(1.524 * AU, 0.093, 1.88, 2.1));
    apo.position.copy(pos(0.922 * AU, 0.191, 0.886, 0.25, 0.06));
    moonRing.position.copy(earth.position);
    moon.position.copy(earth.position).add(new THREE.Vector3(Math.cos(t0 * 12) * 2.6, 0, Math.sin(t0 * 12) * 2.6));
    [earth, mars, moon, apo].forEach(b => b.rotation.y += dt * 0.2);
    // camera target per chapter
    const b = bodies[focus === 'earth' ? 'earth' : focus] || sun;
    if (focus === 'sun') { goal.pos.set(0, 34, 62); goal.look.set(0, 0, 0); }
    else {
      const size = focus === 'mars' ? 0.8 : focus === 'earth' ? 1.1 : focus === 'lunaris' ? 0.36 : 0.35;
      const off = new THREE.Vector3(1, 0.45, 1.4).normalize().multiplyScalar(size * (innerWidth < 760 ? 9 : 6.5));
      goal.pos.copy(b.position).add(off);
      // keep the body to the right of the copy on wide screens
      const side = new THREE.Vector3().crossVectors(off, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(innerWidth < 760 ? 0 : size * 2.2);
      goal.look.copy(b.position).add(side);
    }
    const k = reduced ? 1 : 1 - Math.pow(0.04, dt);
    camPos.lerp(goal.pos, k); camLook.lerp(goal.look, k);
    cam.position.copy(camPos); cam.lookAt(camLook);
    r.render(scene, cam);
  });
}

chapters(); archive(); intro(); sky();
$('#lx-replay').onclick = () => intro(true);
addEventListener('pageshow', archive);
