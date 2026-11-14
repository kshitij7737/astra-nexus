import * as T from '../vendor/three.module.min.js';
import { lensState } from './cosmic-data.js?v=4';

const TAU = Math.PI * 2;
const V = (x, y, z) => new T.Vector3(x, y, z);
function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const noise = `
  float hash(vec3 p) { p = fract(p*.3183099 + vec3(.1,.21,.33)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 p) {
    vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p) { return .56*noise(p)+.27*noise(p*2.1)+.12*noise(p*4.4)+.05*noise(p*9.1); }
`;
const vertex = `
  varying vec3 local;
  void main(){ local=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`;
const linearize = '\n#include <colorspace_fragment>\n';

function cloud(colors, { shell = 0, density = 1, lite = false } = {}) {
  const mesh = new T.Mesh(new T.BoxGeometry(2, 2, 2), new T.ShaderMaterial({
    side: T.BackSide, transparent: true, depthWrite: false, premultipliedAlpha: true,
    uniforms: {
      eye: { value: V(0, 0, 0) }, a: { value: new T.Color(colors[0]) }, b: { value: new T.Color(colors[1]) },
      c: { value: new T.Color(colors[2]) }, time: { value: 0 }, density: { value: density }, shell: { value: shell },
    },
    vertexShader: vertex,
    fragmentShader: `
      varying vec3 local;
      uniform vec3 eye,a,b,c;
      uniform float time,density,shell;
      ${noise}
      void main(){
        vec3 d=normalize(local-eye);
        vec3 safe=sign(d+vec3(.000001))*max(abs(d),vec3(.00001));
        vec3 lo=(-1.-eye)/safe,hi=(1.-eye)/safe;
        vec3 entry=min(lo,hi),leave=max(lo,hi);
        float start=max(0.,max(entry.x,max(entry.y,entry.z)));
        float end=min(leave.x,min(leave.y,leave.z));
        if(end<=start) discard;
        const int samples=${lite ? 22 : 42};
        float stepSize=(end-start)/float(samples);
        vec4 sum=vec4(0.);
        for(int i=0;i<samples;i++){
          vec3 p=eye+d*(start+(float(i)+.47)*stepSize);
          vec3 q=p*vec3(2.8,4.1,3.1)+vec3(time*.018,2.,-time*.013);
          float n=fbm(q+vec3(noise(q*.7),noise(q*.83),0.)*1.3);
          float r=length(p);
          float envelope=1.-smoothstep(.16,1.01,length(p*vec3(.82,1.15,1.)));
          float grain=noise(q*13.0);
          float warp=fbm(q*.54+vec3(2.,4.,3.));
          float edge=p.y+.15+.24*sin(p.x*4.5)+.48*(warp-.5)+.19*(n-.5);
          float dust=(1.-smoothstep(.032,.23,abs(edge)))*smoothstep(.21,.55,warp);
          float ridge=smoothstep(.45,.68,n)*envelope*(.56+.72*grain);
          float wall=exp(-abs(edge+.17)*8.)*envelope*smoothstep(.32,.58,n);
          float body=max(0.,n-.32)*envelope*2.7+wall*.87;
          if(shell>.5){
            float band=exp(-abs(r-(.59+.22*(n-.5)))*(shell>1.5?21.:15.));
            body=band*envelope*(shell>1.5?pow(n,2.3)*4.:.37+n);
            dust*=.15;
            ridge=band*pow(n,2.)*1.8;
          }
          float light=exp(-4.7*length(p-vec3(.22,.06,-.11)))*.93;
          vec3 color=mix(a,b,clamp(n*.7+ridge*.55,0.,1.));
          color=mix(color,c,clamp(light+ridge*.5+wall*.43,0.,1.));
          color*=(.64+grain*.39)*(1.-.94*dust);
          float alpha=1.-exp(-body*stepSize*density*(1.+dust*1.4));
          sum.rgb+=(1.-sum.a)*color*alpha;
          sum.a+=(1.-sum.a)*alpha;
          if(sum.a>.99) break;
        }
        if(sum.a<.002) discard;
        gl_FragColor=vec4(sum.rgb/sum.a,sum.a);
        ${linearize}
        gl_FragColor.rgb*=gl_FragColor.a;
      }
    `,
  }));
  const inverse = new T.Matrix4();
  mesh.onBeforeRender = (_, __, camera) => {
    inverse.copy(mesh.matrixWorld).invert();
    mesh.material.uniforms.eye.value.copy(camera.position).applyMatrix4(inverse);
  };
  return mesh;
}

function pointField(points, size = 2) {
  const geometry = new T.BufferGeometry();
  const positions = [], colors = [], sizes = [];
  for (const [x,y,z,tint,scale] of points) {
    positions.push(x,y,z);
    new T.Color(tint).toArray(colors, colors.length);
    sizes.push(scale);
  }
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('weight', new T.Float32BufferAttribute(sizes, 1));
  return new T.Points(geometry, new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true,
    uniforms: { size: { value: size } },
    vertexShader: `
      uniform float size; attribute float weight; varying vec3 tint;
      void main(){ tint=color; vec4 v=modelViewMatrix*vec4(position,1.);
      gl_PointSize=clamp(size*weight*28./max(3.,-v.z),.8,22.); gl_Position=projectionMatrix*v; }`,
    fragmentShader: `
      varying vec3 tint;
      void main(){ float r=length(gl_PointCoord-.5); if(r>.5) discard;
      float core=exp(-r*r*28.); gl_FragColor=vec4(tint,core*(1.-smoothstep(.36,.5,r))); ${linearize} }`,
  }));
}
function starField(lite) {
  const rng = random(71), points = [];
  for (let i = 0; i < (lite ? 630 : 1500); i++) {
    const a = rng()*TAU, z = rng()*2-1, r = 18+rng()*68, xy = Math.sqrt(1-z*z);
    points.push([r*xy*Math.cos(a), r*z, r*xy*Math.sin(a), i%5 ? '#b4d0f6' : '#ffd4aa', 0.25+Math.pow(rng(), 6)*1.8]);
  }
  return pointField(points, 2.8);
}

function glow(color, radius, opacity = .65) {
  const material = new T.ShaderMaterial({
    transparent:true, depthWrite:false, blending:T.AdditiveBlending,
    uniforms:{tint:{value:new T.Color(color)},opacity:{value:opacity}},
    vertexShader:`varying vec2 st; void main(){ st=uv; vec4 p=modelViewMatrix*vec4(0.,0.,0.,1.); p.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); gl_Position=projectionMatrix*p; }`,
    fragmentShader:`varying vec2 st; uniform vec3 tint; uniform float opacity;
      void main(){float r=length(st-.5)*2.; gl_FragColor=vec4(tint,exp(-r*r*5.)*(1.-smoothstep(.55,1.,r))*opacity); ${linearize} }`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(radius*2,radius*2),material);
  mesh.frustumCulled = false;
  return mesh;
}
function star(radius, color, cutaway = false) {
  const group = new T.Group();
  const body = new T.Mesh(new T.SphereGeometry(radius, 42, 28), new T.ShaderMaterial({
    uniforms: { tint: { value: new T.Color(color) }, time: { value: 0 }, cutaway: { value: cutaway } },
    vertexShader: `varying vec3 p,n,v;void main(){p=normalize(position);n=normalize(normalMatrix*normal);vec4 m=modelViewMatrix*vec4(position,1.);v=normalize(-m.xyz);gl_Position=projectionMatrix*m;}`,
    fragmentShader: `uniform vec3 tint; uniform float time; uniform bool cutaway; varying vec3 p,n,v;
    ${noise}
    void main(){if(cutaway && p.z>0. && p.x>.0) discard; float d=max(0.,dot(normalize(n),normalize(v))); float cell=fbm(p*32.+vec3(time*.04,0.,0.));
      float pores=pow(noise(p*79.),3.); float light=(.45+.55*pow(d,.44))*(.73+.7*cell-.32*pores);
      gl_FragColor=vec4(mix(tint,vec3(1.,.96,.82),.34*d)*light*1.45,1.); ${linearize} }`,
  }));
  group.add(body, glow(color, radius*2.5));
  if(cutaway){
    for(const [r,tint] of [[.80,'#ef8b57'],[.59,'#ffc578'],[.28,'#fff2ce']]){
      const surface = new T.Mesh(new T.SphereGeometry(radius*r,32,22),new T.MeshBasicMaterial({color:tint}));
      group.add(surface);
    }
  }
  return group;
}

function disk(inner, outer, hot, cold, opacity = .9, relativistic = false) {
  const mesh = new T.Mesh(new T.PlaneGeometry(2,2), new T.ShaderMaterial({
    side:T.DoubleSide, transparent:true, depthWrite:false,
    uniforms:{ inner:{value:inner/outer}, hot:{value:new T.Color(hot)}, cold:{value:new T.Color(cold)}, opacity:{value:opacity}, time:{value:0}, relativistic:{value:relativistic} },
    vertexShader:vertex,
    fragmentShader:`
      varying vec3 local; uniform float inner,opacity,time; uniform vec3 hot,cold; uniform bool relativistic;
      ${noise}
      void main(){
        float r=length(local.xy),angle=atan(local.y,local.x);
        if(r<inner||r>1.) discard;
        float gap=smoothstep(inner,inner+.055,r)*(1.-smoothstep(.78,1.,r));
        float spiral=angle+4.7*log(r+.07)-time*.035/pow(r+.14,1.25);
        vec3 flow=vec3(cos(spiral)*4.,sin(spiral)*4.,r*38.);
        float fil=fbm(flow);
        float grit=noise(flow*6.1);
        float bands=.71+.22*sin(r*101.+fil*7.+grit);
        float temp=1.-smoothstep(inner,1.,r);
        vec3 tint=mix(cold,hot,pow(temp,2.2));
        float alpha=gap*opacity*(.2+.8*fil)*bands;
        if(relativistic){
          float beam=.45+.75*pow(.5+.5*cos(angle+.8),1.7);
          tint=mix(tint,vec3(1.,.78,.49),beam*temp*.42)*beam;
          alpha*=.42+temp*.63;
        }
        tint*=.47+fil*1.52+grit*.29;
        gl_FragColor=vec4(tint,alpha); ${linearize}
      }`,
  }));
  mesh.rotation.x=-Math.PI/2;
  mesh.scale.setScalar(outer);
  return mesh;
}

function line(points, color = '#a9d2f7', opacity = .55, loop = false) {
  const geometry = new T.BufferGeometry().setFromPoints(points);
  const material = new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});
  return loop ? new T.LineLoop(geometry,material) : new T.Line(geometry,material);
}
function ring(radius, color, opacity=.45, flatten=1) {
  return line(Array.from({length:100},(_,i)=>V(radius*Math.cos(i*TAU/100),0,flatten*radius*Math.sin(i*TAU/100))),color,opacity,true);
}
function sphere(radius, color, options = {}) {
  return new T.Mesh(new T.SphereGeometry(radius,40,26),new T.MeshStandardMaterial({color,roughness:.88,...options}));
}
function rock(radius, color, seed) {
  const rng=random(seed), geom = new T.IcosahedronGeometry(radius,2);
  const p=geom.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const scale=1+.12*Math.sin(x/radius*6+y/radius*8)*Math.cos(z/radius*10)+.06*Math.cos((x+y+z)/radius*17);
    p.setXYZ(i,x*scale,y*scale,z*scale);
  }
  geom.computeVertexNormals();
  const m = new T.Mesh(geom,new T.MeshStandardMaterial({color,roughness:.94,flatShading:true}));
  m.rotation.set(rng(),rng(),rng()); return m;
}
function jets(group, length=4, tint='#7fe7ff') {
  const rng=random(420), points=[];
  for(let i=0;i<430;i++){
    const h=rng()*length, angle=rng()*TAU, r=(.03+h*.039)*rng();
    points.push([r*Math.cos(angle),h*(i%2?1:-1),r*Math.sin(angle),tint,.5+rng()]);
  }
  group.add(pointField(points,1.6));
}
function dust(count, seed, inner, outer, height, colors) {
  const rng=random(seed), points=[];
  for(let i=0;i<count;i++){
    const a=rng()*TAU, r=inner+(outer-inner)*Math.sqrt(rng());
    points.push([r*Math.cos(a),(rng()-.5)*height,r*Math.sin(a),colors[i%colors.length],.32+rng()*.85]);
  }
  return pointField(points,1.9);
}
function arrows() {
  const group=new T.Group();
  for(let i=0;i<8;i++){
    const a=i*TAU/8, d=V(Math.cos(a),0,Math.sin(a));
    group.add(new T.ArrowHelper(d.clone().negate(),d.clone().multiplyScalar(2.6),.65,0x8ce4ff,.16,.12));
    group.add(new T.ArrowHelper(d,d.clone().multiplyScalar(1.3),.48,0xffb383,.14,.1));
  }
  return group;
}
function nebula(group, beat, state, lite, stellar=false) {
  const remnant=stellar ? beat===5 : beat===2;
  const massive=state.branch==='massive';
  const base=stellar ? ['#17464f','#5fbea2','#ffe3a4'] : ['#32386e','#c376c4','#ffbd8a'];
  const palette=state.infrared ? ['#3b296f','#d17777','#ffeec0'] : base;
  if(remnant){
    const shell=cloud(massive ? ['#40386e','#e16187','#ffd6a4'] : ['#254d76','#76d4cf','#ffe1a5'],{shell:massive?2:1,density:4.2,lite});
    shell.scale.set(massive?4.7:3.7,massive?3.5:3.1,3.6);
    shell.rotation.z=massive?.37:-.15;
    group.add(shell,star(massive?.15:.19,'#d3eaff'));
    if(massive) group.add(dust(lite?270:610,514,1.9,4.9,2.7,['#e56b87','#a293e2','#ffd1a1']));
    return;
  }
  const central=stellar && beat>=3;
  if(!central){
    const volume=cloud(palette,{density:beat===3?5.8:4.9,lite});
    volume.scale.set(6.8,4.3,4.5);
    volume.rotation.z=-.23;
    group.add(volume);
    const tracers=dust(lite?200:460,71,.4,6.2,3.1,[palette[1],palette[2]]);
    tracers.rotation.z=.36;
    group.add(tracers);
  }
  if(central){
    const giant=beat===4;
    group.add(star(giant?(massive?2.24:1.87):1.48,giant?'#ff6847':massive?'#a3d8ff':'#ffd98b',state.cutaway&&!giant));
    if(state.forces && !giant) group.add(arrows());
  }else if((stellar && beat>=1)||(!stellar && beat>=3)){
    const radius=beat<2&&stellar?.25:.49;
    const core=new T.Group();
    core.add(star(radius,'#ffce7b'),disk(radius*1.18,beat===5?2.8:3.2,'#ffd18c','#8750b8',.92));
    group.add(core);
    if(stellar && beat===1) return t=>core.scale.setScalar(.72+.72*Math.exp(-t*.32));
    if((stellar && beat===2)||(!stellar && beat>=4)) jets(group,3.8);
  }else{
    for(const [x,y,z,r] of [[-2.6,.9,-1,.05],[2.3,.42,-1.7,.07],[.2,1.9,-1.6,.047]]){
      const s=star(r,'#fff1d2');s.position.set(x,y,z);group.add(s);
    }
  }
}

function planets(group, beat, state, lite) {
  if(beat===2){
    const debris = new T.Group();
    const rng = random(14);
    for(let i=0;i<27;i++){
      const fragment=rock(.055+rng()*.15,i%2?'#cda58d':'#91babf',i);
      fragment.position.set((rng()-.5)*3,(rng()-.5)*2,(rng()-.5)*2.4);
      debris.add(fragment);
    }
    group.add(debris);
    const grains=[rock(.68,'#b37f64',8),rock(.50,'#8fa4bd',31)];
    const aggregate = new T.Group();
    const joined = [rock(.68,'#b37f64',8),rock(.50,'#8fa4bd',31)];
    joined[0].position.x=-.42; joined[1].position.x=.39;
    aggregate.add(...joined);
    group.add(...grains,aggregate);
    return t=>{
      if(state.still)t=5.2;
      const contact=2.6, approach=T.MathUtils.smoothstep(t,0,contact);
      const retreat=T.MathUtils.smoothstep(t,contact,5.2);
      const result=state.collision;
      const after=t>=contact;
      grains[0].position.x=-1.7+1.24*approach-1.20*retreat;
      grains[1].position.x=1.51-1.07*approach+1.20*retreat;
      grains.forEach(grain=>{grain.visible=!after||result==='bounce';});
      aggregate.visible=after&&result==='stick';
      aggregate.rotation.y=Math.max(0,t-contact)*.09;
      debris.visible=result==='fragment'&&after;
      debris.rotation.y=t*.054;
      debris.scale.setScalar(.18+1.04*retreat);
    };
  }
  group.add(star(.72,'#ffd394'));
  if(beat<5){
    group.add(disk(.83,6.9,'#ffc283','#648fe0',.88));
    for(const y of [-.21,.23]){
      const gas=disk(1.1,7.1,'#d7a3c4','#68cbbb',.30); gas.position.y=y; group.add(gas);
    }
    group.add(dust(lite?450:1050,31,1,7,.46,['#b8aee8','#c8f0e4','#ffbe90']));
  }
  if(state.thermal||beat===1){
    const ice=ring(3.8,'#b8ffed',.82);ice.position.y=.24;group.add(ice);
  }
  if(beat>=3){
    const worlds=[], count=beat===3?11:state.system==='rocky'?7:5;
    for(let i=0;i<count;i++){
      const r=1.24+i*(5.5/count), angle=i*2.4;
      const body=beat===3 ? rock(.10+i*.01,i%2?'#b29a91':'#a0c5ce',i) :
        i>2&&state.system==='mixed' ? stripedPlanet(.31+i*.045,i) : rock(.16+i*.027,'#b39481',i);
      group.add(body);
      if(state.paths){
        const track=ring(r,'#8cbed0',.30,.83+i%3*.035);track.rotation.z=(i%3-1)*.045;group.add(track);
      }
      worlds.push([body,r,angle]);
    }
    return t=>worlds.forEach(([body,r,a],i)=>{
      const phase=a+t*.25/Math.sqrt(r*r*r);
      body.position.set(r*Math.cos(phase),.16*Math.sin(phase+i),r*(.83+i%3*.035)*Math.sin(phase));
      body.rotation.y=t*.17;
    });
  }
}
function stripedPlanet(radius, seed) {
  const body=sphere(radius,'#c29a7c');
  const colors=['#d2a47e','#997990','#e3c49d','#c99c85'];
  const a=new T.Color(colors[seed%4]),b=new T.Color(colors[(seed+2)%4]);
  body.material.onBeforeCompile=shader=>{
    shader.uniforms.stripeA={value:a}; shader.uniforms.stripeB={value:b};
    shader.vertexShader='varying vec3 stripePos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstripePos=normalize(position);');
    shader.fragmentShader='varying vec3 stripePos; uniform vec3 stripeA,stripeB;\n'+noise.replaceAll('noise','nexusNoise').replaceAll('hash','nexusHash')+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float stripe=.5+.5*sin(stripePos.y*35.+3.*nexusNoise(stripePos*9.));
      diffuseColor.rgb=mix(stripeA,stripeB,stripe);`);
  };
  return body;
}

function arc(radius, start, length, color, width=.026, stretch=1) {
  const points=Array.from({length:65},(_,i)=>{
    const a=start+length*i/64;
    return V(radius*Math.cos(a),radius*Math.sin(a)*stretch,0);
  });
  const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,width,6),
    new T.MeshBasicMaterial({color,transparent:true,opacity:.82,depthWrite:false}));
  return mesh;
}
function blackHole(group, beat, state) {
  if(beat===1){
    const precursor=star(1.7,'#ff7849');group.add(precursor);
    return t=>precursor.scale.setScalar(1-.49*(1-Math.exp(-t*.4)));
  }
  if(beat===5&&state.binary){
    const pair=[.46,.63].map(r=>new T.Mesh(new T.SphereGeometry(r,40,26),new T.MeshBasicMaterial({color:'#080c18'})));
    pair.forEach((body,i)=>{
      body.add(disk(.49,1.4+i*.24,'#ffc182','#79508d'));
      group.add(body);
    });
    const samples=Array.from({length:210},(_,i)=>{
      const x=i/209, a=x<.8?Math.pow(x,2.1):.63*Math.exp(-(x-.8)*15);
      return V((x-.5)*8,-2.2+Math.sin(8*x+97*x*x)*a*.68,.2);
    });
    group.add(line(samples,'#9af3ff',.9));
    const finalShadow=new T.Mesh(new T.SphereGeometry(.76,40,28),new T.MeshBasicMaterial({color:'#080c18'}));
    finalShadow.add(disk(.97,1.95,'#ffc182','#79508d',.42));
    group.add(finalShadow);
    return t=>{
      const merge=6.1, progress=T.MathUtils.clamp(t/merge,0,1);
      const a=t*.35+5*progress**3, r=.36+1.3*(1-progress);
      pair.forEach((b,i)=>{
        b.visible=t<merge;
        b.position.set(Math.cos(a+i*Math.PI)*r,.2,Math.sin(a+i*Math.PI)*r);
      });
      finalShadow.visible=t>=merge;
    };
  }
  const radius=state.mass==='supermassive'?1.06:.66;
  const shadow=new T.Mesh(new T.SphereGeometry(radius,48,30),new T.MeshBasicMaterial({color:'#080a14'}));
  group.add(shadow);
  if(beat>=3){
    group.add(disk(radius*1.26,4.45,'#fff1c7','#a13f24',.98,true));
    if(beat===4 || state.evidence==='light'){
      const image=new T.Group();
      for(const [r,from,length,tint,width,height,opacity] of [
        [1.44,.09,Math.PI-.18,'#ffb45f',.10,1.05,.31],
        [1.43,.15,Math.PI-.30,'#ffe0ac',.028,1.05,.91],
        [1.61,.21,Math.PI-.42,'#d45f37',.045,1.06,.52],
        [1.43,Math.PI+.20,Math.PI-.40,'#f7874f',.041,.76,.62],
      ]){
        const band=arc(radius*r,from,length,tint,width,height);
        band.material.opacity=opacity;image.add(band);
      }
      group.add(image);
      image.userData.faceCamera=true;
    }
    if(beat===4&&state.trace){
      const paths=new T.Group();
      paths.add(line([V(radius*1.2,-.15,.3),V(3,-.55,.3)],'#f5c697',.84),
        line(new T.CatmullRomCurve3([V(-2,-.34,.36),V(-radius,.45,.36),V(0,radius*1.4,.36),V(2.9,.54,.36)]).getPoints(32),'#a6d8fa',.84));
      paths.userData.faceCamera=true;
      group.add(paths);
    }
    if(state.jets) jets(group,4.3);
  }
  if(beat===2){
    const dashed=[];
    for(let i=0;i<34;i++){
      const a=i*TAU/34,b=a+.085,r=radius*.55;
      dashed.push(V(r*Math.cos(a),0,r*Math.sin(a)),V(r*Math.cos(b),0,r*Math.sin(b)));
    }
    const guide=new T.LineSegments(new T.BufferGeometry().setFromPoints(dashed),new T.LineBasicMaterial({
      color:state.feature==='horizon'?'#d6f4ff':'#84bbce',opacity:.74,transparent:true,depthTest:false,depthWrite:false,
    }));
    guide.renderOrder=2;
    guide.rotation.x=.3;
    group.add(guide);
    if(state.feature==='shadow'){
      const outline=arc(radius*1.05,0,TAU,'#d9bcff',.018);
      outline.userData.faceCamera=true;group.add(outline);
    }
  }
  if(beat===0 || state.evidence==='orbits'){
    const stars=[];
    for(let i=0;i<5;i++){
      const route=ring(1.8+i*.57,'#99bce3',.36,.60+i*.07);route.rotation.x=(i-2)*.16;route.rotation.z=i*.42;
      const tracer=star(.052,'#e1edff');route.add(tracer);group.add(route);stars.push([route,tracer]);
    }
    return t=>stars.forEach(([route,tracer],i)=>{
      const r=1.8+i*.57,a=i*1.7+t*.48/(i+1);
      tracer.position.set(r*Math.cos(a),0,r*(.60+i*.07)*Math.sin(a));
    });
  }
}

function galaxy(seed, scale=1, color='#9d9fef', lite=false) {
  const rng=random(seed), points=[];
  for(let i=0;i<(lite?1150:2800);i++){
    const r=Math.pow(rng(),1.7)*4.5;
    const angle=(i%4)*TAU/4+r*.97+(rng()-.5)*(.48+r*.17);
    const bar=r<.8;
    points.push([r*Math.cos(angle), (rng()-.5)*(.1+Math.exp(-r)*.63), r*Math.sin(angle)*(bar?.53:.92),
      r<.85?'#ffe5b0':i%7?'#d1c6ff':color,.28+Math.pow(rng(),4)*1.5]);
  }
  const g=new T.Group();g.add(pointField(points,2.1),glow('#dfb88a',1.55,.48));g.scale.setScalar(scale);return g;
}

function foregroundLens(type, scale, lite) {
  if(type==='blackHole'){
    return new T.Mesh(new T.SphereGeometry(scale*.36,32,20),new T.MeshBasicMaterial({color:'#080c19'}));
  }
  if(type==='star') return star(scale*.57,'#ffd9aa');
  const g=galaxy(31,scale*.32,'#dc978c',lite);
  if(type==='cluster'){
    for(const [x,y,z,seed] of [[.74,.36,-.41,29],[-.48,.26,-.54,64],[.2,-.44,-.24,22]]){
      const member=galaxy(seed,.25,'#eea88e',true);
      member.position.set(x,y,z);g.add(member);
    }
  }
  return g;
}
function lensing(group, beat, state, lite) {
  const l=lensState(state.alignment,state.lens);
  const pulse=state.pulse===true;
  if(state.observer){
    const foreground=foregroundLens(state.lens,.77,true);foreground.rotation.x=.85;group.add(foreground);
    const image=new T.Group();
    const scale=state.magnify?1.8:1.16;
    const ringImage=l.appearance==='Einstein ring';
    const spread=l.appearance==='Stretched arcs'?1.9:.65;
    const segments=ringImage?[[l.radius,0,TAU,0]]:[
      [Math.abs(l.images[0]),-spread/2,spread,0],
      [Math.abs(l.images[1]),Math.PI-spread*.32,spread*.64,1],
    ];
    const strata=[];
    for(const [r,start,length,index] of segments){
      for(const [mult,color,width,alpha] of [[1,'#686cd8',.12,.19],[1,'#b1bbff',.061,.44],[.981,'#d8efff',.021,.93]]){
        const band=arc(r*scale*mult,start,length,color,width);
        band.material.opacity=alpha;image.add(band);strata.push([band,alpha,index]);
      }
      const rng=random(96+index);
      const knots=[];
      for(let i=0;i<125;i++){
        const a=start+length*rng(),radius=r*scale+(rng()-.5)*.13;
        knots.push([radius*Math.cos(a),radius*Math.sin(a),.02,'#e8defe',.08+rng()**3*.45]);
      }
      image.add(pointField(knots,2.1));
    }
    group.add(image);
    return t=>strata.forEach(([band,alpha,index])=>{
      band.material.opacity=alpha*(pulse?.6+.4*Math.exp(-Math.pow((t-.4-index*.7)*4,2)):1);
    });
  }
  const source=galaxy(24,.25,'#ffbd77',true);
  source.position.set(-4.2,l.offset*2.5,0);
  const lens=foregroundLens(state.lens,1.22*l.radius,lite);lens.rotation.z=.68;
  const observer=new T.Mesh(new T.ConeGeometry(.31,.69,3),new T.MeshStandardMaterial({color:'#87def2',metalness:.5,roughness:.32}));
  observer.position.x=4.2;observer.rotation.z=-Math.PI/2;
  group.add(source,lens,observer,line([V(-4.5,0,0),V(4.6,0,0)],'#92b8ca',.29));
  if(beat===1&&state.paths){
    for(let i=-5;i<=5;i++){
      const points=Array.from({length:33},(_,j)=>{
        const x=(j-16)*.25, z=i*.40;
        return V(x,-.85-.52*Math.exp(-(x*x+z*z)*.63),z);
      });
      group.add(line(points,'#78c9c4',.21),line(points.map(v=>V(v.z,v.y,v.x)),'#78c9c4',.21));
    }
  }
  if(state.paths){
    const paths=l.images.map((p,i)=>new T.CatmullRomCurve3([source.position.clone(),V(-1.2,p*1.23,0),V(0,p,0),V(1.2,p*.67,0),observer.position.clone()]));
    const dots=paths.map((path,i)=>{
      group.add(line(path.getPoints(64),i?'#d0adff':'#a5f7ff',.82));
      const mote=glow(i?'#d0adff':'#a5f7ff',.25,.95);
      mote.visible=false;group.add(mote);return mote;
    });
    return t=>dots.forEach((dot,i)=>{
      const u=(t-i*.55)/2.5;
      dot.visible=pulse && u>=0 && u<=1;
      dot.position.copy(paths[i].getPoint(T.MathUtils.clamp(u,0,1)));
    });
  }
}

function nova(group, beat, state, lite) {
  const rng=random(80+beat), count=lite?550:1400;
  const warm=['#7957e3','#6bdad8','#f8b37f'], palettes={
    5:['#24183f','#473756','#735575'],6:['#8f48ad','#ff996e','#ffddb6'],
    7:['#325dd7','#6fa5ff','#b2e8ff'],8:['#902e5a','#fe7655','#ffc875'],
    9:['#b65366','#59cabc','#d79e79'],10:['#8f4635','#e7894e','#ffc477'],
    11:['#2c746a','#4ac4aa','#b0f4a7'],16:['#304b83','#509bdf','#b3dafa'],
  };
  const palette=palettes[beat]||warm;
  const points=[];
  const gaussian=()=>(rng()+rng()+rng()-1.5);
  for(let i=0;i<count;i++){
    let x=gaussian()*5.8,y=gaussian()*3.6,z=gaussian()*3.2;
    const a=rng()*TAU, r=.25+rng()*2.8;
    if(beat===1){x=gaussian()*1.7+(i<count*.93?-1.65:1.65);y=gaussian()*1.5;z=gaussian()*1.5;}
    if(beat===2){x=(rng()-.5)*6;y=gaussian()*.075;z=gaussian()*.075;}
    if(beat===3){x=(i%3-1)*2+Math.cos(a)*r*.32;y=Math.sin(a)*r*.42;z=gaussian()*.33;}
    if(beat===12){x=(i%3-1)*1.9+gaussian()*.65;y=(rng()-.5)*(2.2+i%3*.35);z=gaussian()*.65;}
    if(beat===13){x=(rng()-.5)*6;y=Math.sin(x*1.8+i%3)*.55+gaussian()*.25;z=(i%3-1)*.67+gaussian()*.45;}
    if([14,22,23].includes(beat)){x=Math.cos(a)*r;y=Math.sin(a)*r*.73;z=gaussian()*.55;}
    if(beat>=17&&beat<=21){x=r*Math.cos(a);z=r*Math.sin(a);y=gaussian()*(beat>=19?.35:1.6);}
    points.push([x,y,z,palette[i%3],.2+rng()*.8]);
  }
  const field=pointField(points,beat===4?4:3.5);
  let filter=-1;
  group.add(field);
  if(beat===1){
    for(const x of [-1.65,1.65]){
      const cube=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.8,1.8,1.8)),new T.LineBasicMaterial({color:'#8899bc',transparent:true,opacity:.45}));
      cube.position.x=x;group.add(cube);
    }
  }
  const core=new T.Group();
  if(beat===2)core.add(star(.13,'#d8efff'));
  if(beat===3)for(const x of [-2,0,2]){const atom=star(.16,x===0?'#e7bdff':'#b8e9ff');atom.position.x=x;core.add(atom);}
  if(beat===4)core.add(rock(.7,'#ac7967',39));
  if([6,7,8,14,17,18,19,20,21,23].includes(beat))core.add(star(beat===14?.18:.43,beat===8?'#c7e6ff':'#ffce8f'));
  if(beat>=19&&beat<=21) core.add(disk(.52,2.9,'#ffce8f','#7764db',.82));
  if(beat===20)jets(core,2.8);
  if(beat===15)core.add(arrows());
  if(beat===22)for(const [x,y,z] of [[-.55,.36,0],[.5,-.2,-.3],[.2,.64,-.4]]){const sun=star(.21,'#d3e8ff');sun.position.set(x,y,z);core.add(sun);}
  group.add(core);
  return time=>{
    const dial=state.novaDial.value, t=state.novaDial.still?0:time;
    field.rotation.y=t*(.06+([18,19,23].includes(beat)?dial*.6:0))+dial*.25;
    if(beat===23)field.rotation.z=dial*TAU;
    field.scale.setScalar([15,16,17,18].includes(beat)?1.15-dial*.64:.87+dial*.27);
    if(beat===13)field.scale.x=.8+dial*.65;
    if(beat===4)field.geometry.setDrawRange(0,Math.round(count*(.12+dial*.88)));
    const selectedFilter=Math.min(2,Math.floor(dial*3));
    if(beat===9&&filter!==selectedFilter){
      filter=selectedFilter;
      const color=new T.Color(palette[filter]);
      const attribute=field.geometry.getAttribute('color');
      for(let i=0;i<attribute.count;i++)attribute.setXYZ(i,color.r,color.g,color.b);
      attribute.needsUpdate=true;
    }
    if(beat===0)field.material.uniforms.size.value=2.2+dial*3;
    field.visible=beat!==5||dial>.08;
    core.scale.setScalar(beat===21?.25+dial*.9:.78+dial*.42);
    core.visible=(beat!==21||dial>.27)&&(beat!==6||dial>.4);
    if(beat===2)core.position.x=-3+6*dial;
    if(beat===3)group.scale.setScalar(.65+dial*.65);
    if(beat===10||beat===11)field.rotation.x=dial*.46;
  };
}

function universe(group, beat, state, lite, texture) {
  if(beat===0){
    const earth=sphere(1.58,'#467faa',{map:texture(lite?'sm/earth-day.jpg':'earth-day.jpg'),bumpMap:texture(lite?'sm/earth-bump.jpg':'earth-bump.jpg'),bumpScale:.022,emissive:'#ffc47e',emissiveMap:texture(lite?'sm/earth-night.jpg':'earth-night.jpg'),emissiveIntensity:.28});
    earth.material.color.set('#ffffff');earth.rotation.set(.12,-1.1,.09);
    const clouds=sphere(1.60,'#ffffff',{alphaMap:texture(lite?'sm/earth-clouds.jpg':'earth-clouds.jpg'),transparent:true,opacity:.53,depthWrite:false});
    clouds.rotation.copy(earth.rotation);
    const limb=new T.Mesh(new T.SphereGeometry(1.64,48,28),new T.ShaderMaterial({
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`varying vec3 n,v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;v=-p.xyz;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`varying vec3 n,v;void main(){float f=pow(1.-max(0.,dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(.22,.61,1.,f*.62);}`,
    }));
    const moon=sphere(.43,'#eeeeee',{map:texture(lite?'sm/moon.jpg':'moon.jpg'),bumpMap:texture(lite?'sm/moon-bump.jpg':'moon-bump.jpg'),bumpScale:.024});moon.position.set(3.65,.28,-.32);
    earth.position.x=clouds.position.x=limb.position.x=-.65;
    group.add(earth,clouds,limb,moon);
    if(state.scale) group.add(line([V(-.65,-1.75,0),V(3.65,-1.75,0)],'#a7e8dc',.68));
    return t=>{earth.rotation.y=-1.1+t*.034;clouds.rotation.y=-1.1+t*.045;};
  }
  if(beat===1){
    group.add(star(.69,'#ffd584'));
    const pulse=glow('#ffd0a6',.2,.8);group.add(pulse);
    const maps=['planets/mercury.jpg','planets/venus.jpg','sm/earth-day.jpg','sm/mars.jpg',
      'planets/jupiter.jpg','planets/saturn.jpg','planets/uranus.jpg','planets/neptune.jpg'];
    const bodies=maps.map((map,i)=>{
      const radius=[.09,.13,.16,.12,.43,.36,.25,.24][i], track=1.05+i*.72;
      const body=sphere(radius,'#ffffff',{map:texture(map)});
      if(i===5) body.add(disk(radius*1.2,radius*1.9,'#e7d6b7','#bd9c82',.74));
      group.add(body,ring(track,'#7d9bb9',.28));return [body,track];
    });
    return t=>{
      bodies.forEach(([body,r],i)=>{const a=i*.82+t*.11/(i+1);body.position.set(r*Math.cos(a),0,r*Math.sin(a));});
      pulse.visible=state.scale&&!state.still;
      pulse.position.copy(bodies[2][0].position).multiplyScalar((t%4)/4);
    };
  }
  if(beat===2){
    for(const [x,y,z,c,r] of [[-2,0,0,'#ffd785',.34],[1.6,.12,0,'#ff8d71',.17],[2.3,1.4,-2,'#e7c693',.29],[2,-1,-1.2,'#fff1cf',.24],[-3,1.65,-4,'#b6d5ff',.35],[2.52,1.46,-2.16,'#ffb58b',.19]]){
      const s=star(r,c);s.position.set(x,y,z);group.add(s);
    }
    if(state.scale) group.add(line([V(-2,-.8,0),V(1.6,-.8,0)],'#84dce5',.8));
  }else if(beat===3 || beat===4){
    const milky=galaxy(60,beat===3?1:.50,'#e794c4',lite);group.add(milky);
    if(beat===3){
      const marker=sphere(.11,'#ff9379',{emissive:'#e35d42'});marker.position.set(2.65,.25,.66);
      group.add(marker,line([V(2.65,.15,.66),V(2.65,1.03,.66)],'#ffc2a5'));
    }else{
      milky.position.set(-2.6,0,.5);
      const m31=galaxy(3,.61,'#a6b9ff',lite);m31.position.set(2.9,.5,-.6);m31.rotation.set(.37,.7,-.43);group.add(m31);
      const m33=galaxy(7,.2,'#b4d9f5',true);m33.position.set(1.9,-1.4,1.6);group.add(m33);
      for(const [x,y,z] of [[-2.2,1.1,-.7],[-3.4,-.65,1.5],[2.3,1.4,-1.6],[3.8,-.7,.45]]){
        const dwarf=glow('#9fb7fa',.38,.46);dwarf.position.set(x,y,z);group.add(dwarf);
      }
    }
  }else{
    const rng=random(50), points=[], nodes=[];
    for(let i=0;i<24;i++) nodes.push(V((rng()-.5)*9,(rng()-.5)*5,(rng()-.5)*6));
    for(let i=1;i<nodes.length;i++){
      const a=nodes[i], b=nodes.slice(0,i).sort((p,q)=>p.distanceToSquared(a)-q.distanceToSquared(a))[0];
      const curve=new T.QuadraticBezierCurve3(a,a.clone().lerp(b,.5).add(V(.22,.32,-.55)),b);
      for(let j=0;j<(lite?32:82);j++){
        const p=curve.getPoint(rng());p.add(V((rng()-.5)*.34,(rng()-.5)*.42,(rng()-.5)*.42));
        points.push([...p.toArray(),j%4?'#a8ccff':'#f8c199',.25+rng()*.95]);
      }
    }
    group.add(pointField(points,2.3));
    const horizon=glow('#5089aa',6.8,.16);horizon.position.z=-4;
    group.add(horizon);
    const here=glow('#ffad85',.42,.95);group.add(here);
  }
}

export function cameraPreset(id, beat, state, narrow, time=0) {
  const x=narrow?0:2.6;
  let eye=V(3.4,3.2,12.5), target=V(-x,0,0);
  if(id==='nebula') eye=V(1.1,1.1,[15.2,10.1,12.5,10.2,8.1,14][beat]);
  if(id==='stars') eye=V(2.4,2.6,[13,11,9,9.7,10.9,11.5][beat]);
  if(id==='planets') eye=beat===2?V(2.1,1.6,7):V(4.1,6.6,12.8);
  if(id==='black-holes') eye=V(1.4,beat===4?2.3:4.1,beat===2?8.3:11.7);
  if(id==='lensing') eye=V(0,state.observer?.08:2.1,state.observer?6.7:13.5);
  if(id==='universe'){
    eye=V(2.1,[1.2,6.3,2.1,6,4.7,4.3][beat],[8.7,13.2,11,11.9,13.3,14.2][beat]);
    eye.applyAxisAngle(V(0,1,0),Math.sin(time*.16)*.11);
  }
  if(id==='nebula'&&state.feature==='dust')target.x-=.48;
  if(id==='nebula'&&state.feature==='cavity')target.y+=.38;
  if(id==='planets'&&state.feature==='star')eye.multiplyScalar(.84);
  if(id==='planets'&&state.feature==='dust')target.y-=.48;
  if(id==='planets'&&state.feature==='protoplanet')eye.multiplyScalar(.88);
  if(state.angle==='top' && id!=='lensing') eye=V(0,eye.length(),.02);
  if(state.angle==='edge' && id!=='lensing') eye=V(0,.16,eye.length());
  if(narrow){eye.multiplyScalar(id==='planets'||id==='lensing'?1.24:1.13);target.y=1.05;}
  return {eye,target};
}

export function createRenderer(host, lite, context, invalidate) {
  const renderer=new T.WebGLRenderer({canvas:context.canvas,context});

  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.13;
  renderer.domElement.setAttribute('aria-hidden','true');
  host.prepend(renderer.domElement);
  const camera=new T.PerspectiveCamera(44,1,.1,150);
  const scene=new T.Scene();
  scene.add(starField(lite),new T.HemisphereLight('#b9d6ff','#2a2146',1.08));
  const sun=new T.DirectionalLight('#fff1df',3.2);sun.position.set(-4,5,4);scene.add(sun);
  const rim=new T.DirectionalLight('#5c9efa',1.1);rim.position.set(5,0,-3);scene.add(rim);
  const textures=new Map(), loader=new T.TextureLoader();
  const texture=name=>{
    if(!textures.has(name)){
      const map=loader.load(new URL('../textures/'+name,import.meta.url).href,invalidate);
      if(!name.includes('clouds')&&!name.includes('bump')) map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      textures.set(name,map);
    }
    return textures.get(name);
  };
  let model=new T.Group(), motion, start=0, moved=false;
  const size=new T.Vector2();
  scene.add(model);
  function setChapter(chapter, beat, state) {
    scene.background=chapter.id==='universe'?new T.Color('#0a1726'):new T.Color('#040710').lerp(new T.Color(chapter.bg),.13);
    scene.remove(model);
    const disposed=new Set();
    model.traverse(o=>{
      for(const resource of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])]){
        if(resource && !disposed.has(resource)){resource.dispose();disposed.add(resource);}
      }
    });
    model=new T.Group();scene.add(model);
    if(chapter.id==='nebula'||chapter.id==='stars') motion=nebula(model,beat,state,lite,chapter.id==='stars');
    else if(chapter.id==='planets') motion=planets(model,beat,state,lite);
    else if(chapter.id==='black-holes') motion=blackHole(model,beat,state);
    else if(chapter.id==='lensing') motion=lensing(model,beat,state,lite);
    else if(chapter.id==='nova') motion=nova(model,beat,state,lite);
    else motion=universe(model,beat,state,lite,texture);
    moved=false;
  }
  function frame(time, {eye,target}, smooth, width, height) {
    if(!moved){start=time;moved=true;}
    const elapsed=Math.max(0,time-start);
    motion?.(elapsed);
    camera.position.lerp(eye,smooth);
    camera.userData.target ||= target.clone();
    camera.userData.target.lerp(target,smooth);
    camera.lookAt(camera.userData.target);
    if(camera.aspect!==width/height){camera.aspect=width/height;camera.updateProjectionMatrix();}
    renderer.getSize(size);
    if(size.x!==width||size.y!==height){
      renderer.setPixelRatio(Math.min(devicePixelRatio,lite?1:1.25,Math.sqrt(1250000/(width*height))));
      renderer.setSize(width,height,false);
    }
    model.traverse(o=>{
      if(o.material?.uniforms?.time) o.material.uniforms.time.value=elapsed;
      if(o.userData.faceCamera) o.quaternion.copy(camera.quaternion);
    });
    renderer.render(scene,camera);
  }
  function dispose(){
    for(const texture of textures.values())texture.dispose();
    const resources=new Set();
    scene.traverse(node=>{
      if(node.geometry)resources.add(node.geometry);
      for(const material of [].concat(node.material||[]))resources.add(material);
    });
    for(const resource of resources)resource.dispose();
    renderer.dispose();
  }
  function capture(context){
    // A WebGL drawing buffer is valid immediately after drawing.
    renderer.render(scene,camera);
    context.drawImage(renderer.domElement,0,0,context.canvas.width,context.canvas.height);
  }
  return {renderer,setChapter,frame,capture,dispose};
}
