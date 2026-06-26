// Generic per-element-type simulation for the SCADA builder.
// Auto-generates drifting demo values and animates pipe flow based on the
// pipe's SOURCE element state (simple source-check, not a full upstream chain).
import { clamp, drift, rnd } from '../composables/usePlantData'
import { arc } from './shapes'

// draw the sim-range marker lines on a cylinder tank's 0..100 scale (window y 36..214)
export function setTankMarks(elm) {
  if (elm.get('type') !== 's.Cyl') return
  const lo = elm.get('simMin') ?? 20, hi = elm.get('simMax') ?? 70
  const Y = 36, H = 178
  const yLo = Y + H * (1 - lo / 100), yHi = Y + H * (1 - hi / 100)
  elm.attr('markLo', { y1: yLo, y2: yLo, stroke: '#f59e0b' })
  elm.attr('markHi', { y1: yHi, y2: yHi, stroke: '#dc2626' })
}

function tank(elm, isHopper, nodeFlow, outletActive) {
  // capacity follows the balance of inflow vs outflow; idle tanks sit in a 90-95 mock band
  let lvl = elm.get('level') ?? 60
  const filling = !!nodeFlow[elm.id], draining = !!outletActive[elm.id]
  if (filling && !draining) lvl = clamp(lvl + rnd(1.5, 3.5), 8, 96)
  else if (draining && !filling) lvl = clamp(lvl - rnd(1.5, 3.5), 8, 96)
  else if (filling && draining) lvl = drift(lvl, 8, 96, 1.5)
  else lvl = lvl < 90 ? clamp(lvl + rnd(1, 2.5), 8, 95) : drift(lvl, 90, 95, 1.2) // idle: gently climb into 90-95 mock band
  elm.set('level', lvl, { silent: true })
  if (isHopper) elm.attr('fill', { y: 30 + 78 * (1 - lvl / 100), height: 78 * lvl / 100 })
  else { const h = elm.size().height - 72; elm.attr('fill', { y: 36 + h * (1 - lvl / 100), height: h * lvl / 100 }) }
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

function gauge(elm, graph, nodeFlow, ctrlPct) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  let v = gaugePressure(elm, graph, nodeFlow, ctrlPct) // pump pressure via the tap; null if not connected
  if (v == null) v = 0
  v = Math.max(lo, Math.min(hi, v))
  elm.set('value', v, { silent: true })
  const frac = hi > lo ? (v - lo) / (hi - lo) : 0
  const col = frac > 0.85 ? '#dc2626' : '#16a34a'
  elm.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(frac), stroke: col }, val: { text: v.toFixed(1) } })
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

// Propagate flow downstream from sources (tanks above their mark, zones, un-fed pumps).
// A pump/valve only PASSES flow if water actually reaches it — so a dry tank kills the
// whole downstream path. Returns per-pipe live + per-element "has water" map.
function propagateFlow(graph, ctrlPct) {
  const links = graph.getLinks().filter(l => l.get('type') === 's.FlowPipe')
  const inbound = {}
  links.forEach(l => { const t = l.target() && l.target().id; if (t) inbound[t] = (inbound[t] || 0) + 1 })
  const nodeFlow = {}
  const linkLive = new Map()
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
    return !!nodeFlow[node.id] // tap / flow meter / pass-through: only if fed
  }
  let changed = true, guard = 0
  while (changed && guard < 200) {
    changed = false; guard++
    for (const l of links) {
      const s = l.source(), tg = l.target(); const sId = s && s.id, tId = tg && tg.id
      if (!sId || !tId) continue
      const sNode = graph.getCell(sId); if (!sNode) continue
      const live = emits(sNode, s.port)
      linkLive.set(l.id, live)
      if (live && !nodeFlow[tId]) { nodeFlow[tId] = true; changed = true }
    }
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
}

export function simulateTick(graph) {
  const ctrlPct = controlMap(graph)
  const { linkLive, nodeFlow, inbound } = propagateFlow(graph, ctrlPct)
  // a tank is "draining" if any of its outlet pipes is live
  const outletActive = {}
  graph.getLinks().forEach(l => {
    if (l.get('type') !== 's.FlowPipe' || !linkLive.get(l.id)) return
    const sId = l.source() && l.source().id; if (sId) outletActive[sId] = true
  })
  graph.getElements().forEach(elm => {
    switch (elm.get('type')) {
      case 's.Cyl': tank(elm, false, nodeFlow, outletActive); break
      case 's.Hopper': tank(elm, true, nodeFlow, outletActive); break
      case 's.Pump': pump(elm, nodeFlow[elm.id] || !inbound[elm.id]); break
      case 's.Valve': valve(elm); break
      case 's.PG': gauge(elm, graph, nodeFlow, ctrlPct); break
      case 's.Flow': flowMeter(elm, graph, nodeFlow, ctrlPct); break
      case 's.Tap': tap(elm, graph, nodeFlow, ctrlPct); break
      case 's.Quality': quality(elm); break
    }
  })
  animateLinks(graph, ctrlPct, linkLive)
}
