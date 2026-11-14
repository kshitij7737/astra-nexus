import { acts, parts as nebulaParts } from './nova-data.js';
import { chapters, initialSettings } from './cosmic-data.js?v=4';
import { drawCinema } from './nova-cinema.js?v=14';
import { series, questLink } from './nova-series.js?v=14';

const requested=new URLSearchParams(location.search).get('quest');
const questIndex=Math.max(0,series.findIndex(([id])=>id===requested));
const [questId]=series[questIndex];
const quest=questIndex? (await import('./nova-'+questId+'.js')).default : null;
const parts=quest?.parts||nebulaParts;
const title=quest?.title||'Nova’s Nebula Quest';
document.title=title+' · ASTRA NEXUS';

const $=id=>document.getElementById('nova-'+id);
const canvas=$('diagram'), viewport=$('viewport');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const dial={value:0,still:reduced.matches};
const key=quest?'nexus-nova-'+questId:'nexus-nova';
const thresholds=[25,55,85];
const ranks=['Rookie','Scout','Pilot','Captain','Star master'];
const colors=['#c5aaff','#84dfef','#ffad9f','#f6d797','#91e1be'];
const labels=['Drift','Zoom','Light speed','Atoms','Dust','Backlight','Infrared','Starlight','Zap','Filter','Warmth','Tune in','Fly in','Stretch','Blast','Gravity','Chill','Gravity','Spin','Spin','Power','Infrared','Glow','Recycle'];
let progress={};
try { progress=JSON.parse(localStorage.getItem(key))||{}; } catch {}
let part=0, visual, visible=true, redraw=true, raf=0, last=0, yaw=0, pitch=0, pointer=null;
const chapter=quest?chapters.find(c=>c.id===questId):{id:'nova',bg:'#262950'};
let state={novaDial:dial};
let visualKey='', animationTime=0, modeGeneration=0;
function syncModel(){
  if(!quest){visual?.setChapter(chapter,part,state);return;}
  const n=dial.value, label=parts[part][4], scene=quest.scenes[part];
  state={...initialSettings,still:dial.still,scale:true,observer:scene>=2,alignment:Math.round((1-n)*90),
    branch:n>.5?'massive':'sun',cutaway:label==='Cutaway'&&n>.15,forces:label==='Gravity',
    thermal:scene===1,collision:n<.34?'stick':n<.67?'bounce':'fragment',system:n>.5?'rocky':'mixed',
    mass:n>.5?'supermassive':'stellar',jets:label==='Power'&&n>.15,binary:part===19&&questId==='black-holes',
    trace:scene===4,paths:true,angle:label==='Tilt'&&n>.5?'edge':'oblique',magnify:label==='Zoom'&&n>.5};
  if(questId==='lensing')state.alignment=Math.round(state.alignment/4)*4;
  const key=JSON.stringify([scene,state]);
  if(visual&&key!==visualKey){visual.setChapter(chapter,scene,state);visualKey=key;}
}
for(const [id,name] of series){
  const a=document.createElement('a');a.href=questLink(id);a.textContent=name;
  if(id===questId)a.setAttribute('aria-current','page');
  $('series').append(a);
}
const nextQuest=series[questIndex+1];
$('star-life').href=nextQuest?questLink(nextQuest[0]):'cosmic.html?v=11#chapters';
$('star-life').textContent=nextQuest?'Continue to '+nextQuest[1]+' →':'Return to Cosmic Explorer →';


function refreshStars() {
  const stars=parts.reduce((total,_,i)=>total+(progress[i]||0),0);
  const rank=ranks[Math.min(4,Math.floor(stars/(parts.length*3/4)))];
  $('stars').textContent=(progress[part]||0)+' of 3 stars in this part · '+stars+' / '+parts.length*3+' total · '+rank;
}
function save() {
  try { localStorage.setItem(key,JSON.stringify(progress)); } catch {}
}
function go(index) {
  part=Math.max(0,Math.min(parts.length-1,index));
  const [heading,story,graphic,action,label]=parts[part];
  const act=acts.findLastIndex(([start])=>start<=part);
  document.body.style.setProperty('--accent',quest?chapter.accent:colors[act]);
  $('act').textContent=title+' · '+(quest?'':acts[act][1]+' · ')+(part+1)+' / '+parts.length;
  $('title').textContent=heading;
  $('story').textContent=story;
  $('visual').textContent=graphic;
  const credit=$('credit');
  const nebula=questId==='nebula'&&[0,7,8,10,12,22].includes(part);
  const planets=questId==='universe'&&part===3||questId==='planets'&&part===20;
  credit.hidden=!nebula&&!planets;
  credit.href=nebula?'https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/':'sources.html';
  credit.textContent=nebula?'Backdrop: NASA, ESA, CSA, STScI · color adapted':'Planet texture credits · sizes and distances illustrative';
  $('move').textContent=quest?(label==='View'?'Drag the scene or use the View dial.':action):action;
  $('dial-name').textContent=label||labels[part];
  dialReadout(0);
  $('dial').value=0;
  $('part').value=part;
  $('prev').disabled=part===0;
  $('next').disabled=part===parts.length-1;
  $('star-life').hidden=part!==parts.length-1;
  dial.value=0; yaw=pitch=0; animationTime=0;
  if(!dial.still&&canvas.animate)canvas.animate([{opacity:.32},{opacity:1}],{duration:340,easing:'ease-out'});
  visualKey='';syncModel();
  refreshStars();
  redraw=true;
}

let art;
function draw(now) {
  raf=requestAnimationFrame(draw);
  if(document.hidden||!visible||(!redraw&&dial.still)||now-last<39)return;
  if(!dial.still)animationTime+=Math.min(.06,(now-last)/1000);
  last=now;redraw=false;
  if(!visual){
    drawCinema(canvas,questId,part,dial.value,animationTime,yaw,pitch,()=>{redraw=true;});
    return;
  }
  if(quest)syncModel();
  const w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;
  const view=art.cameraPreset(quest?questId:'nebula',quest?quest.scenes[part]:1,state,w<700);
  if(quest)view.eye.multiplyScalar(1-dial.value*.26);
  view.eye.x+=Math.sin(yaw)*3;
  view.eye.y+=pitch;
  if(part===12)view.eye.z-=dial.value*2;
  if(part===1||part===3)view.eye.z-=dial.value*1.5;
  if(w<700)view.target.y=1.45;
  try { visual.frame(animationTime,view,dial.still?1:.22,w,h); }
  catch { fallback(); }
}
function fallback() {
  if(visual){visual.renderer.domElement.remove();visual.dispose();visual=null;}
  canvas.hidden=false;
  $('status').textContent='Illustrative animation';
  $('render').textContent='3D view';
  redraw=true;
}
async function start3d() {
  const generation=++modeGeneration;
  $('render').textContent='Loading 3D…';
  let context;
  try {
    context=document.createElement('canvas').getContext('webgl2',{powerPreference:'low-power'});
    if(!context){fallback();$('status').textContent='Illustrative animation · 3D unavailable';return;}
    art=await import('./cosmic-art.js?v=9');
    if(generation!==modeGeneration){context.getExtension('WEBGL_lose_context')?.loseContext();return;}
    visual=art.createRenderer(viewport,true,context,()=>{redraw=true;});
    visual.renderer.domElement.addEventListener('webglcontextlost',fallback,{once:true});
    visualKey='';syncModel();
    $('status').textContent='Illustrative 3D overview';
    $('render').textContent='Story animation';
    canvas.hidden=true;redraw=true;
  } catch { context?.getExtension('WEBGL_lose_context')?.loseContext();fallback(); }
}

parts.forEach(([title],i)=>$('part').add(new Option((i+1)+' · '+title,i)));
$('part').onchange=e=>go(+e.target.value);
$('prev').onclick=()=>go(part-1);
$('next').onclick=()=>go(part+1);
function dialReadout(value){
  const label=parts[part][4];
  let readout=value+'%';
  if(!quest&&part===9)readout=['Hydrogen','Oxygen','Sulfur'][Math.min(2,Math.floor(value/34))];
  if(questId==='black-holes'&&label==='Mass'&&[11,20].includes(part)){
    const mass=Math.round(3+value*.37);
    readout=mass+' solar masses · ~'+Math.round(mass*2.95)+' km horizon radius';
  }
  $('dial-value').textContent=readout;
}
$('dial').oninput=e=>{
  const value=+e.target.value;
  dial.value=value/100;
  dialReadout(value);
  const earned=thresholds.filter(n=>value>=n).length;
  if(earned>(progress[part]||0)){progress[part]=earned;save();refreshStars();}
  redraw=true;
};
function setStill(value){dial.still=value;$('still').setAttribute('aria-pressed',String(value));redraw=true;}
$('still').onclick=()=>setStill(!dial.still);
reduced.addEventListener('change',e=>setStill(e.matches));
viewport.onpointerdown=e=>{pointer=[e.clientX,e.clientY];viewport.setPointerCapture(e.pointerId);};
viewport.onpointermove=e=>{
  if(!pointer)return;
  if(questId==='lensing'&&[0,4,19].includes(part)){
    const input=$('dial');
    input.value=Math.max(0,Math.min(100,+input.value+(e.clientY-pointer[1])*.65));
    input.oninput({target:input});
  }
  yaw+=(e.clientX-pointer[0])*.009;
  pitch=Math.max(-2,Math.min(2,pitch+(e.clientY-pointer[1])*.012));
  pointer=[e.clientX,e.clientY];redraw=true;
};
viewport.onpointerup=viewport.onpointercancel=()=>{pointer=null;};
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,button,a,summary'))return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(part+(e.key==='ArrowRight'?1:-1));}
});
new ResizeObserver(()=>{redraw=true;}).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;redraw=true;}).observe(viewport);
addEventListener('pagehide',()=>cancelAnimationFrame(raf));
addEventListener('pageshow',e=>{if(e.persisted)raf=requestAnimationFrame(draw);});
if(quest)document.querySelector('.nova-flight details a').href=chapter.source;
if(quest)document.querySelector('.nova-flight details a').textContent='Chapter science reference';
go(0);setStill(dial.still);
raf=requestAnimationFrame(draw);
$('render').onclick=()=>{
  if(visual||$('render').textContent==='Loading 3D…'){modeGeneration++;fallback();}
  else start3d();
};
$('status').textContent='Illustrative animation';
const films={
  nebula:[['nebula','Nebula evolution']],
  stars:[['sun-like-star','Evolution of a Sun-like star'],['massive-star','Evolution of a massive star']],
  planets:[['planet-formation','From nebula to solar system'],['worlds-from-dust','Worlds from dust']],
}[questId]||[];
$('films').hidden=!films.length;
for(const [file,name] of films){
  const button=document.createElement('button');
  button.type='button';button.textContent='Play '+name;
  button.onclick=()=>{
    $('film-list').querySelector('video')?.remove();
    const video=document.createElement('video');
    video.controls=true;video.playsInline=true;
    video.poster='textures/cosmic/'+file+'-poster.webp';
    video.src='textures/cosmic/'+file+'.mp4';
    video.setAttribute('aria-label',name);
    $('film-list').append(video);
    video.play().catch(()=>{});
  };
  $('film-list').append(button);
}
$('films').addEventListener('toggle',()=>{if(!$('films').open)$('film-list').querySelector('video')?.pause();});
