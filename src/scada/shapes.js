// Shared JointJS SCADA shapes. Used by the static Water screen and the builder.
import * as joint from '@joint/core'
const { svg } = joint.util

export const SILVER = { type: 'linearGradient', stops: [
  { offset: '0%', color: '#eef1f4' }, { offset: '18%', color: '#a7afb9' }, { offset: '48%', color: '#f6f8fa' },
  { offset: '82%', color: '#99a2ac' }, { offset: '100%', color: '#cdd5de' }], attrs: { x1: '0%', y1: '0%', x2: '100%', y2: '0%' } }
export const STEEL = { type: 'linearGradient', stops: [
  { offset: '0%', color: '#d4dbe2' }, { offset: '50%', color: '#9aa3ad' }, { offset: '100%', color: '#727b85' }], attrs: { x1: '0%', y1: '0%', x2: '100%', y2: '0%' } }

// ports — magnet 'passive' = connectable target only (static screen); true = link source (builder)
const portGrp = (magnet) => ({ position: { name: 'absolute' }, attrs: { circle: { r: 7, fill: '#cfd6de', stroke: '#8a929c', strokeWidth: 1.5, magnet } }, markup: svg`<circle @selector="circle"/>` })
export const portsCfg = (items, magnet = 'passive') => ({ groups: { p: portGrp(magnet) }, items: items.map(i => ({ group: 'p', id: i.id, args: { x: i.x, y: i.y } })) })

// gauge arc helper
const A0 = 130, SWEEP = 280, R = 40, CX = 48, CY = 48
export function arc(frac) {
  const a0 = A0, a1 = A0 + SWEEP * Math.max(0, Math.min(1, frac))
  const p = (deg) => [CX + R * Math.cos(deg * Math.PI / 180), CY + R * Math.sin(deg * Math.PI / 180)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  const large = (a1 - a0) > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`
}

// Tank-1 level scale 0..100 every 10
const WIN_Y = 36, WIN_H = 178
const scaleNodes = []
for (let v = 0; v <= 100; v += 10) {
  const y = WIN_Y + WIN_H * (1 - v / 100)
  scaleNodes.push({ tagName: 'line', attributes: { x1: 78, y1: y, x2: 86, y2: y, stroke: '#475569', 'stroke-width': 1.2 } })
  scaleNodes.push({ tagName: 'text', attributes: { x: 90, y: y + 4, fill: '#1f2d3d', 'font-size': 10, 'font-weight': 'bold' }, textContent: String(v) })
}

export const CylTank = joint.dia.Element.define('s.Cyl', { size: { width: 150, height: 250 }, attrs: {
  body: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', fill: SILVER, stroke: '#7c858f', strokeWidth: 1 },
  capBot: { cx: 'calc(w/2)', cy: 'calc(h)', rx: 'calc(w/2)', ry: 13, fill: STEEL, stroke: '#7c858f' },
  capTop: { cx: 'calc(w/2)', cy: 0, rx: 'calc(w/2)', ry: 13, fill: SILVER, stroke: '#7c858f' },
  win: { x: 44, y: 36, width: 32, height: 178, fill: '#d7dbe4', stroke: '#6b7280', strokeWidth: 1, rx: 2 },
  fill: { x: 46, width: 28, fill: '#16a34a' },
  // sim-range markers on the scale (stroke set by the builder via setTankMarks; hidden by default so other screens are unaffected)
  markLo: { x1: 42, y1: 36, x2: 78, y2: 36, stroke: 'none', strokeWidth: 2 },
  markHi: { x1: 42, y1: 36, x2: 78, y2: 36, stroke: 'none', strokeWidth: 2 },
  name: { x: 'calc(w/2)', y: 'calc(h+30)', textAnchor: 'middle', fill: '#1f2d3d', fontSize: 14, fontWeight: 'bold' },
  legL: { d: 'M 32 calc(h) l -8 28', stroke: '#5b3a26', strokeWidth: 6, strokeLinecap: 'round' },
  legR: { d: 'M calc(w-32) calc(h) l 8 28', stroke: '#5b3a26', strokeWidth: 6, strokeLinecap: 'round' },
} }, { markup: [
  { tagName: 'path', selector: 'legL' }, { tagName: 'path', selector: 'legR' },
  { tagName: 'rect', selector: 'body' }, { tagName: 'ellipse', selector: 'capBot' }, { tagName: 'ellipse', selector: 'capTop' },
  { tagName: 'rect', selector: 'win' }, { tagName: 'rect', selector: 'fill' },
  { tagName: 'line', selector: 'markLo' }, { tagName: 'line', selector: 'markHi' },
  ...scaleNodes, { tagName: 'text', selector: 'name' },
] })

export const Hopper = joint.dia.Element.define('s.Hopper', { size: { width: 170, height: 230 }, attrs: {
  cone: { d: 'M 0 108 L calc(w) 108 L calc(w/2+14) 205 L calc(w/2-14) 205 Z', fill: STEEL, stroke: '#7c858f' },
  outlet: { x: 'calc(w/2-9)', y: 205, width: 18, height: 18, fill: STEEL, stroke: '#7c858f' },
  cyl: { x: 0, y: 18, width: 'calc(w)', height: 90, fill: SILVER, stroke: '#7c858f' },
  fill: { x: 6, width: 'calc(w-12)', fill: '#16a34a', opacity: 0.85 },
  capTop: { cx: 'calc(w/2)', cy: 18, rx: 'calc(w/2)', ry: 15, fill: SILVER, stroke: '#7c858f' },
  name: { x: 'calc(w/2)', y: -6, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 14, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="cone"/><rect @selector="outlet"/><rect @selector="cyl"/><rect @selector="fill"/><ellipse @selector="capTop"/><text @selector="name"/>` })

export const Pump = joint.dia.Element.define('s.Pump', { size: { width: 92, height: 92 }, attrs: {
  ring: { cx: 46, cy: 46, r: 45, fill: SILVER, stroke: '#7c858f', strokeWidth: 1, cursor: 'pointer' },
  inner: { cx: 46, cy: 46, r: 33, fill: '#8b949e', stroke: '#5b6772', cursor: 'pointer' },
  imp: { d: 'M46 46 L46 12 Q64 18 60 40 Z M46 46 L80 46 Q74 64 52 60 Z M46 46 L46 80 Q28 74 32 52 Z M46 46 L12 46 Q18 28 40 32 Z', fill: '#3b434c', cursor: 'pointer' },
  hub: { cx: 46, cy: 46, r: 6, fill: '#11151a' },
  name: { x: 46, y: 112, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 13, fontWeight: 'bold' },
} }, { markup: svg`<circle @selector="ring"/><circle @selector="inner"/><path @selector="imp"/><circle @selector="hub"/><text @selector="name"/>` })

export const Valve = joint.dia.Element.define('s.Valve', { size: { width: 76, height: 92 }, attrs: {
  wheel: { cx: 38, cy: 14, rx: 30, ry: 13, fill: '#3b434c' },
  stem: { x: 35, y: 14, width: 6, height: 30, fill: '#6b7682' },
  body: { x: 8, y: 44, width: 60, height: 44, rx: 6, fill: SILVER, stroke: '#7c858f' },
  ind: { x: 24, y: 54, width: 28, height: 24, fill: '#16a34a', stroke: '#0f7a35' },
  name: { x: 38, y: 104, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 12 },
} }, { markup: svg`<ellipse @selector="wheel"/><rect @selector="stem"/><rect @selector="body"/><rect @selector="ind"/><text @selector="name"/>` })

export const Zone = joint.dia.Element.define('s.Zone', { size: { width: 110, height: 40 }, attrs: {
  flag: { d: 'M 14 0 L calc(w) 0 L calc(w) calc(h) L 14 calc(h) L 0 calc(h/2) Z', fill: '#fff', stroke: '#16a34a', strokeWidth: 2 },
  name: { x: 'calc(w/2+6)', y: 'calc(h/2)', textAnchor: 'middle', textVerticalAnchor: 'middle', fill: '#16a34a', fontSize: 14, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="flag"/><text @selector="name"/>` })

export const PGauge = joint.dia.Element.define('s.PG', { size: { width: 96, height: 96 }, attrs: {
  bgArc: { d: '', fill: 'none', stroke: '#e2e8f0', strokeWidth: 9, strokeLinecap: 'round' },
  fgArc: { d: '', fill: 'none', stroke: '#dc2626', strokeWidth: 9, strokeLinecap: 'round' },
  unit: { x: 48, y: 44, textAnchor: 'middle', fill: '#6b7c8f', fontSize: 12 },
  val: { x: 48, y: 70, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 24, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="bgArc"/><path @selector="fgArc"/><text @selector="unit">Ⓟ bar</text><text @selector="val"/>` })

// New: control (builder). The visible widget is an HTML panel overlay (slider +
// open/close); the element itself is an invisible data/anchor cell (position,
// pct, targets, name) so there is exactly ONE control widget on screen.
export const Control = joint.dia.Element.define('s.Control', { size: { width: 130, height: 120 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', fill: 'transparent', stroke: 'none' },
} }, { markup: svg`<rect @selector="box"/>` })

// New: flow meter — inline turbine meter (flanged pipe + dial) with live m³/h below.
export const FlowMeter = joint.dia.Element.define('s.Flow', { size: { width: 84, height: 48 }, attrs: {
  flL: { x: 0, y: 13, width: 8, height: 22, fill: STEEL, stroke: '#7c858f' },
  pipe: { x: 6, y: 18, width: 72, height: 12, fill: SILVER, stroke: '#7c858f' },
  flR: { x: 76, y: 13, width: 8, height: 22, fill: STEEL, stroke: '#7c858f' },
  head: { cx: 42, cy: 18, r: 16, fill: SILVER, stroke: '#7c858f', strokeWidth: 1 },
  dial: { cx: 42, cy: 18, r: 12, fill: '#dff1f7', stroke: '#5b6772' },
  rotor: { d: 'M42 18 L42 8 Q49 11 47 16 Z M42 18 L52 18 Q49 25 44 23 Z M42 18 L42 28 Q35 25 37 20 Z M42 18 L32 18 Q35 11 40 13 Z', fill: '#0e7490' },
  val: { x: 42, y: 'calc(h+15)', textAnchor: 'middle', fill: '#0e7490', fontSize: 12, fontWeight: 'bold', text: '0 m³/h' },
} }, { markup: svg`<rect @selector="flL"/><rect @selector="pipe"/><rect @selector="flR"/><circle @selector="head"/><circle @selector="dial"/><path @selector="rotor"/><text @selector="val"/>` })

// New: pressure tap — inline pressure indicator (flanged pipe + dial) showing live bar.
export const Tap = joint.dia.Element.define('s.Tap', { size: { width: 84, height: 48 }, attrs: {
  flL: { x: 0, y: 13, width: 8, height: 22, fill: STEEL, stroke: '#7c858f' },
  pipe: { x: 6, y: 18, width: 72, height: 12, fill: SILVER, stroke: '#7c858f' },
  flR: { x: 76, y: 13, width: 8, height: 22, fill: STEEL, stroke: '#7c858f' },
  head: { cx: 42, cy: 16, r: 15, fill: SILVER, stroke: '#7c858f', strokeWidth: 1 },
  dial: { cx: 42, cy: 16, r: 11, fill: '#fde8e8', stroke: '#5b6772' },
  pVal: { x: 42, y: 20, textAnchor: 'middle', fill: '#b91c1c', fontSize: 10, fontWeight: 'bold', text: '0.0' },
  val: { x: 42, y: 'calc(h+15)', textAnchor: 'middle', fill: '#b91c1c', fontSize: 12, fontWeight: 'bold', text: '0.0 bar' },
} }, { markup: svg`<rect @selector="flL"/><rect @selector="pipe"/><rect @selector="flR"/><circle @selector="head"/><circle @selector="dial"/><text @selector="pVal"/><text @selector="val"/>` })

// New: water-quality analyzer — live pH / Turbidity / Cl / DO readout.
export const Quality = joint.dia.Element.define('s.Quality', { size: { width: 156, height: 118 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', rx: 8, fill: '#fff', stroke: '#cbd5e1', strokeWidth: 1 },
  title: { x: 'calc(w/2)', y: 18, textAnchor: 'middle', fill: '#334155', fontSize: 12, fontWeight: 'bold', text: 'Water Quality' },
  phL: { x: 12, y: 42, fill: '#64748b', fontSize: 11, text: 'pH' },
  phV: { x: 'calc(w-12)', y: 42, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  tbL: { x: 12, y: 62, fill: '#64748b', fontSize: 11, text: 'Turbidity' },
  tbV: { x: 'calc(w-12)', y: 62, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  clL: { x: 12, y: 82, fill: '#64748b', fontSize: 11, text: 'Cl' },
  clV: { x: 'calc(w-12)', y: 82, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  doL: { x: 12, y: 102, fill: '#64748b', fontSize: 11, text: 'DO' },
  doV: { x: 'calc(w-12)', y: 102, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
} }, { markup: svg`<rect @selector="box"/><text @selector="title"/><text @selector="phL"/><text @selector="phV"/><text @selector="tbL"/><text @selector="tbV"/><text @selector="clL"/><text @selector="clV"/><text @selector="doL"/><text @selector="doV"/>` })

// New: chart frame element (builder). A live trend chart (HTML overlay) is drawn on top.
export const Chart = joint.dia.Element.define('s.Chart', { size: { width: 320, height: 180 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', rx: 8, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1 },
  name: { x: 'calc(w/2)', y: 'calc(h+16)', textAnchor: 'middle', fill: '#1f2d3d', fontSize: 13, fontWeight: 'bold' },
} }, { markup: svg`<rect @selector="box"/><text @selector="name"/>` })

// New: flow pipe link — grey tube + green dashed flow in one interactive link.
export const FlowPipe = joint.dia.Link.define('s.FlowPipe', {
  z: -2,
  router: { name: 'orthogonal' },
  connector: { name: 'rounded', args: { radius: 12 } },
  attrs: {
    wrap: { connection: true, stroke: '#b6bdc6', strokeWidth: 13, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' },
    line: { connection: true, stroke: '#16a34a', strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: '12 12', fill: 'none', class: 'wp-flow' },
  },
}, { markup: [
  { tagName: 'path', selector: 'wrap', attributes: { fill: 'none' } },
  { tagName: 'path', selector: 'line', attributes: { fill: 'none' } },
] })

// New: instrument leader — thin grey dashed line connecting a gauge to the
// component it measures (e.g. pressure gauge → pipe between pump and valve).
export const Leader = joint.dia.Link.define('s.Leader', {
  z: -1,
  attrs: {
    line: { connection: true, stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 4', fill: 'none', targetMarker: { type: 'circle', r: 3, fill: '#94a3b8', stroke: 'none' } },
  },
}, { markup: [{ tagName: 'path', selector: 'line', attributes: { fill: 'none' } }] })

// define() only auto-registers into joint.shapes when a *global* `joint` exists (UMD builds).
// Under ESM (Vite) there is no global, so register manually by the type-string leaf so that
// graph.fromJSON() can resolve these types via `cellNamespace: joint.shapes`.
joint.shapes.s = joint.shapes.s || {}
Object.assign(joint.shapes.s, {
  Cyl: CylTank,
  Hopper,
  Pump,
  Valve,
  Zone,
  PG: PGauge,
  Control,
  Chart,
  Quality,
  Tap,
  Flow: FlowMeter,
  FlowPipe,
  Leader,
})
