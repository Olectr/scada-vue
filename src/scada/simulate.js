// Generic per-element-type simulation for the SCADA builder.
// Auto-generates drifting demo values and animates pipe flow based on the
// pipe's SOURCE element state (simple source-check, not a full upstream chain).
import { clamp, drift, rnd, state } from '../composables/usePlantData'
import { arcSeg, needlePoint, tickPoint } from './shapes'

// curated live tags from the plant data singleton — bindable to tanks (%) and gauges (value)
export const TAGS = [
  { label: 'Water · Tank 1 level %', path: 'water.lvl1' },
  { label: 'Water · Tank 2 level %', path: 'water.lvl2' },
  { label: 'Water · Pump 1 pressure', path: 'water.p1' },
  { label: 'Water · Header pressure', path: 'water.prs' },
  { label: 'Boiler · Drum level %', path: 'boiler.bDrum' },
  { label: 'Boiler · Steam pressure', path: 'boiler.bPrs' },
  { label: 'Air · System pressure', path: 'air.prs' },
  { label: 'Solar · Irradiance', path: 'solar.irr' },
]
function readTag(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state) }

// draw the sim-range marker lines on a cylinder tank's 0..100 scale (window y 36..214)
export function setTankMarks(elm) {
  if (elm.get('type') !== 's.Cyl') return
  const lo = elm.get('simMin') ?? 20, hi = elm.get('simMax') ?? 70
  const Y = 36, H = 178
  const yLo = Y + H * (1 - lo / 100), yHi = Y + H * (1 - hi / 100)
  elm.attr('markLo', { y1: yLo, y2: yLo, stroke: '#f59e0b' })
  elm.attr('markHi', { y1: yHi, y2: yHi, stroke: '#dc2626' })
}

function tank(elm, isHopper, inflow, outflow) {
  // capacity follows the balance of inflow vs outflow; idle tanks sit in a 90-95 mock band
  let lvl = elm.get('level') ?? 60
  const tag = elm.get('tag')
  if (tag) {
    lvl = clamp(Number(readTag(tag)) || 0, 0, 100) // bound to a real tag
  } else {
    const filling = !!inflow[elm.id], draining = !!outflow[elm.id]
    if (filling && !draining) lvl = clamp(lvl + rnd(1.5, 3.5), 8, 96)
    else if (draining && !filling) lvl = clamp(lvl - rnd(1.5, 3.5), 8, 96)
    else if (filling && draining) lvl = drift(lvl, 8, 96, 1.5)
    else lvl = lvl < 90 ? clamp(lvl + rnd(1, 2.5), 8, 95) : drift(lvl, 90, 95, 1.2) // idle: gently climb into 90-95 mock band
  }
  elm.set('level', lvl, { silent: true })
  // art lives in base-size coords inside the 'sc' scale group — never use elm.size() here
  if (isHopper) {
    elm.attr('fill', { y: 30 + 78 * (1 - lvl / 100), height: 78 * lvl / 100 })
  } else {
    const y = 36 + 178 * (1 - lvl / 100), h = 178 * lvl / 100
    elm.attr('fill', { y, height: h })
    elm.attr('valText', { y: y + h / 2 + 6, text: Math.round(lvl) + '%' }) // centered readout in the fill
  }
}

// Visual-only helpers (no value drift) — shared so the builder's edit-mode
// Open/Close and slider feedback render identically to the running sim.
export function setPumpVisual(elm) {
  const on = !!elm.get('on')
  elm.attr('imp/class', on ? 'wp-spin' : '')
  elm.attr('inner/fill', on ? '#5fb98f' : '#8b949e')
}
export function setValveVisual(elm) {
  elm.attr('ind/fill', elm.get('open') ? '#16a34a' : '#cbd5e1')
}

function pump(elm, fed) {
  // a pump only actually runs if it's on AND has water (dry-run → stops)
  const running = !!elm.get('on') && fed
  elm.attr('imp/class', running ? 'wp-spin' : '')
  elm.attr('inner/fill', running ? '#5fb98f' : '#8b949e')
  elm.set('pressure', running ? drift(elm.get('pressure') || 2, 1.4, 3.4, 0.18) : 0, { silent: true })
  if (running) elm.set('runtime', (elm.get('runtime') || 0) + 1, { silent: true }) // seconds run-hours
}

function valve(elm) {
  setValveVisual(elm)
}

// follow a gauge's dashed leader → tap, then read the tap's network pump pressure
function gaugePressure(gaugeElm, graph, nodeFlow, ctrlPct) {
  const leaders = graph.getConnectedLinks(gaugeElm).filter(l => l.get('type') === 's.Leader')
  for (const l of leaders) {
    const a = l.source() && l.source().id, b = l.target() && l.target().id
    const tapId = a === gaugeElm.id ? b : a
    const tap = tapId && graph.getCell(tapId)
    if (!tap || tap.get('type') !== 's.Tap') continue
    return nodeFlow[tap.id] ? connectedPumpPressure(tap, graph, ctrlPct) : 0
  }
  return null
}

// paint the needle + value text for a gauge's CURRENT value — shared by layoutGaugeBands
// (initial paint at creation/load, using whatever value is already set) and gauge() (every
// sim tick, using the freshly computed live value). Keeping this in one place means the two
// call sites can never draw the needle differently.
function paintNeedle(elm, v, lo, hi) {
  const frac = hi > lo ? (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) : 0
  const [nx, ny] = needlePoint(frac)
  elm.attr({ needle: { x2: nx, y2: ny }, val: { text: Number(v).toFixed(1) } })
}

// static dial layout — 3 color-band arcs + 5 tick labels, derived from simMin/simMax and the
// bandYellow/bandRed % thresholds. Called on gauge creation and whenever the range/thresholds
// change (property panel) — NOT every sim tick, since none of this depends on the live value.
export function layoutGaugeBands(elm) {
  if (elm.get('type') !== 's.PG') return
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  const yFrac = Math.max(0, Math.min(1, (elm.get('bandYellow') ?? 60) / 100))
  const rFrac = Math.max(yFrac, Math.min(1, (elm.get('bandRed') ?? 85) / 100))
  elm.attr({ bandG: { d: arcSeg(0, yFrac) }, bandY: { d: arcSeg(yFrac, rFrac) }, bandR: { d: arcSeg(rFrac, 1) } })
  for (let i = 0; i < 5; i++) {
    const f = i / 4
    const [x, y] = tickPoint(f)
    const v = lo + (hi - lo) * f
    const anchor = x < 48 - 3 ? 'end' : x > 48 + 3 ? 'start' : 'middle'
    elm.attr('tick' + i, { x, y, textAnchor: anchor, text: String(Math.round(v * 10) / 10) })
  }
  paintNeedle(elm, elm.get('value') ?? lo, lo, hi)
}

function gauge(elm, graph, nodeFlow, ctrlPct) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  const tag = elm.get('tag')
  let v = tag ? (Number(readTag(tag)) || 0) : gaugePressure(elm, graph, nodeFlow, ctrlPct) // bound tag or pump pressure via tap
  if (v == null) v = 0
  v = Math.max(lo, Math.min(hi, v))
  elm.set('value', v, { silent: true })
  paintNeedle(elm, v, lo, hi)
}

// flow meter: walk the flow-pipe network from the meter; a running pump reachable
// without crossing a closed valve gives flow (m³/h ≈ pressure × 120). Respects control gating.
// max pressure of an ON, non-control-closed pump reachable through the pipe network (open valves only)
function connectedPumpPressure(elm, graph, ctrlPct) {
  const gated = id => ctrlPct && ctrlPct[id] != null && ctrlPct[id] <= 0
  const seen = new Set([elm.id]); const q = [elm.id]; let p = 0, steps = 0
  while (q.length && steps < 80) {
    steps++
    const id = q.shift(); const node = graph.getCell(id); if (!node) continue
    const t = node.get('type')
    if (id !== elm.id) {
      if (t === 's.Pump') { if (node.get('on') && !gated(id)) p = Math.max(p, node.get('pressure') || 0); continue }
      if (t === 's.Valve' && !node.get('open')) continue
    }
    for (const fl of graph.getConnectedLinks(node).filter(x => x.get('type') === 's.FlowPipe')) {
      const s = fl.source() && fl.source().id, tg = fl.target() && fl.target().id
      const other = s === id ? tg : s
      if (other && !seen.has(other)) { seen.add(other); q.push(other) }
    }
  }
  return p
}

function flowMeter(elm, graph, nodeFlow, ctrlPct) {
  // flow shown only when water actually reaches the meter; magnitude from the driving pump
  const mph = nodeFlow[elm.id] ? Math.round(connectedPumpPressure(elm, graph, ctrlPct) * 120) : 0
  elm.set('flow', mph, { silent: true })
  if (mph > 0) elm.set('total', (elm.get('total') || 0) + mph / 3600, { silent: true }) // accumulate m³
  elm.attr('val/text', mph + ' m³/h')
  elm.attr('rotor/class', mph > 0 ? 'wp-spin' : '')
}

// pressure tap: shows live pressure of the connected running pump (bar), only when water reaches it
function tap(elm, graph, nodeFlow, ctrlPct) {
  const bar = nodeFlow[elm.id] ? connectedPumpPressure(elm, graph, ctrlPct) : 0
  elm.set('pressure', bar, { silent: true })
  elm.attr('pVal/text', bar.toFixed(1))
  elm.attr('val/text', bar.toFixed(1) + ' bar')
}

// custom component live behavior: static | onoff | openclose | level | meter
function custom(elm) {
  const beh = elm.get('behavior') || 'static', h = elm.size().height
  if (beh === 'level') {
    const lo = elm.get('vmin') ?? 0, hi = elm.get('vmax') ?? 100
    const lvl = drift(elm.get('level') ?? (lo + hi) / 2, lo, hi, Math.max(0.5, (hi - lo) / 50))
    elm.set('level', lvl, { silent: true })
    const frac = hi > lo ? (lvl - lo) / (hi - lo) : 0
    if (elm.get('svgBody')) {
      // AI-drawn body: animate the fill inside the declared liquid-interior zone (0..1 fractions of the ART,
      // not the element box — the drawing is letterboxed/centered when aspect ratios differ)
      const z = elm.get('levelZone')
      if (z && z.w > 0 && z.h > 0) {
        const w = elm.size().width
        const vb = elm.get('svgVB')
        let ox = 0, oy = 0, aw = w, ah = h
        if (vb && vb.w > 0 && vb.h > 0) {
          const s = Math.min(w / vb.w, h / vb.h)
          aw = vb.w * s; ah = vb.h * s
          ox = (w - aw) / 2; oy = (h - ah) / 2
        }
        elm.attr('fill', { opacity: 0.5, rx: 2, x: ox + z.x * aw, width: z.w * aw, y: oy + (z.y + z.h * (1 - frac)) * ah, height: z.h * frac * ah })
      } else elm.attr('fill/opacity', 0)
    } else {
      elm.attr('fill', { opacity: 0.45, y: 3 + (h - 6) * (1 - frac), height: (h - 6) * frac })
    }
    elm.attr('val', { opacity: 1, text: Math.round(frac * 100) + '%' })
  } else if (beh === 'meter') {
    const lo = elm.get('vmin') ?? 0, hi = elm.get('vmax') ?? 10
    const v = drift(elm.get('value') ?? (lo + hi) / 2, lo, hi, (hi - lo) / 40 || 0.2)
    elm.set('value', v, { silent: true })
    elm.attr('val', { opacity: 1, text: v.toFixed(1) + ' ' + (elm.get('unit') || '') })
  } else if (beh === 'onoff') {
    elm.attr('ind', { opacity: 1, fill: elm.get('on') ? '#16a34a' : '#cbd5e1' })
  } else if (beh === 'openclose') {
    elm.attr('ind', { opacity: 1, fill: elm.get('open') ? '#16a34a' : '#cbd5e1' })
  }
}

// injection well card: a well only injects while injection water actually reaches it
// (fed comes from the solved pipe network), so stopping a pump or closing a valve
// upstream drops this card — and therefore the summary totals — to zero.
function wellCard(elm, fed) {
  const lo = elm.get('simMin') ?? 20, hi = elm.get('simMax') ?? 90
  const rate = fed ? drift(elm.get('rate') ?? (lo + hi) / 2, lo, hi, Math.max(0.5, (hi - lo) / 25)) : 0
  elm.set('rate', rate, { silent: true })
  elm.attr('rate/text', Math.round(rate) + ' m³/h')
}

// injection summary: both rows are summed from the well cards on screen — total injection
// and the produced-water share of it. Call this AFTER every well has ticked.
export function sumPanel(elm, graph) {
  let total = 0, prod = 0
  graph.getElements().forEach(w => {
    if (w.get('type') !== 's.Well') return
    const r = Number(w.get('rate')) || 0
    total += r
    if (w.get('produced')) prod += r
  })
  elm.set('total', total, { silent: true })
  elm.set('prod', prod, { silent: true })
  elm.attr('v1/text', String(Math.round(total)))
  elm.attr('v2/text', String(Math.round(prod)))
}

// status dot: green/red from the bound pump or valve, amber when unbound (or bound to
// something with no open/closed state, e.g. a deleted target or a passive component).
export function setDotVisual(elm, graph) {
  const t = elm.get('watch') ? graph.getCell(elm.get('watch')) : null
  const ty = t && t.get('type'), beh = t && t.get('behavior')
  const on = ty === 's.Pump' ? !!t.get('on')
    : ty === 's.Valve' ? !!t.get('open')
    : ty === 's.Custom' && beh === 'onoff' ? !!t.get('on')
    : ty === 's.Custom' && beh === 'openclose' ? !!t.get('open')
    : null
  elm.attr('dot', {
    fill: on === null ? '#f59e0b' : on ? '#22c55e' : '#ef4444',
    rx: elm.get('round') ? elm.size().width / 2 : 3,
  })
}

function quality(elm) {
  const ph = drift(elm.get('ph') ?? 7.2, 6.6, 7.8, 0.05); elm.set('ph', ph, { silent: true }); elm.attr('phV/text', ph.toFixed(2))
  const tb = drift(elm.get('turb') ?? 0.8, 0.2, 1.6, 0.08); elm.set('turb', tb, { silent: true }); elm.attr('tbV/text', tb.toFixed(2) + ' NTU')
  const cl = drift(elm.get('cl') ?? 1.2, 0.6, 1.8, 0.06); elm.set('cl', cl, { silent: true }); elm.attr('clV/text', cl.toFixed(2) + ' mg/L')
  const dox = drift(elm.get('do') ?? 8.4, 6.5, 9.5, 0.15); elm.set('do', dox, { silent: true }); elm.attr('doV/text', dox.toFixed(1) + ' mg/L')
}

// Build id -> driving-control-% map from every Control's `targets` list.
function controlMap(graph) {
  const m = {}
  graph.getElements().forEach(elm => {
    if (elm.get('type') !== 's.Control') return
    const pct = clamp(elm.get('pct') ?? 100, 0, 100)
    ;(elm.get('targets') || []).forEach(id => { m[id] = pct })
  })
  return m
}

// Two-pass flow solver:
//  SUPPLY (forward): water flows downstream from sources (tank above mark, zone, un-fed pump),
//    blocked by closed valves / off / control-0 → nodeFlow[id] = water reaches id.
//  DEMAND (backward): a node can discharge only if a downstream OPEN path reaches a sink
//    (zone / tank / hopper / open pipe end) → canDrain[id].
//  A pipe flows iff its source emits AND its target can drain. So closing a valve removes the
//  downstream demand → the upstream pipe stops and the tank fills; opening it lets it drain.
function propagateFlow(graph, ctrlPct) {
  const links = graph.getLinks().filter(l => l.get('type') === 's.FlowPipe')
  const inbound = {}, outgoing = {}
  links.forEach(l => {
    const s = l.source() && l.source().id, t = l.target() && l.target().id
    if (t) inbound[t] = (inbound[t] || 0) + 1
    if (s) outgoing[s] = (outgoing[s] || 0) + 1
  })
  const nodeFlow = {}, canDrain = {}
  const gated = id => ctrlPct[id] != null && ctrlPct[id] <= 0 // control closed this component
  function emits(node, port) {
    const t = node.get('type')
    if (t === 's.Cyl' || t === 's.Hopper') {
      const lvl = node.get('level') ?? 0, hi = node.get('simMax') ?? 70, lo = node.get('simMin') ?? 20
      return port === 'top' ? lvl > hi : lvl > lo
    }
    if (t === 's.Zone') return true // supply source
    if (t === 's.Pump') return node.get('on') && !gated(node.id) && (nodeFlow[node.id] || !inbound[node.id])
    if (t === 's.Valve') return node.get('open') && !gated(node.id) && (nodeFlow[node.id] || !inbound[node.id])
    if (t === 's.Custom') {
      const b = node.get('behavior')
      if (b === 'onoff') return node.get('on') && !gated(node.id) && (nodeFlow[node.id] || !inbound[node.id])
      if (b === 'openclose') return node.get('open') && !gated(node.id) && (nodeFlow[node.id] || !inbound[node.id])
    }
    return !!nodeFlow[node.id] // tap / flow meter / pass-through: only if fed
  }
  const canPass = node => {
    const t = node.get('type')
    if (t === 's.Valve') return !!node.get('open') && !gated(node.id)
    if (t === 's.Pump') return !!node.get('on') && !gated(node.id)
    if (t === 's.Custom') {
      if (node.get('behavior') === 'onoff') return !!node.get('on') && !gated(node.id)
      if (node.get('behavior') === 'openclose') return !!node.get('open') && !gated(node.id)
    }
    return true
  }
  // passive instruments draw no volumetric flow → never a hydraulic sink, even at a dead end
  const NON_SINK = { 's.PG': 1, 's.Flow': 1, 's.Tap': 1, 's.Quality': 1, 's.Control': 1, 's.Note': 1, 's.Sum': 1, 's.Dot': 1 }
  // SUPPLY forward
  let changed = true, guard = 0
  while (changed && guard < 200) {
    changed = false; guard++
    for (const l of links) {
      const s = l.source(), tg = l.target(); const sId = s && s.id, tId = tg && tg.id
      if (!sId || !tId) continue
      const sNode = graph.getCell(sId); if (!sNode) continue
      if (emits(sNode, s.port) && !nodeFlow[tId]) { nodeFlow[tId] = true; changed = true }
    }
  }
  // DEMAND backward — seed sinks (zone/tank/hopper) and open pipe ends (no outgoing pipe)
  graph.getElements().forEach(n => {
    const t = n.get('type')
    if (t === 's.Zone' || t === 's.Cyl' || t === 's.Hopper' || (!outgoing[n.id] && !NON_SINK[t])) canDrain[n.id] = true
  })
  changed = true; guard = 0
  while (changed && guard < 200) {
    changed = false; guard++
    for (const l of links) {
      const s = l.source(), tg = l.target(); const sId = s && s.id, tId = tg && tg.id
      if (!sId || !tId || canDrain[sId]) continue
      const sNode = graph.getCell(sId); if (!sNode) continue
      if (canDrain[tId] && canPass(sNode)) { canDrain[sId] = true; changed = true }
    }
  }
  // a pipe carries flow only with supply at source AND demand at target
  const linkLive = new Map()
  for (const l of links) {
    const s = l.source(), tg = l.target(); const sId = s && s.id, tId = tg && tg.id
    const sNode = sId && graph.getCell(sId)
    linkLive.set(l.id, !!(sNode && tId && emits(sNode, s.port) && canDrain[tId]))
  }
  return { linkLive, nodeFlow, inbound }
}

function animateLinks(graph, ctrlPct, linkLive) {
  graph.getLinks().forEach(l => {
    if (l.get('type') === 's.Leader') return // instrument leaders don't carry flow
    const live = !!linkLive.get(l.id)
    const srcId = l.source() && l.source().id
    const pct = srcId && ctrlPct[srcId] != null ? ctrlPct[srcId] : 100
    const dur = (0.35 + (1 - pct / 100) * 1.9).toFixed(2)
    l.attr('line', { opacity: live ? 1 : 0, class: live ? 'wp-flow wp-on' : 'wp-flow', style: { animationDuration: dur + 's' } })
  })
}

// Re-animate every pipe from current element state WITHOUT drifting values
// (instant feedback in edit mode / on slider drag).
export function refreshLinks(graph) {
  const ctrlPct = controlMap(graph)
  const { linkLive } = propagateFlow(graph, ctrlPct)
  animateLinks(graph, ctrlPct, linkLive)
  // status dots watch pump/valve state, which is exactly what edit-mode toggles change
  graph.getElements().forEach(e => { if (e.get('type') === 's.Dot') setDotVisual(e, graph) })
}

export function simulateTick(graph) {
  const ctrlPct = controlMap(graph)
  const { linkLive, inbound } = propagateFlow(graph, ctrlPct)
  // derive actual through-flow at each element from the SOLVED pipes (supply ∧ demand)
  const inflow = {}, outflow = {}, flowing = {}
  graph.getLinks().forEach(l => {
    if (l.get('type') !== 's.FlowPipe' || !linkLive.get(l.id)) return
    const s = l.source() && l.source().id, t = l.target() && l.target().id
    if (s) { outflow[s] = true; flowing[s] = true }
    if (t) { inflow[t] = true; flowing[t] = true }
  })
  graph.getElements().forEach(elm => {
    switch (elm.get('type')) {
      case 's.Cyl': tank(elm, false, inflow, outflow); break
      case 's.Hopper': tank(elm, true, inflow, outflow); break
      case 's.Pump': pump(elm, flowing[elm.id] || !inbound[elm.id]); break
      case 's.Valve': valve(elm); break
      case 's.PG': gauge(elm, graph, flowing, ctrlPct); break
      case 's.Flow': flowMeter(elm, graph, flowing, ctrlPct); break
      case 's.Tap': tap(elm, graph, flowing, ctrlPct); break
      case 's.Quality': quality(elm); break
      case 's.Custom': custom(elm); break
      case 's.Well': wellCard(elm, !!flowing[elm.id]); break
      case 's.Dot': setDotVisual(elm, graph); break
    }
  })
  // summary panels run in a second pass — element order isn't guaranteed, and the totals
  // are only correct once every well card has its fresh rate
  graph.getElements().forEach(elm => { if (elm.get('type') === 's.Sum') sumPanel(elm, graph) })
  animateLinks(graph, ctrlPct, linkLive)
}
