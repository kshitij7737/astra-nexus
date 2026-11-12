// NEXUS//04 mission simulation. Pure logic, no DOM, so it can be tested in Node.
// Physics used (all formulas shown to players in the game):
//   Orbital period    T = 2π √(a³ / μ)
//   Eclipse fraction  f = asin(R / a) / π   (worst case, Sun in the orbit plane)
//   Solar power       P = rating × derating ÷ d²   (d = distance from Sun in AU)
//   Delta-v           Δv = Isp × g0 × ln(m_wet / m_dry)
//   Data return       D = rate × efficiency × contact time
import { COMMON, ISP, G0, DIFFICULTY, ANOMALIES } from './game-data.js';
export const diffOf = id => DIFFICULTY[id] || DIFFICULTY.flight;

const opt = (list, id) => list.find(o => o.id === id) || list[0];

export function defaultConfig(m) {
  return {
    solar: 'S', battery: 'S', radio: 'S', recorder: 'S', launch: 'A',
    orbit: m.orbitOptions[0].id, inst: m.objectives.map(o => o.inst[0]).filter((v, i, a) => a.indexOf(v) === i),
    propKg: 120,
  };
}

export function derive(m, cfg, diffId) {
  const diff = diffOf(diffId);
  const O = COMMON.options;
  const solar = opt(O.solar, cfg.solar), batt = opt(O.battery, cfg.battery), radio = opt(O.radio, cfg.radio);
  const rec = opt(O.recorder, cfg.recorder), launch = opt(O.launch, cfg.launch);
  const orbit = m.orbitOptions.find(o => o.id === cfg.orbit) || m.orbitOptions[0];
  const insts = m.instruments.filter(i => cfg.inst.includes(i.id));
  const instKg = insts.reduce((s, i) => s + i.kg, 0), instCr = insts.reduce((s, i) => s + i.cr, 0), instW = insts.reduce((s, i) => s + i.w, 0);
  const dry = COMMON.bus.kg + solar.kg + batt.kg + radio.kg + rec.kg + COMMON.propHardware.kg + instKg;
  const wet = dry + cfg.propKg;
  const cost = COMMON.bus.cr + solar.cr + batt.cr + radio.cr + rec.cr + COMMON.propHardware.cr + instCr + launch.cr + Math.round(cfg.propKg * COMMON.propCostPerKg);
  const solarW = solar.w * COMMON.derating / (m.solarAU ** 2);
  const battWh = batt.wh * COMMON.battEff;
  const rateMbps = radio.mbps * m.radioMul;
  let periodMin, eclipseFrac, a = null;
  if (orbit.periodMin) { periodMin = orbit.periodMin; eclipseFrac = orbit.eclipse || 0; }
  else {
    a = m.body.radiusKm + orbit.altKm;
    periodMin = 2 * Math.PI * Math.sqrt(a ** 3 / m.body.mu) / 60;
    eclipseFrac = Math.asin(m.body.radiusKm / a) / Math.PI;
  }
  const eclipseMin = periodMin * eclipseFrac;
  const eclipseWh = (COMMON.bus.w + COMMON.heaterW) * eclipseMin / 60;
  const dvAvail = ISP * G0 * Math.log(wet / dry);
  const dvNeed = m.dvRequired + orbit.dvMaint;
  const contactMin = periodMin * (orbit.contact[1] - orbit.contact[0]);
  const passMin = periodMin * (orbit.pass[1] - orbit.pass[0]);
  const perContactGbit = rateMbps * COMMON.radioEff * contactMin * 60 / 1000;
  const perPassGbit = insts.reduce((s, i) => s + i.mbps, 0) * orbit.dataMul * passMin * 60 / 1000;
  const sunLoad = COMMON.bus.w + instW + radio.w;
  const missing = m.objectives.filter(o => !o.inst.some(id => cfg.inst.includes(id)));
  const checks = [
    { id: 'mass', ok: wet <= launch.wetKg, label: 'Fits the launch vehicle', detail: `${Math.round(wet)} of ${launch.wetKg} kg` },
    { id: 'budget', ok: cost <= (m.budget ?? COMMON.budget), label: 'Within budget', detail: `${cost} of ${m.budget ?? COMMON.budget} credits` },
    { id: 'dv', ok: dvAvail >= dvNeed, label: 'Enough propellant to reach orbit', detail: `${Math.round(dvAvail)} of ${dvNeed} m/s` },
    { id: 'eclipse', ok: battWh >= eclipseWh, label: 'Battery survives the eclipse', detail: eclipseMin ? `${Math.round(battWh)} of ${Math.round(eclipseWh)} Wh needed` : 'No eclipse on this orbit' },
    { id: 'power', ok: solarW >= sunLoad, label: 'Arrays power everything at once', detail: `${Math.round(solarW)} W vs ${Math.round(sunLoad)} W load` },
    { id: 'science', ok: missing.length === 0, label: 'Every objective has an instrument', detail: missing.length ? `Missing: ${missing.map(o => o.label.toLowerCase()).join('; ')}` : 'All covered' },
  ];
  const budget = Math.round((m.budget ?? COMMON.budget) * diff.budgetMul);
  checks[1].ok = cost <= budget; checks[1].detail = `${cost} of ${budget} credits`;
  // launch reliability falls as the rocket is loaded close to its limit (shown to the player)
  const margin = 1 - wet / launch.wetKg;
  const reliability = Math.max(0.86, Math.min(0.995, 0.995 - Math.max(0, 0.12 - margin) * 0.9));
  const launchFail = diff.launchRisk ? Math.min(0.3, (1 - reliability) * diff.launchRisk) : 0;
  checks.push({ id: 'reserve', ok: dvAvail - dvNeed >= 60, soft: true, label: 'Propellant reserve for surprises', detail: `${Math.round(dvAvail - dvNeed)} m/s spare, 60 recommended` });
  checks.push({ id: 'margin', ok: launchFail <= 0.02, soft: true, label: 'Launch risk acceptable', detail: diff.launchRisk ? `${(launchFail * 100).toFixed(1)}% chance the rocket fails (mass margin ${Math.round(margin * 100)}%)` : 'No launch failures on Cadet' });
  const launchable = checks.find(c => c.id === 'mass').ok && checks.find(c => c.id === 'budget').ok && cfg.inst.length > 0;
  return { diff, margin, reliability, launchFail, budget, solar, batt, radio, rec, launch, orbit, insts, dry, wet, cost, solarW, battWh, rateMbps, storage: rec.gbit, periodMin, eclipseFrac, eclipseMin, eclipseWh, dvAvail, dvNeed, contactMin, passMin, perContactGbit, perPassGbit, sunLoad, a, checks, launchable };
}

const inWin = (p, w) => w[0] <= w[1] ? p >= w[0] && p < w[1] : p >= w[0] || p < w[1];

export class Sim {
  constructor(m, cfg, opts = {}) {
    this.m = m; this.cfg = cfg; this.diff = diffOf(opts.diff); this.d = derive(m, cfg, opts.diff);
    this.health = 100; this.firedAnoms = new Set();
    const off = { astra: 1, lunaris: 3, earth: 2, mars: 0 }[m.id] || 0, pool = ANOMALIES.slice(off).concat(ANOMALIES);
    this.anoms = this.diff.anomalies.map((o, i) => ({ orbit: o, ...pool[i] }));
    this.interactive = !!opts.interactive;
    this.dt = 20; // s of mission time per step
    this.T = this.d.periodMin * 60;
    this.t = 0; this.done = false; this.failed = null;
    this.batt = this.d.battWh; this.safe = false; this.brownouts = 0; this.lost = 0;
    this.buckets = new Map(); // key -> {inst, phase, vol, ratio}
    this.returned = {}; // `${inst}|${phase}` -> credited Gbit
    this.collected = 0; this.sentTotal = 0;
    this.dvMargin = this.d.dvAvail - this.d.dvNeed;
    this.mods = []; // {from, to, ...effect}
    this.firedEvents = new Set(); this.firedChallenges = new Set();
    this.challengeScore = 0; this.choices = []; this.relay = false;
    this.history = []; this.log = [];
    this.enabled = new Set(cfg.inst); // player toggles during operations
    this.pending = null; // event or challenge waiting for player
    this.lastOrbit = -1;
    if (this.dvMargin < 0) { this.failed = { reason: 'insertion', text: `Orbit insertion failed. The spacecraft needed ${this.d.dvNeed} m/s but carried propellant for ${Math.round(this.d.dvAvail)} m/s.` }; this.done = true; }
  }
  get orbit() { return Math.floor(this.t / this.T); }
  get phase() { return (this.t % this.T) / this.T; }
  state() {
    const p = this.phase, o = this.d.orbit, ef = this.d.eclipseFrac;
    const sunlit = !(ef > 0 && Math.abs(p - 0.75) < ef / 2);
    return { phase: p, orbit: this.orbit, sunlit, inPass: inWin(p, o.pass), inContact: inWin(p, o.contact) };
  }
  activeMods() { const ob = this.orbit; return this.mods.filter(x => ob >= x.from && ob < x.to); }
  storageUsed() { let s = 0; for (const b of this.buckets.values()) s += b.vol; return s; }
  addData(inst, vol, ratio = 1) {
    const phase = this.m.flybyOrbit != null ? (this.orbit < this.m.flybyOrbit ? 'pre' : 'post') : 'all';
    const free = this.d.storage - this.storageUsed();
    const keep = Math.min(vol, Math.max(0, free));
    if (vol > keep) this.lost += vol - keep;
    if (keep <= 0) return;
    const key = `${inst}|${phase}|${ratio.toFixed(3)}`;
    const b = this.buckets.get(key) || { inst, phase, vol: 0, ratio };
    b.vol += keep; this.buckets.set(key, b); this.collected += keep * ratio;
  }
  applyEffect(e) {
    const from = this.orbit + 1, to = from + (e.orbits || 1);
    if (e.skipPasses) this.mods.push({ from, to: from + e.skipPasses, skip: true });
    if (e.skipInst) this.mods.push({ from, to, skipInst: e.skipInst });
    if (e.contactMul) this.mods.push({ from, to, contactMul: e.contactMul });
    if (e.compress) this.mods.push({ from, to, compress: e.compress, value: e.value ?? 1 });
    else if (e.value != null) this.mods.push({ from, to, value: e.value });
    if (e.dataBoost) this.mods.push({ from, to, dataBoost: e.dataBoost });
    if (e.bonusData) this.addData(e.bonusData.inst, e.bonusData.gbit);
    if (e.battCost) this.batt = Math.max(0, this.batt - e.battCost);
    if (e.relay) this.relay = true;
    if (e.battBonus) this.batt = this.d.battWh;
    if (e.health) this.damage(-e.health, 'fault');
    if (e.dvCost) {
      this.dvMargin -= e.dvCost;
      if (this.dvMargin < 0) { this.failed = { reason: 'propellant', text: 'Out of propellant. The spacecraft could no longer hold its orbit and the mission ended early.' }; this.done = true; }
    }
  }
  damage(n, why) {
    if (n <= 0 || this.done) return;
    this.health = Math.max(0, this.health - n);
    if (this.health <= 0 && !this.failed) {
      this.failed = { reason: 'lost', text: why === 'power' ? 'Repeated deep battery discharges killed the spacecraft. It went silent and never answered again.' : 'The spacecraft took too much damage and stopped responding. Mission lost.' };
      this.note('Spacecraft not responding. Signal lost.', 'bad'); this.done = true;
    }
  }
  choose(optionIndex) {
    const p = this.pending; if (!p) return null;
    let result;
    if (p.type === 'event' || p.type === 'anomaly') { const o = p.item.options[optionIndex]; this.applyEffect(o.effect); this.choices.push({ title: p.item.title, choice: o.label }); result = o.result; }
    else { const ok = optionIndex === p.item.correct; if (ok) this.challengeScore += 5; result = ok ? `Correct. ${p.item.why}` : `Not quite. ${p.item.why}`; }
    this.pending = null; return result;
  }
  step() {
    if (this.done || this.pending) return;
    const ob = this.orbit;
    if (ob !== this.lastOrbit) {
      this.lastOrbit = ob;
      if (this.interactive) {
        const ev = this.m.events.find(e => e.orbit === ob && !this.firedEvents.has(e.orbit));
        if (ev) { this.firedEvents.add(ev.orbit); this.pending = { type: 'event', item: ev }; return; }
        const ch = this.m.challenges.find(c => c.orbit === ob && !this.firedChallenges.has(c.orbit));
        if (ch) { this.firedChallenges.add(ch.orbit); this.pending = { type: 'challenge', item: ch }; return; }
        const an = this.anoms.find(a => a.orbit === ob && !this.firedAnoms.has(a.orbit));
        if (an) { this.firedAnoms.add(an.orbit); this.pending = { type: 'anomaly', item: an, timer: this.diff.timer }; return; }
      }
    }
    if (ob >= this.m.orbits) { this.done = true; return; }
    const s = this.state(), dt = this.dt, mods = this.activeMods();
    const skip = mods.some(x => x.skip);
    const contactMul = mods.reduce((a, x) => a * (x.contactMul || 1), 1);
    const comp = mods.find(x => x.compress), val = mods.find(x => x.value != null && !x.compress);
    const boost = mods.reduce((a, x) => a * (x.dataBoost || 1), 1);
    // leave safe mode once the arrays are lit and the battery has recovered
    if (this.safe && s.sunlit && this.batt > this.d.battWh * 0.5) { this.safe = false; this.note('Safe mode cleared. Instruments back online.'); }
    let load = COMMON.bus.w + (s.sunlit ? 0 : COMMON.heaterW);
    if (!this.safe && s.inPass && !skip) {
      for (const i of this.d.insts) {
        if (!this.enabled.has(i.id) || mods.some(x => x.skipInst === i.id)) continue;
        load += i.w;
        let vol = i.mbps * this.d.orbit.dataMul * boost * dt / 1000, ratio = 1;
        if (comp) { vol *= comp.compress; ratio = comp.value / comp.compress; }
        else if (val) ratio = val.value;
        this.addData(i.id, vol, ratio);
      }
    }
    const used = this.storageUsed();
    if (!this.safe && s.inContact && used > 1e-9) {
      load += this.d.radio.w;
      let send = Math.min(used, this.d.rateMbps * COMMON.radioEff * contactMul * dt / 1000);
      const frac = send / used;
      for (const [k, b] of this.buckets) {
        const v = b.vol * frac; b.vol -= v;
        const key = `${b.inst}|${b.phase}`;
        this.returned[key] = (this.returned[key] || 0) + v * b.ratio;
        this.sentTotal += v * b.ratio;
        if (b.vol < 1e-9) this.buckets.delete(k);
      }
    }
    const gen = s.sunlit ? this.d.solarW : 0;
    this.batt = Math.min(this.d.battWh, this.batt + (gen - load) * dt / 3600);
    if (this.batt <= 0) {
      this.batt = 0;
      if (!this.safe) { this.safe = true; this.brownouts++; this.note('Battery empty. Safe mode: instruments and radio off until the arrays recharge.', 'warn'); this.damage(8 * this.diff.dmg, 'power'); }
    }
    this.t += dt;
    if (Math.round(this.t / dt) % 6 === 0) this.history.push({ t: this.t, batt: this.batt / this.d.battWh, store: this.storageUsed() / this.d.storage, ret: this.sentTotal });
  }
  note(text, kind = 'info') { this.log.push({ t: this.t, orbit: this.orbit, text, kind }); }
  runAll() { let guard = 0; while (!this.done && guard++ < 1e6) { this.step(); if (this.pending) this.pending = null; } return this.result(); }
  objectiveProgress() {
    return this.m.objectives.map(o => {
      let got = 0;
      for (const id of o.inst) for (const ph of (o.phase === 'all' ? ['all', 'pre', 'post'] : [o.phase])) got += this.returned[`${id}|${ph}`] || 0;
      return { ...o, got, frac: Math.min(1, got / o.need) };
    });
  }
  result() {
    const objs = this.objectiveProgress();
    if (this.failed?.reason === 'insertion' || this.failed?.reason === 'launch') return { score: 0, preLoss: 0, outcome: 'failure', objs, failed: this.failed, missionFailed: true, brown: 0, lost: 0, challenge: 0, base: 0, pen: 0, penBrown: 0, penLost: 0, health: 0, sent: 0, generated: 0, onboard: 0 };
    const base = objs.reduce((s, o) => s + o.w * o.frac, 0);
    const penBrown = Math.min(15, this.brownouts * 3), penLost = Math.min(5, Math.floor(this.lost / 20)), pen = penBrown + penLost;
    const preLoss = Math.max(0, Math.min(100, Math.round(base + this.challengeScore - pen)));
    let score = preLoss;
    if (this.failed) score = Math.round(score * 0.6); // a lost spacecraft keeps only part of the credit
    const missionFailed = !!this.failed || score < this.diff.failBelow;
    // one outcome for badge, headline and summary
    const outcome = missionFailed ? 'failure' : objs.every(o => o.frac >= 1) ? 'success' : 'partial';
    const onboard = this.storageUsed();
    return { score, preLoss, outcome, objs, failed: this.failed, missionFailed, health: Math.round(this.health), failBelow: this.diff.failBelow, brown: this.brownouts, lost: this.lost, challenge: this.challengeScore, base, pen, penBrown, penLost, sent: this.sentTotal, generated: this.collected + this.lost, onboard, relay: this.relay };
  }
}

export function estimate(m, cfg, diff) { return new Sim(m, cfg, { diff }).runAll(); }
