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

function pump(elm) {
  const on = !!elm.get('on')
  elm.attr('imp/class', on ? 'wp-spin' : '')
  elm.attr('inner/fill', on ? '#5fb98f' : '#8b949e')
  elm.set('pressure', on ? drift(elm.get('pressure') || 2, 1.4, 3.4, 0.18) : 0, { silent: true })
}

function valve(elm) {
  elm.attr('ind/fill', elm.get('open') ? '#16a34a' : '#cbd5e1')
}

function gauge(elm) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  const v = drift(elm.get('value') ?? (hi / 2), lo, hi, 0.25)
  elm.set('value', v, { silent: true })
  const frac = hi > lo ? (v - lo) / (hi - lo) : 0
  const col = frac > 0.85 ? '#dc2626' : '#16a34a'
  elm.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(frac), stroke: col }, val: { text: v.toFixed(1) } })
}

function control(elm) {
  const pct = clamp(elm.get('pct') ?? 100, 0, 100)
  elm.attr('barFill/width', (elm.size().width - 16) * pct / 100)
  elm.attr('val/text', pct > 0 ? pct + '% open' : 'Closed')
}

function flowPipe(link, graph) {
  const src = link.source() && link.source().id ? graph.getCell(link.source().id) : null
  let live = false, pct = 100
  if (src) {
    const t = src.get('type')
    if (t === 's.Pump') live = !!src.get('on')
    else if (t === 's.Valve') live = !!src.get('open')
    else if (t === 's.Control') { pct = src.get('pct') ?? 0; live = pct > 0 }
    else if (t === 's.Cyl' || t === 's.Hopper') live = (src.get('level') ?? 0) > 1
    else live = true // zone or anything else = always a source
  }
  const dur = (0.35 + (1 - pct / 100) * 1.9).toFixed(2)
  link.attr('line', { opacity: live ? 1 : 0, class: live ? 'wp-flow wp-on' : 'wp-flow', style: { animationDuration: dur + 's' } })
}

export function simulateTick(graph) {
  graph.getElements().forEach(elm => {
    switch (elm.get('type')) {
      case 's.Cyl': tank(elm, false); break
      case 's.Hopper': tank(elm, true); break
      case 's.Pump': pump(elm); break
      case 's.Valve': valve(elm); break
      case 's.PG': gauge(elm); break
      case 's.Control': control(elm); break
    }
  })
  graph.getLinks().forEach(link => flowPipe(link, graph))
}
