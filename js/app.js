// ASTRA mission environments (Kshitij's workstream).
// Integration entry point: mountMissionModule(containerEl, { mission: 'mars' })
// Returns { setMission(id), destroy() }.
import { MISSIONS, SOURCES, BUILDER, BODIES } from './data.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const srcLink = key => {
  if (!key) return '<span class="mm-src mm-src--none">No source: placeholder</span>';
  const s = SOURCES[key];
  return `<a class="mm-src" href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>`;
};
const TAG = {
  fact: '<span class="mm-tag mm-tag--fact">NASA fact</span>',
  illustrative: '<span class="mm-tag mm-tag--ill">Illustrative</span>',
  conceptual: '<span class="mm-tag mm-tag--con">Conceptual</span>',
  derived: '<span class="mm-tag mm-tag--der">Derived</span>',
};
const pad = n => String(n).padStart(2, '0');
const CHAPTERS = ['Overview', 'What we know', 'Where to look', 'Instruments', 'Hangar'];

export async function mountMissionModule(root, opts = {}) {
  let mission = MISSIONS.find(m => m.id === opts.mission) || MISSIONS[0];
  let stage = null, active = 1, selected = 0, hangarTab = 'craft', renderToken = 0;
  const cfg = { area: BUILDER.arrayArea.def, eff: 0, angle: 0, vol: BUILDER.dataVolume.def, rate: 0, alt: null, instruments: ['Camera'] };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('astra-mm');
  root.innerHTML = `
    <div class="mm-canvas" aria-hidden="true"></div>
    <div class="mm-vignette" aria-hidden="true"></div>
    <div class="mm-grain" aria-hidden="true"></div>
    <header class="mm-top">
      <a class="mm-brand" href="#mm-ch-1" aria-label="ASTRA mission environments, back to top">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><circle cx="16" cy="16" r="6" fill="currentColor"/><ellipse cx="16" cy="16" rx="14" ry="5" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(-24 16 16)"/></svg>
        <span><b>ASTRA</b><small>Mission environments</small></span>
      </a>
      <nav class="mm-missions" aria-label="Choose a mission">${MISSIONS.map(m => `<button type="button" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</nav>
      <button type="button" class="mm-pause" aria-pressed="false">Pause motion</button>
    </header>
    <div class="mm-vertical" aria-hidden="true"></div>
    <nav class="mm-progress" aria-label="Chapters">${CHAPTERS.map((c, i) => `<button type="button" data-goto="${i + 1}"><span>${pad(i + 1)}</span><em>${c}</em></button>`).join('')}</nav>
    <main class="mm-main"></main>`;
  const $ = s => root.querySelector(s);

  try {
    const sc = await import('./scene.js');
    if (!sc.webglAvailable()) throw new Error('WebGL unavailable');
    stage = new sc.Stage($('.mm-canvas'));
  } catch (e) {
    console.warn('ASTRA: 3D disabled, showing text-only layout.', e);
    root.classList.add('mm-no3d'); $('.mm-pause').hidden = true;
  }

  const pauseBtn = $('.mm-pause');
  const syncPause = () => { pauseBtn.setAttribute('aria-pressed', String(stage.paused)); pauseBtn.textContent = stage.paused ? 'Resume motion' : 'Pause motion'; };
  if (stage) { syncPause(); pauseBtn.onclick = () => { stage.paused = !stage.paused; syncPause(); }; }
  root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMission(b.dataset.m));
  const goto = n => root.querySelector(`#mm-ch-${n}`).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  root.querySelectorAll('.mm-progress [data-goto]').forEach(b => b.onclick = () => goto(b.dataset.goto));

  // ---------- page
  function render() {
    const m = mission;
    root.style.setProperty('--accent', m.accent);
    root.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-current', String(b.dataset.m === m.id)));
    $('.mm-vertical').textContent = m.vertical;
    const next = MISSIONS[(MISSIONS.indexOf(m) + 1) % MISSIONS.length];
    const used = [...new Set([...m.facts, ...m.targets, ...m.instruments, ...m.spacecraft.parts].map(x => x.src).filter(Boolean).concat(m.layers ? ['noaaLayers'] : []))];
    $('.mm-main').innerHTML = `
      <section class="mm-ch mm-hero" id="mm-ch-1" data-ch="1" aria-labelledby="mm-h1">
        <div class="mm-hero__copy mm-intro">
          <p class="mm-kicker">Chapter 01 / ${esc(m.hero.kicker)}</p>
          <h1 id="mm-h1">${esc(m.hero.headline)}</h1>
          <p class="mm-lede">${esc(m.hero.lede)}</p>
        </div>
        <div class="mm-anchor mm-hero__anchor" data-anchor="hero"><span class="mm-no3d-msg">3D view unavailable on this device. All mission content is below.</span></div>
        <p class="mm-giant" aria-hidden="true" style="--len:${m.display.length}">${esc(m.display)}</p>
        <div class="mm-hero__foot">
          <nav class="mm-heronums" aria-label="Chapters">${CHAPTERS.map((c, i) => `<button type="button" data-goto="${i + 1}"><span>${pad(i + 1)}</span><em>${c}</em></button>`).join('')}</nav>
          <span class="mm-scroll">Scroll to enter</span>
          <p class="mm-note" title="${esc(m.world.note)}">${TAG.illustrative} ${m.world.kind === 'earth' ? 'Real coastlines, illustrative colours' : 'Illustrative surface'}</p>
        </div>
      </section>

      <section class="mm-ch mm-facts" id="mm-ch-2" data-ch="2" aria-labelledby="mm-h2">
        <div class="mm-anchor mm-facts__anchor" data-anchor="facts"></div>
        <div class="mm-facts__copy mm-reveal">
          <p class="mm-kicker">Chapter 02 / What we know</p>
          <h2 id="mm-h2">${esc(m.factsHeadline)}</h2>
          <p class="mm-body">${esc(m.summary)}</p>
          <dl class="mm-factlist">${m.facts.map((f, i) => `<div><dt><span>${pad(i + 1)}</span>${esc(f.k)}</dt><dd>${esc(f.v)}${srcLink(f.src)}</dd></div>`).join('')}</dl>
          ${m.layers ? `<h3 class="mm-sub">Layers of the atmosphere</h3>
            <ol class="mm-layers">${m.layers.map(l => `<li><b>${esc(l.name)}</b><span>Top ${esc(l.top)}</span><p>${esc(l.note)}</p></li>`).join('')}</ol>${srcLink('noaaLayers')}` : ''}
        </div>
      </section>

      <section class="mm-ch mm-targets" id="mm-ch-3" data-ch="3" aria-labelledby="mm-h3">
        <div class="mm-targets__head mm-reveal">
          <p class="mm-kicker">Chapter 03 / Where to look</p>
          <h2 id="mm-h3">Three places to look.</h2>
          <p class="mm-body">Pick one. The world turns to it.</p>
        </div>
        <div class="mm-gallery">
          <div class="mm-frame mm-anchor" data-anchor="frame" tabindex="-1">
            <span class="mm-frame__label"></span>
            
            <span class="mm-no3d-msg">3D view unavailable. Target details are listed alongside.</span>
          </div>
          <div class="mm-tcards" role="list">${m.targets.map((t, i) => `
            <button type="button" class="mm-tcard" role="listitem" data-t="${i}" aria-pressed="false">
              <span class="mm-tcard__n">${pad(i + 1)} / ${pad(m.targets.length)}</span>
              <span class="mm-tcard__name">${esc(t.name)}</span>
              ${TAG[t.kind]}
            </button>`).join('')}</div>
          <div class="mm-tdetail" aria-live="polite"></div>
        </div>
      </section>

      <section class="mm-ch mm-inst" id="mm-ch-4" data-ch="4" aria-labelledby="mm-h4">
        <div class="mm-anchor mm-inst__anchor" data-anchor="inst"></div>
        <div class="mm-inst__head mm-reveal">
          <p class="mm-kicker">Chapter 04 / The instruments</p>
          <h2 id="mm-h4">The instruments.</h2>
        </div>
        <div class="mm-irow" tabindex="0" aria-label="Instrument cards, scroll sideways">${m.instruments.map((ins, i) => `
          <article class="mm-icard mm-reveal">
            <span class="mm-icard__n">${pad(i + 1)}</span>
            <h3>${esc(ins.name)}</h3>
            <p class="mm-icard__full">${esc(ins.full)}</p>
            <p>${esc(ins.purpose)}</p>
            ${ins.specs.length ? `<ul>${ins.specs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
            ${srcLink(ins.src)}
          </article>`).join('')}</div>
      </section>

      <section class="mm-ch mm-hangar" id="mm-ch-5" data-ch="5" aria-labelledby="mm-h5">
        <div class="mm-hangar__panel mm-reveal">
          <p class="mm-kicker">Chapter 05 / The hangar</p>
          <h2 id="mm-h5">Inspect it. Then build your own.</h2>
          <div class="mm-tabs" role="tablist">
            <button type="button" role="tab" data-tab="craft">Spacecraft explorer</button>
            <button type="button" role="tab" data-tab="builder">Concept builder</button>
          </div>
          <div class="mm-tabpanel" role="tabpanel"></div>
        </div>
        <div class="mm-stage mm-anchor" data-anchor="stage" tabindex="0" aria-label="3D spacecraft. Drag or use arrow keys to rotate.">
          <span class="mm-stage__hint">Drag to rotate · click a part</span>
          <span class="mm-no3d-msg">3D view unavailable. Part details are in the panel.</span>
          <p class="mm-stage__note"></p>
        </div>
      </section>

      <footer class="mm-ch mm-end" id="mm-ch-6" data-ch="6">
        <div class="mm-anchor mm-end__anchor" data-anchor="end"></div>
        <div class="mm-end__copy">
          <p class="mm-kicker">End of ${esc(m.name)}</p>
          <button type="button" class="mm-next" data-next="${next.id}"><span>Next mission</span><b>${esc(next.name)}</b></button>
          <div class="mm-legend"><p class="mm-legend__t">How to read this page</p><p>${TAG.fact} published by NASA or an instrument team</p><p>${TAG.derived} calculated by us, formula shown</p><p>${TAG.illustrative} simplified or artistic, not measured</p><p>${TAG.conceptual} ASTRA design choice, not flight hardware</p></div>
          <details class="mm-sources"><summary>Sources for ${esc(m.name)} (${used.length})</summary><ul>${used.map(k => `<li>${srcLink(k)}</li>`).join('')}</ul></details>
        </div>
        <p class="mm-vword" aria-hidden="true">${esc(m.display)}</p>
      </footer>`;

    root.querySelectorAll('.mm-main [data-goto]').forEach(b => b.onclick = () => goto(b.dataset.goto));
    root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => selectTarget(+b.dataset.t));
    root.querySelector('.mm-next').onclick = () => setMission(next.id);
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { hangarTab = b.dataset.tab; renderHangar(); });
    if (stage) {
      // build the 3D world just after the text has painted, so the page never sits blank
      const token = (renderToken = (renderToken || 0) + 1);
      requestAnimationFrame(() => setTimeout(() => {
        if (token !== renderToken) return;
        stage.setMission(m); applyLayout(active);
      }, 30));
      const frame = root.querySelector('.mm-frame');
      frame.addEventListener('click', e => { const hit = stage.pick(e.clientX, e.clientY); if (hit?.type === 'target') selectTarget(hit.index); });
      bindStage(root.querySelector('.mm-stage'));
    }
    selectTarget(0, true);
    renderHangar();
    observe();
    fitGiant();
    applyLayout(1);
  }

  // Scale the giant mission word to the page width (fonts differ in width per letter).
  function fitGiant() {
    const el = root.querySelector('.mm-giant'); if (!el) return;
    el.style.fontSize = '100px'; el.style.width = 'max-content';
    const hero = root.querySelector('.mm-hero');
    const avail = hero.clientWidth - parseFloat(getComputedStyle(hero).paddingLeft) * 2;
    const size = Math.min(100 * avail / el.getBoundingClientRect().width, window.innerHeight * 0.26);
    el.style.width = '';
    el.style.fontSize = `${Math.floor(size)}px`;
  }
  const onResize = () => fitGiant();
  window.addEventListener('resize', onResize);
  document.fonts?.ready.then(fitGiant);

  // ---------- chapters drive the 3D layout
  let io, revealIO;
  function observe() {
    io?.disconnect(); revealIO?.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) applyLayout(+e.target.dataset.ch); }), { rootMargin: '-48% 0px -48% 0px' });
    root.querySelectorAll('.mm-ch').forEach(s => io.observe(s));
    revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } }), { threshold: 0.15 });
    root.querySelectorAll('.mm-reveal').forEach(el => reduced ? el.classList.add('is-in') : revealIO.observe(el));
  }
  function applyLayout(ch) {
    active = ch;
    root.querySelectorAll('[data-goto]').forEach(b => b.setAttribute('aria-current', String(+b.dataset.goto === Math.min(ch, 5))));
    root.dataset.chapter = ch;
    if (!stage) return;
    const a = n => root.querySelector(`[data-anchor="${n}"]`);
    const small = window.matchMedia('(max-width: 720px)').matches; // globe sits behind text on phones: dim it
    const L = {
      1: { worldAnchor: a('hero'), worldFill: 0.92 },
      2: { worldAnchor: a('facts'), worldFill: 0.85, worldFade: small ? 0.3 : 1 },
      3: { worldAnchor: a('frame'), worldFill: 0.95 },
      4: { worldAnchor: a('inst'), worldFill: 0.9, worldFade: 0.45 },
      5: { worldAnchor: a('inst'), worldFill: 0.6, worldFade: 0, craftAnchor: a('stage'), craftFade: 1 },
      6: { worldAnchor: a('end'), worldFill: 0.8, worldFade: small ? 0.45 : 0.9 },
    }[ch];
    stage.setLayout(L);
    stage.focusTarget(ch === 3 ? selected : -1);
  }

  // ---------- targets
  function selectTarget(i, silent) {
    selected = i;
    const t = mission.targets[i];
    root.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.t === i)));
    root.querySelector('.mm-frame__label').innerHTML = `<b>${esc(t.name)}</b>${t.kind === 'fact' ? `${t.lat.toFixed(2)}°, ${t.lon.toFixed(2)}°` : 'Illustrative position'}`;
    root.querySelector('.mm-tdetail').innerHTML = `
      <h3>${esc(t.name)} ${TAG[t.kind]}</h3>
      <p>${esc(t.desc)}</p>
      <dl class="mm-meta"><div><dt>Location</dt><dd>${t.kind === 'fact' ? `${t.lat.toFixed(2)}°, ${t.lon.toFixed(2)}°` : 'Illustrative position'}</dd></div>
      <div><dt>Coordinate frame</dt><dd>${esc(t.frame)}</dd></div><div><dt>Units</dt><dd>${esc(t.units)}</dd></div>
      <div><dt>Source</dt><dd>${srcLink(t.src)}</dd></div></dl>`;
    if (stage && !silent && active === 3) stage.focusTarget(i);
  }

  // ---------- hangar
  function renderHangar() {
    root.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === hangarTab)));
    const note = root.querySelector('.mm-stage__note');
    if (hangarTab === 'craft') {
      const sc = mission.spacecraft;
      stage?.setCraft(sc.model);
      note.innerHTML = `${TAG.illustrative} Simplified, not to scale.`;
      root.querySelector('.mm-tabpanel').innerHTML = `
        <p class="mm-body"><b>${esc(sc.ref)}</b></p>
        <div class="mm-parts">${sc.parts.map((p, i) => `<button type="button" data-p="${i}" aria-pressed="false"><span>${pad(i + 1)}</span>${esc(p.name)} ${TAG[p.kind]}</button>`).join('')}</div>
        <div class="mm-pdetail" aria-live="polite"><p class="mm-muted">Pick a part.</p></div>`;
      root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => selectPart(+b.dataset.p));
    } else {
      note.innerHTML = `${TAG.conceptual} Not NASA hardware.`;
      renderBuilder();
    }
  }
  function selectPart(i) {
    if (hangarTab !== 'craft') return;
    const p = mission.spacecraft.parts[i]; if (!p) return;
    root.querySelectorAll('[data-p]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === i)));
    root.querySelector('.mm-pdetail').innerHTML = `<h3>${esc(p.name)} ${TAG[p.kind]}</h3><p>${esc(p.note)}</p>${p.src ? srcLink(p.src) : '<p class="mm-muted">Geometry only; no specification claimed.</p>'}`;
    stage?.highlightPart(i);
  }
  function bindStage(el) {
    let down = null, moved = 0;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; moved = 0; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y; moved += Math.abs(dx) + Math.abs(dy);
      stage.rotateCraft(dx * 0.008, dy * 0.006); down = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointerup', e => {
      if (down && moved < 6 && hangarTab === 'craft') { const hit = stage.pick(e.clientX, e.clientY); if (hit?.type === 'part') selectPart(hit.index); }
      down = null;
    });
    el.addEventListener('keydown', e => {
      const k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] }[e.key];
      if (k) { e.preventDefault(); stage.rotateCraft(...k); }
    });
  }

  function calc() {
    const atMars = mission.id === 'mars';
    const S = atMars ? BUILDER.marsIrradiance.value : BUILDER.solarConstant.value;
    const eff = BUILDER.cellEff[cfg.eff].value;
    const P = S * cfg.area * eff * Math.cos(cfg.angle * Math.PI / 180);
    const rate = BUILDER.linkRates[cfg.rate].value;
    const hours = (cfg.vol * 1000 / rate) / 3600;
    const body = BODIES[mission.id];
    const period = body ? 2 * Math.PI * Math.sqrt((body.r + cfg.alt) ** 3 / body.mu) / 60 : null;
    return { S, eff, P, rate, hours, period, body, atMars };
  }
  function renderBuilder() {
    const B = BUILDER, body = BODIES[mission.id];
    if (body && (cfg.alt == null || cfg.alt < body.min || cfg.alt > body.max)) cfg.alt = body.def;
    stage?.setCraft('concept', cfg);
    root.querySelector('.mm-tabpanel').innerHTML = `
      <form class="mm-builder" onsubmit="return false">
        <label><span>Solar array area <output data-o="area"></output></span><input type="range" data-i="area" min="${B.arrayArea.min}" max="${B.arrayArea.max}" step="1" value="${cfg.area}"></label>
        <label><span>Cell type</span><select data-i="eff">${B.cellEff.map((e, i) => `<option value="${i}" ${i === cfg.eff ? 'selected' : ''}>${esc(e.label)}</option>`).join('')}</select></label>
        <label><span>Sun angle off the array <output data-o="angle"></output></span><input type="range" data-i="angle" min="0" max="60" step="5" value="${cfg.angle}"></label>
        <label><span>Science data per day <output data-o="vol"></output></span><input type="range" data-i="vol" min="${B.dataVolume.min}" max="${B.dataVolume.max}" step="1" value="${cfg.vol}"></label>
        <label><span>Downlink rate</span><select data-i="rate">${B.linkRates.map((r, i) => `<option value="${i}" ${i === cfg.rate ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select></label>
        ${body ? `<label><span>Circular orbit altitude <output data-o="alt"></output></span><input type="range" data-i="alt" min="${body.min}" max="${body.max}" step="5" value="${cfg.alt}"></label>` : ''}
        <fieldset><legend>Instruments (orange blocks)</legend>${B.instruments.map(n => `<label class="mm-chk"><input type="checkbox" value="${esc(n)}" ${cfg.instruments.includes(n) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</fieldset>
      </form>
      <div class="mm-results" aria-live="polite"></div>`;
    root.querySelectorAll('[data-i]').forEach(el => el.addEventListener('input', () => { cfg[el.dataset.i] = +el.value; updateBuilder(el.dataset.i === 'area'); }));
    root.querySelectorAll('.mm-builder fieldset input').forEach(c => c.onchange = () => { cfg.instruments = [...root.querySelectorAll('.mm-builder fieldset input:checked')].map(x => x.value); updateBuilder(true); });
    updateBuilder(false);
  }
  function updateBuilder(rebuild) {
    const r = calc(), B = BUILDER;
    const set = (k, t) => { const o = root.querySelector(`[data-o="${k}"]`); if (o) o.textContent = t; };
    set('area', `${cfg.area} m²`); set('angle', `${cfg.angle}°`); set('vol', `${cfg.vol} Gb/day`); set('alt', `${cfg.alt} km`);
    const irrSrc = r.atMars ? B.marsIrradiance.src : B.solarConstant.src;
    root.querySelector('.mm-results').innerHTML = `
      <div class="mm-res"><span class="mm-res__k">Array power at start of life ${TAG.derived}</span><b>${Math.round(r.P).toLocaleString('en-IN')} W</b>
        <code>P = S × A × η × cos θ = ${r.S} × ${cfg.area} × ${r.eff} × cos ${cfg.angle}°</code>
        <p class="mm-muted">${srcLink(irrSrc)} · ideal case, no ageing or shade</p></div>
      <div class="mm-res"><span class="mm-res__k">Time to send one day of data ${TAG.derived}</span><b>${r.hours.toFixed(1)} h per day</b>
        <code>t = volume ÷ rate = ${cfg.vol} Gb ÷ ${r.rate} Mb/s</code>
        <p class="mm-muted">${B.linkRates[cfg.rate].src ? srcLink(B.linkRates[cfg.rate].src) : 'Conceptual rate'}${r.hours > 24 ? ' <b class="mm-warn">Too much data to send home.</b>' : ''}</p></div>
      ${r.period != null ? `<div class="mm-res"><span class="mm-res__k">Orbital period ${TAG.derived}</span><b>${r.period.toFixed(1)} min</b>
        <code>T = 2π √(a³ / μ), a = ${r.body.r} + ${cfg.alt} km, μ = ${r.body.mu} km³/s²</code>
        <p class="mm-muted">${srcLink(r.body.src)}</p></div>`
        : `<div class="mm-res"><span class="mm-res__k">Orbital period</span><b class="mm-na">Unavailable</b><p class="mm-muted">Needs Apophis's mass.</p></div>`}
      <div class="mm-res"><span class="mm-res__k">Total mass and payload power</span><b class="mm-na">Unavailable</b><p class="mm-muted">No sourced part masses yet.</p></div>`;
    if (rebuild) stage?.setCraft('concept', cfg);
  }

  function setMission(id) {
    const m = MISSIONS.find(x => x.id === id); if (!m) return;
    mission = m; cfg.alt = null; hangarTab = 'craft';
    render();
    window.scrollTo({ top: root.offsetTop, behavior: 'auto' });
  }

  render();
  return { setMission, destroy() { window.removeEventListener('resize', onResize); io?.disconnect(); revealIO?.disconnect(); stage?.dispose(); root.innerHTML = ''; } };
}
