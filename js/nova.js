import { acts, parts } from './nova-data.js';

const $=id=>document.getElementById('nova-'+id);
const canvas=$('diagram'), viewport=$('viewport');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const dial={value:0,still:reduced.matches};
const key='nexus-nova';
const thresholds=[25,55,85];
const ranks=['Rookie','Scout','Pilot','Captain','Star master'];
const colors=['#c5aaff','#84dfef','#ffad9f','#f6d797','#91e1be'];
const labels=['Drift','Zoom','Light speed','Atoms','Dust','Backlight','Infrared','Starlight','Zap','Filter','Warmth','Tune in','Fly in','Stretch','Blast','Gravity','Chill','Gravity','Spin','Spin','Power','Infrared','Glow','Recycle'];
let progress={};
try { progress=JSON.parse(localStorage.getItem(key))||{}; } catch {}
let part=0, visual, visible=true, redraw=true, raf=0, last=0, yaw=0, pitch=0, pointer=null;
const chapter={id:'nova',bg:'#262950'};
const state={novaDial:dial};

function refreshStars() {
  const stars=parts.reduce((total,_,i)=>total+(progress[i]||0),0);
  const rank=ranks[Math.min(4,Math.floor(stars/18))];
  $('stars').textContent=(progress[part]||0)+' of 3 stars in this part · '+stars+' / 72 total · '+rank;
}
function save() {
  try { localStorage.setItem(key,JSON.stringify(progress)); } catch {}
}
function go(index) {
  part=Math.max(0,Math.min(parts.length-1,index));
  const [title,story,graphic,action]=parts[part];
  const act=acts.findLastIndex(([start])=>start<=part);
  document.body.style.setProperty('--accent',colors[act]);
  $('act').textContent='Nova’s Nebula Quest · '+acts[act][1]+' · '+(part+1)+' / '+parts.length;
  $('title').textContent=title;
  $('story').textContent=story;
  $('visual').textContent=graphic;
  $('move').textContent=action;
  $('dial-name').textContent=labels[part];
  $('dial-value').textContent='0%';
  $('dial').value=0;
  $('part').value=part;
  $('prev').disabled=part===0;
  $('next').disabled=part===parts.length-1;
  $('star-life').hidden=part!==parts.length-1;
  dial.value=0; yaw=pitch=0;
  visual?.setChapter(chapter,part,state);
  refreshStars();
  redraw=true;
}

function diagram() {
  const w=viewport.clientWidth,h=viewport.clientHeight;
  const scale=Math.min(devicePixelRatio,1.5);
  canvas.width=w*scale;canvas.height=h*scale;
  const g=canvas.getContext('2d');
  g.scale(scale,scale);
  const narrow=w<700, x=w*(narrow?.51:.73),y=h*(narrow?.66:.52),d=Math.min(w,h)*.32;
  const palette=['#b9a3ff','#73c9eb','#ffb382','#66e1bf'];
  const tint=part===9?palette[Math.min(2,Math.floor(dial.value*3))]:palette[part%4];
  const fog=g.createRadialGradient(x,y,0,x,y,d*1.8);
  fog.addColorStop(0,tint+'49');fog.addColorStop(1,'#080b19');
  g.fillStyle=fog;g.fillRect(0,0,w,h);
  let seed=115+part;
  const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<510;i++){
    const r=Math.sqrt(rng()), angle=rng()*6.283+yaw;
    let dx=Math.cos(angle)*r,dy=Math.sin(angle)*r;
    if(part===1){dx=dx*.31+(i<460?-.56:.56);dy*=.41;}
    if(part===2){dy*=.035;}
    if(part===12){dx=dx*.16+(i%3-1)*.5;}
    if(part===13)dy=Math.sin(dx*6+i%3)*.23+dy*.21;
    if(part>=17&&part<=21)dy*=part>=19?.25:.6;
    if(part===4&&i>510*(.15+dial.value*.85))break;
    const spread=[15,16,17,18].includes(part)?1.1-dial.value*.57:.75+dial.value*.27;
    g.fillStyle=(i%3?tint:'#fff4e6')+(i%4?'69':'be');
    g.beginPath();g.arc(x+dx*d*spread,y+(dy+pitch*.1)*d*spread,.5+rng()*1.8,0,Math.PI*2);g.fill();
  }
  if(part===2||[7,8,14,17,18,19,20,21,22,23].includes(part)){
    const cx=part===2?x+d*(2*dial.value-1):x;
    if(part!==21||dial.value>.27){
      const glow=g.createRadialGradient(cx,y,0,cx,y,15+dial.value*30);
      glow.addColorStop(0,'#fff6dc');glow.addColorStop(1,tint+'00');
      g.fillStyle=glow;g.fillRect(cx-50,y-50,100,100);
    }
  }
}

let art;
function draw(now) {
  raf=requestAnimationFrame(draw);
  if(document.hidden||!visible||(!redraw&&(!visual||dial.still))||now-last<31)return;
  last=now;redraw=false;
  if(!visual){diagram();return;}
  const w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;
  const view=art.cameraPreset('nebula',1,{},w<700);
  view.eye.x+=Math.sin(yaw)*3;
  view.eye.y+=pitch;
  if(part===12)view.eye.z-=dial.value*2;
  if(part===1||part===3)view.eye.z-=dial.value*1.5;
  if(w<700)view.target.y=1.45;
  try { visual.frame(dial.still?0:now/1000,view,dial.still?1:.22,w,h); }
  catch { fallback(); }
}
function fallback() {
  if(visual){visual.renderer.domElement.remove();visual.dispose();visual=null;}
  canvas.hidden=false;
  $('status').textContent='Interactive diagram · illustrative';
  redraw=true;
}
async function start3d() {
  let context;
  try {
    context=document.createElement('canvas').getContext('webgl2',{powerPreference:'low-power'});
    if(!context){fallback();return;}
    art=await import('./cosmic-art.js?v=9');
    visual=art.createRenderer(viewport,true,context,()=>{redraw=true;});
    visual.renderer.domElement.addEventListener('webglcontextlost',fallback,{once:true});
    visual.setChapter(chapter,part,state);
    $('status').textContent='Illustrative 3D model';
    canvas.hidden=true;redraw=true;
  } catch { context?.getExtension('WEBGL_lose_context')?.loseContext();fallback(); }
}

parts.forEach(([title],i)=>$('part').add(new Option((i+1)+' · '+title,i)));
$('part').onchange=e=>go(+e.target.value);
$('prev').onclick=()=>go(part-1);
$('next').onclick=()=>go(part+1);
$('dial').oninput=e=>{
  const value=+e.target.value;
  dial.value=value/100;
  $('dial-value').textContent=part===9?['Hydrogen','Oxygen','Sulfur'][Math.min(2,Math.floor(value/34))]:value+'%';
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
go(0);setStill(dial.still);
raf=requestAnimationFrame(draw);
requestAnimationFrame(()=>setTimeout(start3d,0));
