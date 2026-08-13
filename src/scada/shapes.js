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

// gauge dial geometry — shared by the color-band arcs (layoutGaugeBands) and the needle
// (gauge()), both in simulate.js. A0/SWEEP define a 280° dial opening at the top (like a
// speedometer); frac is the live value's position in [0,1] across simMin..simMax.
const A0 = 130, SWEEP = 280, R = 40, CX = 48, CY = 48
function dialPoint(frac, radius) {
  const deg = A0 + SWEEP * Math.max(0, Math.min(1, frac))
  return [CX + radius * Math.cos(deg * Math.PI / 180), CY + radius * Math.sin(deg * Math.PI / 180)]
}
// path for the arc between two fractions of the dial sweep (used for each color band)
export function arcSeg(f0, f1, radius = R) {
  const c0 = Math.max(0, Math.min(1, f0)), c1 = Math.max(0, Math.min(1, f1))
  const [x0, y0] = dialPoint(c0, radius), [x1, y1] = dialPoint(c1, radius)
  const large = SWEEP * (c1 - c0) > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`
}
// needle tip position for a given value fraction
export function needlePoint(frac, radius = R - 6) { return dialPoint(frac, radius) }
// tick label position just outside the dial rim
export function tickPoint(frac, radius = R + 14) { return dialPoint(frac, radius) }

// NOTE (resizable components): shapes listed in SCALE_BASE below draw their art in fixed
// base-size coordinates inside a 'sc' wrapper group; resizing applies scale() on that group.
// Keep their attrs absolute (no calc()) or the art double-scales.
//
// Fill window stays at y:36 h:178 — simulate.js's tank() computes fill/y and
// fill/height directly against these numbers, so this geometry must not move.
export const CylTank = joint.dia.Element.define('s.Cyl', { size: { width: 150, height: 250 }, attrs: {
  body: { x: 30, y: 4, width: 90, height: 242, rx: 14, fill: 'none', stroke: '#e6edf3', strokeWidth: 1.5 },
  win: { x: 34, y: 36, width: 82, height: 178, fill: '#3a4456', stroke: 'none' },
  fill: { x: 34, width: 82, fill: '#8b93f5' },
  valText: { x: 75, textAnchor: 'middle', fill: '#e6edf3', fontSize: 20, fontWeight: 'bold' },
  // sim-range markers on the scale (stroke set by the builder via setTankMarks; hidden by default so other screens are unaffected)
  markLo: { x1: 30, y1: 36, x2: 120, y2: 36, stroke: 'none', strokeWidth: 2 },
  markHi: { x1: 30, y1: 36, x2: 120, y2: 36, stroke: 'none', strokeWidth: 2 },
  name: { x: 75, y: -10, textAnchor: 'middle', fill: '#e6edf3', fontSize: 14, fontWeight: 'bold' },
} }, { markup: [
  { tagName: 'rect', selector: 'body' }, { tagName: 'rect', selector: 'win' }, { tagName: 'rect', selector: 'fill' },
  { tagName: 'text', selector: 'valText' },
  { tagName: 'line', selector: 'markLo' }, { tagName: 'line', selector: 'markHi' },
  { tagName: 'text', selector: 'name' },
] })

export const Hopper = joint.dia.Element.define('s.Hopper', { size: { width: 170, height: 230 }, attrs: {
  cone: { d: 'M 0 108 L 170 108 L 99 205 L 71 205 Z', fill: STEEL, stroke: '#7c858f' },
  outlet: { x: 76, y: 205, width: 18, height: 18, fill: STEEL, stroke: '#7c858f' },
  cyl: { x: 0, y: 18, width: 170, height: 90, fill: SILVER, stroke: '#7c858f' },
  fill: { x: 6, width: 158, fill: '#16a34a', opacity: 0.85 },
  capTop: { cx: 85, cy: 18, rx: 85, ry: 15, fill: SILVER, stroke: '#7c858f' },
  name: { x: 85, y: -6, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 14, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="cone"/><rect @selector="outlet"/><rect @selector="cyl"/><rect @selector="fill"/><ellipse @selector="capTop"/><text @selector="name"/>` })

// inner/fill and imp/class are driven live by setPumpVisual()/pump() in simulate.js
// (on/off color + spin animation) — selector names must stay 'inner' and 'imp'.
export const Pump = joint.dia.Element.define('s.Pump', { size: { width: 92, height: 92 }, attrs: {
  tile: { x: 4, y: 4, width: 84, height: 84, rx: 10, fill: '#101d2c', stroke: '#e6edf3', strokeWidth: 1.5, cursor: 'pointer' },
  inner: { cx: 46, cy: 46, r: 26, fill: '#8b949e', cursor: 'pointer' },
  imp: { d: 'M46 46 L46 24 Q56 27 54 38 Z M46 46 L68 46 Q65 56 54 54 Z M46 46 L46 68 Q36 65 38 54 Z M46 46 L24 46 Q27 36 38 38 Z', fill: '#101d2c', cursor: 'pointer' },
  hub: { cx: 46, cy: 46, r: 5, fill: '#0a1420', stroke: '#e6edf3', strokeWidth: 1 },
  name: { x: 46, y: 112, textAnchor: 'middle', fill: '#e6edf3', fontSize: 13, fontWeight: 'bold' },
} }, { markup: svg`<rect @selector="tile"/><circle @selector="inner"/><path @selector="imp"/><circle @selector="hub"/><text @selector="name"/>` })

// ind/fill is driven live by setValveVisual()/valve() in simulate.js (open/closed color)
// — selector name must stay 'ind'. Both bowtie triangles share the one selector so they
// recolor together, exactly as the old single indicator rect did.
export const Valve = joint.dia.Element.define('s.Valve', { size: { width: 76, height: 92 }, attrs: {
  ind: { d: 'M 8 50 L 38 66 L 8 82 Z M 68 50 L 38 66 L 68 82 Z', fill: '#cbd5e1', stroke: '#0a1420', strokeWidth: 1.5, strokeLinejoin: 'round' },
  name: { x: 38, y: 104, textAnchor: 'middle', fill: '#e6edf3', fontSize: 12 },
} }, { markup: svg`<path @selector="ind"/><text @selector="name"/>` })

export const Zone = joint.dia.Element.define('s.Zone', { size: { width: 110, height: 40 }, attrs: {
  flag: { d: 'M 14 0 L calc(w) 0 L calc(w) calc(h) L 14 calc(h) L 0 calc(h/2) Z', fill: '#fff', stroke: '#16a34a', strokeWidth: 2 },
  name: { x: 'calc(w/2+6)', y: 'calc(h/2)', textAnchor: 'middle', textVerticalAnchor: 'middle', fill: '#16a34a', fontSize: 14, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="flag"/><text @selector="name"/>` })

export const PGauge = joint.dia.Element.define('s.PG', { size: { width: 96, height: 96 }, attrs: {
  bandG: { d: '', fill: 'none', stroke: '#16a34a', strokeWidth: 9, strokeLinecap: 'butt' },
  bandY: { d: '', fill: 'none', stroke: '#f59e0b', strokeWidth: 9, strokeLinecap: 'butt' },
  bandR: { d: '', fill: 'none', stroke: '#dc2626', strokeWidth: 9, strokeLinecap: 'butt' },
  tick0: { x: 0, y: 0, textAnchor: 'middle', fill: '#8592a1', fontSize: 9, text: '' },
  tick1: { x: 0, y: 0, textAnchor: 'middle', fill: '#8592a1', fontSize: 9, text: '' },
  tick2: { x: 0, y: 0, textAnchor: 'middle', fill: '#8592a1', fontSize: 9, text: '' },
  tick3: { x: 0, y: 0, textAnchor: 'middle', fill: '#8592a1', fontSize: 9, text: '' },
  tick4: { x: 0, y: 0, textAnchor: 'middle', fill: '#8592a1', fontSize: 9, text: '' },
  needle: { x1: 48, y1: 48, x2: 48, y2: 48, stroke: '#1f2d3d', strokeWidth: 3, strokeLinecap: 'round' },
  hub: { cx: 48, cy: 48, r: 5, fill: '#1f2d3d' },
  unit: { x: 48, y: 44, textAnchor: 'middle', fill: '#6b7c8f', fontSize: 12 },
  val: { x: 48, y: 70, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 24, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="bandG"/><path @selector="bandY"/><path @selector="bandR"/><text @selector="tick0"/><text @selector="tick1"/><text @selector="tick2"/><text @selector="tick3"/><text @selector="tick4"/><line @selector="needle"/><circle @selector="hub"/><text @selector="unit">Ⓟ bar</text><text @selector="val"/>` })

// New: control (builder). The visible widget is an HTML panel overlay (slider +
// open/close); the element itself is an invisible data/anchor cell (position,
// pct, targets, name) so there is exactly ONE control widget on screen.
export const Control = joint.dia.Element.define('s.Control', { size: { width: 130, height: 120 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', fill: 'transparent', stroke: 'none' },
} }, { markup: svg`<rect @selector="box"/>` })

// New: user-defined custom component — configurable shape, icon, ports, and live behavior.
export const Custom = joint.dia.Element.define('s.Custom', { size: { width: 96, height: 60 }, attrs: {
  bodyRect: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', rx: 8, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 1.5 },
  bodyEllipse: { cx: 'calc(w/2)', cy: 'calc(h/2)', rx: 'calc(w/2)', ry: 'calc(h/2)', fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 1.5, opacity: 0 },
  bodyPath: { d: '', fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 1.5, opacity: 0 },
  // free-form AI-drawn SVG body, rendered as a data-URI image (scripts/external refs can't execute in image context)
  svgImg: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', preserveAspectRatio: 'xMidYMid meet', opacity: 0 },
  fill: { x: 3, width: 'calc(w-6)', y: 3, height: 0, fill: '#16a34a', opacity: 0 }, // level fill (behavior=level)
  ind: { x: 'calc(w/2-8)', y: 'calc(h-13)', width: 16, height: 9, rx: 2, fill: '#16a34a', opacity: 0 }, // on/open indicator
  icon: { x: 'calc(w/2)', y: 'calc(h/2-2)', textAnchor: 'middle', textVerticalAnchor: 'middle', fontSize: 20, text: '' },
  // optional AI/user-authored line-art glyph, authored in a 24x24 box (same convention as Instrument)
  glyph: { d: '', fill: 'none', stroke: '#334155', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0 },
  val: { x: 'calc(w/2)', y: 'calc(h/2+14)', textAnchor: 'middle', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold', opacity: 0, text: '' },
  name: { x: 'calc(w/2)', y: 'calc(h+14)', textAnchor: 'middle', fill: '#3730a3', fontSize: 12, fontWeight: 'bold', text: 'Custom' },
} }, { markup: [
  { tagName: 'rect', selector: 'bodyRect' },
  { tagName: 'ellipse', selector: 'bodyEllipse' },
  { tagName: 'path', selector: 'bodyPath' },
  { tagName: 'image', selector: 'svgImg' },
  { tagName: 'rect', selector: 'fill' },
  { tagName: 'rect', selector: 'ind' },
  { tagName: 'path', selector: 'glyph' },
  { tagName: 'text', selector: 'icon' },
  { tagName: 'text', selector: 'val' },
  { tagName: 'text', selector: 'name' },
] })
// path for non-rect/ellipse custom shapes
export function customPath(shape, w, h) {
  if (shape === 'diamond') return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`
  if (shape === 'triangle') return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`
  return `M 0 8 Q 0 0 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} ${h - 8} Q ${w} ${h} ${w - 8} ${h} L 8 ${h} Q 0 ${h} 0 ${h - 8} Z`
}

// New: annotation label (sticky note) — free text on the canvas.
export const Note = joint.dia.Element.define('s.Note', { size: { width: 150, height: 32 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', rx: 5, fill: '#fef9c3', stroke: '#fde047', strokeWidth: 1 },
  name: { x: 10, y: 'calc(h/2)', textVerticalAnchor: 'middle', fill: '#713f12', fontSize: 13, fontWeight: 'bold', text: 'Note' },
} }, { markup: svg`<rect @selector="box"/><text @selector="name"/>` })

// New: instrument legend icon — small badge (tile + line-art glyph + label) for
// placing standard instrument symbols (valves, transmitters, sensors) on canvas.
// One shape, many presets (see INSTRUMENT_DEFS) — mirrors the Custom-shape pattern.
export const Instrument = joint.dia.Element.define('s.Instrument', { size: { width: 72, height: 88 }, attrs: {
  tile: { x: 8, y: 0, width: 56, height: 56, rx: 8, fill: '#101d2c', stroke: '#3b4b63', strokeWidth: 1.5 },
  glyph: { d: '', transform: 'translate(16.8,8.8) scale(1.6)', fill: 'none', stroke: '#e6edf3', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
  name: { x: 36, y: 72, textAnchor: 'middle', fill: '#e6edf3', fontSize: 11, fontWeight: 'bold' },
} }, { markup: svg`<rect @selector="tile"/><path @selector="glyph"/><text @selector="name"/>` })

// Presets consumed by Instrument — each glyph is authored in a 24x24 box, positioned
// into the 56x56 tile via the shape's fixed 'glyph' transform above.
export const INSTRUMENT_DEFS = [
  { key: 'manualValve', label: 'Manual Valve',
    glyph: 'M8,5 A4,4 0 1,0 16,5 A4,4 0 1,0 8,5 M12,9 L12,13 M4,13 L12,17 L4,21 Z M20,13 L12,17 L20,21 Z' },
  { key: 'nrv', label: 'NRV',
    glyph: 'M7,8 A5,5 0 1,0 17,8 A5,5 0 1,0 7,8 M8,8 L15,8 M12,5 L15,8 L12,11 M4,18 L20,18' },
  { key: 'pressureTransmitter', label: 'Pressure Transmitter',
    glyph: 'M7,6 A5,5 0 1,0 17,6 A5,5 0 1,0 7,6 M12,6 L15,3 M9,15 L9,21 L15,21 L15,15 Z' },
  { key: 'instValve', label: 'Valve',
    glyph: 'M4,7 L12,12 L4,17 Z M20,7 L12,12 L20,17 Z M2,12 L4,12 M20,12 L22,12' },
  { key: 'turbidity', label: 'Turbidity',
    glyph: 'M12,2 C16,8 19,12 19,15 A7,7 0 1,1 5,15 C5,12 8,8 12,2 Z M9,17 A1,1 0 1,0 9.01,17 M14,19 A1,1 0 1,0 14.01,19' },
  { key: 'flowTransmitter', label: 'Flow Transmitter',
    glyph: 'M2,12 L22,12 M2,8 L2,16 M22,8 L22,16 M8,7 L12,12 L8,17 M13,7 L17,12 L13,17' },
  { key: 'radarLevel', label: 'Radar Level Sensor',
    glyph: 'M8,2 L16,2 L16,7 L8,7 Z M12,7 L12,10 M6,13 A6,4 0 0,1 18,13 M9,17 A3,2 0 0,1 15,17' },
  { key: 'chlorineAnalyzer', label: 'Chlorine Analyzer',
    glyph: 'M10,2 L10,8 L4,20 A2,2 0 0,0 6,22 L18,22 A2,2 0 0,0 20,20 L14,8 L14,2 M9,2 L15,2 M12,14 C14,17 15,18 15,19 A3,3 0 1,1 9,19 C9,18 10,17 12,14 Z' },
  { key: 'hydrostaticLevel', label: 'Hydrostatic Level Sensor',
    glyph: 'M12,2 L12,16 M8,4 L16,4 M9,8 L15,8 M12,16 A3,3 0 1,0 12.01,16 M9,22 L15,22' },
]

// New: flow meter — flat dark value chip with live m³/h. 'val' text and 'rotor'
// class are driven live by flowMeter() in simulate.js — selector names must stay.
export const FlowMeter = joint.dia.Element.define('s.Flow', { size: { width: 84, height: 48 }, attrs: {
  box: { x: 0, y: 4, width: 84, height: 40, rx: 8, fill: '#101d2c', stroke: '#3b4b63', strokeWidth: 1.5 },
  rotor: { x1: 74, y1: 12, x2: 74, y2: 20, stroke: '#2dd4bf', strokeWidth: 2, strokeLinecap: 'round' },
  val: { x: 38, y: 28, textAnchor: 'middle', fill: '#e6edf3', fontSize: 13, fontWeight: 'bold', text: '0 m³/h' },
} }, { markup: svg`<rect @selector="box"/><line @selector="rotor"/><text @selector="val"/>` })

// New: pressure tap — flat dark value chip with live bar. 'pVal'/'val' text are
// driven live by tap() in simulate.js — selector names must stay.
export const Tap = joint.dia.Element.define('s.Tap', { size: { width: 84, height: 48 }, attrs: {
  box: { x: 0, y: 4, width: 84, height: 40, rx: 8, fill: '#101d2c', stroke: '#3b4b63', strokeWidth: 1.5 },
  pVal: { x: 42, y: 19, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9, fontWeight: 'bold', text: '0.0' },
  val: { x: 42, y: 34, textAnchor: 'middle', fill: '#e6edf3', fontSize: 12, fontWeight: 'bold', text: '0.0 bar' },
} }, { markup: svg`<rect @selector="box"/><text @selector="pVal"/><text @selector="val"/>` })

// New: water-quality analyzer — live pH / Turbidity / Cl / DO readout.
export const Quality = joint.dia.Element.define('s.Quality', { size: { width: 156, height: 118 }, attrs: {
  box: { x: 0, y: 0, width: 156, height: 118, rx: 8, fill: '#fff', stroke: '#cbd5e1', strokeWidth: 1 },
  title: { x: 78, y: 18, textAnchor: 'middle', fill: '#334155', fontSize: 12, fontWeight: 'bold', text: 'Water Quality' },
  phL: { x: 12, y: 42, fill: '#64748b', fontSize: 11, text: 'pH' },
  phV: { x: 144, y: 42, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  tbL: { x: 12, y: 62, fill: '#64748b', fontSize: 11, text: 'Turbidity' },
  tbV: { x: 144, y: 62, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  clL: { x: 12, y: 82, fill: '#64748b', fontSize: 11, text: 'Cl' },
  clV: { x: 144, y: 82, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  doL: { x: 12, y: 102, fill: '#64748b', fontSize: 11, text: 'DO' },
  doV: { x: 144, y: 102, textAnchor: 'end', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
} }, { markup: svg`<rect @selector="box"/><text @selector="title"/><text @selector="phL"/><text @selector="phV"/><text @selector="tbL"/><text @selector="tbV"/><text @selector="clL"/><text @selector="clV"/><text @selector="doL"/><text @selector="doV"/>` })

// New: chart frame element (builder). A live trend chart (HTML overlay) is drawn on top.
export const Chart = joint.dia.Element.define('s.Chart', { size: { width: 320, height: 180 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', rx: 8, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1 },
  name: { x: 'calc(w/2)', y: 'calc(h+16)', textAnchor: 'middle', fill: '#1f2d3d', fontSize: 13, fontWeight: 'bold' },
} }, { markup: svg`<rect @selector="box"/><text @selector="name"/>` })

// ---- resizable fixed-art shapes: uniform scaling via an 'sc' wrapper group ----
// Art stays in base-size coordinates; el.attr('sc/transform', 'scale(s)') zooms it while the
// model size tracks base*s so ports, links, and selection bboxes stay aligned.
export const SCALE_BASE = {
  's.Cyl': { w: 150, h: 250 }, 's.Hopper': { w: 170, h: 230 }, 's.Pump': { w: 92, h: 92 },
  's.Valve': { w: 76, h: 92 }, 's.PG': { w: 96, h: 96 }, 's.Flow': { w: 84, h: 48 },
  's.Tap': { w: 84, h: 48 }, 's.Quality': { w: 156, h: 118 }, 's.Instrument': { w: 72, h: 88 },
}
for (const C of [CylTank, Hopper, Pump, Valve, PGauge, FlowMeter, Tap, Quality, Instrument]) {
  C.prototype.markup = [{ tagName: 'g', selector: 'sc', children: C.prototype.markup }]
}
export function applyScale(el) {
  const base = SCALE_BASE[el.get('type')]; if (!base) return
  const s = el.get('scale') || 1
  el.attr('sc/transform', 'scale(' + s + ')')
}

// New: flow pipe link — thin line always visible ('wrap') + a colored flow
// overlay ('line') that simulate.js shows/hides + animates based on live flow
// state (see refreshLinks in simulate.js — that on/off logic is unchanged here,
// only the resting colors/widths were flattened to match the thin P&ID look).
export const FlowPipe = joint.dia.Link.define('s.FlowPipe', {
  z: -2,
  router: { name: 'orthogonal' },
  connector: { name: 'rounded', args: { radius: 12 } },
  attrs: {
    wrap: { connection: true, stroke: '#8fa0b3', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' },
    line: { connection: true, stroke: '#16a34a', strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: '12 12', fill: 'none', class: 'wp-flow' },
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
  Note,
  Instrument,
  Custom,
  FlowPipe,
  Leader,
})
