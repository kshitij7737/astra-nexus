// NEXUS//04 game: Brief → Build → Launch → Operate → Debrief.
import { GAME, ORDER, COMMON, ISP, rankFor, gradeFor, DIFFICULTY } from './game-data.js';
import { SOURCES } from './data.js';
import { derive, estimate, Sim, defaultConfig, starterConfig } from './sim.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = k => k && SOURCES[k] ? `<a class="gx-src" href="${SOURCES[k].url}" target="_blank" rel="noopener">${esc(SOURCES[k].title)}</a>` : '';
const fmt = (n, d = 0) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- saved progress (per browser)
const store = {
  get() { try { return JSON.parse(localStorage.getItem('nexus04') || '{}'); } catch { return {}; } },
  set(v) { try { localStorage.setItem('nexus04', JSON.stringify(v)); } catch { /* storage unavailable: progress is not kept */ } },
};

// ---------- settings (saved per browser)
const SET_DEF = { diff: 'cadet', rot: 1, zoom: 1, invert: false, vol: 0.7, speed: 1, shake: true, timers: true };
const settings = { ...SET_DEF, ...(store.get().settings || {}) };
function saveSettings() { const s = store.get(); s.settings = settings; store.set(s); stage?.setControls?.(settings); }
const diff = () => DIFFICULTY[settings.diff] || DIFFICULTY.flight;

// ---------- sound (Web Audio, created on first click)
const audio = {
  on: store.get().sound !== false, ctx: null,
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.on = false; } },
  beep(f = 880, d = 0.08, v = 0.06) {
    if (!this.on) return; this.init(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.value = f; o.type = 'sine';
    g.gain.setValueAtTime(v * settings.vol * 1.4 + 0.0001, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + d);
    o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + d);
  },
  rumble(d = 6) {
    if (!this.on) return; this.init(); if (!this.ctx) return;
    const c = this.ctx, n = c.sampleRate * d, buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
    const g = c.createGain(); g.gain.value = 0.35 * settings.vol * 1.4; s.connect(f).connect(g).connect(c.destination); s.start();
  },
  chime() { [660, 880, 1320].forEach((f, i) => setTimeout(() => this.beep(f, 0.25, 0.05), i * 120)); },
  fail() { [300, 220].forEach((f, i) => setTimeout(() => this.beep(f, 0.4, 0.06), i * 220)); },
  alarm() { [880, 660, 880, 660].forEach((f, i) => setTimeout(() => this.beep(f, 0.14, 0.05), i * 160)); },
  tick() { this.beep(1200, 0.03, 0.03); },
  boom() { this.rumble(3); this.beep(90, 1.2, 0.12); },
};

// ---------- story (mission control voice: VEGA)
const STORY = {
  astra: 'Flight, this is VEGA. On 13 April 2029, a 340 metre asteroid called Apophis will pass inside the ring of our geosynchronous satellites. NASA\'s OSIRIS-APEX arrives just after the pass. We are asking a bolder question: what if we were already there? Build a probe, get there first, and map Apophis before and after Earth pulls on it.',
  lunaris: 'Flight, VEGA. At the Moon\'s south pole there are craters the Sun never reaches. LRO has measured ground there at about 35 kelvin. If ice hides anywhere on the Moon, it is in places like Shackleton. Image the crater, map how cold it is and look for signs of ice. Then get it all home, eclipse after eclipse.',
  earth: 'Flight, VEGA. Most of the weather we live with happens in the lowest 6 to 20 kilometres of air. HALO will watch that thin layer from 705 km up, the height NASA\'s Aura has flown since 2004. Track dust and haze, measure ozone over Antarctica and profile the air. Then get it to the ground station before the next pass.',
  mars: 'Flight, VEGA. Long ago a river poured into Jezero crater and left a delta behind. Perseverance landed there in 2021. JEZERO ECHO will read that ancient lake from orbit: map it, zoom into the delta and find minerals that form in water. Mars is far from the Sun, so your arrays make less than half the power they would at Earth. Plan for it.',
};
const VEGA = {
  pass: 'Target in view. Instruments recording.',
  eclipse: 'Entering eclipse. Running on battery.',
  contact: 'Contact with Earth. Sending data home.',
  full: 'Recorder full. New data is being lost.',
};

// ---------- state
const url = new URLSearchParams(location.search);
let mission = GAME[url.get('mission')] || null;
let cfg = null, d = null, est = null, sim = null, stage = null, screen = 'brief';
let simSpeed = 1, raf = 0, lastFrame = 0, acc = 0, flags = {};

function loadCfg(m) {
  const saved = store.get().cfg?.[m.id];
  const base = defaultConfig(m);
  return saved ? { ...base, ...saved, inst: saved.inst?.filter(id => m.instruments.some(i => i.id === id)) ?? base.inst } : base;
}
function saveCfg() { const s = store.get(); s.cfg = { ...(s.cfg || {}), [mission.id]: cfg }; store.set(s); }

// ---------- boot
async function boot() {
  document.body.addEventListener('click', () => audio.init(), { once: true });
  const soundBtn = $('#gx-sound');
  const syncSound = () => { soundBtn.setAttribute('aria-pressed', String(audio.on)); soundBtn.textContent = audio.on ? 'Sound on' : 'Sound off'; };
  syncSound(); soundBtn.onclick = () => { audio.on = !audio.on; const s = store.get(); s.sound = audio.on; store.set(s); syncSound(); };
  $('#gx-settings').onclick = openSettings;
  document.addEventListener('keydown', onKey);
  try {
    const g3 = await import('./game3d.js');
    if (!g3.webglOK()) throw new Error('no WebGL');
    stage = new g3.GameStage($('#gx-stage')); stage.setControls(settings);
  } catch (e) { console.warn('NEXUS: 3D disabled', e); document.body.classList.add('gx-no3d'); }
  if (!mission) return pickMission();
  start(mission.id);
}

function pickMission() {
  setScreen('pick');
  const best = store.get().best || {};
  $('#gx-pick').innerHTML = `
    <div class="gx-wrap">
      <p class="gx-kicker">NEXUS//04 · Mission select</p>
      <h1 class="gx-h1">Choose your mission.</h1>
      ${diffPicker()}
      <div class="gx-picks">${ORDER.map((id, i) => { const m = GAME[id]; return `
        <button class="gx-pickcard" data-go="${id}" style="--acc:${m.accent}">
          <span class="gx-n">${String(i + 1).padStart(2, '0')}</span>
          <b>${esc(m.name)}</b><span>${esc(m.world)}</span><em>${esc(m.tagline)}</em>
          ${best[id] != null ? `<i>Best score ${best[id]}</i>` : '<i>Not flown yet</i>'}
        </button>`; }).join('')}</div>
    </div>`;
  $$('[data-go]').forEach(b => b.onclick = () => { history.replaceState(null, '', `?mission=${b.dataset.go}`); start(b.dataset.go); });
  wireDiff();
}
function diffPicker() {
  return `<div class="gx-diff" role="radiogroup" aria-label="Difficulty">${Object.values(DIFFICULTY).map(x => `<button type="button" role="radio" data-diff="${x.id}" aria-checked="${settings.diff === x.id}"><b>${x.label}</b><small>${esc(x.blurb)}</small></button>`).join('')}</div>`;
}
function wireDiff(after) {
  $$('[data-diff]').forEach(b => b.onclick = () => { settings.diff = b.dataset.diff; saveSettings(); audio.beep(520, 0.05); $$('[data-diff]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.diff === settings.diff))); after?.(); });
}

function start(id) {
  mission = GAME[id]; cfg = loadCfg(mission); flags = {};
  document.documentElement.style.setProperty('--acc', mission.accent);
  $('#gx-mname').textContent = `${mission.name} · ${mission.world}`;
  renderBrief(); setScreen('brief');
}

function setScreen(name) {
  screen = name; document.body.dataset.screen = name;
  $$('[data-screen]').forEach(s => s.hidden = s.dataset.screen !== name);
  const order = ['brief', 'build', 'launch', 'ops', 'debrief'];
  $$('.gx-steps li').forEach((li, i) => { li.dataset.state = i < order.indexOf(name) ? 'done' : i === order.indexOf(name) ? 'now' : ''; });
  window.scrollTo(0, 0);
}

// ---------- 01 brief
function renderBrief() {
  const m = mission, dvOpt = m.orbitOptions;
  $('#gx-brief').innerHTML = `
    <div class="gx-wrap gx-brief">
      <div class="gx-brief__main">
        <p class="gx-kicker">Mission ${String(ORDER.indexOf(m.id) + 1).padStart(2, '0')} · ${esc(m.world)} · research lead ${esc(m.owner)}</p>
        <h1 class="gx-h1">${esc(m.name)}</h1>
        <p class="gx-tag">${esc(m.tagline)}</p>
        <div class="gx-transmission"><span class="gx-vega">VEGA · Mission control</span><p id="gx-type"></p></div>
        ${m.whatIf ? `<p class="gx-whatif"><b>What if:</b> ${esc(m.whatIf)}</p>` : ''}
        <p class="gx-kicker gx-kicker--sm">Difficulty</p>${diffPicker()}
        <div class="gx-row">
          <button class="gx-btn gx-btn--go" id="gx-tobuild">Start building</button>
          <a class="gx-btn" href="explore.html?mission=${m.id === 'earth' ? 'earth' : m.id}">Explore ${esc(m.world)} first</a>
          <button class="gx-btn gx-btn--ghost" id="gx-switch">Switch mission</button>
        </div>
      </div>
      <aside class="gx-brief__side">
        <h2>Objectives</h2>
        <ol class="gx-objs">${m.objectives.map(o => `<li><b>${esc(o.label)}</b><span>${o.w} pts · needs ${o.need} Gbit back on Earth${o.phase === 'pre' ? ' · before the pass' : o.phase === 'post' ? ' · after the pass' : ''}</span></li>`).join('')}
          <li><b>Answer mission-control questions</b><span>up to 10 pts</span></li></ol>
        <h2>Constraints</h2>
        <ul class="gx-cons">
          <li><span>Budget</span><b id="gx-budgetv">${fmt(Math.round((m.budget ?? COMMON.budget) * diff().budgetMul))} credits</b></li>
          <li><span>Launch vehicles</span><b>${COMMON.options.launch.map(l => `${l.wetKg} kg`).join(' or ')}</b></li>
          <li><span>Δv to reach orbit</span><b>${m.dvRequired} m/s + upkeep</b></li>
          <li><span>Orbits</span><b>${dvOpt.map(o => esc(o.label)).join(' · ')}</b></li>
          <li><span>Distance from Sun</span><b>${m.solarAU} AU</b></li>
          <li><span>Spacecraft can be lost</span><b>Yes. Battery blackouts and faults damage it</b></li>
        </ul>
        <p class="gx-rule">Rule of the game: <b>science only counts when it reaches Earth.</b></p>
      </aside>
    </div>`;
  typewriter($('#gx-type'), STORY[m.id]); wireDiff(() => { const b = $('#gx-budgetv'); if (b) b.textContent = `${fmt(Math.round((m.budget ?? COMMON.budget) * diff().budgetMul))} credits`; });
  $('#gx-tobuild').onclick = () => { audio.beep(660); setScreen('build'); renderBuild(); };
  $('#gx-switch').onclick = () => { history.replaceState(null, '', 'play.html'); pickMission(); };
  if (stage) stage.showBuild(m, cfg, 0, true);
}
function typewriter(el, text) {
  if (reduced) { el.textContent = text; return; }
  el.textContent = ''; let i = 0; clearInterval(typewriter.t);
  typewriter.t = setInterval(() => { el.textContent = text.slice(0, i += 3); if (i >= text.length) clearInterval(typewriter.t); }, 18);
}

// ---------- 02 build
const seg = (key, opts, fmtFn) => `<div class="gx-seg" role="radiogroup" aria-label="${key}">${opts.map(o => `<button type="button" role="radio" data-k="${key}" data-v="${o.id}" aria-checked="${cfg[key] === o.id}">${o.label}${fmtFn ? `<small>${fmtFn(o)}</small>` : ''}</button>`).join('')}</div>`;

function renderBuild() {
  const m = mission, O = COMMON.options, au2 = m.solarAU ** 2;
  $('#gx-build').innerHTML = `
    <div class="gx-build">
      <div class="gx-build__intro">
        <p class="gx-kicker">Step 02 · Mission builder</p>
        <h1 class="gx-h2">Build your <span>${esc(m.world)}</span> ${m.id === 'astra' ? 'probe' : m.id === 'earth' ? 'satellite' : 'orbiter'}</h1>
        <p>Every part costs mass, money or power. VEGA checks your design live.</p><button type="button" class="gx-btn" id="gx-starter">Use a Cadet starter build</button><p class="gx-fine">Sets Cadet difficulty and replaces this design with a tested starting configuration. You can customise it afterward.</p>
        <ul class="gx-hints"><li>Drag to rotate</li><li>Scroll to zoom</li></ul>
      </div>
      <aside class="gx-cat" aria-label="Component catalogue">
        <h2>Component catalogue</h2>
        <div class="gx-item"><div><b>Solar array</b><span>Power in sunlight</span></div>${seg('solar', O.solar, o => `${fmt(o.w * COMMON.derating / au2)} W here`)}</div>
        <div class="gx-item"><div><b>Battery</b><span>Power in eclipse</span></div>${seg('battery', O.battery, o => `${o.wh} Wh`)}</div>
        <div class="gx-item"><div><b>Radio</b><span>Send data to Earth</span></div>${seg('radio', O.radio, o => `${fmt(o.mbps * m.radioMul, 1)} Mb/s`)}</div>
        <div class="gx-item"><div><b>Recorder</b><span>Store data on board</span></div>${seg('recorder', O.recorder, o => `${o.gbit} Gbit`)}</div>
        <div class="gx-item gx-item--col"><div><b>Science payload</b><span>Pick what to fly</span></div>
          <div class="gx-chips">${m.instruments.map(i => `<button type="button" class="gx-chip" data-inst="${i.id}" aria-pressed="${cfg.inst.includes(i.id)}"><b>${esc(i.name)}</b><small>${esc(i.heritage)}-type · ${i.w} W · ${i.mbps} Mb/s · ${i.kg} kg · ${i.cr} cr</small><em>${esc(m.objectives.filter(o => o.inst.includes(i.id)).map(o => o.label).join(' · ') || 'Bonus')}</em></button>`).join('')}</div></div>
        <div class="gx-item gx-item--col"><div><b>Propellant</b><span>Pays for Δv</span></div>
          <label class="gx-range"><input type="range" id="gx-prop" min="0" max="150" step="5" value="${cfg.propKg}"><output id="gx-propv"></output></label></div>
        <div class="gx-item"><div><b>Launch vehicle</b><span>Mass limit</span></div>${seg('launch', O.launch, o => `${o.wetKg} kg · ${o.cr} cr`)}</div>
        <div class="gx-item"><div><b>Orbit</b><span>Where you work</span></div>${seg('orbit', m.orbitOptions, o => esc(o.note))}</div>
        <p class="gx-fine">Part sizes follow the team's LUNARIS design document. Values are game values, not NASA hardware specs.</p>
      </aside>
      <section class="gx-sum" aria-label="Mission summary" aria-live="polite"></section>
    </div>`;
  $$('#gx-build .gx-seg button').forEach(b => b.onclick = () => { cfg[b.dataset.k] = b.dataset.v; audio.beep(520, 0.04); refreshBuild(); });
  $$('#gx-build [data-inst]').forEach(b => b.onclick = () => {
    const id = b.dataset.inst; cfg.inst = cfg.inst.includes(id) ? cfg.inst.filter(x => x !== id) : [...cfg.inst, id]; audio.beep(600, 0.04); refreshBuild();
  });
  $('#gx-starter').onclick = () => { settings.diff = 'cadet'; saveSettings(); cfg = starterConfig(mission); saveCfg(); renderBuild(); toast('Starter loaded. Try changing one part and watch the checks.'); };
  $('#gx-prop').oninput = e => { cfg.propKg = +e.target.value; refreshBuild(true); };
  refreshBuild();
}

let estTimer = 0;
function refreshBuild(light) {
  const m = mission; d = derive(m, cfg, settings.diff); saveCfg();
  $$('#gx-build .gx-seg button').forEach(b => b.setAttribute('aria-checked', String(cfg[b.dataset.k] === b.dataset.v)));
  $$('#gx-build [data-inst]').forEach(b => b.setAttribute('aria-pressed', String(cfg.inst.includes(b.dataset.inst))));
  $('#gx-propv').textContent = `${cfg.propKg} kg · ${fmt(d.dvAvail)} m/s`;
  if (stage) { stage.lastCfg = cfg; if (!light) stage.showBuild(m, cfg); }
  clearTimeout(estTimer);
  const paint = () => {
    est = d.launchable ? estimate(m, cfg, settings.diff) : null;
    const bad = d.checks.filter(c => !c.ok);
    const hint = bad.length ? HINT[bad[0].id](d) : 'VEGA: Design looks solid. Ready when you are.';
    $('#gx-build .gx-sum').innerHTML = `
      <div class="gx-stats">
        <div class="gx-stat ${d.wet > d.launch.wetKg ? 'is-bad' : ''}"><span>Total mass</span><b>${fmt(d.wet, 1)} kg</b><small>limit ${d.launch.wetKg} kg</small></div>
        <div class="gx-stat"><span>Solar power</span><b>${fmt(d.solarW)} W</b><small>at ${esc(m.world)}</small></div>
        <div class="gx-stat"><span>Data storage</span><b>${d.storage} Gbit</b><small>${fmt(d.perPassGbit, 1)} Gbit per pass</small></div>
        <div class="gx-stat"><span>Comm capacity</span><b>${fmt(d.perContactGbit, 1)} Gbit</b><small>per contact</small></div>
        <div class="gx-stat ${d.cost > d.budget ? 'is-bad' : ''}"><span>Budget</span><b>${fmt(d.cost)}</b><small>of ${fmt(d.budget)} credits</small></div>
        <div class="gx-stat ${d.launchFail > 0.02 ? 'is-bad' : ''}"><span>Launch success</span><b>${fmt((1 - d.launchFail) * 100, 1)}%</b><small>${esc(diff().label)} difficulty</small></div>
      </div>
      <div class="gx-compat"><span>Compatibility</span><ul>${d.checks.map(c => `<li class="${c.ok ? 'ok' : c.soft ? 'warn' : 'bad'}"><i aria-hidden="true">${c.ok ? '✓' : '!'}</i>${esc(c.label)}<small>${esc(c.detail)}</small></li>`).join('')}</ul></div>
      <div class="gx-est"><span>Estimated science score</span>${ring(est ? est.score : 0, 90, est ? '' : '—')}<small>${est ? (est.failed?.reason === 'lost' ? '<b class="gx-red">Spacecraft would be lost</b> to battery blackouts' : `if flown with no surprises (max 90 before questions)`) : 'fix mass or budget to estimate'}</small></div>
      <div class="gx-launchbox">
        <p class="gx-hint">${esc(hint)}</p>
        <button class="gx-btn gx-btn--go" id="gx-launch" ${d.launchable ? '' : 'disabled'}>Launch mission</button>
        <details class="gx-formulas"><summary>Show the maths</summary>
          <p>Orbital period T = 2π √(a³/μ) = ${fmt(d.periodMin, 1)} min${d.a ? ` (a = ${fmt(d.a, 1)} km)` : ' (conceptual survey loop)'}</p>
          <p>Eclipse = asin(R/a)/π of each orbit = ${fmt(d.eclipseMin, 1)} min, needs ${fmt(d.eclipseWh)} Wh for the bus and heaters</p>
          <p>Solar P = rating × ${COMMON.derating} ÷ d² = ${fmt(d.solarW)} W (d = ${m.solarAU} AU)</p>
          <p>Δv = Isp × g0 × ln(m_wet / m_dry) = ${ISP} × 9.81 × ln(${fmt(d.wet)} / ${fmt(d.dry)}) = ${fmt(d.dvAvail)} m/s, need ${d.dvNeed}</p>
          <p>Data per contact = ${fmt(d.rateMbps, 2)} Mb/s × ${COMMON.radioEff} × ${fmt(d.contactMin, 1)} min = ${fmt(d.perContactGbit, 2)} Gbit</p>
        </details>
      </div>`;
    $('#gx-launch').onclick = goLaunch;
  };
  if (light) estTimer = setTimeout(paint, 120); else paint();
}
const HINT = {
  mass: d => `VEGA: Too heavy. You are ${fmt(d.wet - d.launch.wetKg)} kg over. Try Launch B or drop a heavy instrument.`,
  budget: d => `VEGA: Over budget by ${fmt(d.cost - d.budget)} credits. Small parts or fewer instruments will fix it.`,
  dv: d => `VEGA: Not enough propellant. You can launch, but you will fly past ${mission.world}. Add about ${fmt(Math.ceil((d.dvNeed - d.dvAvail) / 8))} kg more.`,
  eclipse: d => `VEGA: The battery runs dry in every ${fmt(d.eclipseMin, 0)} minute eclipse. Each blackout damages the spacecraft, and enough of them will kill it.`,
  power: () => 'VEGA: Running everything at once drains the battery even in sunlight. A larger array helps.',
  reserve: d => `VEGA: Only ${Math.round(d.dvAvail - d.dvNeed)} m/s spare. Faults and decisions can cost propellant. About ${Math.ceil((60 - (d.dvAvail - d.dvNeed)) / 8)} kg more gives you a safe reserve.`,
  margin: d => `VEGA: The rocket is loaded to ${Math.round((1 - d.margin) * 100)}% of its limit. That raises the chance it fails. Lighten the craft or take Launch B.`,
  science: () => 'VEGA: One objective has no instrument. Those points are impossible without it.',
};
function ring(score, max = 100, label) {
  const r = 34, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, score / max));
  return `<svg class="gx-ring" viewBox="0 0 80 80" role="img" aria-label="Score ${label || score}"><circle cx="40" cy="40" r="${r}" class="gx-ring__bg"/><circle cx="40" cy="40" r="${r}" class="gx-ring__fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/><text x="40" y="46" text-anchor="middle">${label || score}</text></svg>`;
}

// ---------- 03 launch: GO / NO-GO poll, then the countdown
const POLL = { reserve: 'Reserve', mass: 'Booster', budget: 'Finance', dv: 'Propulsion', eclipse: 'Power', power: 'Electrical', science: 'Science', margin: 'Range safety' };
function goLaunch() {
  if (!d.launchable) return;
  const mo = $('#gx-pollbox'); mo.hidden = false;
  const nogo = d.checks.filter(c => !c.ok);
  mo.innerHTML = `<div class="gx-card gx-poll" role="dialog" aria-modal="true" aria-labelledby="gx-pollt">
    <p class="gx-kicker">Flight director poll · ${esc(diff().label)}</p><h2 id="gx-pollt">Go or no-go for launch?</h2>
    <ul>${d.checks.map((c, i) => `<li class="${c.ok ? 'ok' : c.soft ? 'warn' : 'bad'}" style="--i:${i}"><span>${esc(POLL[c.id] || c.id)}</span><b>${c.ok ? 'GO' : 'NO-GO'}</b><small>${esc(c.detail)}</small></li>`).join('')}</ul>
    ${nogo.length ? `<p class="gx-hint">${nogo.length} station${nogo.length > 1 ? 's' : ''} called no-go. You can launch anyway. It is your call, Flight.</p>` : '<p class="gx-hint">All stations go. Launch success chance ' + fmt((1 - d.launchFail) * 100, 1) + '%.</p>'}
    <div class="gx-opts gx-opts--row"><button class="gx-btn ${nogo.length ? 'gx-btn--warn' : 'gx-btn--go'}" id="gx-golaunch">${nogo.length ? 'Launch anyway' : 'Commit to launch'}</button><button class="gx-btn gx-btn--ghost" id="gx-scrub">Scrub and fix</button></div></div>`;
  $$('.gx-poll li', mo).forEach((li, i) => setTimeout(() => { li.classList.add('in'); audio.beep(li.classList.contains('ok') ? 900 : 300, 0.05); }, 120 + i * 140));
  $('#gx-scrub').onclick = () => { mo.hidden = true; };
  $('#gx-golaunch').onclick = () => { mo.hidden = true; runLaunch(); };
  $('#gx-golaunch').focus();
}
function runLaunch() {
  setScreen('launch');
  const m = mission, reachesOrbit = d.dvAvail >= d.dvNeed;
  const rocketFails = Math.random() < d.launchFail;
  const explodeAt = rocketFails ? 3.4 + Math.random() * 4 : 0;
  const lines = [
    [0, 'T-3'], [0.7, 'T-2'], [1.4, 'T-1'], [2.2, 'Liftoff'], [4.2, 'Max-Q'], [7.5, 'Stage separation'], [8.3, 'Fairing separation'], [9.2, 'Arrays deployed'],
    [10.5, m.id === 'earth' ? 'Raising to final orbit' : `Transfer to ${m.world}`], [15.5, reachesOrbit ? 'Orbit insertion burn' : 'Insertion burn... propellant exhausted'],
  ];
  const box = $('#gx-launchtext'); box.innerHTML = ''; const timers = [];
  lines.forEach(([t, txt]) => { if (explodeAt && t > explodeAt) return; timers.push(setTimeout(() => {
    box.innerHTML = `<b>${esc(txt)}</b>`; if (/^T-/.test(txt)) audio.beep(880, 0.12); if (txt === 'Liftoff') { audio.rumble(6); stage?.shake(0.8); } if (txt === 'Max-Q') stage?.shake(0.5);
  }, t * 1000)); });
  const finish = (ok, why) => {
    timers.forEach(clearTimeout);
    if (why === 'launch' || (rocketFails && !stage)) {
      sim = new Sim(m, cfg, { diff: settings.diff });
      sim.failed = { reason: 'launch', text: `The rocket broke apart ${fmt(explodeAt - 2.2, 1)} seconds after liftoff. It was loaded to ${Math.round((1 - d.margin) * 100)}% of its limit, giving a ${fmt(d.launchFail * 100, 1)}% chance of failure. This time the odds lost.` };
      setTimeout(() => showDebrief(sim.result()), 600); return;
    }
    if (ok) { audio.chime(); box.innerHTML = `<b>Orbit achieved</b>`; setTimeout(startOps, 900); }
    else { audio.fail(); box.innerHTML = `<b>Missed ${esc(m.world)}</b>`; sim = new Sim(m, cfg, { diff: settings.diff }); setTimeout(() => showDebrief(sim.result()), 1400); }
  };
  const cues = { boom: () => { timers.forEach(clearTimeout); box.innerHTML = '<b class="gx-red">Vehicle lost</b>'; audio.boom(); document.body.classList.add('gx-flash'); setTimeout(() => document.body.classList.remove('gx-flash'), 900); } };
  $('#gx-skip').onclick = () => { stage?.skipLaunch?.(); if (!stage) finish(reachesOrbit && !rocketFails, rocketFails ? 'launch' : ''); };
  if (stage) stage.playLaunch(m, reachesOrbit, finish, cues, { explodeAt });
  else setTimeout(() => finish(reachesOrbit && !rocketFails, rocketFails ? 'launch' : ''), 1500);
}

// ---------- 04 operations
function startOps() {
  const m = mission; sim = new Sim(m, cfg, { interactive: true, diff: settings.diff }); flags = {}; simSpeed = settings.speed; lastHealth = 100; streak = 0;
  setScreen('ops');
  if (stage) stage.showOps(m, sim.d);
  $('#gx-ops').innerHTML = `
    <aside class="gx-hud" aria-label="Mission control">
      <div class="gx-hud__top"><p class="gx-kicker">Step 04 · Mission control</p>
        <div class="gx-clock"><b id="gx-orbit"></b><span id="gx-time"></span></div>
        <div class="gx-speed" role="group" aria-label="Simulation speed">${[0, 1, 2, 4].map(s => `<button type="button" data-speed="${s}" aria-pressed="${s === simSpeed}">${s ? s + '×' : 'Pause'}</button>`).join('')}</div></div>
      <div class="gx-chipsrow" id="gx-phase"></div>
      <div class="gx-timeline" aria-hidden="true"><div class="gx-tl" id="gx-tl"></div><i id="gx-play"></i></div>
      <div class="gx-legend"><span class="e">Eclipse</span><span class="p">Target pass</span><span class="c">Contact</span></div><p class="gx-keys">Space pause · 1 2 4 speed · drag the view to look around · scroll to zoom</p>
      <div class="gx-gauges">
        <div class="gx-gauge"><span>Battery</span><div><i id="gx-batt"></i></div><b id="gx-battv"></b></div>
        <div class="gx-gauge"><span>Recorder</span><div><i id="gx-stor"></i></div><b id="gx-storv"></b></div>
        <div class="gx-gauge gx-gauge--hp"><span>Health</span><div><i id="gx-hp"></i></div><b id="gx-hpv"></b></div>
      </div>
      <h3>Objectives · science back on Earth</h3>
      <ul class="gx-prog" id="gx-prog"></ul>
      <h3>Instruments</h3>
      <div class="gx-toggles">${sim.d.insts.map(i => `<label><input type="checkbox" data-tog="${i.id}" checked> ${esc(i.name)} <small>${i.w} W</small></label>`).join('')}</div>
      <h3>Log</h3>
      <ol class="gx-log" id="gx-log" aria-live="polite"></ol>
    </aside>
    <div class="gx-chart"><canvas id="gx-chart" width="560" height="140" aria-label="Battery and recorder over time"></canvas><div class="gx-chartkey"><span class="b">Battery</span><span class="s">Recorder</span><span class="r">Data home</span></div></div>
    <div class="gx-modal" id="gx-modal" hidden></div>`;
  $$('[data-speed]').forEach(b => b.onclick = () => { simSpeed = +b.dataset.speed; $$('[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.speed === simSpeed))); });
  $$('[data-tog]').forEach(c => c.onchange = () => { c.checked ? sim.enabled.add(c.dataset.tog) : sim.enabled.delete(c.dataset.tog); });
  // timeline segments
  const o = sim.d.orbit, tl = $('#gx-tl'), seg = (w, cls) => { const [a, b] = w; const parts = a <= b ? [[a, b]] : [[a, 1], [0, b]]; parts.forEach(([x, y]) => { const s = document.createElement('i'); s.className = cls; s.style.left = x * 100 + '%'; s.style.width = (y - x) * 100 + '%'; tl.appendChild(s); }); };
  if (sim.d.eclipseFrac) seg([0.75 - sim.d.eclipseFrac / 2, 0.75 + sim.d.eclipseFrac / 2], 'e');
  seg(o.pass, 'p'); seg(o.contact, 'c');
  log(`Orbit achieved around ${m.world}. ${m.contactNote}`, 'ok');
  if (simSpeed === 0) simSpeed = 1;
  lastFrame = performance.now(); acc = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function log(text, kind = 'info') {
  const li = document.createElement('li'); li.className = kind;
  li.innerHTML = `<span>O${String(sim.orbit + 1).padStart(2, '0')}</span>${esc(text)}`;
  const el = $('#gx-log'); if (!el) return; el.prepend(li); while (el.children.length > 30) el.lastChild.remove();
}
function loop(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
  if (screen !== 'ops') return;
  const modalOpen = !$('#gx-modal').hidden || !$('#gx-setbox').hidden || !!document.querySelector('dialog[open]') || document.hidden;
  if (!sim.pending && simSpeed > 0 && !modalOpen) {
    const stepsPerSec = (sim.T / sim.dt) / 9 * simSpeed; // one orbit ≈ 9 s at 1×
    acc += dt * stepsPerSec;
    let n = Math.floor(acc); acc -= n;
    const logLen = sim.log.length;
    while (n-- > 0 && !sim.done && !sim.pending) {
      const before = sim.state(), storeBefore = sim.storageUsed(), lostBefore = sim.lost;
      sim.step();
      const st = sim.state();
      if (st.inPass && !before.inPass && !flags.pass) { flags.pass = 1; log(VEGA.pass); }
      if (!st.sunlit && before.sunlit && !flags.ecl) { flags.ecl = 1; log(VEGA.eclipse); }
      if (st.inContact && !before.inContact && !flags.con && storeBefore > 0) { flags.con = 1; log(VEGA.contact); }
      if (sim.lost > lostBefore && !flags.full) { flags.full = 1; log(VEGA.full, 'warn'); audio.beep(300, 0.2); }
    }
    for (const e of sim.log.slice(logLen)) { log(e.text, e.kind); if (e.kind === 'warn') { audio.alarm(); alert('Power blackout. Spacecraft damaged.'); } }
    // hook: reward clean downlinks
    const sent = sim.sentTotal;
    if (sent - (flags.lastMilestone || 0) >= milestoneStep()) { flags.lastMilestone = Math.floor(sent / milestoneStep()) * milestoneStep(); toast(`${fmt(flags.lastMilestone, 0)} Gbit home`); audio.beep(1100, 0.08); }
  }
  paintOps();
  if (sim.pending && $('#gx-modal').hidden) showCard(sim.pending);
  if (sim.done && !sim.pending && !modalOpen) {
    cancelAnimationFrame(raf);
    if (sim.failed?.reason === 'lost') { lostSequence(); return; }
    setTimeout(() => showDebrief(sim.result()), 700); return;
  }
  raf = requestAnimationFrame(loop);
}
function paintOps() {
  const s = sim.state(), m = mission, mods = sim.activeMods(), skip = mods.some(x => x.skip);
  const used = sim.storageUsed();
  const observing = !sim.safe && s.inPass && !skip && sim.enabled.size > 0;
  const transmitting = !sim.safe && s.inContact && used > 1e-6;
  const bf0 = sim.batt / sim.d.battWh;
  stage?.setOps({ phase: s.phase, orbitFloat: sim.t / sim.T, observing, transmitting, sunlit: s.sunlit, alert: sim.safe || bf0 < 0.15 || sim.health < 30 });
  document.body.classList.toggle('gx-danger', sim.health < 30 || sim.safe);
  if (sim.health < lastHealth) { lastHealth = sim.health; }
  $('#gx-hp').style.width = sim.health + '%'; $('#gx-hp').className = sim.health < 30 ? 'low' : sim.health < 60 ? 'mid' : '';
  $('#gx-hpv').textContent = `${Math.round(sim.health)}%`;
  $('#gx-orbit').textContent = `Orbit ${Math.min(m.orbits, s.orbit + 1)} / ${m.orbits}`;
  const hrs = sim.t / 3600; $('#gx-time').textContent = `Mission time ${Math.floor(hrs)} h ${String(Math.floor((hrs % 1) * 60)).padStart(2, '0')} m`;
  $('#gx-phase').innerHTML = [
    s.sunlit ? '<span class="sun">Sunlight</span>' : '<span class="ecl">Eclipse</span>',
    observing ? '<span class="obs">Recording</span>' : s.inPass ? '<span>Target pass</span>' : '',
    transmitting ? '<span class="tx">Sending home</span>' : s.inContact ? '<span>Contact</span>' : '',
    sim.safe ? '<span class="safe">Safe mode</span>' : '',
  ].join('');
  $('#gx-play').style.left = s.phase * 100 + '%';
  const bf = sim.batt / sim.d.battWh, sf = used / sim.d.storage;
  $('#gx-batt').style.width = bf * 100 + '%'; $('#gx-batt').className = bf < 0.2 ? 'low' : '';
  $('#gx-battv').textContent = `${fmt(sim.batt)} / ${fmt(sim.d.battWh)} Wh`;
  $('#gx-stor').style.width = sf * 100 + '%'; $('#gx-stor').className = sf > 0.9 ? 'low' : '';
  $('#gx-storv').textContent = `${fmt(used, 1)} / ${sim.d.storage} Gbit`;
  $('#gx-prog').innerHTML = sim.objectiveProgress().map(o => `<li><span>${esc(o.label)}</span><div><i style="width:${o.frac * 100}%"></i></div><b>${fmt(o.got, 1)}/${o.need}</b></li>`).join('');
  drawChart();
}
function drawChart() {
  const c = $('#gx-chart'); if (!c) return; const g = c.getContext('2d'), W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const h = sim.history.slice(-300); if (h.length < 2) return;
  const maxRet = Math.max(1, ...sim.history.map(x => x.ret));
  const line = (key, col, scale = 1) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); h.forEach((p, i) => { const x = i / (h.length - 1) * W, y = H - 6 - (p[key] / scale) * (H - 12); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  line('batt', '#ffd166'); line('store', '#ff7a3d'); line('ret', '#6fffd0', maxRet);
}
function showCard(p) {
  const mo = $('#gx-modal'); mo.hidden = false;
  const it = p.item, isQ = p.type === 'challenge', isA = p.type === 'anomaly';
  if (isA) { audio.alarm(); stage?.shake(0.7); alert(it.title); } else audio.beep(740, 0.15);
  const timed = isA && p.timer && settings.timers;
  mo.innerHTML = `<div class="gx-card ${isA ? 'gx-card--alarm' : ''}" role="dialog" aria-modal="true" aria-labelledby="gx-cardt">
    <p class="gx-kicker">${isQ ? 'VEGA asks · +5 points' : isA ? 'Master alarm · spacecraft fault' : 'Decision · orbit ' + (it.orbit + 1)}</p>
    <h2 id="gx-cardt">${esc(isQ ? it.q : it.title)}</h2>
    ${isQ ? '' : `<p>${esc(it.text)}</p>`}
    ${timed ? `<div class="gx-timer" aria-hidden="true"><i id="gx-timer"></i></div><p class="gx-fine" id="gx-timerv">${p.timer} s to respond. If time runs out, nothing is done.</p>` : ''}
    <div class="gx-opts">${(isQ ? it.a : it.options.map(o => o.label)).map((t, i) => `<button class="gx-btn" data-opt="${i}"><kbd>${i + 1}</kbd> <span>${esc(t)}${isQ ? '' : costTags(it.options[i].effect)}</span></button>`).join('')}</div>
    ${isQ ? `<p class="gx-fine">Evidence: ${src(it.src)}</p>` : isA ? '<p class="gx-fine">Scenario fault, modelled on problems real spacecraft have had.</p>' : '<p class="gx-fine">Scenario event for gameplay.</p>'}
  </div>`;
  let timerId = 0;
  const pick = i => {
    clearInterval(timerId);
    const hpBefore = sim.health;
    const res = sim.choose(i);
    const good = isQ ? i === it.correct : true;
    if (isQ) { good ? (audio.chime(), streak++) : (audio.fail(), streak = 0); if (streak >= 2) toast('Two for two. Sharp, Flight.'); }
    const hurt = sim.health < hpBefore;
    if (hurt) { stage?.shake(0.9); audio.fail(); }
    log(res, isQ ? (good ? 'ok' : 'warn') : hurt ? 'warn' : 'info');
    mo.innerHTML = `<div class="gx-card"><p class="gx-kicker">${isQ ? (good ? 'Correct' : 'Not quite') : hurt ? `Damage taken · health ${Math.round(sim.health)}%` : 'Outcome'}</p><h2>${esc(res)}</h2><button class="gx-btn gx-btn--go" id="gx-cont">Continue mission</button></div>`;
    $('#gx-cont').focus();
    $('#gx-cont').onclick = () => { mo.hidden = true; lastFrame = performance.now(); };
  };
  $$('[data-opt]', mo).forEach(b => b.onclick = () => pick(+b.dataset.opt));
  mo.onkey = k => { const n = +k - 1; const bs = $$('[data-opt]', mo); if (bs[n]) pick(n); };
  if (timed) {
    const T = p.timer * 1000; let remaining = T, previous = performance.now(), lastSec = p.timer;
    timerId = setInterval(() => {
      const now = performance.now(), elapsed = now - previous; previous = now;
      if (document.hidden || document.querySelector('dialog[open]') || !$('#gx-setbox').hidden) return;
      const left = remaining = Math.max(0, remaining - elapsed); const sec = Math.ceil(left / 1000);
      $('#gx-timer').style.width = left / T * 100 + '%';
      if (sec !== lastSec) { lastSec = sec; $('#gx-timerv').textContent = `${sec} s to respond. If time runs out, nothing is done.`; if (sec <= 3) audio.tick(); }
      if (left <= 0) { clearInterval(timerId); toast('Too slow. No action taken.'); pick(it.options.length - 1); }
    }, 50);
  }
  $('[data-opt]', mo)?.focus();
}
function costTags(e) {
  const t = [];
  if (e.dvCost) t.push([e.dvCost > sim.dvMargin ? 'fatal' : 'cost', e.dvCost > sim.dvMargin ? `−${e.dvCost} m/s: more than your ${Math.max(0, Math.round(sim.dvMargin))} m/s spare. Mission ends` : `−${e.dvCost} m/s of ${Math.round(sim.dvMargin)} spare`]);
  if (e.battCost) t.push(['cost', e.battCost > 1000 ? 'Drains the battery' : `−${e.battCost} Wh battery`]);
  if (e.health) t.push([sim.health + e.health <= 0 ? 'fatal' : 'cost', sim.health + e.health <= 0 ? `Health −${-e.health}: spacecraft lost` : `Health −${-e.health}`]);
  if (e.skipPasses) t.push(['cost', `Skip ${e.skipPasses} pass${e.skipPasses > 1 ? 'es' : ''}`]);
  if (e.skipInst) t.push(['cost', 'One instrument idle']);
  if (e.value != null && e.value < 1) t.push(['cost', `Data quality ${Math.round(e.value * 100)}%`]);
  if (e.contactMul && e.contactMul < 1) t.push(['cost', `Downlink ${Math.round(e.contactMul * 100)}%`]);
  if (e.contactMul > 1) t.push(['gain', `Downlink +${Math.round((e.contactMul - 1) * 100)}%`]);
  if (e.dataBoost) t.push(['gain', `Data +${Math.round((e.dataBoost - 1) * 100)}%`]);
  if (e.bonusData) t.push(['gain', `+${e.bonusData.gbit} Gbit`]);
  if (e.compress) t.push(['gain', 'Smaller files']);
  if (e.battBonus) t.push(['gain', 'Battery refilled']);
  if (e.relay) t.push(['gain', 'Helps Perseverance']);
  if (!t.length) t.push(['none', 'No cost']);
  return `<small class="gx-tags">${t.map(([k, v]) => `<i class="${k}">${esc(v)}</i>`).join('')}</small>`;
}
let lastHealth = 100, streak = 0;
const milestoneStep = () => Math.max(2, Math.round(mission.objectives.reduce((a, o) => a + o.need, 0) / 4));
function toast(text) {
  const t = $('#gx-toast'); const el = document.createElement('p'); el.textContent = text; t.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2200); setTimeout(() => el.remove(), 2800);
}
function alert(text) {
  document.body.classList.remove('gx-alert'); void document.body.offsetWidth; document.body.classList.add('gx-alert');
  toast(text);
}
function lostSequence() {
  audio.boom(); stage?.loseCraft?.(); stage?.shake(1);
  const l = $('#gx-lost'); l.hidden = false; $('#gx-lostsub').textContent = `${mission.name} is not responding. Orbit ${sim.orbit + 1}.`;
  setTimeout(() => { l.hidden = true; showDebrief(sim.result()); }, reduced ? 600 : 3200);
}
function onKey(e) {
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape' && !$('#gx-setbox').hidden) { $('#gx-setbox').hidden = true; return; }
  if (e.key === 'Escape' && !$('#gx-pollbox').hidden) { $('#gx-pollbox').hidden = true; return; }
  if (e.target.matches?.('input, textarea, select')) return;
  const mo = $('#gx-modal');
  if (mo && !mo.hidden && /^[1-4]$/.test(e.key) && mo.onkey && $('[data-opt]', mo)) { mo.onkey(e.key); e.preventDefault(); return; }
  if (screen !== 'ops' || !$('#gx-setbox').hidden) return;
  const set = v => { simSpeed = v; $$('[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.speed === simSpeed))); };
  if (e.key === ' ') { set(simSpeed ? 0 : (settings.speed || 1)); e.preventDefault(); }
  if (e.key === '1') set(1); if (e.key === '2') set(2); if (e.key === '4') set(4);
}

// ---------- settings
function openSettings() {
  const mo = $('#gx-setbox'); mo.hidden = false;
  const row = (id, label, min, max, step, val, out) => `<label class="gx-set"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output id="${id}v">${out}</output></label>`;
  mo.innerHTML = `<div class="gx-card gx-setcard" role="dialog" aria-modal="true" aria-labelledby="gx-sett">
    <p class="gx-kicker">Settings · saved in this browser</p><h2 id="gx-sett">Flight settings</h2>
    <p class="gx-kicker gx-kicker--sm">Difficulty${screen === 'ops' ? ' (applies to your next flight)' : ''}</p>${diffPicker()}
    ${row('st-rot', 'Camera drag sensitivity', 0.25, 3, 0.25, settings.rot, settings.rot + '×')}
    ${row('st-zoom', 'Zoom sensitivity', 0.25, 3, 0.25, settings.zoom, settings.zoom + '×')}
    ${row('st-vol', 'Volume', 0, 1, 0.05, settings.vol, Math.round(settings.vol * 100) + '%')}
    <label class="gx-set"><span>Default mission speed</span><select id="st-speed">${[1, 2, 4].map(v => `<option value="${v}" ${settings.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}</select></label>
    <label class="gx-check"><input type="checkbox" id="st-inv" ${settings.invert ? 'checked' : ''}> Invert vertical drag</label>
    <label class="gx-check"><input type="checkbox" id="st-shake" ${settings.shake ? 'checked' : ''}> Camera shake</label>
    <label class="gx-check"><input type="checkbox" id="st-timers" ${settings.timers ? 'checked' : ''}> Countdown on spacecraft faults</label>
    <div class="gx-opts gx-opts--row"><button class="gx-btn gx-btn--go" id="st-done">Done</button><button class="gx-btn gx-btn--ghost" id="st-view">Reset camera</button><button class="gx-btn gx-btn--ghost" id="st-reset">Restore defaults</button></div></div>`;
  const bind = (id, key, fmtFn, num = true) => { $('#' + id).oninput = e => { settings[key] = num ? +e.target.value : e.target.value; $('#' + id + 'v') && ($('#' + id + 'v').textContent = fmtFn(settings[key])); saveSettings(); }; };
  bind('st-rot', 'rot', v => v + '×'); bind('st-zoom', 'zoom', v => v + '×'); bind('st-vol', 'vol', v => Math.round(v * 100) + '%');
  $('#st-speed').onchange = e => { settings.speed = +e.target.value; saveSettings(); };
  $('#st-inv').onchange = e => { settings.invert = e.target.checked; saveSettings(); };
  $('#st-shake').onchange = e => { settings.shake = e.target.checked; saveSettings(); };
  $('#st-timers').onchange = e => { settings.timers = e.target.checked; saveSettings(); };
  wireDiff(() => { if (screen === 'build') refreshBuild(); if (screen === 'brief') renderBrief(); });
  $('#st-view').onclick = () => { stage?.resetView?.(); audio.beep(700, 0.05); };
  $('#st-reset').onclick = () => { Object.assign(settings, SET_DEF); saveSettings(); openSettings(); };
  $('#st-done').onclick = () => { mo.hidden = true; if (screen === 'pick') pickMission(); };
  $('#st-done').focus();
}

// ---------- 05 debrief
function showDebrief(r) {
  cancelAnimationFrame(raf); setScreen('debrief');
  const m = mission, failed = r.missionFailed, rank = r.failed ? 'Mission lost' : rankFor(r.score), grade = failed ? 'F' : gradeFor(r.score);
  document.body.classList.remove('gx-danger');
  const earned = achievementsFor(r);
  const s = store.get(); s.best = s.best || {}; s.best[m.id] = Math.max(s.best[m.id] || 0, r.score);
  const unlocked = m.discoveries.filter(x => r.objs.find(o => o.id === x.unlock)?.frac >= 1);
  s.disc = [...new Set([...(s.disc || []), ...unlocked.map(x => x.id)])];
  const prevAch = new Set(s.ach || []); s.ach = [...new Set([...(s.ach || []), ...earned.map(a => a.id)])];
  s.flights = (s.flights || 0) + 1; if (!failed) s.wins = (s.wins || 0) + 1; store.set(s);
  const newAch = earned.filter(a => !prevAch.has(a.id));
  const tips = [];
  if (r.failed?.reason === 'insertion') tips.push('Add propellant until the Δv check turns green. The builder shows exactly how much you need.');
  if (r.failed?.reason === 'propellant') tips.push('Your choices used more propellant than you carried. Leave a margin for surprises.');
  if (r.failed?.reason === 'launch') tips.push('Rockets loaded close to their limit fail more often. Keep at least 12% mass margin, or move up to Launch B. The builder shows the exact odds.');
  if (r.failed?.reason === 'lost') tips.push('Every battery blackout and every ignored fault damages the spacecraft. Make the eclipse check green, and act on master alarms quickly.');
  if (!r.failed && failed) tips.push(`On ${diff().label} a mission needs at least ${r.failBelow} points to count as a success. Return more science.`);
  if (r.brown) tips.push(`The battery ran out ${r.brown} time${r.brown > 1 ? 's' : ''}. A larger battery keeps you alive through eclipse.`);
  if (r.lost > 1) tips.push(`${fmt(r.lost, 1)} Gbit was lost to a full recorder. A bigger recorder or a faster radio fixes that.`);
  r.objs.filter(o => o.frac < 1).forEach(o => tips.push(`"${o.label}" reached ${Math.round(o.frac * 100)}%. ${o.got < 0.01 ? 'Fly an instrument that serves it.' : 'More downlink would finish it.'}`));
  if (!tips.length) tips.push('A clean mission. Try a cheaper build and see if you can still hit 100.');
  const comp = { astra: '#e8a85c', lunaris: '#b9c8e8', earth: '#6fb4ff', mars: '#ff7a3d' }[m.id];
  const next = ORDER[(ORDER.indexOf(m.id) + 1) % ORDER.length];
  $('#gx-debrief').innerHTML = `
    <div class="gx-wrap gx-deb">
      <div class="gx-deb__hero">
        ${patch(m, r.score, comp)}
        <div>
          <p class="gx-kicker">Step 05 · Debrief</p>
          ${failed ? `<p class="gx-stamp" aria-hidden="true">Mission failed</p>` : `<p class="gx-stamp gx-stamp--ok" aria-hidden="true">Mission success</p>`}
          <h1 class="gx-h1">${r.failed?.reason === 'launch' ? 'Vehicle lost.' : r.failed?.reason === 'insertion' ? 'Lost in space.' : r.failed?.reason === 'lost' ? 'Signal lost.' : r.failed?.reason === 'propellant' ? 'Out of propellant.' : failed ? 'Not enough science.' : r.score >= 80 ? 'Science is home.' : 'Partial success.'}</h1>
          <p class="gx-tag">${r.failed ? esc(r.failed.text) : `Grade <b class="gx-grade">${grade}</b> · rank <b>${esc(rank)}</b> · ${esc(diff().label)} difficulty.`}</p>
          <div class="gx-row"><div class="gx-bigscore">${ring(r.score, 100)}<span>Final score</span></div>
            <ul class="gx-mini"><li><b>${fmt(r.sent || 0, 1)} Gbit</b> science returned</li><li><b>${fmt(r.lost || 0, 1)} Gbit</b> lost to a full recorder</li><li><b>${r.brown || 0}</b> safe-mode shutdowns</li><li><b>${(r.challenge || 0) / 5} / 2</b> questions right</li>${r.failed?.reason === 'launch' || r.failed?.reason === 'insertion' ? '' : `<li><b>${r.health ?? 0}%</b> spacecraft health at the end</li>`}</ul></div>
        </div>
      </div>
      <div class="gx-cols">
        <section><h2>Objectives</h2><ul class="gx-prog gx-prog--big">${r.objs.map(o => `<li><span>${esc(o.label)}</span><div><i style="width:${o.frac * 100}%"></i></div><b>${Math.round(o.w * o.frac)} / ${o.w}</b></li>`).join('')}</ul>
          <h2>VEGA's notes</h2><ul class="gx-tips">${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>
        <section><h2>Your mission vs NASA</h2>
          <table class="gx-table"><thead><tr><th></th><th>Real mission</th></tr></thead><tbody>${m.compare.map(([k, v, s]) => `<tr><th>${esc(k)}</th><td>${esc(v)} ${src(s)}</td></tr>`).join('')}
            <tr><th>Your solar power</th><td>${fmt(d.solarW)} W at ${esc(m.world)} (game value)</td></tr></tbody></table>
          <h2>Discoveries unlocked</h2>
          <div class="gx-disc">${m.discoveries.map(x => { const on = unlocked.includes(x); return `<article class="${on ? 'on' : ''}"><b>${on ? esc(x.title) : 'Locked'}</b><p>${on ? esc(x.text) : 'Complete the matching objective to unlock.'}</p>${on ? src(x.src) : ''}</article>`; }).join('')}</div>
          <h2>Achievements</h2>
          <div class="gx-ach">${ACH.map(a => { const on = (store.get().ach || []).includes(a.id); return `<span class="${on ? 'on' : ''} ${newAch.some(x => x.id === a.id) ? 'new' : ''}" title="${esc(a.how)}"><b>${esc(a.name)}</b><small>${esc(a.how)}</small></span>`; }).join('')}</div></section>
      </div>
      <div class="gx-row gx-deb__actions">
        <button class="gx-btn gx-btn--go" id="gx-retry">${failed ? 'Try again' : 'Rebuild and fly again'}</button>
        ${!failed && settings.diff !== 'commander' ? `<button class="gx-btn" id="gx-harder">Fly it on ${settings.diff === 'cadet' ? 'Flight' : 'Commander'}</button>` : ''}
        <a class="gx-btn" href="play.html?mission=${next}">Next mission: ${esc(GAME[next].name)}</a>
        <a class="gx-btn gx-btn--ghost" href="index.html#archive">Discovery archive</a>
        <a class="gx-btn gx-btn--ghost" href="index.html">Back to NEXUS</a>
      </div>
    </div>`;
  $('#gx-retry').onclick = () => { setScreen('build'); renderBuild(); };
  const hb = $('#gx-harder'); if (hb) hb.onclick = () => { settings.diff = settings.diff === 'cadet' ? 'flight' : 'commander'; saveSettings(); setScreen('build'); renderBuild(); };
  newAch.forEach((a, i) => setTimeout(() => { toast(`Achievement: ${a.name}`); audio.chime(); }, 900 + i * 900));
  if (stage) stage.showBuild(m, cfg, 0, true);
  failed ? audio.fail() : audio.chime();
}
const ACH = [
  { id: 'first', name: 'First light', how: 'Complete any mission' },
  { id: 'clean', name: 'Clean sheet', how: 'No blackouts and no lost data' },
  { id: 'full', name: 'Full house', how: 'Finish every objective in a mission' },
  { id: 'quiz', name: 'Know your stuff', how: 'Answer both of VEGA\'s questions' },
  { id: 'tough', name: 'Iron hull', how: 'Survive a fault and finish above 90% health' },
  { id: 'cheap', name: 'Shoestring', how: 'Succeed using under 85% of the budget' },
  { id: 'cmdr', name: 'Commander', how: 'Succeed on Commander difficulty' },
  { id: 'perfect', name: 'Flight Director', how: 'Score 95 or more' },
  { id: 'grand', name: 'Four frontiers', how: 'Succeed on all four missions' },
];
function achievementsFor(r) {
  const ok = !r.missionFailed, out = [];
  const add = id => out.push(ACH.find(a => a.id === id));
  if (ok) add('first');
  if (ok && !r.brown && (r.lost || 0) < 0.1) add('clean');
  if (ok && r.objs.every(o => o.frac >= 1)) add('full');
  if (r.challenge >= 10) add('quiz');
  if (ok && sim?.firedAnoms?.size && r.health > 90) add('tough');
  if (ok && d && d.cost < d.budget * 0.85) add('cheap');
  if (ok && settings.diff === 'commander') add('cmdr');
  if (r.score >= 95) add('perfect');
  const best = { ...(store.get().best || {}) }; if (ok) best[mission.id] = Math.max(best[mission.id] || 0, r.score);
  const wins = store.get().winsBy || {}; if (ok) wins[mission.id] = 1; const s = store.get(); s.winsBy = wins; store.set(s);
  if (ORDER.every(id => wins[id])) add('grand');
  return out;
}
function patch(m, score, col) {
  const starsN = score >= 95 ? 5 : score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score > 0 ? 1 : 0;
  const st = Array.from({ length: 5 }, (_, i) => `<text x="${60 + (i - 2) * 13}" y="96" text-anchor="middle" font-size="11" fill="${i < starsN ? '#ffd166' : '#3a3a44'}">★</text>`).join('');
  return `<svg class="gx-patch" viewBox="0 0 120 120" role="img" aria-label="${esc(m.name)} mission patch">
    <defs><radialGradient id="pg" cx="50%" cy="40%"><stop offset="0" stop-color="${col}" stop-opacity=".55"/><stop offset="1" stop-color="#07070b"/></radialGradient></defs>
    <circle cx="60" cy="60" r="56" fill="url(#pg)" stroke="${col}" stroke-width="3"/>
    <circle cx="60" cy="52" r="18" fill="${col}" opacity=".9"/><ellipse cx="60" cy="52" rx="34" ry="9" fill="none" stroke="#fff" stroke-width="1.5" transform="rotate(-18 60 52)"/>
    <text x="60" y="84" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="${m.name.length > 7 ? 10 : 13}" fill="#fff" letter-spacing="1">${esc(m.name)}</text>${st}
    <path id="arc" d="M18 60 A42 42 0 0 1 102 60" fill="none"/><text font-size="7" fill="#fff" letter-spacing="2" font-family="monospace"><textPath href="#arc" startOffset="50%" text-anchor="middle">NEXUS//04 · ${esc(m.world.toUpperCase())}</textPath></text></svg>`;
}

boot();
