import { reactive, ref, onMounted, onUnmounted } from 'vue'

/* ---------- helpers ---------- */
export const rnd = (a, b) => a + Math.random() * (b - a)
export const ri = (a, b) => Math.round(rnd(a, b))
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const drift = (v, min, max, step) => clamp(v + rnd(-step, step), min, max)
const pad = n => String(n).padStart(2, '0')
function ring(arr, v, n = 40) { arr.push(v); while (arr.length > n) arr.shift(); return arr }

/* ---------- singleton reactive state ----------
   Swap the tick() body for a real MQTT (mqtt.js) or OPC UA (node-opcua)
   subscription handler — mutate the same reactive `state` and the whole
   UI updates automatically. */
const state = reactive({
  clock: '00:00:00',
  broker: 'MQTT broker connected',

  kpi: { pwr: 512, eff: 88, flow: 1240, alm: 5, units: [62, 71, 54, 68, 30, 64], gen: [], dem: [] },
  water: { tanks: { t1: 72, t2: 55, t3: 88 }, ph: 7.2, turb: 0.8, cl: 1.2, do: 8.4,
    in: 1240, out: 1180, prs: 4.2, bw: 'Idle', inA: [], outA: [], pumpOn: true,
    pump2On: false, v1: true, v2: true, v3: true, cv1: 100, cv2: 25,
    p1: 0, p2: 0.3, lvl1: 62, lvl2: 40, lvlA: [], lvlA2: [] },
  solar: { pac: 3800, irr: 880, yld: 18.4, pr: 84, tmod: 48, tamb: 31, wind: 3.4, dc: 720,
    grid: 3760, freq: 50, pf: 0.99, co2: 12.4, strings: [8.1, 8.3, 7.9, 8.0, 8.2, 7.8],
    pA: [], iA: [], inverters: [], strOff: [false, false, false, false, false, false] },
  power: { v: 11, load: 42, freq: 50, pf: 0.98, txt: 58, txl: 74, txtap: 8, thd: 2.4,
    imp: 184, exp: 62, peak: 48, react: 6.2, L1: [], L2: [], L3: [], feeders: [5.2, 4.1, 6.4, 1.8, 4.2, 0], brkOpen: false },
  boiler: { bDrum: 54, bPrs: 138, bRpm: 30, steam: 420, fuel: 38, o2: 3.2, eff: 91, vib: 4.2, brg: 72,
    temps: [1180, 540, 538, 228, 148], prsA: [], tmpA: [], trip: false },
  mfg: { oee: 82, rate: 46, good: 18420, rej: 1.8, lines: [62, 71, 88, 53, 77, 64], act: [], tgt: [], stop: false },
  tags: { total: 0, good: 0, mps: 0, lat: 0, mpsA: [], qual: [90, 7, 3], rows: [] },

  hvac: { sup: 14.5, ret: 23, co2: 620, rh: 48, setp: 22, chL: 64, fanHz: 42,
    zones: [21.5, 22.4, 23.1, 20.8, 24.2, 22.0], supA: [], co2A: [], fanOn: true },
  air: { prs: 7.2, dp: 3.5, flow: 42, kw: 118, leak: 8, load: 72, prsA: [], flowA: [], unload: false },
  wind: { pwr: 8.4, ws: 7.2, dir: 240, avail: 96, cf: 38, gust: 9.1,
    turbs: [88, 92, 79, 95, 61, 90], pwrA: [], wsA: [], off: [false, false, false, false, false, false] },
  farm: { tanks: { k1: 80, k2: 50, k3: 60, k4: 20 }, inv: 18400, temp: 32, vap: 2.1,
    invA: [], lvlA: [], pumpOn: true,
    cells: [
      { t: 68, p: 45, fr: 1200, dr: 980 },
      { t: 72, p: 40, fr: 950, dr: 750 },
      { t: 65, p: 30, fr: 800, dr: 600 },
      { t: 70, p: 25, fr: 600, dr: 400 },
    ] },

  alarms: [
    { c: '', m: 'Boiler vibration above alert threshold (5.8 mm/s)', t: '2m ago' },
    { c: 'warn', m: 'Solar Zone C inverter derating — temperature', t: '7m ago' },
    { c: '', m: 'Feeder 6 breaker manually opened', t: '14m ago' },
    { c: 'warn', m: 'Clarifier tank level high (88%)', t: '21m ago' },
    { c: 'warn', m: 'Line 5 station ST5 fault — sensor timeout', t: '33m ago' },
  ],
})

/* ---------- tag definitions ---------- */
const tagDefs = [
  ['plant/water/tank1/level', 'MQTT', '%'], ['plant/water/ph', 'MQTT', 'pH'],
  ['ns=2;s=Water.Pump1.Run', 'OPC UA', 'bool'], ['plant/solar/inv1/pac', 'MQTT', 'kW'],
  ['ns=3;s=Solar.Irradiance', 'OPC UA', 'W/m²'], ['plant/power/bus/voltage', 'MQTT', 'kV'],
  ['ns=4;s=Power.Feeder3.Current', 'OPC UA', 'A'], ['plant/boiler/drum/level', 'MQTT', '%'],
  ['ns=5;s=Boiler.Steam.Press', 'OPC UA', 'bar'], ['plant/turbine/rpm', 'MQTT', 'rpm'],
  ['plant/mfg/line2/oee', 'MQTT', '%'], ['ns=6;s=Mfg.Line4.Count', 'OPC UA', 'pcs'],
  ['plant/power/freq', 'MQTT', 'Hz'], ['plant/solar/yield/today', 'MQTT', 'MWh'],
  ['ns=2;s=Water.Turbidity', 'OPC UA', 'NTU'], ['plant/boiler/flue/o2', 'MQTT', '%'],
]
const tagVals = tagDefs.map(d => ({ topic: d[0], src: d[1], unit: d[2], val: 0, q: 'GOOD', ts: '' }))

/* ---------- simulation tick ---------- */
function tick() {
  const d = new Date()
  state.clock = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  // KPI
  const k = state.kpi
  k.pwr = drift(k.pwr, 460, 560, 6); k.eff = drift(k.eff, 84, 93, 0.6)
  k.flow = drift(k.flow, 1100, 1350, 15)
  k.alm = clamp(k.alm + (Math.random() < 0.1 ? ri(-1, 1) : 0), 2, 9)
  k.units = k.units.map(v => drift(v, 25, 95, 3))
  ring(k.gen, k.pwr); ring(k.dem, k.pwr - rnd(-25, 25))

  // Water
  const w = state.water
  for (const t in w.tanks) w.tanks[t] = drift(w.tanks[t], 20, 98, 2)
  w.ph = drift(w.ph, 6.6, 7.8, 0.05); w.turb = drift(w.turb, 0.2, 1.6, 0.08)
  w.cl = drift(w.cl, 0.6, 1.8, 0.06); w.do = drift(w.do, 6.5, 9.5, 0.15)
  w.in = drift(w.in, 1100, 1350, 18); w.out = drift(w.out, 1050, 1320, 18)
  w.prs = drift(w.prs, 3.6, 4.8, 0.08); w.bw = Math.random() < 0.05 ? 'Running' : 'Idle'
  if (!w.pumpOn) { w.in *= 0.9; w.out *= 0.9; w.prs *= 0.95; w.bw = 'Stopped' }
  w.lvl1 = w.tanks.t1; w.lvl2 = w.tanks.t2
  w.p1 = w.pumpOn ? drift(w.p1 || 2, 1.4, 3.4, 0.18) : 0
  w.p2 = w.pump2On ? drift(w.p2 || 2, 1.4, 3.4, 0.18) : 0.3
  ring(w.inA, w.in); ring(w.outA, w.out); ring(w.lvlA, w.tanks.t1); ring(w.lvlA2, w.tanks.t2)

  // Solar
  const s = state.solar
  s.irr = drift(s.irr, 650, 1000, 20); s.pac = s.irr * 4.3 + rnd(-60, 60)
  s.pr = drift(s.pr, 80, 90, 0.5); s.yld = drift(s.yld + 0.002, 15, 24, 0.05)
  s.tmod = drift(s.tmod, 40, 58, 0.6); s.tamb = drift(s.tamb, 26, 36, 0.4)
  s.wind = drift(s.wind, 1, 7, 0.4); s.dc = drift(s.dc, 690, 760, 5)
  s.grid = s.pac - rnd(10, 40); s.freq = drift(s.freq, 49.95, 50.05, 0.02)
  s.pf = drift(s.pf, 0.97, 1, 0.005); s.co2 = drift(s.co2 + 0.003, 11, 14, 0.05)
  s.strings = s.strings.map((v, i) => s.strOff[i] ? 0 : drift(v || rnd(6.5, 9), 6.5, 9, 0.2))
  const sOn = s.strOff.filter(x => !x).length / s.strOff.length
  s.pac *= sOn; s.grid = s.pac - rnd(10, 40)
  ring(s.pA, s.pac); ring(s.iA, s.irr)

  // Power
  const p = state.power
  p.v = drift(p.v, 10.6, 11.4, 0.05); p.load = drift(p.load, 34, 52, 1)
  p.freq = drift(p.freq, 49.95, 50.05, 0.02); p.pf = drift(p.pf, 0.95, 0.99, 0.005)
  p.txt = drift(p.txt, 50, 68, 0.6); p.txl = drift(p.txl, 65, 85, 1); p.thd = drift(p.thd, 1.8, 3.2, 0.1)
  p.imp = drift(p.imp + 0.01, 180, 200, 0.5); p.exp = drift(p.exp + 0.005, 55, 70, 0.4)
  p.react = drift(p.react, 5, 8, 0.2)
  p.feeders = p.feeders.map((v, i) => i === 5 ? 0 : drift(v, 1, 8, 0.4))
  if (p.brkOpen) { p.feeders[3] = 0; p.load *= 0.92 }
  const base = p.load / 3
  ring(p.L1, base * 100 + rnd(-30, 30)); ring(p.L2, base * 100 + rnd(-30, 30)); ring(p.L3, base * 100 + rnd(-30, 30))

  // Boiler
  const b = state.boiler
  b.bDrum = drift(b.bDrum, 45, 62, 1); b.bPrs = drift(b.bPrs, 128, 148, 1.5); b.bRpm = drift(b.bRpm, 29.5, 30.5, 0.15)
  b.steam = drift(b.steam, 380, 450, 5); b.fuel = drift(b.fuel, 34, 42, 0.6); b.o2 = drift(b.o2, 2.6, 3.8, 0.1)
  b.eff = drift(b.eff, 88, 93, 0.4); b.vib = drift(b.vib, 2.5, 6, 0.3); b.brg = drift(b.brg, 65, 82, 0.8)
  const lo = [1100, 500, 500, 210, 135], hi = [1250, 580, 575, 250, 165]
  b.temps = b.temps.map((v, i) => drift(v, lo[i], hi[i], 8))
  if (b.trip) { b.bRpm = Math.max(0, b.bRpm - 1.5); b.steam *= 0.95; b.bPrs *= 0.985; b.vib = drift(b.vib, 0.5, 2, 0.3) }
  ring(b.prsA, b.bPrs); ring(b.tmpA, b.temps[1])

  // Mfg
  const m = state.mfg
  m.oee = drift(m.oee, 76, 88, 0.7); m.rate = drift(m.rate, 40, 52, 1)
  if (m.stop) { m.rate *= 0.85; m.oee *= 0.97 } else m.good += ri(8, 20)
  m.rej = drift(m.rej, 0.8, 3, 0.15)
  m.lines = m.lines.map(v => drift(v, 30, 95, 3))
  ring(m.act, m.rate); ring(m.tgt, 48)

  // Tags
  let good = 0, unc = 0, bad = 0
  tagVals.forEach(t => {
    if (t.unit === 'bool') t.val = Math.random() < 0.5 ? 1 : 0
    else t.val = drift(t.val || rnd(10, 100), 0, 1000, t.val ? Math.max(1, t.val * 0.03) : 20)
    t.q = Math.random() < 0.93 ? 'GOOD' : Math.random() < 0.6 ? 'UNCERT' : 'BAD'
    t.ts = state.clock
    if (t.q === 'GOOD') good++; else if (t.q === 'UNCERT') unc++; else bad++
  })
  state.tags.rows = tagVals.map(t => ({ ...t }))
  state.tags.mps = ri(180, 340)
  state.tags.total = tagVals.length * 64
  state.tags.good = Math.round(state.tags.total * rnd(0.95, 0.99))
  state.tags.lat = ri(4, 18)
  state.tags.qual = [good, unc, bad]
  ring(state.tags.mpsA, state.tags.mps)

  // HVAC
  const h = state.hvac
  h.sup = drift(h.sup, 12, 17, 0.3); h.ret = drift(h.ret, 21, 25, 0.3)
  h.co2 = drift(h.co2, 480, 780, 12); h.rh = drift(h.rh, 40, 58, 0.8)
  h.chL = drift(h.chL, 45, 85, 2); h.fanHz = drift(h.fanHz, 35, 50, 0.8)
  h.zones = h.zones.map(v => drift(v, 19, 25, 0.3))
  if (!h.fanOn) { h.fanHz = 0; h.sup = Math.min(h.ret, h.sup + 0.5); h.co2 = Math.min(900, h.co2 + 15) }
  ring(h.supA, h.sup); ring(h.co2A, h.co2)

  // Compressed Air
  const ca = state.air
  ca.prs = drift(ca.prs, 6.4, 7.8, 0.06); ca.dp = drift(ca.dp, 2, 5, 0.15)
  ca.flow = drift(ca.flow, 30, 55, 1.5); ca.kw = drift(ca.kw, 95, 140, 3)
  ca.leak = drift(ca.leak, 5, 14, 0.4); ca.load = drift(ca.load, 55, 92, 2)
  if (ca.unload) { ca.flow *= 0.9; ca.prs *= 0.985; ca.kw *= 0.96; ca.load *= 0.9 }
  ring(ca.prsA, ca.prs); ring(ca.flowA, ca.flow)

  // Wind
  const wd = state.wind
  wd.ws = drift(wd.ws, 4, 12, 0.5); wd.gust = clamp(wd.ws + rnd(0.5, 2.5), 4, 16)
  wd.dir = drift(wd.dir, 180, 300, 6); wd.cf = drift(wd.cf, 25, 55, 2)
  wd.avail = drift(wd.avail, 90, 99, 0.5)
  wd.turbs = wd.turbs.map((v, i) => wd.off[i] ? Math.max(0, v - 8) : drift(v, 40, 99, 4))
  wd.pwr = wd.turbs.reduce((a, b) => a + b, 0) / 100 * 1.8
  ring(wd.pwrA, wd.pwr); ring(wd.wsA, wd.ws)

  // Tank Farm
  const tf = state.farm
  for (const t in tf.tanks) tf.tanks[t] = drift(tf.tanks[t], 15, 95, 1.5)
  tf.temp = drift(tf.temp, 28, 38, 0.4); tf.vap = drift(tf.vap, 1.2, 3.2, 0.1)
  tf.inv = Math.round(Object.values(tf.tanks).reduce((a, b) => a + b, 0) * 80)
  tf.cells.forEach(c => {
    c.t = drift(c.t, 60, 75, 0.5); c.p = drift(c.p, 22, 50, 0.8)
    c.fr = drift(c.fr, 500, 1300, 25); c.dr = drift(c.dr, 350, 1000, 22)
  })
  ring(tf.invA, tf.inv); ring(tf.lvlA, tf.tanks.k1)
}

function slowTick() {
  state.solar.inverters = [1, 2, 3, 4, 5, 6].map(i => ({
    n: 'INV-0' + i, p: rnd(580, 640), s: i === 5 ? 'DERATE' : 'RUN',
  }))
}

/* ---------- composable ---------- */
let timers = []
let started = false
export function usePlantData() {
  onMounted(() => {
    if (started) return
    started = true
    tick(); slowTick()
    timers.push(setInterval(tick, 1000))
    timers.push(setInterval(slowTick, 5000))
  })
  onUnmounted(() => { /* keep singleton running across view switches */ })
  return { state }
}

export { state }
