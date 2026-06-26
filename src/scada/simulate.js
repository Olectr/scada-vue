// Generic per-element-type simulation for the SCADA builder.
// Auto-generates drifting demo values and animates pipe flow based on the
// pipe's SOURCE element state (simple source-check, not a full upstream chain).
import { clamp, drift } from '../composables/usePlantData'
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

function tank(elm, isHopper) {
  // level drifts across the full operating span; simMin/simMax are LOW/HIGH marks + flow gates
  const lvl = drift(elm.get('level') ?? 60, 8, 96, 2)
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

function pump(elm) {
  const on = !!elm.get('on')
  setPumpVisual(elm)
  elm.set('pressure', on ? drift(elm.get('pressure') || 2, 1.4, 3.4, 0.18) : 0, { silent: true })
}

function valve(elm) {
  setValveVisual(elm)
}

// follow a gauge's dashed leader → tap → flow-connected pump and read its live pressure
function gaugePressure(gaugeElm, graph) {
  const leaders = graph.getConnectedLinks(gaugeElm).filter(l => l.get('type') === 's.Leader')
  for (const l of leaders) {
    const a = l.source() && l.source().id, b = l.target() && l.target().id
    const tapId = a === gaugeElm.id ? b : a
    const tap = tapId && graph.getCell(tapId)
    if (!tap || tap.get('type') !== 's.Tap') continue
    for (const fl of graph.getConnectedLinks(tap).filter(x => x.get('type') === 's.FlowPipe')) {
      const s = fl.source() && fl.source().id, t = fl.target() && fl.target().id
      const o = graph.getCell(s === tap.id ? t : s)
      if (o && o.get('type') === 's.Pump') return o.get('pressure') || 0
    }
  }
  return null
}

function gauge(elm, graph) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  let v = gaugePressure(elm, graph) // actual pump pressure via the tap; null if not connected
  if (v == null) v = 0
  v = Math.max(lo, Math.min(hi, v))
  elm.set('value', v, { silent: true })
  const frac = hi > lo ? (v - lo) / (hi - lo) : 0
  const col = frac > 0.85 ? '#dc2626' : '#16a34a'
  elm.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(frac), stroke: col }, val: { text: v.toFixed(1) } })
}

// flow meter: walk the flow-pipe network from the meter; a running pump reachable
// without crossing a closed valve gives flow (m³/h ≈ pressure × 120). Respects control gating.
function flowMeter(elm, graph, ctrlPct) {
  const seen = new Set([elm.id]); const q = [elm.id]; let mph = 0, steps = 0
  while (q.length && steps < 60) {
    steps++
    const id = q.shift(); const node = graph.getCell(id); if (!node) continue
    const t = node.get('type')
    if (id !== elm.id) {
      if (t === 's.Pump') {
        const gated = ctrlPct && ctrlPct[id] != null && ctrlPct[id] <= 0
        if (node.get('on') && !gated) mph = Math.max(mph, Math.round((node.get('pressure') || 0) * 120))
        continue // don't traverse past a pump
      }
      if (t === 's.Valve' && !node.get('open')) continue // closed valve blocks the path
    }
    for (const fl of graph.getConnectedLinks(node).filter(x => x.get('type') === 's.FlowPipe')) {
      const s = fl.source() && fl.source().id, tg = fl.target() && fl.target().id
      const other = s === id ? tg : s
      if (other && !seen.has(other)) { seen.add(other); q.push(other) }
    }
  }
  elm.set('flow', mph, { silent: true })
  elm.attr('val/text', String(mph))
}

function quality(elm) {
  const ph = drift(elm.get('ph') ?? 7.2, 6.6, 7.8, 0.05); elm.set('ph', ph, { silent: true }); elm.attr('phV/text', ph.toFixed(2))
  const tb = drift(elm.get('turb') ?? 0.8, 0.2, 1.6, 0.08); elm.set('turb', tb, { silent: true }); elm.attr('tbV/text', tb.toFixed(2) + ' NTU')
  const cl = drift(elm.get('cl') ?? 1.2, 0.6, 1.8, 0.06); elm.set('cl', cl, { silent: true }); elm.attr('clV/text', cl.toFixed(2) + ' mg/L')
  const dox = drift(elm.get('do') ?? 8.4, 6.5, 9.5, 0.15); elm.set('do', dox, { silent: true }); elm.attr('doV/text', dox.toFixed(1) + ' mg/L')
}

// ctrlPct: map of element id -> the % of a Control that drives it (last control wins).
// A pipe whose source is a control-driven pump/valve runs at that control's speed.
function flowPipe(link, graph, ctrlPct) {
  if (link.get('type') === 's.Leader') return // instrument leaders don't carry flow
  const srcId = link.source() && link.source().id
  const src = srcId ? graph.getCell(srcId) : null
  let live = false, pct = 100
  if (src) {
    const t = src.get('type')
    if (t === 's.Pump') live = !!src.get('on')
    else if (t === 's.Valve') live = !!src.get('open')
    else if (t === 's.Control') { pct = clamp(src.get('pct') ?? 100, 0, 100); live = pct > 0 }
    else if (t === 's.Cyl' || t === 's.Hopper') {
      // a tank outlet flows only when level is past its mark: top → above HIGH, bottom → above LOW
      const lvl = src.get('level') ?? 0
      const hi = src.get('simMax') ?? 70, lo = src.get('simMin') ?? 20
      const port = link.source() && link.source().port
      if (port === 'top') live = lvl > hi
      else if (port === 'bot' || port === 'in') live = lvl > lo
      else live = lvl > lo // body-snapped (no port): gate on LOW mark, not unconditional
    }
    else live = true // zone or anything else = always a source
    // a Control linked to this source sets the flow speed (0% also stops it)
    if (t !== 's.Control' && ctrlPct[srcId] != null) {
      pct = ctrlPct[srcId]
      if (pct <= 0) live = false
    }
  }
  const dur = (0.35 + (1 - pct / 100) * 1.9).toFixed(2)
  link.attr('line', { opacity: live ? 1 : 0, class: live ? 'wp-flow wp-on' : 'wp-flow', style: { animationDuration: dur + 's' } })
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

// Re-animate every pipe from current element state WITHOUT drifting values.
// Used for instant feedback in edit mode (and on slider drag) so a 60Hz input
// event never advances the tank/gauge simulation.
export function refreshLinks(graph) {
  const ctrlPct = controlMap(graph)
  graph.getLinks().forEach(link => flowPipe(link, graph, ctrlPct))
}

export function simulateTick(graph) {
  const ctrlPct = controlMap(graph)
  graph.getElements().forEach(elm => {
    switch (elm.get('type')) {
      case 's.Cyl': tank(elm, false); break
      case 's.Hopper': tank(elm, true); break
      case 's.Pump': pump(elm); break
      case 's.Valve': valve(elm); break
      case 's.PG': gauge(elm, graph); break
      case 's.Flow': flowMeter(elm, graph, ctrlPct); break
      case 's.Quality': quality(elm); break
    }
  })
  graph.getLinks().forEach(link => flowPipe(link, graph, ctrlPct))
}
