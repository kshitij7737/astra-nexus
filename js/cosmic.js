import { series, questLink } from './nova-series.js';
import { objectives, readObjectives, completeObjective } from './cosmic-progress.js';
import { chapters, initialSettings, lensNames, lensState } from './cosmic-data.js?v=4';
import { drawDiagram } from './cosmic-diagram.js?v=4';
import { collisions, features, scales, sceneHotspots, sceneIds, summaries } from './cosmic-revision.js?v=6';
import { assetPath, assets, evidenceByScene } from './cosmic-evidence.js?v=5';
import { imagePath, observationFor, observations } from './cosmic-gallery.js?v=3';

let explorerAudio;
let soundOn=false;
const $ = id => document.getElementById(id);
const viewport = $('viewport'), canvas = $('diagram');
const prefersStill = matchMedia('(prefers-reduced-motion: reduce)');
const autoLite = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) < 5;
let chapter = chapters[0], beat = 0, state = {...initialSettings};
let art, visual, free = false, labels = false, still = prefersStill.matches, guided = false, frameId = 0;
let yaw = 0, pitch = 0, zoom = 1, clock = 0, previous = 0, deadline = 0, viewChanged = true;
let pointer = null, diagramFrame = 0, pulseTimer = 0, renderGeneration = 0, rendererQueued = false;
let hubOpen = false, lastScene = '#nebula', frozen = false, visited = new Set();
const progress=new Map(), branches=new Map();
const videoDialog=$('media-dialog');
let displayPreference = 'auto', activeDisplay = 'model', loadedObservation = null, pendingObservation;
let sceneBuild = 0, sceneAnimation, lastDraw = 0, viewerVisible = true, fadingObservation;
let modelDirty = true, modelReady = false;
const stage = document.querySelector('.cx-stage');
const notes=$('universe-notes'), consolePanel=$('chapter-console'), evidencePanel=$('evidence');
const handoff = $('scene-handoff');
const clips = {
  nebula: [{file:'nebula', title:'Nebula evolution', time:'0:34'}],
  planets: [
    {file:'planet-formation', title:'From nebula to solar system', time:'0:31'},
    {file:'worlds-from-dust', title:'Worlds from dust', time:'0:33'},
    {file:'nebula-to-system', title:'Dust to planets: artwork sequence', time:'0:28'},
  ],
  stars: [
    {file:'sun-like-star', title:'Evolution of a Sun-like star', time:'0:42'},
    {file:'massive-star', title:'Evolution of a massive star', time:'0:49'},
  ],
};

function clearHandoff() {
  sceneAnimation?.cancel();
  sceneAnimation = null;
  handoff.hidden = true;
}
function captureModel() {
  clearHandoff();
  if (still || !viewerVisible || !modelReady || activeDisplay !== 'model') return false;
  const width = stage.clientWidth, height = stage.clientHeight;
  if (!width || !height) return false;
  const scale = Math.min(1, Math.sqrt(420000 / (width * height)));
  handoff.width = Math.round(width * scale);
  handoff.height = Math.round(height * scale);
  const context = handoff.getContext('2d', {alpha:false});
  try {
    if (visual) visual.capture(context);
    else context.drawImage(canvas, 0, 0, handoff.width, handoff.height);
  } catch {
    return false;
  }
  handoff.hidden = false;
  return true;
}
function revealModel() {
  sceneAnimation = handoff.animate([{opacity:1}, {opacity:0}], {
    duration:chapter.id==='universe'?980:360, easing:'cubic-bezier(.2,.65,.3,1)',
  });
  sceneAnimation.onfinish = clearHandoff;
}
const missingImages = new Set();

function syncDisplay() {
  const id = observationFor(chapter.id,beat,state);
  const available = id && !missingImages.has(id);
  const show = available && (displayPreference==='telescope' || displayPreference==='auto' && !visual && chapter.id!=='universe');
  activeDisplay = show ? 'telescope' : 'model';
  $('observation').hidden = !show || !loadedObservation;
  if (!show) {
    pendingObservation = null;
    $('observation').removeAttribute('aria-busy');
  }
  $('observation-notes').hidden = !show;
  $('model-controls').hidden = show;
  viewport.hidden = show && Boolean(loadedObservation);
  $('model-labels').hidden = show || !labels;
  $('scale').hidden = show || chapter.id!=='universe' || !state.scale;
  $('show-observation').hidden = !available;
  pressed($('show-model'),!show);
  pressed($('show-observation'),Boolean(show));
  $('show-model').parentElement.hidden=!available;
  $('show-model').textContent = visual ? '3D model' : 'Diagram';
  $('render-mode').hidden = show;
  $('explorer-photo').hidden=show;
  $('render-mode').textContent = visual ? 'Illustrative 3D model' : 'Interactive diagram';
  $('free').hidden = show || !visual;
  $('motion').hidden = show;
  $('labels').hidden = show;
  $('reset').hidden = show;
  $('replay').hidden = show;
  $('feature-marker').hidden=show || !state.feature;
  $('scene-hotspots').hidden=show||!labels||free;
  if(visual) visual.renderer.domElement.hidden=!modelReady;
  canvas.hidden=Boolean(visual && modelReady);
  $('retry-renderer').hidden=Boolean(visual);
  if (show && free) setFree(false);
  if (!show || pendingObservation?.id === id) return;
  if (loadedObservation === id) {
    pendingObservation = null;
    $('observation').removeAttribute('aria-busy');
    return;
  }
  const photo = observations[id];
  const img = new Image();
  const request = {id};
  pendingObservation = request;
  $('observation').setAttribute('aria-busy','true');
  img.alt = photo.alt;
  img.decoding = 'async';
  img.style.setProperty('--photo-focus',photo.focus);
  img.style.setProperty('--photo-zoom',photo.zoom || 1);
  img.classList.toggle('cx-wide',id==='carina');
  img.src = imagePath(id);
  img.decode().then(()=>{
    if(pendingObservation !== request) return;
    const old = $('observation-image');
    const wasVisible = !$('observation').hidden;
    fadingObservation?.remove();
    fadingObservation = null;
    old.removeAttribute('id');
    img.id = 'observation-image';
    old.before(img);
    $('observation').hidden = false;
    if (wasVisible && !still && viewerVisible) {
      viewport.hidden = true;
      fadingObservation = old;
      old.setAttribute('aria-hidden','true');
      const fade = old.animate([{opacity:1},{opacity:0}],{duration:380,easing:'ease-out',fill:'forwards'});
      fade.onfinish=()=>{old.remove(); if(fadingObservation===old) fadingObservation=null;};
    } else {
      old.remove();
      if (!still && viewerVisible) {
        const incoming = $('observation').animate([{opacity:0},{opacity:1}], {duration:300,easing:'ease-out'});
        incoming.onfinish=()=>{if(activeDisplay==='telescope')viewport.hidden=true;};
      }
      else viewport.hidden=true;
    }
    loadedObservation = id;
    pendingObservation = null;
    $('observation').removeAttribute('aria-busy');
    $('observation-title').textContent = photo.title;
    $('observation-instrument').textContent = photo.instrument;
    $('observation-note').textContent = photo.note;
    $('observation-credit').textContent = photo.credit;
    $('observation-credit').href = photo.link;
  }).catch(()=>{
    if(pendingObservation !== request) return;
    pendingObservation = null;
    $('observation').removeAttribute('aria-busy');
    missingImages.add(id);
    rebuild();
  });
}
function switchDisplay(preference) {
  setGuided(false);
  displayPreference=preference;
  rebuild(true);
}

function el(tag, content, className) {
  const e = document.createElement(tag);
  if (content != null) e.textContent = content;
  if (className) e.className = className;
  return e;
}
function pressed(control, on) { control.setAttribute('aria-pressed',String(on)); }
function button(label, action, on) {
  const b=el('button',label);
  b.type='button';
  if(on!==undefined) pressed(b,on);
  b.onclick=action;
  return b;
}
function link(text, href, external=false) {
  const a=el('a',text);
  a.href=href;
  if(external){a.target='_blank';a.rel='noopener';}
  return a;
}
function route(id, index) {
  return '#'+id+(index===undefined?'':'/'+sceneIds[id][index]);
}
function currentRoute() {
  const [id,key]=location.hash.slice(1).split('/');
  const item=chapters.find(c=>c.id===id);
  return {item, index:item?Math.max(0,sceneIds[id].indexOf(key)):0, hub:id==='chapters'};
}
function media(asset) {
  const pane=$('media-content');
  pane.replaceChildren();
  $('media-title').textContent=asset.title;
  $('media-caption').textContent=asset.kind+' · '+asset.credit+'. '+asset.note;
  $('media-links').replaceChildren();
  if(asset.source) $('media-links').append(link('Official source ↗',asset.source,true));
  if(asset.original) $('media-links').append(link('Original media ↗',asset.original,true));
  if(asset.video){
    const video=el('video');
    video.setAttribute('aria-label',asset.title);
    video.controls=true;video.playsInline=true;video.preload='none';
    const path=asset.local ? file=>'textures/cosmic/'+file : assetPath;
    video.poster=path(asset.file);video.src=path(asset.video);
    const status=el('p');status.setAttribute('role','status');
    video.addEventListener('waiting',()=>{status.textContent='Loading video…';});
    video.addEventListener('playing',()=>{status.textContent='';});
    video.addEventListener('error',()=>{status.textContent='Video unavailable. You can continue exploring the scene.';});
    pane.append(video,status);
  }else{
    const image=el('img');image.src=assetPath(asset.file);image.alt=asset.alt;
    image.addEventListener('error',()=>{pane.replaceChildren(el('p','Image unavailable. Open the official source below.'));});
    if(asset.id==='eso2405c'){
      const scroll=el('div',null,'cx-gallery-image');
      const zoom=button('Zoom in',()=>{
        const expanded=zoom.getAttribute('aria-pressed')!=='true';
        pressed(zoom,expanded);zoom.textContent=expanded?'Fit image':'Zoom in';
        scroll.classList.toggle('zoomed',expanded);
      },false);
      scroll.tabIndex=0;
      scroll.setAttribute('aria-label','Taurus disk gallery. Scroll to inspect when zoomed.');
      scroll.append(image);pane.append(zoom,scroll);
    }else pane.append(image);
  }
  setGuided(false);
  videoDialog.showModal();
  if (asset.local) pane.querySelector('video').play().catch(() => {});

}
videoDialog.addEventListener('close',()=>{
  const pane=$('media-content'), video=pane.querySelector('video');
  if(video){video.pause();video.removeAttribute('src');video.load();}
  pane.replaceChildren();
});

function renderClips() {
  const items=clips[chapter.id] || [];
  $('chapter-films').hidden=!items.length;
  $('film-list').replaceChildren(...items.map(clip=>{
    const open=button(clip.title,()=>media({
      title:clip.title, kind:'Illustrative film', credit:'NEXUS//04 team submission',
      note:'The film compresses time and includes on-screen text.',
      file:clip.file+'-poster.webp', video:clip.file+'.mp4', local:true,
    }));
    open.className='cx-film';
    open.prepend(el('span','', 'cx-film-play'));
    open.firstElementChild.setAttribute('aria-hidden','true');
    open.append(el('span',clip.time,'cx-film-time'));
    open.setAttribute('aria-label','Watch '+clip.title+' ('+clip.time+')');
    return open;
  }));
}
function renderEvidence() {
  const keys=evidenceByScene[chapter.id]?.[beat] || [];
  $('evidence').hidden=!keys.length;
  $('evidence-grid').replaceChildren(...keys.map(key=>{
    const asset=assets[key];
    const card=el('article',null,'cx-evidence-card');
    const copy=el('div',null,'cx-evidence-copy');
    copy.append(el('p',asset.kind,'cx-eyebrow'),el('h3',asset.title),el('p',asset.note));
    if(key==='water'){
      const legend=el('div',null,'cx-evidence-legend');
      legend.append(el('span','Blue · water vapour'),el('span','Red · dust'));
      copy.append(legend);
    }
    if(asset.file){
      const image=el('img');image.src=assetPath(asset.file);image.alt=asset.alt;image.loading='lazy';image.decoding='async';
      image.addEventListener('error',()=>{image.hidden=true;},{once:true});
      card.append(image);
      copy.append(button(asset.video?'Watch animation':'Expand image',()=>media(asset)));
    }
    copy.append(link(asset.credit+' ↗',asset.source,true));
    if(!asset.file)copy.append(link('View official media ↗',asset.original,true));
    card.append(copy);
    return card;
  }));
}
const hubCards=chapters.map((item,i)=>{
  const a=link('',route(item.id));
  const arrow=el('span','→','cx-hub-arrow');
  arrow.setAttribute('aria-hidden','true');
  const intro=el('span',item.intro,'cx-hub-intro');
  intro.append(el('span',null,'cx-objective-count'));
  a.append(el('span',String(i+1).padStart(2,'0'),'cx-eyebrow'),el('strong',item.title),intro,arrow);
  return a;
});
$('hub-grid').append(...hubCards);
const questNav=el('nav',null,'cx-chapters');
questNav.setAttribute('aria-label','Nova story quests');
questNav.append(...series.map(([id,name])=>link(name+' Quest',questLink(id))));
$('hub-grid').after(questNav);
$('continue-chapter').after(link('Play Nova’s Quests →',questLink('nebula')));
function renderObjectives() {
  const progress=readObjectives();
  const total=chapters.filter(c=>progress[c.id]?.length===objectives[c.id].length).length;
  $('explorer-progress').textContent=total+' of '+chapters.length+' chapters complete';
  chapters.forEach((c,i)=>{
    hubCards[i].querySelector('.cx-objective-count').textContent=(progress[c.id]?.length||0)+' / '+objectives[c.id].length+' objectives';
  });
  $('chapter-objectives').textContent=objectives[chapter.id].map((name,i)=>
    (progress[chapter.id]?.includes(i)?'✓ ':'○ ')+name).join('   ·   ');
}
function trackObjectives() {
  const id=chapter.id;
  const pairs={
    nebula:[beat===4,state.infrared],
    stars:[beat===5&&state.branch==='massive',beat===3&&state.cutaway],
    planets:[beat===2&&state.collision==='stick',state.thermal],
    'black-holes':[state.mass==='supermassive',beat===4&&state.trace],
    lensing:[state.challenge&&state.alignment===0,state.lensLesson==='delay'&&state.pulse],
    universe:[beat===5,state.compare],
  };
  pairs[id].forEach((done,i)=>{if(done)completeObjective(id,i);});
  renderObjectives();
}
const menu = chapters.map((item,i)=>{
  const a=el('a');
  a.href='#'+item.id;
  a.append(el('b',String(i+1).padStart(2,'0')),el('span',item.short));
  $('chapters').append(a);
  return a;
});
function resetCamera() { yaw=0; pitch=0; zoom=1; viewChanged=true; }
function drawFallback(){
  if(visual||activeDisplay==='telescope'||!viewerVisible||hubOpen)return;
  cancelAnimationFrame(diagramFrame);
  diagramFrame=requestAnimationFrame(()=>{
    drawDiagram(canvas,chapter,beat,state,drawFallback);
    modelReady = true;
  });
}
let animateScene=false, firstModelFrame=true;
function rebuild(transition=false) {
  modelDirty = true;
  animateScene ||= transition;
  if(sceneBuild) return;
  sceneBuild=requestAnimationFrame(()=>{
    sceneBuild=0;
    const animate=animateScene;
    animateScene=false;
    if (hubOpen) return;
    const wasTelescope = activeDisplay === 'telescope' && !$('observation').hidden;
    syncDisplay();
    if(activeDisplay==='telescope') {
      if(!loadedObservation && !modelReady && !visual) {
        drawDiagram(canvas,chapter,beat,state,drawFallback);
        modelReady=true;
      }
      return;
    }
    const captured = animate && !wasTelescope && captureModel();
    if(visual){
      if (!viewerVisible) return;
      try{
        if (modelDirty) visual.setChapter(chapter,beat,{...state,still});
        modelDirty=false;
        viewChanged=true;
        renderModel(performance.now());
      }
      catch(error){console.warn('Could not build the 3D scene.',error);useFallback();return;}
    }else{
      cancelAnimationFrame(diagramFrame);
      drawDiagram(canvas,chapter,beat,state,drawFallback);
      modelReady=true;
    }
    if (captured) revealModel();
    else if (animate && wasTelescope && !still && viewerVisible) {
      viewport.animate([{opacity:.45},{opacity:1}],{duration:250,easing:'ease-out'});
    }
  });
}
function setFree(on) {
  free=on;
  if(on){setGuided(false);frozen=false;}
  else resetCamera();
  viewport.classList.toggle('free',on);
  $('zoom-controls').hidden=!on;
  $('scene-hotspots').hidden=on||activeDisplay==='telescope'||!labels;
  pressed($('free'),on);
  $('free').textContent=on?'Return to guided view':'Free look';
  viewChanged=true;
}
function setGuided(on) {
  guided=on;
  if(on) frozen=false;
  if(on && free) setFree(false);
  $('play').textContent=on?'Pause guided tour':beat===5?'Replay chapter':'Play guided tour';
  $('stage-play').textContent=on?'Pause tour':beat===5?'Replay tour':'Play tour';
  $('stage-play').toggleAttribute('data-playing',on);
  deadline=performance.now()+(chapter.id==='nebula'?20000:10000);
}
function buildControls() {
  const root=$('controls');
  root.replaceChildren();
  const choices=(options,key)=>{
    const row=el('div',null,'cx-choices');
    for(const [value,label] of options){
      const b=button(label,()=>update(key,value),state[key]===value);
      b.dataset.control=key;
      b.dataset.value=value;
      row.append(b);
    }
    root.append(row);
  };
  const toggle=(key,label)=>{
    const b=button(label,()=>update(key,!state[key]),state[key]);
    b.dataset.control=key;
    root.append(b);
  };
  const select=(key,label,options)=>{
    const wrapper=el('label',null,'cx-field');
    const field=el('select');
    field.dataset.field=key;
    for(const [value,text] of options){
      const option=el('option',text);option.value=value;field.append(option);
    }
    field.value=state[key];
    field.onchange=()=>update(key,field.value);
    wrapper.append(el('span',label),field);
    root.append(wrapper);
  };
  const inspect=()=>{
    select('feature','Inspect a feature',[['','Select a feature'],...features[chapter.id].map(([id,title])=>[id,title])]);
  };
  const angle=(top='Top-down')=>select('angle','View angle',[['oblique','Three-quarter'],['top',top],['edge','Edge-on']]);
  if(chapter.id==='nebula'){
    const row=el('div',null,'cx-choices');
    for(const [index,title] of [[2,'Material returned by stars'],[3,'A stellar nursery']]){
      const b=button(title,()=>go(index),beat===index);
      b.dataset.beat=index;
      row.append(b);
    }
    root.append(row);
    choices([['sun','Planetary nebula'],['massive','Supernova remnant']],'branch');
    toggle('infrared','Infrared-inspired view');
    inspect();
  }else if(chapter.id==='stars'){
    choices([['sun','Sun-like star'],['massive','Massive star']],'branch');
    toggle('forces','Show inward gravity and outward pressure');
    toggle('cutaway','Core cross-section');
    angle('Face-on disk');
    inspect();
  }else if(chapter.id==='planets'){
    angle();
    toggle('thermal','Show water-ice line');
    choices(Object.entries(collisions).map(([key,[name]])=>[key,name]),'collision');
    inspect();
    toggle('paths','Show orbit paths');
    choices([['mixed','Rocky worlds + giants'],['rocky','Compact rocky worlds']],'system');
  }else if(chapter.id==='black-holes'){
    angle('Face-on');
    select('mass','Compare mass',[['stellar','10 solar masses'],['supermassive','1 million solar masses']]);
    select('evidence','Evidence topic',[['orbits','Stellar orbits'],['light','Bent light'],['matter','Hot matter'],['observations','Radio observations']]);
    toggle('trace','Trace light');
    toggle('jets','Show optional jets');
    toggle('binary','Advanced binary merger');
    inspect();
    root.append(el('p','Bright disks and jets appear around some black holes.','cx-subnote'));
  }else if(chapter.id==='lensing'){
    const wrapper=el('label',null,'cx-field');
    const slider=el('input');slider.type='range';slider.min=0;slider.max=100;slider.value=state.alignment;
    slider.dataset.field='alignment';
    slider.oninput=()=>update('alignment',+slider.value);
    const offset=el('span','Source offset');offset.id='offset-label';
    slider.setAttribute('aria-labelledby','offset-label');
    wrapper.append(offset,slider);
    root.append(wrapper);
    select('lens','Lens type',[['star','Star'],['blackHole','Black hole'],['galaxy','Galaxy'],['cluster','Galaxy cluster']]);
    const row=el('div',null,'cx-choices');
    for(const [key,text] of [['observer','Observer view'],['paths','Light paths'],['magnify','Magnify image']]){
      const b=button(text,()=>update(key,!state[key]),state[key]);b.dataset.control=key;row.append(b);
    }
    row.append(button('Align source',()=>{update('observer',true);update('alignment',0);}));
    root.append(row);
    choices([['brightness','Brightness'],['delay','Arrival time']],'lensLesson');
    root.append(button('Try the alignment challenge',()=>{
      setGuided(false);
      state.challenge=true;
      state.observer=true;
      state.alignment=55;
      syncControls();showReading();rebuild();
    }));
    inspect();
  }else{
    angle('Flat map');
    toggle('scale','Scale ruler');
    toggle('compare','Compare distances');
    root.append(button('Return to Earth',()=>go(0)));
    inspect();
  }
  syncControls();
}
function syncControls(){
  for(const b of $('controls').querySelectorAll('[data-control]')){
    const key=b.dataset.control;
    pressed(b,b.dataset.value===undefined?state[key]:state[key]===b.dataset.value);
  }
  for(const field of $('controls').querySelectorAll('[data-field]')) field.value=state[field.dataset.field]??field.value;
  if(chapter.id==='lensing'){
    $('controls').querySelector('[data-control=magnify]').disabled=!state.observer;
    $('controls').querySelector('[data-control=paths]').disabled=state.observer;
    $('offset-label').textContent='Source offset · '+state.alignment+'%';
  }
}
function update(key,value) {
  setGuided(false);
  state[key]=value;
  if(key==='branch')branches.set(chapter.id,value);
  frozen=false;
  if(key==='feature'){
    const targets={
      nebula:{gas:1,dust:1,cavity:1,core:3,jets:4},stars:{cloud:0,core:1,disk:2,fusion:3},
      planets:{star:0,dust:0,gap:1,protoplanet:4,orbit:5},
      'black-holes':{horizon:2,shadow:2,disk:3,ring:4,far:4,beaming:4},
      universe:{earth:0,sun:1,proxima:2,galaxy:3,local:4,edge:5},
    };
    const target=targets[chapter.id]?.[value];
    if(target!==undefined && target!==beat){go(target,false,true);return;}
  }
  if(key==='branch'&&chapter.id==='nebula'&&beat!==2){go(2);return;}
  if(key==='system'&&beat!==5){go(5);return;}
  if(key==='collision'&&beat!==2){go(2);return;}
  if(key==='trace'&&value&&beat!==4){go(4);return;}
  if(key==='binary'&&value&&beat!==5){go(5,false,true);return;}
  if(key==='evidence'){
    const target={orbits:0,light:4,matter:3,observations:5}[value];
    if(target!==beat){go(target);return;}
  }
  if(key==='jets'&&value&&beat<3){go(3);return;}
  if(key==='forces'&&value&&beat!==3){go(3);return;}
  if(key==='cutaway'&&value&&beat!==3){go(3);return;}
  if (key==='alignment') {
    scheduleAlignment();
    return;
  }
  syncControls();
  if(key==='angle'){resetCamera();drawFallback();}
  else rebuild();
  showReading();
}
let alignmentFrame=0;
function scheduleAlignment() {
  if(alignmentFrame) return;
  alignmentFrame=requestAnimationFrame(()=>{
    alignmentFrame=0;
    if(chapter.id!=='lensing') return;
    syncControls();
    showReading();
    rebuild();
  });
}
function showReading(){
  let text='';
  const selected=features[chapter.id].find(([key])=>key===state.feature);
  if(chapter.id==='nebula'){
    text=beat===2?(state.branch==='sun'?'A planetary nebula is a glowing shell around a white dwarf.':'A supernova remnant is the expanding debris of a stellar explosion.'):
      'Observation-informed model. Depth, colors and camera position are interpretive.';
    if(state.infrared)text+=' The alternate colors suggest how infrared can reveal embedded objects.';
  }
  if(chapter.id==='stars'){
    text=state.branch==='sun'?'Sun-like example · red giant → shed outer gas → white dwarf.':'Massive-star example · core collapse may leave a neutron star or a black hole.';
    if(state.forces&&beat===3)text+=' Cyan arrows show inward gravity. Amber arrows show outward pressure.';
    if(state.cutaway&&beat===3)text+=' The cutaway locates sustained hydrogen fusion in the core.';
  }
  if(chapter.id==='planets'){
    text=beat===2?'Scale changes here. The grains are greatly magnified. '+collisions[state.collision][1]:
      state.thermal||beat===1?'Mint guide: approximate water-ice line. Its position depends on disk conditions.':
      beat>=4?(state.system==='mixed'?'Example arrangement: rocky inner worlds and larger outer planets.':'Example arrangement: closely spaced rocky worlds.'):'Illustrative disk. The gas extends farther above and below the midplane than the thin dust layer.';
  }
  if(chapter.id==='black-holes'){
    const radius=state.mass==='stellar'?'about 30 km':'about 3 million km';
    text=state.binary&&beat===5?'Optional demonstration · a schematic wave chirp from a separate merger.':
      beat===5?'The evidence below includes actual radio observations and a separate scientific simulation.':
      'Non-spinning example · horizon radius '+radius+'. Model proportions are illustrative.';
    if(state.trace&&beat===4)text+=' A direct ray can reach us from the near disk. Bent rays can show the far side above the shadow.';
    if(state.jets&&beat>=3)text+=' Jets are powered by material and magnetic fields outside the horizon.';
  }
  if(chapter.id==='lensing'){
    const l=lensState(state.alignment,state.lens);
    text=l.appearance+' · '+lensNames[state.lens]+' lens · illustrative geometry.';
    if(state.challenge)text+=l.offset===0?' Challenge complete: exact alignment produces a ring in this model.':' Challenge: use the Source offset slider to make a complete ring.';
    renderLensLesson(l);
  }
  if(chapter.id==='universe')text=state.compare?'1 AU is about 390 mean Earth–Moon distances. 1 light-year is about 63,000 AU.':scales[beat][2];
  if(selected)text+=' '+selected[2];
  for(const marker of $('scene-hotspots').children)pressed(marker,marker.dataset.feature===state.feature);
  $('feature-marker').textContent=selected?.[1]||'';
  $('feature-marker').hidden=activeDisplay==='telescope'||!selected;
  $('reading').textContent=text;
  trackObjectives();
  $('scale').hidden=activeDisplay==='telescope'||chapter.id!=='universe'||!state.scale;
  $('scale').textContent=chapter.id==='universe'?scales[beat][0]+' · '+scales[beat][1]:'';
}
function renderLensLesson(l){
  const locator=$('locator'), panel=$('lens-demo');
  locator.hidden=false;
  locator.replaceChildren(...['Source','Lens','Observer'].map((name,i)=>{
    const marker=el('span',name);
    const selected=state.feature===['source','lens','observer'][i];
    if(selected)marker.dataset.selected='true';
    if(i===0)marker.style.setProperty('--offset',l.offset*9+'px');
    return marker;
  }));
  panel.hidden=false;
  const ring=l.offset===0;
  if(state.lensLesson==='brightness'){
    panel.replaceChildren(el('strong','Brightness · qualitative'),
      el('p',ring?'At ideal alignment the model shows a ring.':'The apparent images can differ in brightness. The model does not calculate an observed flux ratio.'));
    return;
  }
  panel.replaceChildren(el('strong','Arrival time · illustrative'),
    el('p',ring?'Move the source off center to compare two arrivals.':'Two light paths can carry the same flash to us at different times. The sequence illustrates order only.'));
  const pulse=button('Pulse source',()=>{
    clearTimeout(pulseTimer);
    if(still){
      completeObjective(chapter.id,1);renderObjectives();
      panel.lastElementChild.textContent='Illustrative sequence: Image A first, then Image B.';
      return;
    }
    state.pulse=true;
    trackObjectives();
    state.observer=true;
    frozen=false;
    syncControls();rebuild();
    panel.lastElementChild.classList.remove('pulsing');
    void panel.offsetWidth;
    panel.lastElementChild.classList.add('pulsing');
    pulseTimer=setTimeout(()=>{state.pulse=false;rebuild();},2400);
  });
  pulse.disabled=ring;
  const arrivals=el('div',null,'cx-arrivals');
  arrivals.append(el('span','Image A · first'),el('span','Image B · later'));
  panel.append(pulse,arrivals);
}
function renderScaleReference() {
  const root=$('scale-reference');
  root.replaceChildren();
  if(chapter.id!=='universe')return;
  const list=el('dl',null,'cx-scale-reference');
  for(const [name,value,convention,href] of scales){
    const heading=el('dt',name+' · '+value);
    const description=el('dd',convention+' ');
    description.append(link('Source ↗',href,true));list.append(heading,description);
  }
  root.append(el('h3','Scale references'),list);
}
function renderHotspots() {
  const root=$('scene-hotspots');
  root.replaceChildren(...sceneHotspots[chapter.id][beat].map(([key,x,y])=>{
    const name=features[chapter.id].find(([id])=>id===key)[1];
    const marker=button('+',()=>update('feature',key),false);
    marker.title=name;
    marker.setAttribute('aria-label','Inspect '+name);
    marker.dataset.feature=key;
    marker.style.left=x+'%';marker.style.top=y+'%';
    return marker;
  }));
}
function renderRelated() {
  const root=$('chapter-related'), summary=$('chapter-summary');
  root.replaceChildren();
  const id=chapter.id;
  root.append(link('Play Nova’s '+series.find(([key])=>key===id)[1]+' Quest →',questLink(id)));
  if(id==='stars'&&beat===2)root.append(link('Explore how planets form →',route('planets',0)));
  if(id==='stars'&&beat===0)root.append(link('Recap the stellar nursery →',route('nebula',3)));
  if(id==='stars'&&beat>=4)root.append(link('Part 04 · Black-hole structure and evidence →',route('black-holes',0)));
  if(id==='planets')root.append(link('Return to the protostar stage →',route('stars',2)));
  if(id==='black-holes'&&beat===1)root.append(link('Compare the massive-star pathway →',route('stars',4)));
  if(id==='nebula'&&beat===2)root.append(button('Return to the nursery',()=>go(3)));
  summary.hidden=beat!==chapter.beats.length-1;
  if(!summary.hidden){
    const [takeaway,next]=summaries[id];
    summary.replaceChildren(el('h3','Chapter takeaway'),el('p',takeaway),el('p',next),
      el('p',visited.size+' of '+chapter.beats.length+' scenes visited','cx-subnote'));
  }
}
function go(index, fromTour=false, keepFeature=false, transition=true){
  if(!fromTour)setGuided(false);
  clearTimeout(pulseTimer);
  if(!keepFeature){state.feature='';state.binary=false;}
  frozen=false;
  beat=Math.max(0,Math.min(chapter.beats.length-1,index));
  visited.add(beat);
  state.pulse=false;
  if(chapter.id==='lensing'){
    state.challenge=false;
    state.observer=beat>=2;
    state.alignment=[66,66,0,62,46,20][beat];
    state.lens=beat===1?'blackHole':beat===5?'cluster':'galaxy';
    state.paths=true;
  }
  if(chapter.id==='black-holes') state.evidence=['orbits','orbits','orbits','matter','light','observations'][beat];
  resetCamera();
  $('beat-number').textContent='Scene '+String(beat+1).padStart(2,'0')+' / '+chapter.beats.length;
  $('beat-title').textContent=chapter.beats[beat][0];
  $('beat-copy').textContent=chapter.beats[beat][1];
  $('stage-beat').replaceChildren(el('b',chapter.beats[beat][0]),el('span',chapter.beats[beat][1]));
  if(transition && !still && viewerVisible){
    for(const id of ['stage-beat','beat-title','beat-copy']){
      $(id).animate([{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:270,easing:'ease-out'});
    }
  }
  $('timeline').value=beat;
  if(chapter.id==='universe'){
    $('universe-scrub').value=beat;
    $('universe-scrub').setAttribute('aria-valuetext',scales[beat][0]+' · '+scales[beat][1]);
    $('universe-distance').textContent=scales[beat][1];
  }
  $('timeline').setAttribute('aria-valuetext',chapter.beats[beat][0]);
  $('timeline-value').textContent=(beat+1)+' of '+chapter.beats.length;
  $('stage-previous').disabled=$('previous').disabled=beat===0;
  $('stage-next').disabled=$('next').disabled=beat===chapter.beats.length-1;
  Array.from($('stops').children).forEach((b,i)=>pressed(b,i===beat));
  setGuided(guided);
  for(const b of $('controls').querySelectorAll('[data-beat]')) pressed(b,+b.dataset.beat===beat);
  syncControls();
  renderHotspots();
  showReading();
  renderRelated();
  renderEvidence();
  rebuild(transition);
  lastScene=route(chapter.id,beat);
  if(transition)sceneTone(280+beat*45);
}
function openChapter(item, start=0){
  chapter=item;
  viewport.classList.toggle('cx-lens-drag',item.id==='lensing');
  const universe=item.id==='universe';
  document.body.classList.toggle('cx-universe',universe);
  for(const id of ['universe-ruler','universe-distance','universe-details','universe-earth'])$(id).hidden=!universe;
  if(universe){
    $('universe-notes-content').append(consolePanel,evidencePanel);
    $('science').closest('details').open=true;
  }else{
    $('chapter-view').querySelector('footer').before(consolePanel,evidencePanel);
  }
  displayPreference='auto';
  clearTimeout(pulseTimer);
  state={...initialSettings,branch:branches.get(item.id)||initialSettings.branch};
  if(!progress.has(item.id))progress.set(item.id,new Set());
  visited=progress.get(item.id);
  $('locator').hidden=$('lens-demo').hidden=item.id!=='lensing';
  document.documentElement.style.setProperty('--accent',item.accent);
  const index=chapters.indexOf(item);
  menu.forEach((a,i)=>i===index?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  const chapterStrip=$('chapters');
  const activeLink=menu[index];
  chapterStrip.scrollTo({left:activeLink.offsetLeft-chapterStrip.offsetLeft-(chapterStrip.clientWidth-activeLink.offsetWidth)/2});
  $('chapter-number').textContent='Chapter '+String(index+1).padStart(2,'0')+' / 06';
  $('chapter-title').textContent=item.title;
  $('chapter-intro').textContent=item.intro;
  $('duration').textContent='Guided tour · about '+(item.id==='nebula'?'2 minutes':'1 minute')+(item.id==='stars'?' · Stellar time compressed':'');
  $('chapter-help').textContent='Choose a named feature or change an option in '+item.short+'. Scene controls remain available in the diagram.';
  renderScaleReference();
  $('science').textContent=item.science;
  $('sources').replaceChildren(link('Cosmic Explorer asset register ↗','sources.html#cosmic-asset-register'));
  for(const url of [item.source,item.extra].filter(Boolean)){
    const a=el('a',url===item.source?'NASA science reference ↗':'NASA scale reference ↗');
    a.href=url;a.target='_blank';a.rel='noopener';
    $('sources').append(a,el('br'));
  }
  if(item.id==='nebula'){
    const tour=el('a','Open the original nebula flythrough ↗');
    tour.href='nebula.html';
    $('sources').append(tour);
  }
  $('model-labels').replaceChildren(...item.labels.map(x=>el('span',x)));
  $('stops').replaceChildren(...item.beats.map(([title],i)=>{
    const b=button(String(i+1),()=>go(i),i===0);
    b.setAttribute('aria-label',title);
    return b;
  }));
  const next=({nebula:['stars',2,'Continue the forming star'],stars:['black-holes',0,'Black-hole evidence'],planets:['stars',2,'Return to the stellar timeline'],'black-holes':['lensing',0,'Gravitational lensing'],lensing:['universe',0,'Cosmic scales']})[item.id];
  $('next-chapter').href=next?route(next[0],next[1]):'#chapters';
  $('next-chapter').textContent=(next?next[2]:'Chapter hub')+' →';
  renderClips();
  buildControls();go(start);
}
function navigate(){
  if(videoDialog.open) videoDialog.close();
  if(notes.open)notes.close();
  const destination=currentRoute();
  const returning=progress.has(chapter.id)&&hubOpen&&!destination.hub&&destination.item===chapter&&destination.index===beat;
  hubOpen=destination.hub;
  $('chapter-hub').hidden=!hubOpen;
  $('chapter-view').hidden=hubOpen;
  if(hubOpen){
    clearHandoff();
    renderObjectives();
    setGuided(false);frozen=true;
    $('continue-chapter').href=lastScene;
    $('continue-chapter').textContent=progress.size?'Continue exploring →':'Start exploring →';
    $('hub-title').setAttribute('tabindex','-1');
    $('hub-title').focus({preventScroll:true});
    scrollTo(0,0);
    return;
  }
  if(returning){frozen=false;rebuild(true);}
  else openChapter(destination.item||chapters[0],destination.index);
  scrollTo(0,0);
  if (!renderGeneration && !rendererQueued) {
    rendererQueued = true;
    requestAnimationFrame(()=>setTimeout(()=>{
      rendererQueued = false;
      if(!renderGeneration && !hubOpen)startRenderer();
    },0));
  }
}
function loop(now){
  frameId=requestAnimationFrame(loop);
  if(document.hidden||hubOpen||videoDialog.open||notes.open||$('help-dialog').open){previous=0;return;}
  if(guided&&now>=deadline){
    if(beat<chapter.beats.length-1)go(beat+1,true);
    else {setGuided(false);frozen=true;}
  }
  if(!visual||activeDisplay==='telescope'||!viewerVisible||sceneBuild||modelDirty){previous=0;return;}
  if((still||frozen)&&!viewChanged)return;
  try { renderModel(now); }
  catch (error) {
    console.warn('Cosmic Explorer is switching to its diagram view.', error);
    useFallback();
    $('renderer-status').textContent='3D was interrupted. The diagram is ready.';
  }
}
function renderModel(now) {
  const quality=$('quality').value;
  const limit=quality==='lite'||quality==='auto'&&autoLite ? 1000/30 : 1000/60;
  if(!viewChanged && now-lastDraw<limit-1.5) return;
  const dt=previous?Math.min(.08,(now-previous)/1000):limit/1000;
  previous=lastDraw=now;
  if(!still&&!frozen)clock+=dt;
  const width=viewport.clientWidth,height=viewport.clientHeight;
  if(!width||!height)return;
  const view=art.cameraPreset(chapter.id,beat,state,width<760,clock);
  if(free){
    const eye=view.eye;
    const r=eye.length()*zoom;
    const phi=Math.max(.16,Math.min(Math.PI-.16,Math.acos(eye.y/eye.length())+pitch));
    const theta=Math.atan2(eye.x,eye.z)+yaw;
    eye.set(r*Math.sin(phi)*Math.sin(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.cos(theta));
  }
  const smoothing=(still||frozen||firstModelFrame)?1:1-Math.exp(-dt*4.6);
  visual.frame(clock,view,smoothing,width,height);
  firstModelFrame=false;
  viewChanged=false;
  if(!modelReady){
    modelReady=true;
    visual.renderer.domElement.hidden=false;
    canvas.hidden=true;
  }
}
function useFallback(){
  clearHandoff();
  modelReady=false;
  if(visual){
    const old=visual;
    visual=null;
    old.dispose();
    old.renderer.domElement.remove();
    old.renderer.forceContextLoss();
  }
  canvas.hidden=false;
  setFree(false);
  rebuild();
}
async function startRenderer(){
  const generation=++renderGeneration;
  $('renderer-status').textContent='Loading 3D…';
  if (!hubOpen) $('stage-status').textContent='Loading 3D · diagram available';
  if(visual)useFallback();
  let context;
  try{
    context=document.createElement('canvas').getContext('webgl2',{powerPreference:'low-power'});
    if(!context)throw Error('WebGL unavailable');
    art=await import('./cosmic-art.js?v=9');
    if(generation!==renderGeneration){context.getExtension('WEBGL_lose_context')?.loseContext();return;}
    const quality=$('quality').value;
    visual=art.createRenderer(viewport,quality==='lite'||quality==='auto'&&autoLite,context,()=>{viewChanged=true;});
    firstModelFrame=true;
    modelReady=false;
    const current=visual;
    current.renderer.domElement.hidden=true;
    current.renderer.domElement.addEventListener('webglcontextlost',event=>{
      event.preventDefault();
      if(visual===current){useFallback();$('renderer-status').textContent='3D was interrupted. The diagram is ready.';}
    },{once:true});
    rebuild();
    $('renderer-status').textContent='Interactive 3D is ready.';
    $('stage-status').textContent='';
  }catch{
    if(generation!==renderGeneration)return;
    const hadRenderer=Boolean(visual);
    useFallback();
    if(!hadRenderer)context?.getExtension('WEBGL_lose_context')?.loseContext();
    $('renderer-status').textContent='3D is unavailable. Diagrams and telescope views are ready.';
    $('stage-status').textContent='';
  }
}
$('stage-previous').onclick=$('previous').onclick=()=>go(beat-1);
$('stage-next').onclick=$('next').onclick=()=>go(beat+1);
$('stage-play').onclick=$('play').onclick=()=>{
  if(guided){setGuided(false);frozen=true;return;}
  switchDisplay('model');
  if(beat===chapter.beats.length-1) go(0);
  if(still){$('stage-status').textContent='Still mode is on. Advance using the scene arrows.';return;}
  $('stage-status').textContent='';
  setGuided(true);
};
$('show-model').onclick=()=>switchDisplay('model');
$('show-observation').onclick=()=>switchDisplay('telescope');
$('inspect-model').onclick=()=>{
  switchDisplay('model');
  $('controls').querySelector('button, input, select')?.focus();
};
$('timeline').oninput=e=>go(+e.target.value,false,false,false);
$('free').onclick=()=>{setFree(!free);if(free)viewport.focus({preventScroll:true});};
$('labels').onclick=()=>{
  labels=!labels;pressed($('labels'),labels);$('model-labels').hidden=!labels;
  $('scene-hotspots').hidden=!labels||free;
};
function setStill(on){
  still=on;pressed($('motion'),still);pressed($('help-motion'),still);
  $('stage-status').textContent='';
  if(still){setGuided(false);clearHandoff();fadingObservation?.remove();}
  rebuild();
  viewChanged=true;
}
$('help-motion').onclick=$('motion').onclick=()=>setStill(!still);
prefersStill.addEventListener('change',e=>setStill(e.matches));
$('reset').onclick=()=>{setFree(false);resetCamera();};
$('replay').onclick=()=>{
  setGuided(false);clearTimeout(pulseTimer);state.pulse=false;frozen=false;rebuild();showReading();
};
$('help').onclick=()=>{setGuided(false);$('help-dialog').showModal();};
for(const dialog of [$('help-dialog'),videoDialog,notes]){
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  });
}
$('quality').onchange=startRenderer;
$('retry-renderer').onclick=startRenderer;
for(const [id,delta] of [['zoom-in',-.1],['zoom-out',.1]]){
  $(id).onclick=()=>{zoom=clampZoom(zoom+delta);viewChanged=true;};
}
viewport.onpointerdown=e=>{
  const lensDrag=chapter.id==='lensing'&&!free;
  if((!free&&!lensDrag)||e.button!==0)return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lensDrag,start:state.alignment};
  viewport.setPointerCapture(e.pointerId);
};
viewport.onpointermove=e=>{
  if(pointer?.id!==e.pointerId)return;
  if(pointer.lensDrag){
    const offset=pointer.start+Math.round((e.clientY-pointer.y)/2);
    update('alignment',Math.max(0,Math.min(100,offset)));
    return;
  }
  yaw-=(e.clientX-pointer.x)*.008; pitch+=(e.clientY-pointer.y)*.008;
  pointer.x=e.clientX;pointer.y=e.clientY;viewChanged=true;
};
viewport.onpointerup=viewport.onpointercancel=()=>{pointer=null;};
const clampZoom=n=>Math.max(.70,Math.min(1.75,n));
viewport.addEventListener('wheel',e=>{
  if(!free)return;
  e.preventDefault();zoom=clampZoom(zoom*Math.exp(e.deltaY*.001));viewChanged=true;
},{passive:false});
viewport.onkeydown=e=>{
  if(!free)return;
  if(e.key==='ArrowLeft')yaw-=.14;
  else if(e.key==='ArrowRight')yaw+=.14;
  else if(e.key==='ArrowUp')pitch-=.12;
  else if(e.key==='ArrowDown')pitch+=.12;
  else if(e.key==='+'||e.key==='=')zoom=clampZoom(zoom-.10);
  else if(e.key==='-')zoom=clampZoom(zoom+.10);
  else if(e.key==='Escape'){setFree(false);$('free').focus({preventScroll:true});}
  else return;
  e.preventDefault();viewChanged=true;
};
new ResizeObserver(()=>{viewChanged=true;drawFallback();}).observe(viewport);
new IntersectionObserver(([entry])=>{
  viewerVisible=entry.isIntersecting;
  previous=0;
  if(viewerVisible){
    viewChanged=true;
    if(visual&&modelDirty)rebuild();
    else drawFallback();
  }
}).observe(stage);
window.addEventListener('hashchange',navigate);
document.addEventListener('visibilitychange',()=>{if(document.hidden)setGuided(false);});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);videoDialog.querySelector('video')?.pause();});
window.addEventListener('pageshow',event=>{if(event.persisted){previous=0;frameId=requestAnimationFrame(loop);}});
navigate();
pressed($('motion'),still);pressed($('help-motion'),still);
frameId=requestAnimationFrame(loop);

$('universe-scrub').oninput=e=>go(+e.target.value);
$('universe-details').onclick=()=>{setGuided(false);notes.showModal();};
$('universe-earth').onclick=()=>go(0);
window.addEventListener('pageshow',renderObjectives);
document.addEventListener('keydown',event=>{
  if(hubOpen||free||notes.open||videoDialog.open||$('help-dialog').open||event.target.closest('input,select,button,a,summary'))return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();go(beat+(event.key==='ArrowRight'?1:-1));}
});

function sceneTone(frequency){
  if(!soundOn||!explorerAudio||explorerAudio.state!=='running')return;
  const t=explorerAudio.currentTime;
  const oscillator=explorerAudio.createOscillator(),gain=explorerAudio.createGain();
  oscillator.type='sine';
  oscillator.frequency.setValueAtTime(frequency,t);
  oscillator.frequency.exponentialRampToValueAtTime(frequency*.78,t+.2);
  gain.gain.setValueAtTime(0,t);
  gain.gain.linearRampToValueAtTime(.035,t+.035);
  gain.gain.exponentialRampToValueAtTime(.0001,t+.36);
  oscillator.connect(gain).connect(explorerAudio.destination);
  oscillator.start(t);oscillator.stop(t+.36);
}
$('explorer-sound').onclick=async()=>{
  if(!soundOn){
    try{
      explorerAudio ||= new (window.AudioContext||window.webkitAudioContext)();
      await explorerAudio.resume();
    }catch{return;}
  }
  soundOn=!soundOn;
  pressed($('explorer-sound'),soundOn);
  $('explorer-sound').textContent=soundOn?'Sound on':'Sound off';
  sceneTone(420);
};
$('explorer-photo').onclick=()=>{
  if(!modelReady||activeDisplay!=='model')return;
  const source=visual?.renderer.domElement||canvas;
  if(!source.width||!source.height)return;
  const photo=document.createElement('canvas');
  photo.width=source.width;photo.height=source.height;
  const ctx=photo.getContext('2d');
  try{
    if(visual)visual.capture(ctx);
    else ctx.drawImage(canvas,0,0);
  }catch{return;}
  const size=Math.max(12,Math.round(photo.width*.018));
  const band=size*4.5;
  ctx.fillStyle='#070d19eb';ctx.fillRect(0,photo.height-band,photo.width,band);
  ctx.fillStyle='#f3f5ff';ctx.font='600 '+size+'px system-ui';
  ctx.fillText(chapter.beats[beat][0],size,photo.height-size*2.6,photo.width-size*2);
  ctx.font=Math.max(10,Math.round(size*.76))+'px system-ui';
  ctx.fillText('ASTRA NEXUS · Illustrative model · Asset credits: sources.html',size,photo.height-size,photo.width-size*2);
  photo.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob);
    const save=link('',url);
    save.download=chapter.id+'-'+sceneIds[chapter.id][beat]+'.png';
    save.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  });
};
