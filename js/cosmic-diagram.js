import { lensState } from './cosmic-data.js?v=2';

const globes = new Map();
function globe(name, onLoad) {
  if(!globes.has(name)){
    const image=new Image();
    image.addEventListener('load',onLoad,{once:true});
    image.src=new URL('../textures/cosmic/'+name+'-globe.webp',import.meta.url).href;
    globes.set(name,image);
  }
  return globes.get(name);
}
export function drawDiagram(canvas, chapter, beat, state, onLoad) {
  const {clientWidth:w,clientHeight:h}=canvas;
  if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio,2);
  canvas.width=w*dpr;canvas.height=h*dpr;
  const g=canvas.getContext('2d');
  g.scale(dpr,dpr);
  const narrow=w<760;
  const x=w*(narrow?.50:.71),y=h*(narrow?.61:.52),s=Math.min(w*(narrow?.091:.049),h*.105);
  const bg=g.createRadialGradient(x,y,0,x,y,w*.68);
  bg.addColorStop(0,chapter.bg+'4d');bg.addColorStop(1,'#050812');
  g.fillStyle='#050812';g.fillRect(0,0,w,h);
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  let seed=98;
  const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
  for(let i=0;i<220;i++){
    g.fillStyle=i%5?'#c7d7f652':'#f4d9ba90';
    const px=random()*w,py=random()*h,r=random();
    g.fillRect(px,py,.5+r*1.25,.5+r*1.25);
  }
  g.translate(x,y);g.scale(s,s);
  const circle=(a,b,r,color)=>{g.fillStyle=color;g.beginPath();g.arc(a,b,r,0,Math.PI*2);g.fill();};
  const stroke=(a,b,r,color,flat=1,from=0,to=2*Math.PI)=>{
    g.strokeStyle=color;g.lineWidth=.036;g.beginPath();g.ellipse(a,b,r,r*flat,0,from,to);g.stroke();
  };
  const light=(a,b,r,inside,outside)=>{
    const gr=g.createRadialGradient(a,b,0,a,b,r);gr.addColorStop(0,inside);gr.addColorStop(1,outside);
    circle(a,b,r,gr);
  };
  const path=(points,color)=>{
    g.strokeStyle=color;g.lineWidth=.032;g.beginPath();
    points.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));g.stroke();
  };
  const cloud=(hues,remnant=false,massive=false)=>{
    for(let i=0;i<92;i++){
      const a=random()*Math.PI*2,r=remnant?1.65+random()*.7:random()*3.7;
      const cx=Math.cos(a)*r,cy=Math.sin(a)*r*(massive?.87:.54);
      light(cx,cy,.26+random()*(remnant?.58:1.46),hues[i%hues.length],'#22245000');
    }
  };
  const spiral=(a,b,r)=>{
    light(a,b,r*.66,'#fbd6a578','#c18ef100');
    for(let i=0;i<500;i++){
      const d=random()*r,angle=i%4*Math.PI/2+d*1.6+random()*.5;
      circle(a+d*Math.cos(angle),b+.64*d*Math.sin(angle),.011+random()*.026,i%6?'#c6bcff87':'#ffe7bdb8');
    }
  };
  if(chapter.id==='nebula'||chapter.id==='stars'){
    const stars=chapter.id==='stars',massive=state.branch==='massive';
    const remnant=beat===(stars?5:2);
    if(remnant){
      cloud(massive?['#ec739965','#ca8deb53']:['#65ddd285','#d8ac7975'],true,massive);
      if(!massive)for(const r of [1.4,1.75,2.0])stroke(0,0,r,'#92dbdb86',.8);
      circle(0,0,.13,'#e9f6ff');
    }else if(stars&&(beat===3||beat===4)){
      light(0,0,2.9,beat===4?'#f678556c':'#ffd2898c','#ffa96200');
      circle(0,0,beat===4?1.38:.98,beat===4?'#ef8158':massive?'#cde6ff':'#ffdc98');
      if(state.cutaway && beat===3){
        g.save();
        g.beginPath();g.moveTo(0,0);g.arc(0,0,1,-Math.PI/2,0);g.closePath();g.clip();
        for(const [r,c] of [[1,'#df8158'],[.78,'#f6ac71'],[.56,'#ffd087'],[.28,'#fff4ca']]) circle(0,0,r,c);
        g.restore();
      }
      if(state.forces){path([[-2,0],[-1.25,0]],'#a6edff');path([[1.08,0],[1.8,0]],'#ffd4a0');}
    }else{
      cloud(state.infrared?['#e984876a','#9166c480']:stars?['#66d9b280','#7c97d45e']:['#dc84c477','#6f6dc59a','#ffae8360']);
      if(beat>0)path([[-3,-.4],[-1.5,.34],[-.48,.46],[1.4,-.04],[3,-.38]],'#161b378a');
      if(beat>=3||stars&&beat>=1){
        light(0,0,1.48,'#ffbf8ab0','#ffb16e00');
        stroke(0,0,.97,'#f9b27ce0',.32);circle(0,0,.23,'#ffe2a4');
        if(!stars&&beat>=4||stars&&beat===2)path([[0,-1.5],[0,1.5]],'#78e8f7c0');
      }
    }
  }else if(chapter.id==='planets'){
    if(beat===2){
      for(let i=0;i<48;i++)circle((random()-.5)*5,(random()-.5)*3,.02+random()*.11,'#e7ab88a0');
      circle(-.65,0,.58,'#ae765f');circle(.65,.11,.45,'#89a8b8');
    }else{
      const flat=state.angle==='top'?1:state.angle==='edge'?.19:.53;
      for(let i=0;i<22;i++)stroke(0,0,.54+i*.148,beat===5?'#819ab45a':i<10?'#f6b87674':'#9cb5f075',flat);
      if(state.thermal||beat===1)stroke(0,0,2.02,'#adf9e7',flat);
      light(0,0,1.18,'#ffd39cc4','#ffb16700');circle(0,0,.36,'#ffdf9e');
      if(beat>=3)for(let i=0;i<7;i++){
        const r=.85+i*.39,a=i*2.3;
        circle(r*Math.cos(a),flat*r*Math.sin(a),.09+(state.system==='mixed'?i*.027:0),i<3?'#d5a083':'#aad1e1');
      }
    }
  }else if(chapter.id==='black-holes'){
    if(beat===1){light(0,0,2.45,'#ff9571b0','#fa775500');circle(0,0,1.2,'#ee8b68');}
    else if(beat===5){
      for(const a of [-1,1]){stroke(a,0,.89,'#ffa670',.4);circle(a,0,.36,'#080c1b');}
      path(Array.from({length:180},(_,i)=>{const t=i/179;return [(t-.5)*7,1.65+Math.sin(11*t+100*t*t)*Math.min(t*t,Math.max(0,(1-t)*3))];}),'#8de9fa');
    }else{
      const r=state.mass==='supermassive'?1.03:.65;
      if(beat===0||state.evidence==='orbits')for(let i=0;i<4;i++)stroke(0,0,1.6+i*.46,'#adc9ea75',.52+i*.07);
      if(beat>=3){
        const flat=state.angle==='top'?.91:state.angle==='edge'?.12:.32;
        const inner=r*1.28,outer=r+2.1;
        const band=g.createRadialGradient(0,0,inner,0,0,outer);
        band.addColorStop(0,'#fff1bb');band.addColorStop(.13,'#ffad62e0');
        band.addColorStop(.41,'#dd622e94');band.addColorStop(.76,'#7a304155');band.addColorStop(1,'#5d253500');
        g.save();g.scale(1,flat);circle(0,0,outer,band);circle(0,0,inner,'#060913');
        for(let i=0;i<36;i++)stroke(0,0,inner+(outer-inner)*i/36,i<10?'#ffcf9950':'#df8b7e21');
        g.restore();
      }
      if(beat===4||state.evidence==='light'){
        g.save();g.shadowBlur=12;g.shadowColor='#fa8c4b';
        stroke(0,0,r*1.43,'#ffe0ae',1.06,Math.PI+.12,Math.PI*2-.12);
        stroke(0,0,r*1.55,'#e87f5688',1.1,Math.PI+.28,Math.PI*2-.22);g.restore();
      }
      if(state.jets&&beat>=3)path([[0,-2.7],[0,2.7]],'#88e5fd');
      circle(0,0,r,'#080b16');
      if(beat===2)stroke(0,0,r*.75,'#c7e5f3');
    }
  }else if(chapter.id==='lensing'){
    const l=lensState(state.alignment,state.lens);
    if(state.observer){
      spiral(0,0,.65);
      const m=state.magnify?1.85:1.32;
      const lensArc=(r,from,to,tint)=>{
        g.save();
        g.shadowColor=tint;g.shadowBlur=11;
        stroke(0,0,r,tint,1,from,to);
        g.shadowBlur=0;
        stroke(0,0,r*.98,'#c7dbff62',1,from,to);
        g.restore();
      };
      if(l.appearance==='Einstein ring')lensArc(l.radius*m,0,Math.PI*2,'#d3edff');
      else{
        const a=l.appearance==='Stretched arcs'?1.6:.58;
        lensArc(Math.abs(l.images[0])*m,-a/2,a/2,'#b4e5ff');
        lensArc(Math.abs(l.images[1])*m,Math.PI-a*.4,Math.PI+a*.4,'#c9b7ff');
      }
    }else{
      const offset=-l.offset*1.5;
      path([[-3.4,0],[3.4,0]],'#799ab777');
      if(state.paths)for(const [i,p] of l.images.entries()){
        g.strokeStyle=i?'#c5a7fb':'#8df0ff';g.lineWidth=.035;
        g.beginPath();g.moveTo(-3.2,offset);g.bezierCurveTo(-1.3,offset, -1.1,p,0,p);g.bezierCurveTo(1.1,p,2,p*.5,3.2,0);g.stroke();
      }
      spiral(-3.2,offset,.62);spiral(0,0,.52*l.radius);
      g.fillStyle='#99e2fc';g.beginPath();g.moveTo(3.52,0);g.lineTo(3.02,.24);g.lineTo(3.02,-.24);g.fill();
    }
  }else{
    if(beat===0){
      for(const [name,cx,cy,r,tint] of [['earth',-.9,0,1.82,'#377bad'],['moon',2.06,.1,.48,'#b9b4b0']]){
        const image=globe(name,onLoad);
        if(image.complete&&image.naturalWidth)g.drawImage(image,cx-r,cy-r,r*2,r*2);
        else circle(cx,cy,r*.94,tint);
      }
      if(state.scale)path([[-.9,1.95],[2.06,1.95]],'#a6e8ef');
    }
    if(beat===1){for(let i=1;i<=8;i++){stroke(0,0,i*.42,'#a1bdd168',.55);circle(i*.42*Math.cos(i*1.5),i*.42*.55*Math.sin(i*1.5),.06+i*.012,'#bad0e1');}circle(0,0,.3,'#ffd18b');}
    if(beat===2){circle(-1.7,0,.24,'#ffd18b');circle(1.6,0,.11,'#ff9b8e');if(state.scale)path([[-1.7,.8],[1.6,.8]],'#a6e8ef');}
    if(beat===3){spiral(0,0,3.5);circle(1.85,-.55,.09,'#ffab8a');}
    if(beat===4){spiral(-1.6,.38,1.65);spiral(1.42,-.43,1.94);spiral(2.5,1.23,.47);}
    if(beat===5){for(let i=0;i<380;i++){const a=random()*7.6-3.8;circle(a,Math.sin(a*1.7+i%4)*(.7+i%3*.28)+(random()-.5)*.48,.019+random()*.03,'#bfd7ffc2');}stroke(0,0,3.8,'#8edccb9f',.64);circle(0,0,.075,'#ffbe9a');}
  }
}
