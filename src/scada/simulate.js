// Generic per-element-type simulation for the SCADA builder.
// Auto-generates drifting demo values and animates pipe flow based on the
// pipe's SOURCE element state (simple source-check, not a full upstream chain).
import { clamp, drift } from '../composables/usePlantData'
import { arc } from './shapes'

function tank(elm, isHopper) {
  const lo = elm.get('simMin') ?? 20, hi = elm.get('simMax') ?? 95
  const lvl = drift(elm.get('level') ?? 60, lo, hi, 2)
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

function gauge(elm) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  const v = drift(elm.get('value') ?? (hi / 2), lo, hi, 0.25)
  elm.set('value', v, { silent: true })
  const frac = hi > lo ? (v - lo) / (hi - lo) : 0
  const col = frac > 0.85 ? '#dc2626' : '#16a34a'
  elm.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(frac), stroke: col }, val: { text: v.toFixed(1) } })
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
    else if (t === 's.Cyl' || t === 's.Hopper') live = (src.get('level') ?? 0) > 1
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
  graph.getElements().forEach(elm => {
    switch (elm.get('type')) {
      case 's.Cyl': tank(elm, false); break
      case 's.Hopper': tank(elm, true); break
      case 's.Pump': pump(elm); break
      case 's.Valve': valve(elm); break
      case 's.PG': gauge(elm); break
    }
  })
  const ctrlPct = controlMap(graph)
  graph.getLinks().forEach(link => flowPipe(link, graph, ctrlPct))
}
