import { acts as nebulaActs, parts as nebulaParts } from './nova-data.js';
import { chapters } from './cosmic-data.js?v=4';
import { drawCinema } from './nova-cinema.js?v=15';
import { series, questLink } from './nova-series.js?v=16';

const requested = new URLSearchParams(location.search).get('quest');
const questIndex = Math.max(0, series.findIndex(([id]) => id === requested));
const [questId] = series[questIndex];
const quest = questIndex ? (await import('./nova-' + questId + '.js')).default : null;
const parts = quest?.parts || nebulaParts;
const title = quest?.title || 'Nova’s Nebula Quest';
document.title = title + ' · ASTRA NEXUS';

const ACTS = {
  nebula: nebulaActs.map(([s, n]) => [s, n]),
  stars: [[0, 'A star switches on'], [5, 'Not all stars are equal'], [10, 'A sun-like star grows old'], [15, 'A massive star’s finale'], [20, 'Stardust']],
  planets: [[0, 'A disk around a young star'], [5, 'Dust becomes pebbles'], [10, 'Building worlds'], [15, 'Giants and gaps'], [20, 'Many possible systems']],
  'black-holes': [[0, 'Finding the invisible'], [5, 'How black holes form'], [10, 'Edges and shadows'], [15, 'Bright matter outside'], [20, 'Seeing the shadow']],
  lensing: [[0, 'Gravity bends light'], [5, 'Shapes of lensing'], [10, 'Natural telescopes'], [15, 'Weighing the invisible'], [19, 'Your turn to lens']],
  universe: [[0, 'Close to home'], [5, 'Our neighbors'], [10, 'Our galaxy and beyond'], [15, 'Galaxies everywhere'], [20, 'The edge of what we can see']],
};
const QUEST_COLOR = { nebula: '#a070ff', stars: '#ffd45a', planets: '#ff5fae', 'black-holes': '#52e4ff', lensing: '#6dff9e', universe: '#ff9a5a' };
const ACT_COLORS = ['#ff5fae', '#52e4ff', '#a070ff', '#ffd45a', '#6dff9e'];
const NEBULA_DIALS = ['Drift', 'Zoom', 'Light speed', 'Atoms', 'Dust', 'Backlight', 'Infrared', 'Starlight', 'Zap', 'Filter', 'Warmth', 'Tune in', 'Fly in', 'Stretch', 'Blast', 'Gravity', 'Chill', 'Gravity', 'Spin', 'Spin', 'Power', 'Infrared', 'Glow', 'Recycle'];
const acts = ACTS[questId];
const color = QUEST_COLOR[questId];
document.body.style.setProperty('--c', color);

const $ = id => document.getElementById('nova-' + id);
const view = $('view'), viewport = $('viewport'), diagram = $('diagram'), hudCanvas = $('hud'), labelsEl = $('labels');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const key = quest ? 'nexus-nova-' + questId : 'nexus-nova';
const thresholds = [25, 55, 85];
const ranks = ['Rookie', 'Scout', 'Pilot', 'Captain', 'Star master'];
let progress = {};
try { progress = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
let part = 0, engine = null, shots = null, still = reduced.matches, visible = true, raf = 0, last = 0, dirty = true;
let dialValue = 0, time2d = 0, yaw = 0, pitch = 0, pointer = null, dragged = 0;

// Quest tabs
series.forEach(([id, name], i) => {
  const a = document.createElement('a'); a.href = questLink(id); a.style.setProperty('--c', QUEST_COLOR[id]);
  a.innerHTML = '<b>' + (i + 1) + '</b>'; a.append(name);
  if (id === questId) a.setAttribute('aria-current', 'page');
  $('series').append(a);
});
const nextQuest = series[questIndex + 1];
$('star-life').href = nextQuest ? questLink(nextQuest[0]) : 'cosmic.html?v=11#chapters';
$('star-life').textContent = nextQuest ? 'Continue to ' + nextQuest[1] + ' →' : 'Back to Cosmic Explorer →';
const chapter = chapters.find(c => c.id === questId);
if (chapter?.source) $('source').href = chapter.source;

// Part track grouped by act
const dots = [];
acts.forEach(([start, name], ai) => {
  const end = acts[ai + 1]?.[0] ?? parts.length;
  const g = document.createElement('div'); g.className = 'nv-act'; g.style.setProperty('--ac', ACT_COLORS[ai]);
  const s = document.createElement('span'); s.textContent = 'Act ' + (ai + 1); g.append(s);
  for (let i = start; i < end; i++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'nv-dot'; b.title = (i + 1) + ' · ' + parts[i][0];
    b.setAttribute('aria-label', 'Part ' + (i + 1) + ': ' + parts[i][0]); b.onclick = () => go(i); g.append(b); dots[i] = b;
  }
  $('track').append(g);
});
parts.forEach(([t], i) => $('part').add(new Option((i + 1) + ' · ' + t, i)));

function actOf(i) { return acts.findLastIndex(([s]) => s <= i); }
function refreshStars(popIndex) {
  const total = parts.reduce((s, _, i) => s + (progress[i] || 0), 0);
  const rank = ranks[Math.min(4, Math.floor(total / (parts.length * 3 / 4)))];
  const here = progress[part] || 0;
  [...$('starset').children].forEach((el, i) => { el.classList.toggle('on', i < here); if (i === popIndex) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } });
  $('rank').textContent = rank;
  $('stars').textContent = here + ' of 3 stars in this part · ' + total + ' of ' + parts.length * 3 + ' in the quest · Rank: ' + rank + '. Slide the dial all the way to catch every star.';
  dots.forEach((d, i) => { d.dataset.s = progress[i] || 0; });
}
function save() { try { localStorage.setItem(key, JSON.stringify(progress)); } catch {} }

function setDial(v) {
  dialValue = v / 100;
  $('dial').value = v; $('dial').style.setProperty('--fill', v + '%');
  $('dial-value').textContent = !quest && part === 9 ? ['Hydrogen', 'Oxygen', 'Sulfur'][Math.min(2, Math.floor(v / 34))] : Math.round(v) + '%';
  if (engine) engine.dial = dialValue;
  const earned = thresholds.filter(n => v >= n).length;
  if (earned > (progress[part] || 0)) { const prev = progress[part] || 0; progress[part] = earned; save(); refreshStars(earned - 1); if (prev === 0 && earned) {} }
  dirty = true;
}

function crossfade() {
  if (!engine || still) return;
  try { engine.frame(0, true); } catch { return; }
  const snap = engine.snapshot(); if (!snap) return;
  snap.className = 'nv-ghost'; view.insertBefore(snap, hudCanvas);
  snap.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(6px)' }], { duration: 900, easing: 'cubic-bezier(.3,.6,.3,1)' }).onfinish = () => snap.remove();
}

function go(index) {
  index = Math.max(0, Math.min(parts.length - 1, index));
  const [heading, story, graphic, action, label] = parts[index];
  const changed = index !== part || !engine?.shown;
  if (changed) crossfade();
  part = index;
  const ai = actOf(part);
  $('act').textContent = 'Chapter ' + (questIndex + 1) + ' · Act ' + (ai + 1) + ' · Part ' + (part + 1) + ' of ' + parts.length;
  $('title').textContent = heading; $('story').textContent = story;
  const cap = document.querySelector('.nv-caption'); cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
  $('visual').textContent = graphic;
  $('move').textContent = action;
  $('dial-name').textContent = label || NEBULA_DIALS[part] || 'Dial';
  $('part').value = part;
  $('prev').disabled = part === 0;
  $('next').disabled = part === parts.length - 1;
  $('star-life').hidden = part !== parts.length - 1;
  dots.forEach((d, i) => d.toggleAttribute('aria-current', i === part)); dots[part]?.setAttribute('aria-current', 'step');
  yaw = pitch = 0; time2d = 0;
  if (engine && shots) {
    try { engine.resetView(); engine.show(shots[part]); engine.shown = true; engine.dial = 0; }
    catch (e) { console.error(e); fallback('Simple view'); }
  }
  setDial(0);
  refreshStars();
  try { history.replaceState(null, '', '#part-' + (part + 1)); } catch {}
  dirty = true;
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - (last || now)) / 1000); const ms = now - last; last = now;
  if (document.hidden || !visible) return;
  if (still && !dirty) return;
  dirty = false;
  if (engine) {
    try { engine.frame(still ? 0 : dt, still); if (!still) engine.perf(ms); }
    catch (e) { console.error(e); fallback('Simple view'); }
    return;
  }
  if (!still) time2d += dt;
  drawCinema(diagram, questId, part, dialValue, time2d, yaw, pitch, () => { dirty = true; });
  if (!still) dirty = true;
}

function fallback(reason) {
  if (engine) { try { engine.dispose(); } catch {} engine = null; }
  hudCanvas.getContext('2d').clearRect(0, 0, hudCanvas.width, hudCanvas.height); labelsEl.textContent = '';
  diagram.hidden = false;
  $('status').textContent = reason || '';
  $('render').textContent = '3D view';
  dirty = true;
}
async function start3d() {
  $('render').textContent = 'Loading…';
  try {
    const test = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!test) throw new Error('no webgl');
    const [{ createNova }, mod] = await Promise.all([import('./nova-gl.js'), import(['nebula', 'stars', 'planets'].includes(questId) ? './nova-shots-a.js' : './nova-shots-b.js')]);
    shots = mod.default[questId];
    engine = createNova(viewport, labelsEl, hudCanvas);
    engine.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback('Simple view · 3D paused by the browser'); }, { once: true });
    diagram.hidden = true;
    $('status').textContent = '';
    $('render').textContent = 'Simple view';
    engine.show(shots[part]); engine.shown = true; engine.dial = dialValue;
    dirty = true;
  } catch (e) { console.warn(e); fallback('Simple view · 3D is not available on this device'); }
}

$('part').onchange = e => go(+e.target.value);
$('prev').onclick = () => go(part - 1);
$('next').onclick = () => go(part + 1);
$('dial').oninput = e => setDial(+e.target.value);
function setStill(v) { still = v; $('still').setAttribute('aria-pressed', String(v)); $('still').textContent = v ? 'Play motion' : 'Pause motion'; dirty = true; }
$('still').onclick = () => setStill(!still);
reduced.addEventListener('change', e => setStill(e.matches));
$('render').onclick = () => { if (engine) fallback('Simple view'); else start3d(); };

viewport.addEventListener('pointerdown', e => { pointer = [e.clientX, e.clientY]; dragged = 0; viewport.setPointerCapture(e.pointerId); });
viewport.addEventListener('pointermove', e => {
  if (!pointer) return;
  const dx = e.clientX - pointer[0], dy = e.clientY - pointer[1]; pointer = [e.clientX, e.clientY]; dragged += Math.abs(dx) + Math.abs(dy);
  if (engine) engine.drag(dx, dy); else { yaw += dx * .009; pitch = Math.max(-2, Math.min(2, pitch + dy * .012)); }
  if (dragged > 30) $('hint').classList.add('gone');
  dirty = true;
});
viewport.addEventListener('pointerup', () => { pointer = null; });
viewport.addEventListener('pointercancel', () => { pointer = null; });
document.addEventListener('keydown', e => {
  if (e.target.closest('input,select,textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(part + (e.key === 'ArrowRight' ? 1 : -1)); }
});
new ResizeObserver(() => { engine?.resize(); dirty = true; }).observe(view);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; }).observe(view);
addEventListener('pagehide', () => cancelAnimationFrame(raf));
addEventListener('pageshow', e => { if (e.persisted) { last = 0; raf = requestAnimationFrame(frame); } });

const start = Math.max(0, Math.min(parts.length - 1, (parseInt((location.hash.match(/part-(\d+)/) || [])[1], 10) || 1) - 1));
setStill(still);
go(start);
raf = requestAnimationFrame(frame);
start3d();
setTimeout(() => $('hint').classList.add('gone'), 9000);

const films = {
  nebula: [['nebula', 'Nebula evolution']],
  stars: [['sun-like-star', 'Evolution of a Sun-like star'], ['massive-star', 'Evolution of a massive star']],
  planets: [['planet-formation', 'From nebula to solar system'], ['worlds-from-dust', 'Worlds from dust']],
}[questId] || [];
$('films').hidden = !films.length;
for (const [file, name] of films) {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = '▶ ' + name;
  button.onclick = () => {
    $('film-list').querySelector('video')?.remove();
    const video = document.createElement('video');
    video.controls = true; video.playsInline = true;
    video.poster = 'textures/cosmic/' + file + '-poster.webp';
    video.src = 'textures/cosmic/' + file + '.mp4';
    video.setAttribute('aria-label', name);
    $('film-list').append(video);
    video.play().catch(() => {});
  };
  $('film-list').append(button);
}
$('films').addEventListener('toggle', () => { if (!$('films').open) $('film-list').querySelector('video')?.pause(); });
