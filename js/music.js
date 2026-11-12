// Generative ambient score, made live with Web Audio (no audio files).
// Slow pad chords, a low drone and sparse bell notes through a soft reverb.
// Moods: 'calm' (menus, building), 'launch' (swell), 'ops' (steady pulse), 'tense' (danger).
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [ // A minor colour, slow and open
  [45, 57, 60, 64, 71], // Am(add9)
  [41, 53, 57, 60, 64], // Fmaj7
  [48, 55, 60, 64, 67], // C
  [43, 55, 59, 62, 69], // G6/9
  [40, 52, 55, 59, 62], // Em7
  [41, 53, 57, 60, 67], // Fmaj9
];
const BELL = [69, 71, 72, 76, 79, 81, 83, 84, 88];

export class Music {
  constructor() { this.ctx = null; this.on = false; this.vol = 0.5; this.mood = 'calm'; this.timer = 0; this.step = 0; }
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    this.master.connect(comp).connect(c.destination);
    // reverb from a generated impulse
    const len = c.sampleRate * 4, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.55; this.verb.connect(wet).connect(this.master);
    this.dry = c.createGain(); this.dry.gain.value = 0.6; this.dry.connect(this.master); this.dry.connect(this.verb);
    // echo for the bells
    this.delay = c.createDelay(2); this.delay.delayTime.value = 0.62; const fb = c.createGain(); fb.gain.value = 0.38;
    this.delay.connect(fb).connect(this.delay); this.delay.connect(this.verb);
    // pad filter with a slow sweep
    this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 700; this.padF.Q.value = 0.6; this.padF.connect(this.dry);
    const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.04; lfoG.gain.value = 280; lfo.connect(lfoG).connect(this.padF.frequency); lfo.start();
    // drone
    this.drone = c.createGain(); this.drone.gain.value = 0.0; this.drone.connect(this.dry);
    for (const [f, type, g] of [[55, 'sine', 0.5], [110.4, 'triangle', 0.12]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = g; o.connect(gg).connect(this.drone); o.start(); }
    // tension pulse
    this.pulse = c.createGain(); this.pulse.gain.value = 0; this.pulse.connect(this.dry);
    const po = c.createOscillator(); po.type = 'sine'; po.frequency.value = 73.4; const pa = c.createGain(); pa.gain.value = 0;
    const pl = c.createOscillator(); pl.frequency.value = 2; const pd = c.createGain(); pd.gain.value = 0.5; pl.connect(pd).connect(pa.gain);
    po.connect(pa).connect(this.pulse); po.start(); pl.start();
    return true;
  }
  start() {
    if (!this.init()) return; this.on = true;
    this.ctx.resume?.();
    const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(this.vol * 0.55, t, 1.5);
    this.applyMood();
    if (!this.timer) this.loop();
  }
  stop() {
    this.on = false; if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    clearTimeout(this.timer); this.timer = 0;
  }
  setVolume(v) { this.vol = v; if (this.ctx && this.on) this.master.gain.setTargetAtTime(v * 0.55, this.ctx.currentTime, 0.3); }
  setMood(m) { if (m === this.mood) return; this.mood = m; this.applyMood(); }
  applyMood() {
    if (!this.ctx) return; const t = this.ctx.currentTime, m = this.mood;
    this.drone.gain.setTargetAtTime(m === 'launch' ? 0.22 : m === 'tense' ? 0.16 : 0.08, t, 1.2);
    this.pulse.gain.setTargetAtTime(m === 'tense' ? 0.22 : m === 'ops' ? 0.05 : 0, t, 0.8);
    this.padF.Q.setTargetAtTime(m === 'tense' ? 3 : 0.6, t, 1);
  }
  loop() {
    if (!this.on) { this.timer = 0; return; }
    const c = this.ctx, t = c.currentTime + 0.05, len = this.mood === 'launch' ? 5 : 8;
    const chord = CHORDS[this.step++ % CHORDS.length];
    chord.forEach((n, i) => this.pad(midi(n + (this.mood === 'tense' && i === 2 ? 1 : 0)), t + i * 0.12, len, i === 0 ? 0.05 : 0.032));
    const bells = this.mood === 'tense' ? 1 : this.mood === 'launch' ? 2 : 3;
    for (let k = 0; k < bells; k++) if (Math.random() < 0.75) this.bell(midi(BELL[(Math.random() * BELL.length) | 0]), t + 1 + Math.random() * (len - 2));
    this.timer = setTimeout(() => this.loop(), len * 1000 - 50);
  }
  pad(f, t, len, amp) {
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + len * 0.35); g.gain.setValueAtTime(amp, t + len * 0.7); g.gain.linearRampToValueAtTime(0, t + len * 1.15);
    for (const det of [-7, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(g); o.start(t); o.stop(t + len * 1.2); }
    g.connect(this.padF);
  }
  bell(f, t) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.76; const g2 = c.createGain(); g2.gain.value = 0.15;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.dry); g.connect(this.delay);
    o.start(t); o2.start(t); o.stop(t + 3.3); o2.stop(t + 3.3);
  }
}
