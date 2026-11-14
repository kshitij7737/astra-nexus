// Cinematic WebGL engine for Nova's quests: particles, glowing stars, planets,
// disks, gravity-well grids, black holes, galaxies and the cosmic web.
import * as THREE from '../vendor/three.module.min.js';

export const TAU = Math.PI * 2;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const mix = (a, b, t) => a + (b - a) * t;
export function rgb(hex) { return [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255]; }
export function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function gauss(r) { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) * 0.866; }

// Palette from the brief: deep indigo sky with pink, cyan, purple, yellow and green.
export const P = { pink: 0xff5fae, cyan: 0x52e4ff, purple: 0xa070ff, yellow: 0xffd45a, green: 0x6dff9e,
  white: 0xfff6ea, blue: 0x5a8dff, orange: 0xff8a3c, red: 0xff4a3a, gold: 0xffb347, teal: 0x2fd6b8, ice: 0xb8e8ff };

const NOISE = `
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,4.1);a*=.5;}return s;}
`;

const POINT_V = `
attribute float aSize; attribute vec3 aColor; attribute vec4 aSeed;
uniform vec3 uTint; uniform float uTime,uPix,uSpin,uSpinPow,uInfall,uExpand,uTurb,uAlpha,uTwinkle,uJet,uJetLen,uJetW,uSpeed,uFlat,uSizeK;
varying vec3 vC; varying float vA; varying float vRot;
void main(){
  vec3 p=position; float a=1.; vRot=aSeed.y*6.2831+uTime*.03*(aSeed.z-.5);
#ifdef INFALL
  float ph=fract(aSeed.x+uTime*uInfall);
  float k=pow(1.-ph,1.25); p.xz*=k; p.y*=k*k;
  a=smoothstep(0.,.12,ph)*smoothstep(1.,.8,ph)*smoothstep(.04,.3,k);
#endif
#ifdef JET
  float ph=fract(aSeed.x+uTime*uJet); float sg=aSeed.w>.5?1.:-1.;
  float rad=uJetW*(.25+ph*2.2)*aSeed.y; float an=aSeed.z*6.2831+uTime*2.5;
  p=vec3(cos(an)*rad,sg*(.12+ph*uJetLen),sin(an)*rad);
  a=pow(1.-ph,1.4)*smoothstep(0.,.04,ph);
#endif
  float r=length(p.xz);
  float ang=uTime*uSpin*pow(max(r,.12),-uSpinPow);
  float c=cos(ang),s=sin(ang); p.xz=mat2(c,-s,s,c)*p.xz;
  p.y*=uFlat;
  p*=uExpand;
  p+=uTurb*vec3(sin(uTime*.55+aSeed.y*31.+p.y*1.3),sin(uTime*.47+aSeed.z*27.+p.x*1.1),cos(uTime*.51+aSeed.x*23.+p.z*1.2));
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
#ifdef FIXED
  gl_PointSize=aSize*uSizeK;
#else
  gl_PointSize=min(aSize*uSizeK*uPix/max(-mv.z,.01),150.);
  a*=smoothstep(.15,.7,-mv.z);
#endif
  float tw=1.-uTwinkle*.55+uTwinkle*.55*sin(uTime*(1.5+aSeed.y*3.)+aSeed.w*60.);
#ifdef RAY
  float d=fract(uTime*uSpeed)-aSeed.x; tw*=.7+1.8*exp(-d*d*260.);
#endif
  vC=aColor*uTint; vA=a*uAlpha*tw;
}`;
const POINT_F = `
varying vec3 vC; varying float vA; varying float vRot; uniform float uSoft; uniform sampler2D uTex;
void main(){
  vec2 q=gl_PointCoord-.5; float d=dot(q,q)*4.;
#ifdef GAS
  float cr=cos(vRot),sr=sin(vRot); vec2 uv=mat2(cr,-sr,sr,cr)*q+.5;
  float a=texture2D(uTex,uv).a*(1.-smoothstep(.6,1.,d));
  a*=vA;
#else
  float a=exp(-d*uSoft)+.18*exp(-d*uSoft*.22);
  a*=vA*(1.-smoothstep(.85,1.,d));
#endif
  if(a<.004)discard;
#ifdef DARK
  gl_FragColor=vec4(vC,a);
#else
  gl_FragColor=vec4(vC*a,a);
#endif
}`;

const STAR_V = `varying vec3 vN,vP,vV; void main(){vN=normalize(normalMatrix*normal);vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const STAR_F = NOISE + `
uniform vec3 uColor; uniform float uTime,uHeat,uGran,uAlpha,uSpots;
varying vec3 vN,vP,vV;
void main(){
  float mu=clamp(dot(normalize(vN),normalize(vV)),0.,1.);
  vec3 q=normalize(vP);
  float g=fbm(q*uGran+vec3(0.,uTime*.12,uTime*.05));
  float g2=fbm(q*uGran*3.1-vec3(uTime*.09));
  float spot=smoothstep(.62,.7,fbm(q*2.2+3.))*uSpots;
  vec3 c=uColor*(.62+.55*g+.28*g2)*(1.-spot*.7);
  c=mix(c*.42,c,pow(mu,.5));
  c+=vec3(1.,.96,.86)*pow(mu,2.5)*uHeat;
  gl_FragColor=vec4(c,uAlpha);
}`;

const PLANET_V = `uniform vec3 uSunW; varying vec3 vN,vP,vV,vL; varying vec2 vUv;
void main(){vUv=uv;vN=normalize(normalMatrix*normal);vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;
vL=normalize((viewMatrix*vec4(uSunW,1.)).xyz-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const PLANET_F = NOISE + `
uniform vec3 uA,uB,uC; uniform float uType,uTime,uSeed,uAmb,uAlpha,uHasMap; uniform sampler2D uMap; varying vec3 vN,vP,vV,vL; varying vec2 vUv;
void main(){
  vec3 n=normalize(vN); vec3 p=normalize(vP)+uSeed;
  float lit=clamp(dot(n,normalize(vL))*1.15+.08,0.,1.);
  float mu=clamp(dot(n,normalize(vV)),0.,1.);
  vec3 col;
  if(uType<.5){ float f=fbm(p*3.5); float cr=smoothstep(.55,.6,n3(p*9.))*.25; col=mix(uA,uB,f)*(1.-cr); }
  else if(uType<1.5){ float w=fbm(p*vec3(2.,.5,2.)+vec3(uTime*.02,0.,0.)); float b=sin((normalize(vP).y+w*.35)*16.+uSeed*4.);
    col=mix(uA,uB,.5+.5*b); col=mix(col,uC,smoothstep(.3,.9,w)*.35); }
  else if(uType<2.5){ float f=fbm(p*2.6); float land=smoothstep(.5,.54,f); vec3 sea=vec3(.05,.2,.55);
    col=mix(sea,mix(vec3(.15,.42,.18),vec3(.55,.45,.3),smoothstep(.6,.75,f)),land);
    col=mix(col,vec3(.95),smoothstep(.78,.86,abs(normalize(vP).y)));
    float cl=smoothstep(.55,.72,fbm(p*4.+vec3(uTime*.015,0.,0.))); col=mix(col,vec3(1.),cl*.85); }
  else { float f=fbm(p*4.+vec3(0.,uTime*.05,0.)); col=mix(uA,uB,smoothstep(.35,.7,f)); col+=uC*pow(smoothstep(.55,.75,f),2.)*1.5; lit=max(lit,.55); }
  if(uHasMap>.5) col=texture2D(uMap,vUv).rgb*1.35;
  col*=uAmb+lit*(1.-uAmb);
  col+=uC*pow(1.-mu,3.)*(.25+lit)*.9;
  gl_FragColor=vec4(col,uAlpha);
}`;

const DISK_V = `varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const DISK_F = NOISE + `
uniform float uTime,uIn,uOut,uHeat,uDop,uAlpha,uSpin; uniform vec3 uCam; varying vec3 vP;
void main(){
  float r=length(vP.xy); float t=clamp((r-uIn)/(uOut-uIn),0.,1.); float an=atan(vP.y,vP.x);
  float sw=an+uTime*uSpin*1.6/pow(max(r,.2),1.5);
  float s=fbm(vec3(cos(sw)*2.,sin(sw)*2.,r*5.)*1.6); float s2=n3(vec3(sw*6.,r*30.,uTime*.2));
  vec3 hot=vec3(1.,.97,.9), mid=vec3(1.,.66,.25), cool=vec3(.75,.18,.06);
  vec3 c=mix(hot,mid,smoothstep(0.,.35,t)); c=mix(c,cool,smoothstep(.3,1.,t));
  c=mix(c,hot,(1.-t)*uHeat*.6);
  vec3 tang=normalize(vec3(-vP.y,vP.x,0.));
  float dop=1.+uDop*dot(tang,normalize(uCam));
  float a=smoothstep(0.,.05,t)*(1.-smoothstep(.55,1.,t))*(.45+.75*s+.25*s2);
  c*=dop*dop*(1.35-t*.6);
  gl_FragColor=vec4(c*a*uAlpha,a*uAlpha);
}`;

const HALO_F = `
uniform float uTime,uIn,uW,uAlpha,uPhoton; varying vec3 vP;
void main(){
  float r=length(vP.xy); float an=atan(vP.y,vP.x);
  float band=exp(-pow((r-uIn-uW*.5)/(uW*.5),2.)*2.)*(.55+.45*sin(an*3.+uTime*.7));
  float ph=exp(-pow((r-uIn)/(uIn*.025),2.))*uPhoton;
  float top=.35+.65*smoothstep(-.3,.9,sin(an));
  vec3 c=vec3(1.,.72,.38)*band*top+vec3(1.,.93,.8)*ph;
  float a=(band*top*.8+ph)*uAlpha;
  gl_FragColor=vec4(c*uAlpha,a);
}`;

const WELL_V = `
uniform vec4 uM[4]; uniform float uTime,uRipple,uRippleK,uDepth; uniform vec2 uR0;
varying float vD,vE;
void main(){
  vec3 p=position; float y=0.;
  for(int i=0;i<4;i++){ vec2 d=p.xz-uM[i].xy; float rr=length(d); y-=uM[i].z/sqrt(rr*rr/(uM[i].w*uM[i].w)+1.); }
  float rc=length(p.xz-uR0);
  y+=uRipple*sin(rc*uRippleK-uTime*3.)/(1.+rc*.35);
  p.y=y*uDepth; vD=-y; vE=length(position.xz);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const WELL_F = `
uniform vec3 uA,uB; uniform float uAlpha,uEdge; varying float vD,vE;
void main(){ float f=clamp(vD*.35,0.,1.); vec3 c=mix(uA,uB,f);
  float a=uAlpha*(.45+.9*f)*(1.-smoothstep(uEdge*.6,uEdge,vE)); gl_FragColor=vec4(c*1.3,a);}`;

const LAYER_V = `#include <clipping_planes_pars_vertex>
varying vec3 vN,vV,vP; void main(){ vec4 mvPosition=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=-mvPosition.xyz; vP=position; gl_Position=projectionMatrix*mvPosition;
#include <clipping_planes_vertex>
}`;
const LAYER_F = NOISE + `#include <clipping_planes_pars_fragment>
uniform vec3 uColor; uniform float uTime; varying vec3 vN,vV,vP;
void main(){
#include <clipping_planes_fragment>
  float mu=abs(dot(normalize(vN),normalize(vV)));
  float g=n3(vP*5.+vec3(0.,uTime*.3,0.))*.6+n3(vP*12.)*.4;
  vec3 c = gl_FrontFacing ? uColor*(.5+.6*pow(mu,.6))*(.8+.4*g) : uColor*(.9+.3*g);
  gl_FragColor=vec4(c,1.);
}`;
const STREAK_V = `
attribute float aB; attribute float aR; uniform float uTime,uSpin,uWarp,uInfall; varying float vB;
void main(){
  vec3 p=position; float r=aR;
  float ang=uTime*uSpin*pow(max(r,.2),-1.5);
  float c=cos(ang),s=sin(ang); p.xz=mat2(c,-s,s,c)*p.xz;
  float th=atan(p.z,p.x); p.y+=uWarp*r*.18*sin(th*2.+uTime*.2);
  vB=aB; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const STREAK_F = `uniform vec3 uA,uB; uniform float uAlpha; varying float vB;
void main(){ vec3 c=mix(uB,uA,vB); gl_FragColor=vec4(c,vB*uAlpha); }`;
const CMB_F = NOISE + `
uniform float uTime,uC,uAlpha; varying vec3 vN,vP,vV;
void main(){ vec3 q=normalize(vP); float f=fbm(q*9.)*.55+fbm(q*24.)*.45; float d=(f-.5)*uC*2.4;
  vec3 c=vec3(1.,.55,.18)+vec3(.35,.15,-.12)*d; c=mix(c,vec3(.25,.45,1.),clamp(-d,0.,1.)*.9); c=mix(c,vec3(1.,.25,.15),clamp(d,0.,1.)*.6);
  float mu=clamp(dot(normalize(vN),normalize(vV)),0.,1.);
  gl_FragColor=vec4(c*(.55+.5*mu),uAlpha);}`;

function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texCache = {};
const loader = new THREE.TextureLoader();
function loadTex(name) {
  if (!texCache[name]) { const t = loader.load('textures/' + name); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[name] = t; }
  return texCache[name];
}
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const glow = canvasTex(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,255,255,.75)');
    r.addColorStop(.35, 'rgba(255,255,255,.22)'); r.addColorStop(.7, 'rgba(255,255,255,.05)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  const spikes = canvasTex(256, (g, s) => {
    g.translate(s / 2, s / 2); g.globalCompositeOperation = 'lighter';
    for (const [a, w, l] of [[0, 1, 1], [Math.PI / 2, 1, 1], [Math.PI / 4, .5, .55], [-Math.PI / 4, .5, .55]]) {
      g.save(); g.rotate(a);
      const lg = g.createLinearGradient(-s / 2, 0, s / 2, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5 - .5 * l, 'rgba(255,255,255,0)');
      lg.addColorStop(.5, 'rgba(255,255,255,' + w + ')'); lg.addColorStop(.5 + .5 * l, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(-s / 2, -1.5, s, 3); g.globalAlpha = .25; g.fillRect(-s / 2, -4, s, 8); g.globalAlpha = 1;
      g.restore();
    }
  });
  const galaxies = [];
  for (let k = 0; k < 6; k++) galaxies.push(canvasTex(64, (g, s) => {
    const R = rng(91 + k * 7); g.translate(s / 2, s / 2); g.globalCompositeOperation = 'lighter';
    const spiral = k % 3 !== 2, hue = [[255, 220, 170], [190, 210, 255], [255, 190, 150], [235, 235, 255], [255, 170, 210], [200, 255, 230]][k];
    for (let i = 0; i < 260; i++) {
      let x, y, a = .08;
      if (spiral) { const arm = i % 2, rr = R() * 26, th = rr * .24 + arm * Math.PI + R() * .5; x = Math.cos(th) * rr; y = Math.sin(th) * rr; }
      else { const rr = Math.abs(gauss(R)) * 10; const th = R() * TAU; x = Math.cos(th) * rr * 1.6; y = Math.sin(th) * rr; }
      g.fillStyle = `rgba(${hue},${a})`; g.beginPath(); g.arc(x, y, 1.2 + R() * 2.4, 0, TAU); g.fill();
    }
    const c = g.createRadialGradient(0, 0, 0, 0, 0, 9); c.addColorStop(0, 'rgba(255,245,225,.95)'); c.addColorStop(1, 'rgba(255,240,220,0)');
    g.fillStyle = c; g.fillRect(-12, -12, 24, 24);
  }));
  const puff = canvasTex(128, (g, s2) => {
    const R = rng(12); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) { const a = R() * TAU, r = Math.pow(R(), .7) * s2 * .3; const x = s2 / 2 + Math.cos(a) * r, y = s2 / 2 + Math.sin(a) * r, rr = s2 * (.05 + R() * .14);
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s2, s2); }
  });
  const ringTex = canvasTex(256, (g, s2) => {
    const R = rng(3); for (let x = 0; x < s2; x++) { const t = x / s2; const a = (t < .08 ? 0 : .35 + R() * .5) * (t > .55 && t < .6 ? .15 : 1) * (1 - Math.pow(t, 6));
      g.fillStyle = `rgba(${220 - t * 40},${200 - t * 50},${170 - t * 60},${a})`; g.fillRect(x, 0, 1, s2); }
  });
  return TEX = { glow, spikes, galaxies, puff, ringTex };
}

export function createNova(host, labelsEl, hudCanvas) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x080a1e);
  renderer.localClippingEnabled = true;
  host.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(45, 1, .01, 6000);
  const G = { uTime: { value: 0 }, uPix: { value: 500 } };
  let scene = null, shot = null, dpr = Math.min(devicePixelRatio || 1, 1.75), slow = 0, fast = 0;
  const view = { yaw: 0, pitch: 0 };
  const dial = { target: 0, n: 0 };
  const hud = hudCanvas.getContext('2d');

  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    if (w >= 760) camera.setViewOffset(w, h, -w * .13, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const hr = Math.min(devicePixelRatio || 1, 2);
    hudCanvas.width = Math.round(w * hr); hudCanvas.height = Math.round(h * hr);
  }

  // Build a scene from a shot function using a small kit.
  function show(build, opts = {}) {
    const old = shot;
    if (old) old.dispose();
    labelsEl.textContent = '';
    scene = new THREE.Scene();
    scene.fog = null;
    const disposables = [];
    const updates = [];
    const labels = [];
    const k = { scene, t: 0, n: 0, narrow: host.clientWidth < 720, camCfg: { d: 8, el: 16, az: 0, fov: 45, target: V(), drift: .05, roll: 0 }, zoom: 1, hudFn: null, shake: 0 };
    const track = o => { o.traverse?.(m => { if (m.geometry) disposables.push(m.geometry); if (m.material) disposables.push(m.material); }); return o; };
    k.add = (o, parent = scene) => { parent.add(track(o)); return o; };
    k.on = fn => updates.push(fn);
    k.hud = fn => { k.hudFn = fn; };
    k.cam = cfg => { Object.assign(k.camCfg, cfg); if (cfg.target && !(cfg.target instanceof THREE.Vector3)) k.camCfg.target = V(...cfg.target); };
    k.label = (text, pos, cls = '') => {
      const el = document.createElement('span'); el.className = 'nova-tag ' + cls; el.textContent = text; labelsEl.append(el);
      const L = { el, pos: typeof pos === 'function' ? pos : (pos instanceof THREE.Vector3 ? pos : V(...pos)), show: 1, set(t) { if (el.textContent !== t) el.textContent = t; } };
      labels.push(L); return L;
    };
    k.group = (parent = scene) => { const g = new THREE.Group(); parent.add(g); return g; };

    // Generic particle system.
    const followers = [];
    k.points = ({ pos, col, size, seed, blend = 'add', defines = {}, u = {}, parent = scene, soft = 4.2, fixed = false, follow = false }) => {
      const n = pos.length / 3, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      if (!seed) { seed = new Float32Array(n * 4); const R = rng(n * 13 + 7); for (let i = 0; i < seed.length; i++) seed[i] = R(); }
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const uniforms = { uTime: G.uTime, uPix: G.uPix, uSpin: { value: 0 }, uSpinPow: { value: 1.5 }, uInfall: { value: 0 }, uExpand: { value: 1 }, uTurb: { value: 0 }, uAlpha: { value: 1 }, uTwinkle: { value: 0 }, uJet: { value: 0 }, uJetLen: { value: 3 }, uJetW: { value: .1 }, uSpeed: { value: .3 }, uFlat: { value: 1 }, uSizeK: { value: 1 }, uSoft: { value: soft }, uTex: { value: textures().puff }, uTint: { value: new THREE.Vector3(1, 1, 1) } };
      for (const key in u) uniforms[key] = { value: u[key] };
      const h = { obj: null, u: uniforms, geo, tint(hex, t = 1) { const c = rgb(hex); uniforms.uTint.value.set(mix(1, c[0] * 1.6, t), mix(1, c[1] * 1.6, t), mix(1, c[2] * 1.6, t)); } };
      const d = { ...defines }; if (fixed) d.FIXED = 1; if (blend === 'dark') d.DARK = 1;
      const mat = new THREE.ShaderMaterial({ uniforms, defines: d, vertexShader: POINT_V, fragmentShader: POINT_F, transparent: true, depthWrite: false,
        blending: blend === 'dark' ? THREE.NormalBlending : THREE.AdditiveBlending });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
      k.add(pts, parent); h.obj = pts; if (follow) followers.push(pts);
      return h;
    };
    // Helper to fill buffers from a generator f(i, R) -> [x,y,z, color hex or [r,g,b], size, bright]
    k.make = (n, f, opts = {}) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
      const { seed: sd, ...rest } = opts;
      const R = rng(typeof sd === 'number' ? sd : 1234);
      for (let i = 0; i < n; i++) {
        const [x, y, z, c, s, b = 1] = f(i, R);
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        const cc = Array.isArray(c) ? c : rgb(c);
        col[i * 3] = cc[0] * b; col[i * 3 + 1] = cc[1] * b; col[i * 3 + 2] = cc[2] * b; size[i] = s;
      }
      return k.points({ pos, col, size, ...rest, seed: sd instanceof Float32Array ? sd : undefined });
    };
    k.sky = (o = {}) => {
      const cols = [0xffffff, 0xcfe0ff, 0xffe6c4, 0xffd0e8, 0xbff4ff];
      return k.make(o.n || 2600, (i, R) => {
        const u = R() * 2 - 1, th = R() * TAU, s = Math.sqrt(1 - u * u), r = 900;
        const big = R() < .04;
        return [Math.cos(th) * s * r, u * r, Math.sin(th) * s * r, cols[i % 5], (big ? 3.4 : 1.4 + R() * 1.6) * (o.size || 1) * Math.min(devicePixelRatio || 1, 2), (big ? 1 : .35 + R() * .55) * (o.bright || 1)];
      }, { fixed: true, seed: 77, u: { uTwinkle: .6 }, soft: 5, follow: true });
    };
    k.nebulaSky = (o = {}) => {
      const cols = o.colors || [P.purple, P.blue, P.pink, P.cyan];
      return k.make(o.n || 260, (i, R) => {
        const th = R() * TAU, u = (R() * 2 - 1) * .55, s = Math.sqrt(1 - u * u), r = 700;
        return [Math.cos(th) * s * r, u * r + (o.y || 0), Math.sin(th) * s * r, cols[i % cols.length], 120 + R() * 220, .05 * (o.bright || 1)];
      }, { seed: 31, soft: 2.5, follow: true });
    };
    k.glow = (pos, s, color, op = 1) => {
      const m = new THREE.SpriteMaterial({ map: textures().glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op });
      const sp = new THREE.Sprite(m); sp.position.copy(pos instanceof THREE.Vector3 ? pos : V(...pos)); sp.scale.setScalar(s); k.add(sp); return sp;
    };
    k.spikes = (pos, s, color, op = 1) => {
      const m = new THREE.SpriteMaterial({ map: textures().spikes, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op });
      const sp = new THREE.Sprite(m); sp.position.copy(pos instanceof THREE.Vector3 ? pos : V(...pos)); sp.scale.setScalar(s); k.add(sp); return sp;
    };
    k.star = (o = {}) => {
      const g = new THREE.Group(); (o.parent || scene).add(g);
      if (o.pos) g.position.copy(o.pos instanceof THREE.Vector3 ? o.pos : V(...o.pos));
      const u = { uColor: { value: new THREE.Vector3(...rgb(o.color ?? P.gold)) }, uTime: G.uTime, uHeat: { value: o.heat ?? .7 }, uGran: { value: o.gran ?? 5 }, uAlpha: { value: 1 }, uSpots: { value: o.spots ?? 0 } };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({ uniforms: u, vertexShader: STAR_V, fragmentShader: STAR_F, transparent: true }));
      k.add(mesh, g);
      const corona = k.glow(V(), 4.2, o.glow ?? o.color ?? P.gold, o.coronaOp ?? .85); g.add(corona);
      const halo = k.glow(V(), 11, o.glow ?? o.color ?? P.gold, .22); g.add(halo);
      const sp = o.spikes === false ? null : k.spikes(V(), 16, o.spikeColor ?? 0xfff2e0, o.spikes ?? .35); if (sp) g.add(sp);
      const h = { g, mesh, u, corona, halo, sp, r: 1,
        setR(r) { h.r = r; mesh.scale.setScalar(r); corona.scale.setScalar(r * 4.2); halo.scale.setScalar(r * 11); if (sp) sp.scale.setScalar(Math.max(2, r * 16)); },
        setColor(hex) { u.uColor.value.set(...rgb(hex)); corona.material.color.setHex(hex); halo.material.color.setHex(hex); },
        lerpColor(a, b, t) { const A = rgb(a), B = rgb(b); const c = A.map((x, i) => mix(x, B[i], t)); u.uColor.value.set(...c); const hx = new THREE.Color(c[0], c[1], c[2]); corona.material.color.copy(hx); halo.material.color.copy(hx); },
        fade(a) { u.uAlpha.value = a; corona.material.opacity = (o.coronaOp ?? .85) * a; halo.material.opacity = .22 * a; if (sp) sp.material.opacity = (o.spikes ?? .35) * a; g.visible = a > .01; } };
      h.setR(o.r ?? 1);
      return h;
    };
    k.planet = (o = {}) => {
      const types = { rocky: 0, gas: 1, earth: 2, lava: 3 };
      const u = { uA: { value: new THREE.Vector3(...rgb(o.a ?? 0x8a6a50)) }, uB: { value: new THREE.Vector3(...rgb(o.b ?? 0xd8c0a0)) }, uC: { value: new THREE.Vector3(...rgb(o.rim ?? 0x6fb0ff)) },
        uType: { value: types[o.type || 'rocky'] }, uTime: G.uTime, uSeed: { value: o.seed ?? 0 }, uHasMap: { value: o.map ? 1 : 0 }, uMap: { value: o.map ? loadTex(o.map) : null }, uSunW: { value: o.sun ? (o.sun instanceof THREE.Vector3 ? o.sun : V(...o.sun)) : V(0, 0, 0) }, uAmb: { value: o.amb ?? .06 }, uAlpha: { value: 1 } };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.ShaderMaterial({ uniforms: u, vertexShader: PLANET_V, fragmentShader: PLANET_F, transparent: true }));
      mesh.scale.setScalar(o.r ?? 1); if (o.pos) mesh.position.copy(o.pos instanceof THREE.Vector3 ? o.pos : V(...o.pos));
      k.add(mesh, o.parent || scene);
      if (o.ring) {
        const rgeo = new THREE.RingGeometry(1.3, 2.3, 128, 1); const pa = rgeo.attributes.position, uva = rgeo.attributes.uv;
        for (let i = 0; i < pa.count; i++) { const r = Math.hypot(pa.getX(i), pa.getY(i)); uva.setXY(i, (r - 1.3) / 1, .5); }
        const rg = new THREE.Mesh(rgeo, new THREE.MeshBasicMaterial({ map: textures().ringTex, color: o.ring, transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false }));
        rg.rotation.x = -Math.PI / 2 + .35; mesh.add(rg); track(rg);
      }
      return { mesh, u };
    };
    k.orbit = (r, color = 0x9ab8ff, op = .35, o = {}) => {
      const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU; pts.push(V(Math.cos(a) * r, 0, Math.sin(a) * r * (o.flat ?? 1))); }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      if (o.tilt) line.rotation.x = o.tilt; if (o.pos) line.position.copy(o.pos instanceof THREE.Vector3 ? o.pos : V(...o.pos));
      k.add(line, o.parent || scene); return line;
    };
    k.line = (points, color = 0xffffff, op = .6, parent = scene) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      k.add(line, parent); return line;
    };
    // A glowing ray made of dense points with a travelling pulse.
    k.ray = (points, color = P.yellow, o = {}) => {
      const curve = points.isCurve ? points : new THREE.CatmullRomCurve3(points);
      const n = o.n || 700;
      const seed = new Float32Array(n * 4); const R = rng(n + 5);
      const h = k.make(n, (i) => { const p = curve.getPoint(i / (n - 1)); return [p.x, p.y, p.z, color, o.size ?? .09, o.bright ?? 1.4]; },
        { defines: { RAY: 1 }, u: { uSpeed: o.speed ?? .35 }, seed: (() => { for (let i = 0; i < n; i++) { seed[i * 4] = i / (n - 1); seed[i * 4 + 1] = R(); seed[i * 4 + 2] = R(); seed[i * 4 + 3] = R(); } return seed; })(), parent: o.parent });
      h.curve = curve;
      h.setPoints = (pts2) => { const cv = new THREE.CatmullRomCurve3(pts2); const a = h.geo.attributes.position; for (let i = 0; i < n; i++) { const p = cv.getPoint(i / (n - 1)); a.setXYZ(i, p.x, p.y, p.z); } a.needsUpdate = true; };
      return h;
    };
    k.arrow = (from, dir, len, color, o = {}) => {
      const g = new THREE.Group(); (o.parent || scene).add(g);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.op ?? .9, blending: THREE.AdditiveBlending, depthWrite: false });
      const w = o.w ?? .05;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(w, w, 1, 10), m); const head = new THREE.Mesh(new THREE.ConeGeometry(w * 2.6, w * 6, 14), m);
      g.add(shaft, head); track(g);
      g.position.copy(from instanceof THREE.Vector3 ? from : V(...from));
      g.quaternion.setFromUnitVectors(V(0, 1, 0), (dir instanceof THREE.Vector3 ? dir : V(...dir)).clone().normalize());
      const h = { g, mat: m, set(l) { l = Math.max(.02, l); shaft.scale.y = l; shaft.position.y = l / 2; head.position.y = l + w * 3; } };
      h.set(len); return h;
    };
    k.box = (s, color, op = .5) => {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, s, s)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending }));
      k.add(e); return e;
    };
    k.sphereWire = (r, color, op = .25, parent = scene) => {
      const e = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 24, 16)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      k.add(e, parent); return e;
    };
    k.ball = (r, color, o = {}) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshBasicMaterial({ color, transparent: o.op !== undefined, opacity: o.op ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: o.depthWrite ?? true }));
      if (o.pos) m.position.copy(o.pos instanceof THREE.Vector3 ? o.pos : V(...o.pos)); k.add(m, o.parent || scene); return m;
    };
    // Layered cutaway sphere (onion).
    k.layers = (radii, colors, o = {}) => {
      const R = radii[0] * 1.05;
      const planes = [new THREE.Plane(V(-1, 0, 0), R), new THREE.Plane(V(0, 0, -1), R)];
      const g = k.group(o.parent || scene); const shells = [];
      radii.forEach((r, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 48), new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Vector3(...rgb(colors[i])) }, uTime: G.uTime },
          vertexShader: LAYER_V, fragmentShader: LAYER_F, side: THREE.DoubleSide, clipping: true, clippingPlanes: planes, clipIntersection: true }));
        g.add(m); track(m); shells.push(m);
      });
      // faint limb glow for the outer layer
      const glow = k.glow(V(), radii[0] * 4.5, colors[0], .35); g.add(glow);
      return { g, shells, planes, cut(v) { const c = mix(R, 0, clamp(v)); planes[0].constant = c; planes[1].constant = c; } };
    };
    // Gravity-well grid (pink lines, like the planet-formation reel).
    k.well = (o = {}) => {
      const N = o.N ?? 64, L = o.L ?? 8, seg = o.seg ?? 160; const pos = [];
      for (let i = 0; i <= N; i++) {
        const c = -L + 2 * L * i / N;
        for (let j = 0; j < seg; j++) {
          const a = -L + 2 * L * j / seg, b = -L + 2 * L * (j + 1) / seg;
          pos.push(c, 0, a, c, 0, b, a, 0, c, b, 0, c);
        }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const u = { uM: { value: [new THREE.Vector4(0, 0, o.mass ?? 2.5, o.soft ?? .9), new THREE.Vector4(0, 0, 0, 1), new THREE.Vector4(0, 0, 0, 1), new THREE.Vector4(0, 0, 0, 1)] },
        uTime: G.uTime, uRipple: { value: 0 }, uRippleK: { value: 2.2 }, uDepth: { value: 1 }, uR0: { value: new THREE.Vector2() },
        uA: { value: new THREE.Vector3(...rgb(o.a ?? 0x6a2a9a)) }, uB: { value: new THREE.Vector3(...rgb(o.b ?? 0xff6ad5)) }, uAlpha: { value: o.op ?? .55 }, uEdge: { value: L } };
      const mesh = new THREE.LineSegments(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: WELL_V, fragmentShader: WELL_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      mesh.frustumCulled = false; if (o.y) mesh.position.y = o.y; k.add(mesh, o.parent || scene);
      const h = { mesh, u, depthAt(x, z) { let y = 0; for (const m of u.uM.value) { const rr = Math.hypot(x - m.x, z - m.y); y -= m.z / Math.sqrt(rr * rr / (m.w * m.w) + 1); } return y * u.uDepth.value + (o.y || 0); } };
      return h;
    };
    // Black hole: shadow, accretion disk, lensed halo, photon ring.
    k.bh = (o = {}) => {
      const g = k.group(o.parent || scene); if (o.pos) g.position.copy(o.pos instanceof THREE.Vector3 ? o.pos : V(...o.pos));
      const rs = o.r ?? 1;
      const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      shadow.scale.setScalar(rs); g.add(shadow); track(shadow); shadow.renderOrder = -1;
      const du = { uTime: G.uTime, uIn: { value: rs * 1.6 }, uOut: { value: rs * (o.out ?? 5.5) }, uHeat: { value: o.heat ?? .5 }, uDop: { value: o.dop ?? .45 }, uAlpha: { value: o.disk ?? 1 }, uSpin: { value: o.spin ?? 1 }, uCam: { value: V(1, 0, 0) } };
      const disk = new THREE.Mesh(new THREE.RingGeometry(rs * 1.5, rs * (o.out ?? 5.5), 160, 4), new THREE.ShaderMaterial({ uniforms: du, vertexShader: DISK_V, fragmentShader: DISK_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      disk.rotation.x = -Math.PI / 2; g.add(disk); track(disk);
      const vx = k.vortex({ rin: rs * 1.65, rout: rs * (o.out ?? 5.5) * .95, parent: g, spin: 1, warp: o.warp ?? .3, n: o.streakN ?? 1100, a: o.streakA ?? 0xfff4e6, b: o.streakB ?? 0xff8a3c, bright: .8, seed: 19 });
      const hu = { uTime: G.uTime, uIn: { value: rs * 1.08 }, uW: { value: rs * .9 }, uAlpha: { value: o.halo ?? 1 }, uPhoton: { value: o.photon ?? 1 } };
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(rs * 6, rs * 6), new THREE.ShaderMaterial({ uniforms: hu, vertexShader: DISK_V, fragmentShader: HALO_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(halo); track(halo);
      const h = { g, shadow, disk, halo, du, hu, rs, vx, tilt: o.tilt ?? 0,
        setR(r) { h.rs = r; shadow.scale.setScalar(r); du.uIn.value = r * 1.6; disk.scale.setScalar(r / rs); vx.mesh.scale.setScalar(r / rs); hu.uIn.value = r * 1.08; hu.uW.value = r * .9; halo.scale.setScalar(r / rs); } };
      disk.rotation.z = 0; g.rotation.z = h.tilt;
      k.on(() => {
        g.getWorldQuaternion(halo.quaternion).invert().multiply(camera.quaternion);
        const lp = disk.worldToLocal(camera.position.clone()).normalize(); du.uCam.value.copy(lp);
        vx.u.uAlpha.value = (o.streaks ?? .9) * Math.min(1, du.uAlpha.value); vx.u.uSpin.value = du.uSpin.value * .8;
      });
      return h;
    };
    k.cmb = (r, o = {}) => {
      const u = { uTime: G.uTime, uC: { value: o.c ?? .5 }, uAlpha: { value: o.op ?? 1 } };
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), new THREE.ShaderMaterial({ uniforms: u, vertexShader: STAR_V, fragmentShader: CMB_F, transparent: true, side: o.side ?? THREE.FrontSide, depthWrite: false }));
      k.add(m, o.parent || scene); return { mesh: m, u };
    };
    // Procedural generators.
    k.cloud = (o = {}) => { let h;
      const blobs = o.blobs || [[0, 0, 0, 1]]; const cols = o.colors || [P.purple, P.cyan, P.pink, P.blue]; const r0 = o.r ?? 3;
      const R0 = rng(o.seed || 5); const fil = []; const norm = Math.min(1, 8000 / (o.n ?? 9000));
      for (let f = 0; f < (o.filaments ?? 5); f++) fil.push([R0() * TAU, R0() * TAU, R0() * 3]);
      h = k.make(o.n ?? 9000, (i, R) => {
        const b = blobs[i % blobs.length]; const big = R() < (o.big ?? .08);
        let x = gauss(R) * r0 * b[3] * .55, y = gauss(R) * r0 * b[3] * .38 * (o.flat ?? 1), z = gauss(R) * r0 * b[3] * .55;
        if (R() < .45) { const F = fil[i % fil.length]; const s = (R() - .5) * 2 * r0 * b[3]; x = Math.cos(F[0]) * s + gauss(R) * .12 * r0; y = Math.sin(F[1]) * s * .4 * (o.flat ?? 1) + Math.sin(s * 1.3 + F[2]) * .3 + gauss(R) * .1 * r0; z = Math.sin(F[0]) * s + gauss(R) * .12 * r0; }
        const c = cols[(i * 7 + Math.floor(Math.abs(y + x) * 2)) % cols.length];
        const core = .3 + .7 * ease(Math.hypot(x, y, z) / (r0 * b[3] * .5));
        return [x + b[0], y + b[1], z + b[2], c, big ? r0 * (.35 + R() * .45) : r0 * (.012 + R() * .03), (big ? .03 * (o.haze ?? 1) : (.12 + R() * .26) * (o.bright ?? 1)) * core * norm];
      }, { seed: o.seed || 5, u: { uTurb: o.turb ?? .03, uSpin: o.spin ?? 0, uSpinPow: .2, uTwinkle: .15 }, defines: o.infall ? { INFALL: 1 } : {}, blend: o.blend, parent: o.parent, soft: o.soft ?? 4.2 });
      if (!o.infall && o.gas !== 0) {
        const gas = k.gas({ n: o.gas ?? Math.round((o.n ?? 9000) / 45), r: r0, blobs, colors: o.blend === 'dark' ? [0x040309] : cols, flat: o.flat, seed: o.seed, blend: o.blend, parent: o.parent, bright: o.blend === 'dark' ? 6 : (o.bright ?? 1) * .9 });
        const set = h.u.uAlpha, tint = h.tint;
        h.gas = gas; h.tint = (hex, t) => { tint(hex, t); gas.tint(hex, t); };
        k.on(() => { gas.u.uAlpha.value = set.value; gas.u.uExpand.value = h.u.uExpand.value; gas.obj.position.copy(h.obj.position); gas.obj.scale.copy(h.obj.scale); gas.u.uFlat.value = h.u.uFlat.value; });
      }
      return h;
    };
    // Volumetric gas: big soft noise-textured puffs.
    k.gas = (o = {}) => {
      const blobs = o.blobs || [[0, 0, 0, 1]]; const cols = o.colors || [P.purple, P.blue, P.pink]; const r0 = o.r ?? 3;
      return k.make(o.n ?? 260, (i, R) => { const b = blobs[i % blobs.length];
        return [b[0] + gauss(R) * r0 * b[3] * .5, b[1] + gauss(R) * r0 * b[3] * .32 * (o.flat ?? 1), b[2] + gauss(R) * r0 * b[3] * .5, cols[i % cols.length], r0 * (o.size ?? 1) * (.5 + R() * .9), (o.bright ?? 1) * (.035 + R() * .045)]; },
        { seed: (o.seed || 5) + 400, defines: { GAS: 1 }, blend: o.blend, parent: o.parent, u: { uTurb: .02, uSpin: o.spin ?? 0, uSpinPow: .2 } });
    };
    // Swirling streaks (accretion vortex / disk filaments).
    k.vortex = (o = {}) => {
      const rin = o.rin ?? 1.2, rout = o.rout ?? 5, N = o.n ?? 900, seg = 14; const R = rng(o.seed || 8);
      const pos = [], aB = [], aR = [];
      for (let i = 0; i < N; i++) {
        const r = rin + Math.pow(R(), o.conc ?? 1.4) * (rout - rin), a0 = R() * TAU, len = (.25 + R() * .9) * (1.2 - (r - rin) / (rout - rin) * .5), y = gauss(R) * (o.thick ?? .04) * r;
        const br = (o.bright ?? 1) * (.35 + R() * .65) * (1 - (r - rin) / (rout - rin) * .6);
        for (let j = 0; j < seg; j++) for (const jj of [j, j + 1]) {
          const t = jj / seg, a = a0 + t * len, rr = r * (1 - t * (o.spiral ?? .06));
          pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr); aB.push(br * Math.sin(t * Math.PI)); aR.push(r);
        }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 1)); geo.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 1));
      const u = { uTime: G.uTime, uSpin: { value: o.spin ?? 1 }, uWarp: { value: o.warp ?? 0 }, uInfall: { value: 0 }, uAlpha: { value: o.op ?? 1 },
        uA: { value: new THREE.Vector3(...rgb(o.a ?? 0xfff2e0)) }, uB: { value: new THREE.Vector3(...rgb(o.b ?? 0xff8a3c)) } };
      const mesh = new THREE.LineSegments(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: STREAK_V, fragmentShader: STREAK_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      mesh.frustumCulled = false; k.add(mesh, o.parent || scene); return { mesh, u };
    };
    k.disk = (o = {}) => {
      const rin = o.rin ?? .5, rout = o.rout ?? 5; const gaps = o.gaps || [];
      const colorAt = o.color || (t => t < .25 ? [1, .92, .75] : t < .55 ? rgb(P.gold).map((x, i) => mix(x, rgb(P.pink)[i], (t - .25) / .3)) : rgb(P.pink).map((x, i) => mix(x, rgb(P.blue)[i], (t - .55) / .45)));
      return k.make(o.n ?? 16000, (i, R) => {
        let r, tries = 0;
        do { r = rin + Math.pow(R(), o.conc ?? .7) * (rout - rin); tries++; } while (tries < 8 && gaps.some(([gr, gw]) => Math.abs(r - gr) < gw * (.4 + R() * .6)));
        const a = R() * TAU, t = (r - rin) / (rout - rin);
        const h = gauss(R) * (o.thick ?? .06) * r;
        const big = R() < .05;
        const c = Array.isArray(colorAt(t, R)) ? colorAt(t, R) : rgb(colorAt(t, R));
        const inner = .3 + .7 * ease(t * 4);
        return [Math.cos(a) * r, h, Math.sin(a) * r, c, big ? .5 + R() * .7 : (o.size ?? .045) * (.6 + R() * 1.2), (big ? .06 : (.4 + R() * .7) * (o.bright ?? 1)) * inner];
      }, { seed: o.seed || 9, u: { uSpin: o.spin ?? .35, uSpinPow: 1.5, uTwinkle: .2 }, defines: o.infall ? { INFALL: 1 } : {}, parent: o.parent });
    };
    k.galaxy = (o = {}) => {
      const arms = o.arms ?? 2, r0 = o.r ?? 5, tw = o.twist ?? 2.6;
      const core = o.core ?? P.gold, armC = o.armColor ?? 0x7fa6ff, knot = o.knot ?? P.pink;
      return k.make(o.n ?? 22000, (i, R) => {
        const bulge = R() < (o.bulge ?? .22);
        if (bulge) { const rr = Math.abs(gauss(R)) * r0 * .16; const th = R() * TAU, ph = Math.acos(R() * 2 - 1);
          return [rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph) * .6, rr * Math.sin(ph) * Math.sin(th), core, r0 * .012 + R() * r0 * .01, .5 + R() * .5]; }
        const t = Math.pow(R(), .8), rr = t * r0, arm = i % arms;
        const th = arm / arms * TAU + Math.log(1 + rr) * tw + gauss(R) * (.32 - t * .12) * (o.loose ?? 1);
        const isKnot = R() < .03 && t > .3;
        const c = isKnot ? knot : rgb(core).map((x, j) => mix(x, rgb(armC)[j], ease(t * 1.4)));
        return [Math.cos(th) * rr, gauss(R) * r0 * .025 * (1 - t * .5), Math.sin(th) * rr, c, isKnot ? r0 * .05 : r0 * (.006 + R() * .012), isKnot ? .9 : .3 + R() * .7];
      }, { seed: o.seed || 3, u: { uSpin: o.spin ?? .04, uSpinPow: .3, uTwinkle: .1 }, parent: o.parent });
    };
    k.web = (o = {}) => {
      const R0 = rng(o.seed || 21), r0 = o.r ?? 10, nodes = [];
      for (let i = 0; i < (o.nodes ?? 70); i++) { const u = R0() * 2 - 1, th = R0() * TAU, s = Math.sqrt(1 - u * u), rr = r0 * Math.cbrt(R0()); nodes.push(V(Math.cos(th) * s * rr, u * rr * (o.flat ?? 1), Math.sin(th) * s * rr)); }
      const edges = [];
      nodes.forEach((a, i) => { nodes.map((b, j) => [a.distanceTo(b), j]).sort((x, y) => x[0] - y[0]).slice(1, 4).forEach(([, j]) => { if (j > i) edges.push([i, j]); }); });
      const cols = o.colors || [0xffd7a8, 0xffb070, 0xffffff, 0xc8b0ff, 0x9fd0ff];
      return k.make(o.n ?? 30000, (i, R) => {
        if (R() < .3) { const nd = nodes[Math.floor(R() * nodes.length)]; const s = r0 * .03;
          return [nd.x + gauss(R) * s, nd.y + gauss(R) * s, nd.z + gauss(R) * s, cols[i % cols.length], r0 * (.006 + R() * .01), .6 + R() * .5]; }
        const [a, b] = edges[Math.floor(R() * edges.length)]; const t = R(); const A = nodes[a], B = nodes[b]; const s = r0 * .012;
        return [mix(A.x, B.x, t) + gauss(R) * s, mix(A.y, B.y, t) + gauss(R) * s, mix(A.z, B.z, t) + gauss(R) * s, cols[(i * 3) % cols.length], r0 * (.004 + R() * .006), .35 + R() * .45];
      }, { seed: o.seed || 21, u: { uTwinkle: .25 }, parent: o.parent });
    };
    k.shell = (o = {}) => {
      const r0 = o.r ?? 2, cols = o.colors || [P.orange, P.pink, P.yellow];
      return k.make(o.n ?? 8000, (i, R) => {
        const u = R() * 2 - 1, th = R() * TAU, s = Math.sqrt(1 - u * u); const rr = r0 * (1 + gauss(R) * (o.thick ?? .06)) * (1 + .12 * Math.sin(th * 5 + u * 4) * (o.lumpy ?? 1));
        return [Math.cos(th) * s * rr, u * rr * (o.flat ?? 1), Math.sin(th) * s * rr, cols[i % cols.length], r0 * (.01 + R() * .025), (.26 + R() * .45) * (o.bright ?? 1)];
      }, { seed: o.seed || 11, u: { uTurb: o.turb ?? .01, uTwinkle: .2 }, parent: o.parent });
    };
    k.jet = (o = {}) => k.make(o.n ?? 3000, (i, R) => [0, 0, 0, i % 3 ? (o.color ?? P.cyan) : 0xffffff, o.size ?? .09, .5 + R() * .6],
      { seed: o.seed || 4, defines: { JET: 1 }, u: { uJet: o.speed ?? .45, uJetLen: o.len ?? 4, uJetW: o.w ?? .08 }, parent: o.parent });
    k.galaxies = (n, f, parent = scene) => {
      const T = textures().galaxies; const R = rng(n * 3 + 1); const list = [];
      for (let i = 0; i < n; i++) {
        const [p, s, type, op = 1, rot = R() * TAU] = f(i, R);
        const m = new THREE.SpriteMaterial({ map: T[type % T.length], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, rotation: rot });
        const sp = new THREE.Sprite(m); sp.position.copy(p); sp.scale.setScalar(s); sp.userData.op = op; parent.add(sp); track(sp); list.push(sp);
      }
      return list;
    };
    k.text = (text, pos, cls) => k.label(text, pos, cls);

    build(k);
    if (!k.noSky) k.sky(k.skyOpts || {});
    const cam = { pos: V(), target: V() };
    shot = { k, updates, labels, cam, followers, start: -1, dispose() { for (const d of disposables) d.dispose?.(); scene.clear(); } };
    dial.n = dial.target;
    resize();
  }

  function frame(dt, still) {
    if (!shot) return;
    const { k } = shot;
    if (!still) { k.t += dt; G.uTime.value += dt; }
    dial.n += (dial.target - dial.n) * Math.min(1, dt * 5 + (still ? 1 : 0));
    k.n = dial.n;
    for (const f of shot.updates) f(k.t, k.n, dt);
    const c = k.camCfg;
    const intro = still ? 1 : ease(k.t / 2.2);
    const az = c.az * Math.PI / 180 + (still ? 0 : c.drift * k.t) + view.yaw;
    const el = clamp(c.el * Math.PI / 180 + view.pitch, -1.45, 1.45);
    let d = c.d * k.zoom * (1 + .45 * (1 - intro));
    if (k.narrow) d *= c.narrow ?? 1.35;
    if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    camera.position.set(c.target.x + Math.sin(az) * Math.cos(el) * d, c.target.y + Math.sin(el) * d, c.target.z + Math.cos(az) * Math.cos(el) * d);
    if (k.shake > .001) camera.position.add(V((Math.random() - .5) * k.shake, (Math.random() - .5) * k.shake, 0));
    camera.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
    camera.lookAt(c.target);
    for (const f of shot.followers) f.position.copy(camera.position);
    G.uPix.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
    renderer.render(scene, camera);
    // Labels
    const w = host.clientWidth, h = host.clientHeight; const tmp = V();
    for (const L of shot.labels) {
      const p = typeof L.pos === 'function' ? L.pos(k.t, k.n) : L.pos;
      if (!p || L.show <= 0) { L.el.style.opacity = 0; continue; }
      tmp.copy(p).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
      L.el.style.opacity = vis ? L.show : 0;
      L.el.style.transform = `translate(${(tmp.x * .5 + .5) * w}px,${(-tmp.y * .5 + .5) * h}px) translate(-50%,-50%)`;
    }
    // HUD
    const hr = hudCanvas.width / Math.max(1, w);
    hud.setTransform(1, 0, 0, 1, 0, 0); hud.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    if (k.hudFn) { hud.setTransform(hr, 0, 0, hr, 0, 0); k.hudFn(hud, w, h, k.t, k.n); }
  }

  // Adapt resolution to keep motion smooth on slower laptops.
  function perf(ms) {
    if (ms > 30) { slow++; fast = 0; } else if (ms < 14) { fast++; slow = 0; } else { slow = Math.max(0, slow - 1); }
    if (slow > 40 && dpr > .7) { dpr = Math.max(.7, dpr - .25); slow = 0; resize(); }
    if (fast > 240 && dpr < Math.min(devicePixelRatio || 1, 1.75)) { dpr = Math.min(devicePixelRatio || 1, 1.75, dpr + .25); fast = 0; resize(); }
  }

  // Snapshot for crossfades between parts.
  function snapshot() {
    const src = renderer.domElement; if (!src.width) return null;
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    try { c.getContext('2d').drawImage(src, 0, 0); } catch { return null; }
    return c;
  }

  return {
    renderer, camera, show, frame, resize, perf, snapshot,
    set dial(v) { dial.target = clamp(v); }, get dial() { return dial.n; },
    drag(dx, dy) { view.yaw += dx * .008; view.pitch = clamp(view.pitch + dy * .006, -1.1, 1.1); },
    resetView() { view.yaw = 0; view.pitch = 0; },
    dispose() { shot?.dispose(); renderer.dispose(); renderer.domElement.remove(); labelsEl.textContent = ''; },
  };
}
