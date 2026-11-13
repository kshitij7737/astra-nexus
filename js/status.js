// NEXUS//04 mission status panel: a small "system online" pill that opens into the player's mission
// status (progress saved on this device by the game), the mission log, a help desk (VEGA) and sound.
// Values come from the player's own game runs. Nothing here is live NASA telemetry.
import { GAME, ORDER } from './game-data.js';

const KEY = 'nexus04';
const STAGES = ['Brief', 'Build', 'Launch', 'Operate', 'Debrief'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

// Called by the game: record the furthest stage reached and add a line to the mission log.
export function trace(missionId, text, stageIdx) {
  const s = read();
  s.current = missionId;
  if (stageIdx != null) { s.stage = s.stage || {}; s.stage[missionId] = Math.max(s.stage[missionId] || 0, stageIdx + 1); }
  if (text) { s.mlog = [{ t: Date.now(), m: missionId, text }, ...(s.mlog || [])].slice(0, 14); }
  write(s);
}

const FAQ = [
  ['What is NEXUS//04?', 'A NASA Space Apps 2026 team project. Four mission concepts (ASTRA, HALO, LUNARIS, JEZERO ECHO), each built on a real NASA mission, and a game where you design, launch and fly one.'],
  ['Do I need to know about space?', 'No. The game explains each step, VEGA (mission control) gives hints, and every number has a plain-language label. Start with HALO on Cadet.'],
  ['What counts as science?', 'Only data that reaches Earth. Instruments record during target passes, the recorder stores it, and the radio sends it home during contact windows.'],
  ['Why did my battery run flat?', 'In eclipse the arrays give no power. A bigger battery, fewer instruments switched on, or a larger array keeps you alive through the shadow.'],
  ['What is delta-v?', 'How much the spacecraft can change its speed with the propellant it carries. You need enough to reach orbit plus a reserve for surprises.'],
  ['Which numbers are real?', 'Facts on the site carry a NASA or instrument-team source link. Game values (power, data, credits) are simplified and labelled as game or simulated values.'],
  ['Is this real NASA hardware?', 'No. The spacecraft are team concepts inspired by OSIRIS-APEX, LRO, Aura and MRO. They are labelled conceptual wherever they appear.'],
];

export function mountStatus({ music } = {}) {
  if (document.querySelector('.nx-status')) return;
  const el = document.createElement('aside');
  el.className = 'nx-status'; el.setAttribute('aria-label', 'Mission status');
  el.innerHTML = `
    <button class="nx-status__pill" type="button" aria-expanded="false" aria-controls="nx-status-panel">
      <i class="nx-dot" aria-hidden="true"></i><span class="nx-status__sys">System online</span><span class="nx-status__sum"></span>
    </button>
    <div class="nx-status__panel" id="nx-status-panel" role="dialog" aria-label="Mission status" hidden>
      <div class="nx-status__tabs" role="tablist">
        <button type="button" role="tab" data-t="status" aria-selected="true">Status</button>
        <button type="button" role="tab" data-t="log" aria-selected="false">Log</button>
        <button type="button" role="tab" data-t="help" aria-selected="false">Ask VEGA</button>
      </div>
      <div class="nx-status__body"></div>
      <div class="nx-status__foot">
        <label class="nx-sound"><input type="checkbox" data-sound> Ambient sound</label>
        <input type="range" min="0" max="1" step="0.05" data-vol aria-label="Volume">
      </div>
      <p class="nx-status__note">Your progress on this device. Illustrative game values, not live NASA telemetry.</p>
    </div>`;
  document.body.appendChild(el);
  const pill = el.querySelector('.nx-status__pill'), panel = el.querySelector('.nx-status__panel'), body = el.querySelector('.nx-status__body');
  let tab = 'status';
  const s0 = read();
  const snd = el.querySelector('[data-sound]'), vol = el.querySelector('[data-vol]');
  vol.value = s0.ambVol ?? 0.5; snd.checked = false; // never autoplays: sound starts only on a click
  if (!music) el.querySelector('.nx-status__foot').hidden = true;
  snd.onchange = () => { if (snd.checked) { music?.start?.(); music?.setVolume?.(+vol.value); music?.setMood?.('calm'); } else music?.stop?.(); };
  vol.oninput = () => { music?.setVolume?.(+vol.value); const s = read(); s.ambVol = +vol.value; write(s); };

  function summary() {
    const s = read(), id = s.current && GAME[s.current] ? s.current : null;
    const st = s.stage || {}, total = ORDER.reduce((a, k) => a + Math.min(5, st[k] || 0), 0);
    return { s, id, pct: Math.round(total / (ORDER.length * 5) * 100), st };
  }
  function paintPill() {
    const { id, pct } = summary();
    el.querySelector('.nx-status__sum').textContent = id ? `${GAME[id].name} · ${pct}%` : 'No mission flown yet';
  }
  function paint() {
    const { s, id, pct, st } = summary();
    el.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
    if (tab === 'status') {
      const m = id ? GAME[id] : null, stage = id ? st[id] || 0 : 0, last = s.mlog?.[0];
      const data = !id ? 'Standing by' : stage >= 5 ? 'Debrief filed' : stage >= 4 ? 'Collecting and sending data' : stage >= 3 ? 'In flight' : 'On the ground';
      body.innerHTML = `
        <dl class="nx-kv">
          <div><dt>Mission</dt><dd>${m ? `<span style="color:${m.accent}">${esc(m.name)}</span> · ${esc(m.world)}` : 'Pick one in mission control'}</dd></div>
          <div><dt>Data status</dt><dd>${esc(data)}</dd></div>
          <div><dt>Overall progress</dt><dd><span class="nx-bar"><i style="width:${pct}%"></i></span> ${pct}%</dd></div>
        </dl>
        <ol class="nx-stages" aria-label="Stages for ${m ? esc(m.name) : 'your mission'}">${STAGES.map((n, i) => `<li class="${i < stage ? 'done' : i === stage && id ? 'now' : ''}">${n}</li>`).join('')}</ol>
        <ul class="nx-missions">${ORDER.map(k => `<li style="--c:${GAME[k].accent}"><b>${esc(GAME[k].name)}</b><span class="nx-bar"><i style="width:${Math.min(5, st[k] || 0) * 20}%"></i></span>${s.best?.[k] != null ? `<small>best ${s.best[k]}</small>` : ''}</li>`).join('')}</ul>
        ${last ? `<p class="nx-last"><b>Latest:</b> ${esc(last.text)}</p>` : ''}
        <a class="nx-go" href="play.html${id ? `?mission=${id}` : ''}">${id && (st[id] || 0) < 5 ? 'Continue mission' : 'Fly a mission'}</a>`;
    } else if (tab === 'log') {
      const log = s.mlog || [];
      body.innerHTML = log.length ? `<ol class="nx-log">${log.map(e => `<li><time>${new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><span style="color:${GAME[e.m]?.accent || '#fff'}">${esc(GAME[e.m]?.name || '')}</span> ${esc(e.text)}</li>`).join('')}</ol>`
        : '<p class="nx-empty">Nothing logged yet. Fly a mission and each step lands here.</p>';
    } else {
      body.innerHTML = `<p class="nx-vega">VEGA here, mission control. Common questions:</p>${FAQ.map(([q, a]) => `<details class="nx-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}`;
    }
  }
  const open = v => { panel.hidden = !v; pill.setAttribute('aria-expanded', String(v)); el.classList.toggle('is-open', v); if (v) paint(); };
  pill.onclick = () => open(panel.hidden);
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { open(false); pill.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !el.contains(e.target)) open(false); });
  addEventListener('storage', () => { paintPill(); if (!panel.hidden) paint(); });
  paintPill();
  return { open, refresh() { paintPill(); if (!panel.hidden) paint(); } };
}
