import { chapters, initialSettings, lensNames, lensState } from './cosmic-data.js?v=2';
import { drawDiagram } from './cosmic-diagram.js?v=2';
import { imagePath, observationFor, observations } from './cosmic-gallery.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport'), canvas = $('diagram');
const prefersStill = matchMedia('(prefers-reduced-motion: reduce)');
const lite = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) < 5;
let chapter = chapters[0], beat = 0, state = {...initialSettings};
let art, visual, free = false, labels = false, still = prefersStill.matches, guided = false, frameId = 0;
let yaw = 0, pitch = 0, zoom = 1, clock = 0, previous = 0, deadline = 0, viewChanged = true;
let pointer = null, diagramFrame = 0, pulseTimer = 0;
let displayPreference = 'auto', activeDisplay = 'model', loadedObservation = null;
const missingImages = new Set();

function syncDisplay() {
  const id = observationFor(chapter.id,beat,state);
  const available = id && !missingImages.has(id);
  const show = available && (displayPreference==='telescope' || displayPreference==='auto' && !visual);
  activeDisplay = show ? 'telescope' : 'model';
  $('observation').hidden = !show;
  $('observation-notes').hidden = !show;
  $('model-controls').hidden = show;
  viewport.hidden = show;
  $('model-labels').hidden = show || !labels;
  $('scale').hidden = show || chapter.id!=='universe' || !state.scale;
  $('show-observation').hidden = !available;
  pressed($('show-model'),!show);
  pressed($('show-observation'),Boolean(show));
  $('show-model').parentElement.hidden=!available;
  $('show-model').textContent = visual ? '3D model' : 'Diagram';
  $('render-mode').hidden = show;
  $('render-mode').textContent = visual ? 'Illustrative 3D model' : 'Interactive diagram';
  $('free').hidden = show || !visual;
  $('motion').hidden = show || !visual;
  $('labels').hidden = show;
  $('reset').hidden = show;
  if (show && free) setFree(false);
  if (!show || loadedObservation===id) return;
  const photo = observations[id];
  const img = $('observation-image');
  loadedObservation = id;
  img.alt = photo.alt;
  img.style.setProperty('--photo-focus',photo.focus);
  img.classList.toggle('cx-wide',id==='carina');
  img.src = imagePath(id);
  $('observation-title').textContent = photo.title;
  $('observation-instrument').textContent = photo.instrument;
  $('observation-note').textContent = photo.note;
  $('observation-credit').textContent = photo.credit;
  $('observation-credit').href = photo.link;
}
function switchDisplay(preference) {
  setGuided(false);
  displayPreference=preference;
  rebuild();
}
$('observation-image').addEventListener('error',()=>{
  if(!loadedObservation) return;
  missingImages.add(loadedObservation);
  rebuild();
});

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
const menu = chapters.map((item,i)=>{
  const a=el('a');
  a.href='#'+item.id;
  a.append(el('b',String(i+1).padStart(2,'0')),el('span',item.short));
  $('chapters').append(a);
  return a;
});
function addressChapter() {
  return chapters.find(c=>c.id===location.hash.slice(1)) || chapters[0];
}
function resetCamera() { yaw=0; pitch=0; zoom=1; viewChanged=true; }
function drawFallback(){
  if(visual||activeDisplay==='telescope')return;
  cancelAnimationFrame(diagramFrame);
  diagramFrame=requestAnimationFrame(()=>drawDiagram(canvas,chapter,beat,state,drawFallback));
}
function rebuild() {
  syncDisplay();
  if(activeDisplay==='telescope') return;
  if(visual) visual.setChapter(chapter,beat,state);
  else drawFallback();
  viewChanged=true;
}
function setFree(on) {
  free=on;
  if(on) setGuided(false);
  else resetCamera();
  viewport.classList.toggle('free',on);
  pressed($('free'),on);
  $('free').textContent=on?'Return to guided view':'Free look';
  viewChanged=true;
}
function setGuided(on) {
  guided=on;
  if(on && free) setFree(false);
  $('play').textContent=on?'Pause guided tour':beat===5?'Replay chapter':'Play guided tour';
  $('stage-play').textContent=on?'Pause tour':beat===5?'Replay tour':'Play tour';
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
  const angle=(top='Top-down')=>select('angle','View angle',[['oblique','Three-quarter'],['top',top],['edge','Edge-on']]);
  if(chapter.id==='nebula'){
    const row=el('div',null,'cx-choices');
    for(const [index,title] of [[2,'Stellar material'],[3,'Stellar nursery']]){
      const b=button(title,()=>go(index),beat===index);
      b.dataset.beat=index;
      row.append(b);
    }
    root.append(row);
    choices([['sun','Sun-like remnant'],['massive','Supernova remnant']],'branch');
    toggle('infrared','Infrared-inspired view');
    select('feature','Inspect a feature',[['gas','Gas filaments'],['dust','Dust ridge'],['cavity','Lit cavity'],['core','Dense core'],['jets','Bipolar jets']]);
  }else if(chapter.id==='stars'){
    choices([['sun','Sun-like star'],['massive','Massive star']],'branch');
    toggle('forces','Show inward gravity and outward pressure');
    toggle('cutaway','Core cross-section');
    angle('Face-on disk');
  }else if(chapter.id==='planets'){
    angle();
    toggle('thermal','Show water-ice line');
    toggle('paths','Show orbit paths');
    choices([['mixed','Rocky worlds + giants'],['rocky','Compact rocky worlds']],'system');
  }else if(chapter.id==='black-holes'){
    angle('Face-on');
    select('mass','Compare mass',[['stellar','10 solar masses'],['supermassive','1 million solar masses']]);
    select('evidence','Evidence overlay',[['orbits','Stellar orbits'],['light','Bent light'],['matter','Hot matter'],['waves','Gravitational waves']]);
    toggle('jets','Show optional jets');
  }else if(chapter.id==='lensing'){
    const wrapper=el('label',null,'cx-field');
    const slider=el('input');slider.type='range';slider.min=0;slider.max=100;slider.value=state.alignment;
    slider.dataset.field='alignment';
    slider.oninput=()=>update('alignment',+slider.value);
    wrapper.append(el('span','Source offset'),slider);
    root.append(wrapper);
    select('lens','Lens type',[['star','Star'],['blackHole','Black hole'],['galaxy','Galaxy'],['cluster','Galaxy cluster']]);
    const row=el('div',null,'cx-choices');
    for(const [key,text] of [['observer','Observer view'],['paths','Light paths'],['magnify','Magnify image']]){
      const b=button(text,()=>update(key,!state[key]),state[key]);b.dataset.control=key;row.append(b);
    }
    row.append(button('Align source',()=>update('alignment',0)),button('Pulse source',()=>{
      setGuided(false);
      state.pulse=true;
      state.observer=true;
      clearTimeout(pulseTimer);
      pulseTimer=setTimeout(()=>{state.pulse=false;showReading();},3400);
      syncControls();
      rebuild();
      showReading();
    }));
    root.append(row);
  }else{
    angle('Flat map');
    toggle('scale','Scale ruler');
    toggle('compare','Compare distances');
    root.append(button('Return to Earth',()=>go(0)));
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
  }
}
function update(key,value) {
  setGuided(false);
  state[key]=value;
  if(key==='feature'){
    const targets={gas:1,dust:1,cavity:1,core:3,jets:4};
    go(targets[value]);
    return;
  }
  if(key==='branch'){
    const target=chapter.id==='nebula'?2:beat<4?4:beat;
    if(target!==beat){go(target);return;}
  }
  if(key==='system'&&beat<4){go(5);return;}
  if(key==='evidence'){
    const target={orbits:0,light:4,matter:3,waves:5}[value];
    if(target!==beat){go(target);return;}
  }
  if(key==='jets'&&value&&beat<3){go(3);return;}
  if(key==='forces'&&value&&beat!==3){go(3);return;}
  if(key==='cutaway'&&value&&beat!==3){go(3);return;}
  syncControls();
  if(key==='angle'){resetCamera();drawFallback();}
  else rebuild();
  showReading();
}
function showReading(){
  let text='';
  if(chapter.id==='nebula'){
    const features={gas:'Gas filaments: ridges of illuminated gas.',dust:'Dust ridge: denser material absorbs visible light.',cavity:'Lit cavity: young stars can clear gas and brighten the cavity walls.',core:'Dense core: gravity draws material inward.',jets:'Bipolar jets: narrow outflows aligned with the disk axis.'};
    text=(beat===2?(state.branch==='sun'?'Sun-like star · expelled gas around a white dwarf.':'Massive star · a filament-rich supernova remnant.'):features[state.feature]||'Select a feature or compare the two remnant paths.')+(state.infrared?' Infrared-inspired colors are schematic.':'');
  }
  if(chapter.id==='stars') text=state.cutaway&&beat===3?'Schematic cross-section · sustained hydrogen fusion occurs in the core.':state.forces&&beat===3?'Cyan arrows point inward (gravity). Amber arrows point outward (pressure).':state.branch==='sun'?'Sun-like path · red giant → expelled gas → white dwarf.':'Massive path · supergiant → core collapse → neutron star or black hole.';
  if(chapter.id==='planets') text=beat===2?'Magnified example · some particles stick, others scatter.':state.thermal||beat===1?'Mint ring · approximate water-ice line. The boundary depends on disk conditions.':state.system==='mixed'?'Illustrative outcome · rocky inner worlds and larger outer planets.':'Illustrative outcome · a compact family of rocky planets.';
  if(chapter.id==='black-holes'){
    if(beat===5) text='Evidence · schematic gravitational-wave chirp.';
    else{
      const radius=state.mass==='stellar'?'about 30 km':'about 3 million km';
      text='Non-spinning example · horizon radius '+radius+'. The rendered proportions are illustrative.';
      if(state.jets&&beat>=3)text+=' Jets are powered by matter and fields outside the horizon.';
    }
  }
  if(chapter.id==='lensing'){
    const l=lensState(state.alignment,state.lens);
    text=l.appearance+' · '+state.alignment+'% offset on the model slider · '+lensNames[state.lens]+' lens.';
    if(state.pulse)text+=still||!visual?' The same flash may reach the observer at different times.':' Watch the two apparent images brighten in sequence.';
    else if(l.appearance==='Einstein ring')text+=' One apparent ring around the lens.';
    else text+=' Two apparent images of the same source. Near alignment increases magnification in this model.';
  }
  if(chapter.id==='universe')text=state.compare?'1 AU ≈ 390 Earth–Moon distances. 1 light-year ≈ 63,000 AU. The display changes scale at each stop.':chapter.scales[beat]+'. Distances and object sizes are illustrative.';
  $('reading').textContent=text;
  $('scale').hidden=activeDisplay==='telescope'||chapter.id!=='universe'||!state.scale;
  $('scale').textContent=chapter.scales?.[beat]||'';
}
function go(index, fromTour=false){
  if(!fromTour)setGuided(false);
  beat=Math.max(0,Math.min(chapter.beats.length-1,index));
  state.pulse=false;
  if(chapter.id==='lensing'){
    state.observer=beat>=2;
    state.alignment=[66,66,0,62,46,20][beat];
    state.lens=beat===1?'blackHole':beat===5?'cluster':'galaxy';
    state.paths=true;
  }
  if(chapter.id==='black-holes') state.evidence=['orbits','orbits','orbits','matter','light','waves'][beat];
  resetCamera();
  $('beat-number').textContent='Scene '+String(beat+1).padStart(2,'0')+' / '+chapter.beats.length;
  $('beat-title').textContent=chapter.beats[beat][0];
  $('beat-copy').textContent=chapter.beats[beat][1];
  $('stage-beat').replaceChildren(el('b',chapter.beats[beat][0]),el('span',chapter.beats[beat][1]));
  $('timeline').value=beat;
  $('timeline-value').textContent=(beat+1)+' of '+chapter.beats.length;
  $('stage-previous').disabled=$('previous').disabled=beat===0;
  $('stage-next').disabled=$('next').disabled=beat===chapter.beats.length-1;
  Array.from($('stops').children).forEach((b,i)=>pressed(b,i===beat));
  setGuided(guided);
  for(const b of $('controls').querySelectorAll('[data-beat]')) pressed(b,+b.dataset.beat===beat);
  syncControls();
  showReading();
  rebuild();
}
function openChapter(item){
  chapter=item;
  displayPreference='auto';
  clearTimeout(pulseTimer);
  state={...initialSettings,feature:'gas'};
  document.documentElement.style.setProperty('--accent',item.accent);
  const index=chapters.indexOf(item);
  menu.forEach((a,i)=>i===index?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  const chapterStrip=$('chapters');
  const link=menu[index];
  chapterStrip.scrollTo({left:link.offsetLeft-chapterStrip.offsetLeft-(chapterStrip.clientWidth-link.offsetWidth)/2});
  $('chapter-number').textContent='Chapter '+String(index+1).padStart(2,'0')+' / 06';
  $('chapter-title').textContent=item.title;
  $('chapter-intro').textContent=item.intro;
  $('science').textContent=item.science;
  $('sources').replaceChildren();
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
  const next=chapters[index+1];
  $('next-chapter').href=next?'#'+next.id:'./#dash';
  $('next-chapter').textContent=next?next.short+' →':'Mission control →';
  buildControls();go(0);
}
function loop(now){
  frameId=requestAnimationFrame(loop);
  if(document.hidden){previous=0;return;}
  const dt=previous?Math.min(.05,(now-previous)/1000):0;
  previous=now;
  if(guided&&now>=deadline){
    if(beat<chapter.beats.length-1)go(beat+1,true);
    else setGuided(false);
  }
  if(!visual||activeDisplay==='telescope')return;
  if(!still)clock+=dt;
  if(still&&!viewChanged)return;
  const width=viewport.clientWidth,height=viewport.clientHeight;
  if(!width||!height)return;
  const view=art.cameraPreset(chapter.id,beat,state,width<760);
  if(free){
    const eye=view.eye;
    const r=eye.length()*zoom;
    const phi=Math.max(.16,Math.min(Math.PI-.16,Math.acos(eye.y/eye.length())+pitch));
    const theta=Math.atan2(eye.x,eye.z)+yaw;
    eye.set(r*Math.sin(phi)*Math.sin(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.cos(theta));
  }
  try {
    visual.frame(clock,view,still?1:1-Math.exp(-dt*4.6),width,height);
  } catch (error) {
    console.warn('Cosmic Explorer is switching to its diagram view.', error);
    useFallback();
  }
  viewChanged=false;
}
function useFallback(){
  if(visual){
    visual.renderer.dispose();
    visual.renderer.domElement.remove();
    visual=null;
  }
  canvas.hidden=false;
  setFree(false);
  rebuild();
}
async function init(){
  openChapter(addressChapter());
  pressed($('motion'),still);
  drawFallback();
  frameId=requestAnimationFrame(loop);
  try{
    const context=document.createElement('canvas').getContext('webgl2',{powerPreference:'low-power'});
    if(!context) return useFallback();
    art=await import('./cosmic-art.js?v=2');
    visual=art.createRenderer(viewport,lite,context);
    visual.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();useFallback();},{once:true});
    canvas.hidden=true;
    rebuild();
  }catch{useFallback();}
}
$('stage-previous').onclick=$('previous').onclick=()=>go(beat-1);
$('stage-next').onclick=$('next').onclick=()=>go(beat+1);
$('stage-play').onclick=$('play').onclick=()=>{
  if(guided){setGuided(false);return;}
  switchDisplay('model');
  if(beat===chapter.beats.length-1) go(0);
  setGuided(true);
};
$('show-model').onclick=()=>switchDisplay('model');
$('show-observation').onclick=()=>switchDisplay('telescope');
$('inspect-model').onclick=()=>{
  switchDisplay('model');
  $('controls').querySelector('button, input, select')?.focus();
};
$('timeline').oninput=e=>go(+e.target.value);
$('free').onclick=()=>setFree(!free);
$('labels').onclick=()=>{
  labels=!labels;pressed($('labels'),labels);$('model-labels').hidden=!labels;
};
function setStill(on){
  still=on;pressed($('motion'),still);
  if(still)setGuided(false);
  viewChanged=true;
}
$('motion').onclick=()=>setStill(!still);
prefersStill.addEventListener('change',e=>setStill(e.matches));
$('reset').onclick=()=>{
  clearTimeout(pulseTimer);state={...initialSettings,feature:'gas'};
  setFree(false);buildControls();go(0);
};
viewport.onpointerdown=e=>{
  if(!free||e.button!==0)return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
  viewport.setPointerCapture(e.pointerId);
};
viewport.onpointermove=e=>{
  if(pointer?.id!==e.pointerId)return;
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
  else if(e.key==='Escape')setFree(false);
  else return;
  e.preventDefault();viewChanged=true;
};
new ResizeObserver(()=>{viewChanged=true;drawFallback();}).observe(viewport);
window.addEventListener('hashchange',()=>openChapter(addressChapter()));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setGuided(false);});
window.addEventListener('pagehide',()=>cancelAnimationFrame(frameId));
window.addEventListener('pageshow',event=>{if(event.persisted){previous=0;frameId=requestAnimationFrame(loop);}});
init();
