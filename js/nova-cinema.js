const tau=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const pick=(xs,i)=>xs[Math.min(xs.length-1,i)];
const blue='#77bbff', gold='#ffaf68', violet='#b28afa', white='#fbedd9', mint='#80ead8';

const maps={
  Earth:'sm/earth-day.jpg', Mercury:'planets/mercury.jpg', Venus:'planets/venus.jpg', Mars:'sm/mars.jpg',
  Jupiter:'planets/jupiter.jpg', Saturn:'planets/saturn.jpg', Uranus:'planets/uranus.jpg', Neptune:'planets/neptune.jpg',
};
const images=new Map();
function texture(name,src,onLoad){
  if(!images.has(name)){
    const image=new Image();image.addEventListener('load',onLoad,{once:true});image.src=new URL('../textures/'+src,import.meta.url).href;images.set(name,image);
  }
  const image=images.get(name);
  return image.complete&&image.naturalWidth?image:null;
}
export function drawCinema(canvas,chapter,part,n,time,yaw,pitch,onLoad){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(!w||!h)return;
  const ratio=Math.min(devicePixelRatio,1.5);
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
  }
  const g=canvas.getContext('2d');
  g.setTransform(ratio,0,0,ratio,0,0);
  g.fillStyle='#080e20';g.fillRect(0,0,w,h);
  let seed=1181+part*17;
  const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const narrow=w<720;
  const r=Math.min(w*(narrow?.47:.33),h*.43);
  g.translate(w*(narrow?.5:.68),h*(narrow?.65:.53));
  g.scale(r,r);
  function path(points,c,width=.008){
    g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=c;g.lineWidth=width;g.stroke();
  }
  function dot(x,y,r,c){
    if(r<=0)return;
    g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,tau);g.fill();
  }
  function glow(x,y,r,c,alpha=1){
    if(r<=0)return;
    const grad=g.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,c);grad.addColorStop(.28,c+'88');grad.addColorStop(1,c+'00');
    g.globalAlpha=alpha;dot(x,y,r,grad);g.globalAlpha=1;
  }
  function ring(x,y,r,c,flat=1,tilt=0){
    if(r<=0)return;
    g.beginPath();g.ellipse(x,y,r,r*flat,tilt,0,tau);g.strokeStyle=c;g.lineWidth=.008;g.stroke();
  }
  function text(x,y,s,c='#dce9fd'){
    g.font='.057px system-ui';g.fillStyle=c;g.textAlign='center';g.fillText(s,x,y);
  }
  function star(x,y,r,c){
    glow(x,y,r*3.8,c,.53);
    const grad=g.createRadialGradient(x-r*.26,y-r*.28,0,x,y,r);
    grad.addColorStop(0,'#fff9e3');grad.addColorStop(.48,c);grad.addColorStop(1,c+'40');
    dot(x,y,r,grad);
  }
  function planet(x,y,r,c){
    glow(x,y,r*1.12,c,.55);
    const grad=g.createRadialGradient(x-r*.49,y-r*.42,0,x,y,r*1.06);
    grad.addColorStop(0,c);grad.addColorStop(.67,'#244c81');grad.addColorStop(1,'#070c19');
    dot(x,y,r,grad);
    g.save();g.beginPath();g.arc(x,y,r*.98,0,tau);g.clip();
    for(let i=0;i<23;i++){
      const a=i*2.4+time*.18+n;
      if(c===blue)glow(x+Math.cos(a)*r*.81,y+Math.sin(a*1.7)*r*.8,r*(.24+i%4*.04),i%3?'#9ae4bc':'#d7edff',.45);
      else ring(x,y+(i-11)*r*.12,r,'#ffffff35',.11,.22);
    }
    g.restore();
  }
  function cloud(x,y,size,c,kind=0){
    for(let i=0;i<95;i++){
      const a=rand()*tau+time*.09+yaw,q=rand();
      const dx=kind===1?(i%3-1)*size*.54+Math.cos(a)*q*size*.23:Math.cos(a)*q*size;
      const dy=kind===2?Math.sin(dx*8+i%3)*size*.25:Math.sin(a)*q*size*(kind===1?1:.63);
      glow(x+dx,y+dy,size*(.09+rand()*.19),i%4?c:violet,.10+rand()*.22);
    }
  }
  function disk(x,y,r,c,flat=.28,phase=time,gap=-1){
    for(let i=0;i<300;i++){
      const a=rand()*tau+phase*.21, q=.18+rand()*.82;
      if(Math.abs(q-gap)<.08)continue;
      const shade=i%9?c:white;
      dot(x+Math.cos(a)*r*q,y+Math.sin(a)*r*q*flat,.002+rand()*.008,shade+'b0');
    }
    for(let i=0;i<9;i++){const q=.23+i*.081;if(Math.abs(q-gap)>.08)ring(x,y,r*q,c+'68',flat);}
  }
  function spiral(x,y,r,c,arms=3,flat=.58){
    glow(x,y,r*.72,white,.44);
    for(let i=0;i<190;i++){
      const q=rand(),a=i%arms*tau/arms+q*5.8+(rand()-.5)*.74+time*.035;
      dot(x+Math.cos(a)*r*q,y+Math.sin(a)*r*q*flat,.002+rand()*.008,i%5?c+'a0':white);
    }
  }
  function web(radius,radial){
    const nodes=Array.from({length:34},(_,i)=>{
      const a=i*2.39996, q=radial?.57+rand()*.34:Math.sqrt(rand())*.9;
      return [Math.cos(a)*q*radius,Math.sin(a)*q*radius*.82];
    });
    nodes.forEach(([x,y],i)=>{
      for(let j=i+1;j<nodes.length;j++){
        const [u,v]=nodes[j],d=Math.hypot(u-x,v-y);
        if(d>.36||d<.07)continue;
        path([[x,y],[(x+u)/2+.025,(y+v)/2-.025],[u,v]],radial?'#ff9d7868':'#a3bcfa55',.004);
      }
      glow(x,y,.052,i%3?blue:gold,.71);
    });
  }
  function arc(r,start,len,c,width=.021){
    g.beginPath();g.arc(0,0,r,start,start+len);g.lineWidth=width;g.strokeStyle=c;g.stroke();
  }
  function graph(curve,c){
    path([[-.81,-.53],[-.81,.54],[.79,.54]],'#9ebae38a');
    path(Array.from({length:61},(_,i)=>{const x=i/60;return [-.8+1.58*x,.47-curve(x)];}),c,.014);
    const q=clamp(n);glow(-.8+q*1.58,.47-curve(q),.075,white);
  }
  const tint=[violet,gold,blue,mint][part%4];
  glow(0,0,1.9,tint,.12);
  for(let i=0;i<240;i++){
    const x=(rand()-.5)*6.5,y=(rand()-.5)*4.7;
    dot(x+Math.sin(yaw)*.08,y+pitch*.035,.0015+rand()*.004,i%7===0?gold+'ad':'#bed8ff85');
  }
  g.translate(Math.sin(yaw)*.13,pitch*.06);

  function texturedPlanet(name,x,y,size){
    const image=texture(name,maps[name],onLoad);
    if(!image){planet(x,y,size,blue);return;}
    glow(x,y,size*1.17,blue,.35);
    if(name==='Saturn')ring(x,y,size*1.74,'#ead2aa',.36,-.28);
    g.save();g.beginPath();g.arc(x,y,size,0,tau);g.clip();
    g.drawImage(image,0,0,image.naturalWidth*.58,image.naturalHeight,x-size,y-size,size*2,size*2);
    const shade=g.createLinearGradient(x-size,y-size,x+size,y+size);
    shade.addColorStop(0,'#fff4cf36');shade.addColorStop(.47,'#090e2200');shade.addColorStop(1,'#03050cea');
    g.fillStyle=shade;g.fillRect(x-size,y-size,size*2,size*2);
    g.restore();
    if(name==='Saturn'){
      g.beginPath();g.ellipse(x,y,size*1.74,size*.62,-.28,0,Math.PI);
      g.strokeStyle='#ecd2a7';g.lineWidth=.016;g.stroke();
    }
  }
  function solarPullback(){
    const names=Object.keys(maps);
    const zoom=1.38-n*.72+Math.sin(time*.32)*.065;
    g.save();g.scale(zoom,zoom);g.translate(0,-.10+n*.08);
    star(0,-.1,.25,gold);glow(0,-.1,.84,gold,.22);
    const orbit={Mercury:[.31,.026],Venus:[.40,.044],Earth:[.53,.146],Mars:[.67,.039],
      Jupiter:[.83,.128],Saturn:[.99,.106],Uranus:[1.12,.056],Neptune:[1.24,.063]};
    const angles=[1.54,-1.83,-2.54,.45,-2.08,-.98,2.49,.87];
    const bodies=names.map((name,i)=>{
      const [distance,size]=orbit[name],a=angles[i]+time*.07/(i+1)+n*.85;
      ring(0,-.1,distance,'#b7cce235',.69,-.14);
      return {name,size,x:Math.cos(a)*distance,y:-.1+Math.sin(a)*distance*.69};
    }).sort((a,b)=>a.y-b.y);
    for(const b of bodies)texturedPlanet(b.name,b.x,b.y,b.size);
    g.restore();
  }
  function nebulaFlythrough(){
    const image=texture('carina','cosmic/carina.webp',onLoad);
    if(image){
      g.save();
      const zoom=1.32+n*1.54+Math.sin(time*.26)*.22;
      g.globalAlpha=.66;
      g.globalCompositeOperation='screen';
      g.filter='hue-rotate(24deg) saturate(0.85)';
      g.drawImage(image,-zoom*.73+yaw*.05,-zoom*.55,zoom*1.46,zoom*1.08);
      g.restore();
    }
    cloud(-.14,.10,.93+n*.43,violet,part===12?1:0);
    cloud(.30,-.19,.66+n*.37,blue);
    for(let i=0;i<100;i++){
      const a=rand()*tau,q=(rand()+time*.045)%1,d=.15+q*(1.02+n*.48);
      const x=Math.cos(a)*d,y=Math.sin(a)*d*.76;
      dot(x,y,.002+q*.009,i%11? '#b8d8ff99':'#ffdcbbe0');
    }
  }
  function lensJourney(){
    const offset=(1-n)*.37;
    function warp(x,z){
      const q=x*x+z*z;
      return [x+.37*z,z*.64+.16*Math.exp(-q*6)];
    }
    for(let i=-8;i<=8;i++){
      path(Array.from({length:25},(_,j)=>warp(i*.115,(j-12)*.077)),'#94a9ee50',.004);
      path(Array.from({length:25},(_,j)=>warp((j-12)*.082,i*.112)),'#94a9ee50',.004);
    }
    spiral(0,0,.43,violet,3,.69);
    glow(0,0,.26,gold,.58);
    const source=[offset,-.72],observer=[-.13,.71];
    for(const sign of [-1,1]){
      const pts=Array.from({length:47},(_,i)=>{
        const t=i/46;
        return [source[0]*(1-t)+observer[0]*t+sign*(.35+n*.16)*Math.sin(Math.PI*t),source[1]*(1-t)+observer[1]*t];
      });
      path(pts,'#b4cfff45',.043);path(pts,'#fff5df',.011);
      const [x,y]=pts[Math.floor(((time*.32+n*.38)%1)*46)];glow(x,y,.064,white);
    }
    star(...source,.038,white);text(source[0],-.82,'Distant galaxy');
    texturedPlanet('Earth',...observer,.048);text(observer[0],.86,'Observer');
    if(part===6||part===19){
      g.save();g.translate(.75,-.35);
      dot(0,0,.24,'#091630');ring(0,0,.24,'#9bbdff95');
      glow(0,0,.09,gold,.56);
      const spread=Math.min(tau,.8+n*5.5);
      arc(.16,-spread/2,spread,blue,.019);
      if(n<.94)arc(.16,2.81,.59+n*.72,mint,.013);
      text(0,.34,'Illustrated telescope view');
      g.restore();
    }
  }
  function merger(){
    const spread=.72*Math.pow(1-n,1.4);
    const a=time*(.55+n*2.2)+n*8;
    for(const sign of [-1,1]){
      const trail=Array.from({length:30},(_,i)=>{
        const t=i/29,angle=a-t*(1.35+n),r=spread+t*.14;
        return [sign*Math.cos(angle)*r,sign*Math.sin(angle)*r*.58];
      });
      path(trail,'#6cd4ffa0',.013);
      if(n<.88){
        const [x,y]=trail[0];glow(x,y,.20,'#64dbff',.93);dot(x,y,.052,'#050a14');ring(x,y,.063,blue);
        for(let i=0;i<20;i++){const q=trail[Math.min(i+2,29)];dot(q[0]+(rand()-.5)*.04,q[1]+(rand()-.5)*.04,.006,blue+'77');}
      }
    }
    if(n>.58){
      const phase=(n-.58)/.42;
      glow(0,0,.82*phase+.12,violet,Math.sin(phase*Math.PI)*.81);
      for(let i=0;i<5;i++)ring(0,0,.13+i*.10+phase*.48,violet+'8a',.56,-.18);
      if(n>=.88){glow(0,0,.28,blue,.58);dot(0,0,.091,'#03060e');ring(0,0,.102,blue);}
    }
  }
  function accretionFlyby(){
    const jetsOn=part===18, warped=part===20||part===21;
    const tilt=part===17?-.46+n*.85:-.38;
    const flatten=part===17?.19+n*.61:warped?.31:.43;
    const horizon=.17+n*.16;
    const outer=.96+n*.20;
    const silver=warped||part===17;
    const near=silver?'#e9efff':'#ff7153', far=silver?'#b8cdff':'#50bcff';
    g.save();g.rotate(tilt);
    glow(0,0,outer,far,.25);
    for(let i=0;i<47;i++){
      const q=horizon*1.36+(outer-horizon*1.36)*i/47;
      const phase=(i*.37+time*.47)%tau;
      for(const side of [-1,1]){
        const points=Array.from({length:38},(_,j)=>{
          const a=phase+j*.091+side*Math.PI*.5;
          const r=q+.011*Math.sin(a*9+i+time*2);
          return [Math.cos(a)*r,Math.sin(a)*r*flatten];
        });
        path(points,(side>0?near:far)+(i%3?'48':'88'),i%4?.005:.012);
      }
    }
    if(warped){
      const bent=Array.from({length:52},(_,i)=>{
        const a=Math.PI+i*Math.PI/51;
        return [Math.cos(a)*horizon*1.24,Math.sin(a)*horizon*1.29];
      });
      path(bent,far+'66',.071);path(bent,white,.017);
    }
    glow(0,0,horizon*1.52,far,.48);
    dot(0,0,horizon,'#020409');
    ring(0,0,horizon*1.03,silver?'#f2f4ff':near);
    if(part===21)ring(0,0,horizon*.66,blue+'da');
    if(jetsOn){
      for(const sign of [-1,1]){
        for(let i=0;i<38;i++){
          const q=(rand()+time*.38)%1,length=.28+n*.71;
          const x=(rand()-.5)*(.025+q*.21),y=sign*(.10+q*length);
          glow(x,y,.03+q*.023,i%3?blue:white,(1-q)*.65);
        }
        path([[0,sign*horizon],[0,sign*(.31+n*.68)]],far+'aa',.014);
      }
    }
    g.restore();
  }
  function galacticSweep(){
    const size=.97+n*.55;
    g.save();g.translate(.14-n*.32,.06);g.rotate(-.43+Math.sin(time*.15)*.16);
    glow(0,0,size*.85,blue,.24);
    glow(0,0,size*.46,gold,.68);
    for(let i=0;i<1200;i++){
      const arm=i%4,q=rand()**.72;
      const angle=arm*tau/4+q*5.65+(rand()-.5)*(.3+q*.47)+time*.04;
      const x=Math.cos(angle)*q*size,y=Math.sin(angle)*q*size*(.39+n*.33);
      const color=q<.23?'#ffd2a4':i%13===0?'#ed9472':i%7===0?'#e5f3ff':'#76bfff';
      dot(x,y,.001+rand()*.006,color+(i%4?'86':'cc'));
    }
    if(part===10){
      ring(0,0,size*.59,mint+'66',.39+n*.33);
      glow(Math.cos(n*tau)*size*.59,Math.sin(n*tau)*size*.59*(.39+n*.33),.063,gold,.82);
    }
    g.restore();
  }
  if(chapter==='black-holes'&&[15,16,17,18,20,21].includes(part)){accretionFlyby();return;}
  if(chapter==='universe'&&[8,9,10].includes(part)){galacticSweep();return;}
  if(chapter==='nebula'&&[0,7,8,10,12,22].includes(part)){nebulaFlythrough();return;}
  if((chapter==='universe'&&part===3)||(chapter==='planets'&&part===20)){solarPullback();return;}
  if(chapter==='lensing'&&[4,5,6,12,19,20].includes(part)){lensJourney();return;}
  if(chapter==='black-holes'&&part===19){merger();return;}

  if(chapter==='nebula'){
    if(part===1){
      for(const [x,count,name] of [[-.47,145,'Room air'],[.47,9,'Nebula']]){
        const size=.54*(x<0?1:1-n*.35);g.strokeStyle=blue;g.lineWidth=.009;g.strokeRect(x-size/2,-size/2,size,size);
        for(let i=0;i<count;i++)dot(x+(rand()-.5)*size,(rand()-.5)*size,.008,tint);
        text(x,.44,name);
      }
    }else if(part===2){
      path([[-.78,0],[.78,0]],'#91d5ed');
      for(let i=0;i<5;i++){const x=-.76+i*.38;path([[x,-.046],[x,.046]],blue);text(x,.15,i+' ly');}
      glow(-.76+1.52*((time*(.45-n*.40)+n)%1),0,.12,white);
    }else if(part===3){
      for(let i=0;i<2;i++){const x=(i-.5)*.95;ring(x,0,.24+n*.12,blue,.57,-.4);star(x,0,.065+i*.03,white);dot(x+Math.cos(time)*.24,Math.sin(time)*.12,.024,blue);text(x,.49,i?'Helium':'Hydrogen');}
    }else if(part===4){
      planet(0,0,.18,'#c4886e');for(let i=0;i<15+n*70;i++)dot((rand()-.5)*1.5,(rand()-.5)*1.1,.006+rand()*.014,white+'8a');
    }else if(part===5||part===6){
      cloud(0,0,.8,violet);g.fillStyle='#050710';g.globalAlpha=1-(part===6?n*.87:n*.2);g.beginPath();g.ellipse(0,0,.64,.34,-.25,0,tau);g.fill();g.globalAlpha=1;
      if(part===6)for(let i=0;i<7;i++)glow((rand()-.5), (rand()-.5)*.44,.08,white,n);
    }else if(part===12||part===13){
      cloud(0,0,.86+n*.24,part===12?gold:mint,part===12?1:2);
    }else if(part>=18&&part<=21){
      disk(0,0,.84,gold,.31,time*(.4+2*n));
      star(0,0,.12,white);
      if(part===20)for(const sign of [-1,1])path([[0,0],[.035,sign*(.28+n*.56)]],blue,.018+n*.07);
      if(part===21)cloud(0,0,.72,violet),glow(0,0,.28,gold,n);
    }else if(part===23){
      ring(0,0,.61,blue);for(let i=0;i<3;i++){const a=i*tau/3+n*tau;star(Math.cos(a)*.61,Math.sin(a)*.61,.085,[violet,gold,mint][i]);}text(0,0,'Cloud → star → cloud');
    }else{
      const c=part===9?pick(['#f17483','#62ddce','#d79077'],Math.floor(n*3)):part===7?blue:part===11?mint:part===0?violet:gold;
      cloud(0,0,part>=15&&part<=17?.86-n*.65:.75+n*.16,c);
      if([7,8,17,22].includes(part))for(let i=0;i<(part===22?5:1);i++) star(i?(rand()-.5)*.78:0,i?(rand()-.5)*.63:0,.055+n*.084,part===7?blue:white);
      if(part===14)ring(0,0,.16+n*.65,gold,.74);
      if(part===15)for(let i=0;i<8;i++){const a=i*tau/8;path([[Math.cos(a)*.68,Math.sin(a)*.68],[Math.cos(a)*(.43-n*.24),Math.sin(a)*(.43-n*.24)]],i%2?gold:blue,.02);}
    }
  }else if(chapter==='stars'){
    if(part===1){
      for(let i=0;i<4;i++){const a=i*tau/4;star(Math.cos(a)*(.58-.49*n),Math.sin(a)*(.49-.41*n),.085,blue);}
      if(n>.7)star(0,0,.17,gold);
    }else if([4,5,8].includes(part)){
      [gold,white,blue].forEach((c,i)=>star((i-1)*.55,0,.12+i*(.035+n*.052),c));
    }else if(part===9||part===20){
      for(let i=0;i<55;i++){const x=rand()*1.37-.68;dot(x,part===9?.48*x+(rand()-.5)*.27:(i%6-2.5)*.16,.012+(i%5===0?.012:0),[gold,white,blue][i%3]);}
      glow(-.65+n*1.3,.46*(-.65+n*1.3),.13,white);
    }else if([13,14,18,21,22,23].includes(part)){
      cloud(0,0,.32+n*.57,part===22?violet:gold);
      for(let i=0;i<4;i++)ring(0,0,.17+n*.63+i*.038,gold+'90',.84);
      star(0,0,part===14?.09:.14,part===18?white:blue);
    }else if(part===19){
      star(-.37,0,.085+n*.03,blue);glow(.39,0,.31+n*.14,gold);dot(.39,0,.15+n*.09,'#030408');
      text(-.37,.47,'Neutron star');text(.39,.47,'Black hole');
    }else{
      const size=part===17?.48-n*.35:part===11?.19+n*.49:.26+n*.19;
      star(0,0,size,part===6||part===11?gold:part===4?blue:'#ffaf57');
      if([3,15,16].includes(part)){
        g.save();g.beginPath();g.rect(0,-.7,.7,1.4);g.clip();
        for(let i=0;i<4;i++)dot(0,0,size*(1-i*.23),['#ac4943','#ff8352','#faca67',part===16?'#a7abb4':'#fff3a3'][i]);
        g.restore();
      }
      if(part===2)for(let i=0;i<8;i++){const a=i*tau/8;path([[Math.cos(a)*.65,Math.sin(a)*.65],[Math.cos(a)*(.39+n*.1),Math.sin(a)*(.39+n*.1)]],i%2?blue:gold,.024);}
      if([6,7,8,10,12].includes(part)){path([[-.64,.65],[.64,.65]],blue+'83');glow(-.64+n*1.28,.65,.073,white);}
    }
  }else if(chapter==='planets'){
    if(part>=5&&part<=11){
      const count=part===5?2:12, sizes=.035+n*.062;
      for(let i=0;i<count;i++){
        const a=i*2.4+time*.4, distance=part===5?.46-n*.37:.25+rand()*.57;
        planet(Math.cos(a)*distance,Math.sin(a)*distance*.57,sizes*(1+i%4*.35),i%2?gold:'#c89b87');
      }
      if(part>=9)planet(0,0,.07+n*.21,mint);
    }else if(part===16||part===21||part===22){
      for(let i=0;i<2;i++){const x=(i-.5)*.92;
        if(part===16)planet(x,0,.13+i*.1+n*.066,i?gold:blue);
        else{disk(x,0,.37,gold,i?.43:.29,time+n);star(x,0,.072,i?blue:gold);planet(x+(i?.24:.15)+n*.05,.08,.045+i*.016,i?mint:blue);}
      }
    }else{
      const gap=part===17?.48+n*.2:part===3?.55:-1;
      disk(0,0,.91,part===1?blue:gold,part===3?.72:.34,time*(.5+n*2),gap);
      star(0,0,.12,white);
      if(part===1||part===13||part===23)ring(0,0,.39+n*.24,part===23?mint:blue,.34);
      const count=part===20?8:part>=11?3:1;
      for(let i=0;i<count;i++){
        const q=.26+i*.075+(part===18?(.43-n*.32):part===23?n*.36:.06),a=i*2.1+time*.11;
        planet(Math.cos(a)*q,Math.sin(a)*q*.34,part===15?.09+n*.14:.027+i*.012,[gold,blue,mint][i%3]);
      }
    }
  }else if(chapter==='black-holes'){
    const radius=.16+n*.17;
    if(part===0||part===1){
      for(let i=0;i<5;i++){const q=.28+i*.12,a=time*(1+n)/(i+1)+i;ring(0,0,q,blue+'68',.62,i*.28);star(Math.cos(a)*q,Math.sin(a)*q*.62,.024,white);}
      dot(0,0,.095,'#020309');
    }else if(part===22){
      for(const [x,caption] of [[-.45,'M87*'],[.45,'Sagittarius A*']]){glow(x,0,.38,gold);dot(x,0,.17,'#080607');ring(x,0,.185,gold);text(x,.49,caption);}
    }else if(part===13){
      for(const [x,factor] of [[-.46,1-n*.85],[.46,1]]){ring(x,0,.24,blue);const a=time*factor+n*3;path([[x,0],[x+Math.sin(a)*.18,-Math.cos(a)*.18]],white,.016);text(x,.4,x<0?'Near':'Far');}
    }else if(part===3||part===4||part===10||part===14){
      dot(0,0,radius,'#020309');ring(0,0,radius,blue);
      if(part===14){g.beginPath();g.ellipse(.61-n*.43,.17,.07+n*.2,.078-n*.056,-.28,0,tau);g.fillStyle=white;g.fill();}
      else path([[-.68,-.22],[.02-n*.26,-.62+n*.58],[.58-n*.22,.12+n*.1]],gold,.017);
    }else{
      if([2,5,6].includes(part))star(-.47,0,.24-n*.16,gold);
      if(part===9)spiral(0,0,.9,violet,4);
      if(part>=15||part===8)disk(0,0,.83,gold,.18+n*.27,time*(1+n));
      glow(0,0,radius*2.1,gold,.62);dot(0,0,radius,'#020307');
      ring(0,0,radius+.026,gold);
      if(part===18)for(const s of [-1,1])path([[0,0],[.045,s*(.35+n*.52)]],blue,.025);
      if(part===21)ring(0,0,radius*.62,blue);
      if(part===11){path([[-radius,.53],[radius,.53]],white);text(0,.65,'Relative horizon size');}
      if(part===12||part===23)text(0,0,'?');
    }
  }else if(chapter==='lensing'){
    const offset=(1-n)*.46;
    if(part===0){
      const cx=-.46+n*.92;
      for(let j=-4;j<=4;j++)path(Array.from({length:31},(_,i)=>{const x=i/16-.94;return [x,j*.105+.22*Math.exp(-((x-cx)**2)*8)*(1-Math.abs(j)*.12)];}),blue+'79');
      planet(cx,.06,.185,blue);
    }else if(part===13||part===14){
      graph(x=>.17+.61*Math.exp(-((x-.5)**2)*36)+(part===14?.23*Math.exp(-((x-.63)**2)*780):0),mint);
    }else if([1,2,3,4,5,12,19].includes(part)){
      star(-.69,-offset,.07,gold);planet(0,0,.15,blue);text(.67,.27,'Observer');
      for(const s of [-1,1])path([[-.69,-offset],[-.32,s*(.28+n*.16)],[.02,s*(.21+n*.22)],[.67,0]],s<0?blue:violet,.014);
      glow(.67,0,.083,white);
    }else if(part===7){
      spiral(0,0,.35,gold,2);
      for(let i=0;i<4;i++){const a=i*tau/4;star(Math.cos(a)*(.43+n*.09),Math.sin(a)*(.44-n*.07),.047,blue);}
    }else if(part>=15&&part<=17){
      spiral(-.56+n*.72,-.18,.36,gold);spiral(.51-n*.73,.25,.36,blue);web(.74,false);
    }else{
      const r=.36+n*.26;
      spiral(0,0,.3,gold,2);
      if(part===6&&n>.94)arc(r,0,tau,blue,.032);
      else{arc(r,-.52-offset,1+n*2,blue,.028);arc(r,2.71,1.25+n*1.3,violet,.02);}
      if(part===21)text(0,.74,pick(['Mass','Dark matter','Early galaxies','Expansion'],Math.floor(n*4)));
    }
  }else{
    if(part===20||part===22||part===23){
      g.save();const shrink=part===23?1-n*.78:.88+n*.12;g.scale(shrink,shrink);
      web(.84,false);web(1.05,true);
      for(let i=0;i<5;i++)ring(0,0,.25+i*.174,i>2?'#ed946d71':'#a4c9ff4a',.88);
      for(let i=0;i<7;i++){const a=i*2.39996,q=.26+i*.076;spiral(Math.cos(a)*q,Math.sin(a)*q*.82,.09+i*.009,i%2?blue:gold);}
      star(0,0,.036,gold);g.restore();
      if(part===23&&n>.63)planet(0,0,(n-.63)*.79,blue);
    }else if(part===21){
      glow(0,0,.86,gold,.61);dot(0,0,.66,'#753a25');
      for(let i=0;i<110;i++){const a=rand()*tau,q=Math.sqrt(rand())*.63;glow(Math.cos(a)*q,Math.sin(a)*q,.071,i%3?gold:violet,.16+n*.7);}
    }else if(part>=15){
      if(part===17)web(.94,false);
      else for(let i=0;i<(part===18?8+n*28:14);i++)spiral((rand()-.5)*1.66,(rand()-.5)*1.2,.041+rand()*.048,i%3?blue:gold);
      if(part===19){path([[-.65,.6],[.65,.6]],blue);glow(-.65+n*1.3,.6,.077,white);}
    }else if(part>=8){
      spiral(part>=12?-.35:0,0,.73-n*.12,blue,4);
      if(part>=12)spiral(.72-n*.38,.14,.36,gold,2,.47);
      if(part===10||part===8){ring(0,0,.43,blue,.59);glow(Math.cos(n*tau)*.43,Math.sin(n*tau)*.252,.069,gold);}
      if(part===11){dot(0,0,.088,'#010203');ring(0,0,.12,gold);}
    }else if(part===7){
      cloud(0,0,.83+n*.16,violet);star(.18,-.07,.07,blue);
    }else if(part>=5){
      star(-.52,0,.14,gold);star(.51,0,.056,'#f47c63');path([[-.43,.2],[.45,.2]],blue);text(0,.37,part===5?'About 4.24 light-years':'Solar neighborhood');
      if(part===6)for(let i=0;i<10;i++)star((rand()-.5)*1.55,(rand()-.5)*1.03,.026,blue);
    }else if(part>=2){
      star(0,0,.18+n*.07,gold);
      for(let i=0;i<(part===2?1:8);i++){const q=.27+i*.082,a=i*2.41+time*.13+n*.65;ring(0,0,q,blue+'65',.58);planet(Math.cos(a)*q,Math.sin(a)*q*.58,.026+i*.004,i%2?gold:blue);}
      if(part===4){ring(0,0,.91,mint,.78);glow(.39+n*.59,-.13,.049,white);}
    }else{
      planet(part===1?-.36:0,0,.44-n*.20,blue);
      if(part===1){planet(.57,-.12,.117,'#ab9b88');glow(-.17+.64*((time*(.44-n*.38)+n)%1),-.08,.057,white);text(0,.58,'384,400 km average');}
    }
  }
}
