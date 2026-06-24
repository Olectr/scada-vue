# SCADA Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a drag-drop SCADA builder, reachable from one new sidebar button, where a user places tanks/pumps/valves/gauges/controls/zones, wires them with pipes, runs a live auto-simulated diagram, and saves/loads layouts to localStorage.

**Architecture:** Extract the inline JointJS shape definitions from `JointWaterScada.vue` into a shared `src/scada/shapes.js` (adding a `FlowPipe` link and a `Control` element). A new `src/views/ScadaBuilder.vue` hosts a palette + interactive JointJS paper + inspector + toolbar. A generic `src/scada/simulate.js` drives auto-simulated values per element type each second in Run mode. Layouts persist via `graph.toJSON()` in localStorage.

**Tech Stack:** Vue 3 (`<script setup>`), `@joint/core` 4.2, Vite. No new dependencies.

## Global Constraints

- No new npm dependencies. Use `@joint/core` and Vue 3 only.
- Vue 3 `<script setup>` SFCs, matching existing style in `src/views/*.vue`.
- Node `>=20.19` (per `package.json`).
- **The existing Water screen (`JointWaterScada.vue`) and every other screen must keep rendering and behaving identically.**
- No test framework exists in this repo; verification is via `npm run dev` + browser observation. Do not add vitest/jest.
- Reactive simulation singleton helpers (`rnd`, `clamp`, `drift`) are exported from `src/composables/usePlantData.js` — reuse them, do not redefine.
- Custom JointJS element/link `type` strings: tank `s.Cyl`, hopper `s.Hopper`, pump `s.Pump`, valve `s.Valve`, zone `s.Zone`, gauge `s.PG`, control `s.Control`, pipe `s.FlowPipe`.
- Repo is not yet a git repo. If you want the commit steps to run, do `git init` first (optional); otherwise skip the commit steps.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/scada/shapes.js` | Create | All custom JointJS shapes (`CylTank`, `Hopper`, `Pump`, `Valve`, `Zone`, `PGauge`, `Control`, `FlowPipe`), gradients (`SILVER`, `STEEL`), `arc()`, `portsCfg()` helper. Single source of truth. |
| `src/scada/simulate.js` | Create | `simulateTick(graph)` — generic per-type value simulation + pipe flow animation. |
| `src/views/ScadaBuilder.vue` | Create | Builder UI: palette, paper, inspector, toolbar, Edit/Run modes, persistence. |
| `src/components/JointWaterScada.vue` | Modify | Import shapes from `src/scada/shapes.js`; remove the inline duplicates. Behavior unchanged. |
| `src/App.vue` | Modify | Add the `builder` entry to the `screens` array. |

---

## Task 1: Extract shapes into a shared module

**Files:**
- Create: `src/scada/shapes.js`
- Modify: `src/components/JointWaterScada.vue` (lines ~50–130 shape defs, and the `arc` helper ~122–130)

**Interfaces:**
- Produces (from `src/scada/shapes.js`):
  - `SILVER`, `STEEL` — gradient config objects
  - `portsCfg(items, magnet = 'passive')` — returns JointJS `ports` config; `items` is `[{id, x, y}]`. `magnet` is `'passive'` (default, link target only) or `true` (link source — used by the builder).
  - `arc(frac)` — returns an SVG arc `d` string for gauges (0..1 fraction)
  - Element classes: `CylTank`, `Hopper`, `Pump`, `Valve`, `Zone`, `PGauge`, `Control`
  - Link class: `FlowPipe`
  - All classes are registered into `joint.shapes` by `define()`, so `cellNamespace: joint.shapes` resolves them for `fromJSON`.

- [ ] **Step 1: Create `src/scada/shapes.js` with gradients, helpers, and the six existing shapes (moved verbatim from `JointWaterScada.vue`)**

```js
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
  name: { x: 'calc(w/2)', y: 'calc(h+30)', textAnchor: 'middle', fill: '#1f2d3d', fontSize: 14, fontWeight: 'bold' },
  legL: { d: 'M 32 calc(h) l -8 28', stroke: '#5b3a26', strokeWidth: 6, strokeLinecap: 'round' },
  legR: { d: 'M calc(w-32) calc(h) l 8 28', stroke: '#5b3a26', strokeWidth: 6, strokeLinecap: 'round' },
} }, { markup: [
  { tagName: 'path', selector: 'legL' }, { tagName: 'path', selector: 'legR' },
  { tagName: 'rect', selector: 'body' }, { tagName: 'ellipse', selector: 'capBot' }, { tagName: 'ellipse', selector: 'capTop' },
  { tagName: 'rect', selector: 'win' }, { tagName: 'rect', selector: 'fill' },
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
  imp: { d: 'M46 18 q8 22 28 28 q-22 8 -28 28 q-8 -22 -28 -28 q22 -8 28 -28 Z', fill: '#3b434c', cursor: 'pointer' },
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

// New: control slider element (builder). pct 0..100 set via inspector.
export const Control = joint.dia.Element.define('s.Control', { size: { width: 120, height: 54 }, attrs: {
  box: { x: 0, y: 0, width: 'calc(w)', height: 'calc(h)', rx: 8, fill: '#fff', stroke: '#cbd5e1', strokeWidth: 1 },
  name: { x: 'calc(w/2)', y: 17, textAnchor: 'middle', fill: '#334155', fontSize: 12, fontWeight: 'bold' },
  bar: { x: 8, y: 30, width: 'calc(w-16)', height: 8, rx: 4, fill: '#e2e8f0' },
  barFill: { x: 8, y: 30, width: 0, height: 8, rx: 4, fill: '#2563eb' },
  val: { x: 'calc(w/2)', y: 50, textAnchor: 'middle', fill: '#2563eb', fontSize: 10 },
} }, { markup: svg`<rect @selector="box"/><text @selector="name"/><rect @selector="bar"/><rect @selector="barFill"/><text @selector="val"/>` })

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
```

- [ ] **Step 2: Replace the inline shape defs in `JointWaterScada.vue` with an import**

In `src/components/JointWaterScada.vue`, delete the inline `SILVER`, `STEEL`, `portGrp`, `portsCfg`, `scaleNodes`/`WIN_Y`/`WIN_H` block, `CylTank`, `Hopper`, `Pump`, `Valve`, `Zone`, `PGauge` definitions, and the `arc` helper + its `A0/SWEEP/R/CX/CY` constants (lines ~50–130). Replace the top imports so the file pulls them from the shared module. Change:

```js
import * as joint from '@joint/core'
import { state } from '../composables/usePlantData'
import TrendChart from './TrendChart.vue'
```

to:

```js
import * as joint from '@joint/core'
import { state } from '../composables/usePlantData'
import TrendChart from './TrendChart.vue'
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, portsCfg, arc } from '../scada/shapes'
```

Also delete the now-unused `const { svg } = joint.util` line **only if** `svg` is not used elsewhere in the file (it is not, once shapes move out — verify with a search). Leave everything else (`pipe()`, `onMounted`, `watchEffect`, template, styles) untouched.

- [ ] **Step 3: Start the dev server and verify the Water screen is unchanged**

Run: `npm run dev`
Open the printed localhost URL, click **Water Treatment** in the sidebar. Expected: the P&ID renders exactly as before — silver tanks, spinning pump when on, animated green flow on open paths, red pressure arcs, trend chart overlay, draggable control boxes. No console errors.

- [ ] **Step 4: Commit (optional — only if `git init` was run)**

```bash
git add src/scada/shapes.js src/components/JointWaterScada.vue
git commit -m "refactor: extract JointJS SCADA shapes into shared module"
```

---

## Task 2: Generic simulation tick

**Files:**
- Create: `src/scada/simulate.js`

**Interfaces:**
- Consumes: `arc` from `src/scada/shapes.js`; `clamp`, `drift` from `src/composables/usePlantData.js`.
- Produces: `simulateTick(graph)` — call once per second in Run mode. Reads/writes per-element custom attributes: tanks/hoppers `level` + `simMin`/`simMax`; pumps `on` + `pressure`; valves `open`; gauges `value` + `simMin`/`simMax`; controls `pct`. Animates every `FlowPipe` based on its source element's state.

- [ ] **Step 1: Create `src/scada/simulate.js`**

```js
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
```

- [ ] **Step 2: Verify the module parses (no runtime test yet — exercised in Task 5)**

Run: `npm run dev`
Expected: dev server compiles with no error referencing `src/scada/simulate.js`. (Module is imported and exercised in Task 5.)

- [ ] **Step 3: Commit (optional)**

```bash
git add src/scada/simulate.js
git commit -m "feat: add generic SCADA element simulation tick"
```

---

## Task 3: Builder scaffold — palette, paper, add components, edit/link

**Files:**
- Create: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Consumes: shapes + `portsCfg`, `FlowPipe` from `src/scada/shapes.js`.
- Produces: a mounted JointJS paper with palette-driven element creation and interactive port linking in Edit mode. `mode` ref (`'edit' | 'run'`) and `graph`/`paper` used by later tasks. `addComponent(type)`, `selectEl(model)` functions used by later tasks.

- [ ] **Step 1: Create `src/views/ScadaBuilder.vue` with palette, paper, add + link logic**

```vue
<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as joint from '@joint/core'
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, Control, FlowPipe, portsCfg } from '../scada/shapes'
import { simulateTick } from '../scada/simulate'

const host = ref(null)
const fitEl = ref(null)
const scale = ref(1)
const STAGE_W = 1500, STAGE_H = 660
const mode = ref('edit') // 'edit' | 'run'
let paper, graph, fitRO, onResize, simTimer = null

const palette = [
  { type: 'tank', label: 'Tank', ico: '🛢' },
  { type: 'hopper', label: 'Hopper', ico: '⏏' },
  { type: 'pump', label: 'Pump', ico: '⚙' },
  { type: 'valve', label: 'Valve', ico: '▽' },
  { type: 'gauge', label: 'Pressure Gauge', ico: 'Ⓟ' },
  { type: 'control', label: 'Control', ico: '🎚' },
  { type: 'zone', label: 'Zone', ico: '⚑' },
]

const counters = reactive({})
function nextName(base) { counters[base] = (counters[base] || 0) + 1; return `${base} ${counters[base]}` }

function makeEl(type) {
  const x = STAGE_W / 2 - 75, y = STAGE_H / 2 - 100
  switch (type) {
    case 'tank': return new CylTank({ position: { x, y }, attrs: { name: { text: nextName('Tank') } }, ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true), level: 60, simMin: 20, simMax: 95 })
    case 'hopper': return new Hopper({ position: { x, y }, attrs: { name: { text: nextName('Hopper') } }, ports: portsCfg([{ id: 'in', x: 0, y: 62 }, { id: 'bot', x: 85, y: 222 }], true), level: 50, simMin: 20, simMax: 95 })
    case 'pump': return new Pump({ position: { x, y }, attrs: { name: { text: nextName('Pump') } }, ports: portsCfg([{ id: 'l', x: 0, y: 46 }, { id: 'r', x: 92, y: 46 }], true), on: true, pressure: 2 })
    case 'valve': return new Valve({ position: { x, y }, attrs: { name: { text: nextName('Valve') } }, ports: portsCfg([{ id: 'l', x: 8, y: 66 }, { id: 'r', x: 68, y: 66 }], true), open: true })
    case 'gauge': return new PGauge({ position: { x, y }, value: 4, simMin: 0, simMax: 8 })
    case 'control': return new Control({ position: { x, y }, attrs: { name: { text: nextName('Control') } }, pct: 100 })
    case 'zone': return new Zone({ position: { x, y }, attrs: { name: { text: nextName('Zone') } }, ports: portsCfg([{ id: 'p', x: 0, y: 20 }], true) })
  }
}
function addComponent(type) { const el = makeEl(type); if (el) graph.addCell(el) }

const sel = reactive({ id: null }) // expanded in Task 4
function selectEl(model) { sel.id = model ? model.id : null } // expanded in Task 4

function fit() {
  if (!fitEl.value || !paper) return
  const cw = fitEl.value.clientWidth
  const ch = fitEl.value.clientHeight || (window.innerHeight * 0.7)
  const s = Math.min(cw / STAGE_W, ch / STAGE_H)
  scale.value = s
  paper.setDimensions(STAGE_W * s, STAGE_H * s)
  paper.scale(s)
}

onMounted(() => {
  graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes })
  paper = new joint.dia.Paper({
    el: host.value, model: graph, width: STAGE_W, height: STAGE_H,
    background: { color: '#ffffff' }, cellViewNamespace: joint.shapes, async: true,
    gridSize: 10, drawGrid: { name: 'dot', args: { color: '#e2e8f0' } },
    defaultConnectionPoint: { name: 'anchor' },
    defaultLink: () => new FlowPipe(),
    linkPinning: false,
    snapLinks: { radius: 20 },
    validateMagnet: () => mode.value === 'edit',
    validateConnection: (cv, magnetS, tv, magnetT) => mode.value === 'edit' && !!magnetT && tv !== cv && tv.model.isElement(),
    interactive: () => (mode.value === 'edit' ? { linkMove: false } : false),
  })

  paper.on('element:pointerclick', view => {
    if (mode.value === 'run') {
      const m = view.model, t = m.get('type')
      if (t === 's.Pump') m.set('on', !m.get('on'))
      else if (t === 's.Valve') m.set('open', !m.get('open'))
      return
    }
    selectEl(view.model)
  })
  paper.on('blank:pointerclick', () => { if (mode.value === 'edit') selectEl(null) })

  fit()
  onResize = fit
  fitRO = new ResizeObserver(fit); fitRO.observe(fitEl.value)
  window.addEventListener('resize', onResize)
})

function startSim() { stopSim(); simulateTick(graph); simTimer = setInterval(() => simulateTick(graph), 1000) }
function stopSim() { if (simTimer) clearInterval(simTimer); simTimer = null }
watch(mode, m => { if (m === 'run') startSim(); else stopSim() })

onUnmounted(() => {
  stopSim()
  if (fitRO) fitRO.disconnect()
  if (onResize) window.removeEventListener('resize', onResize)
  if (paper) paper.remove()
  graph = paper = null
})
</script>

<template>
  <div class="builder">
    <div class="toolbar">
      <strong>SCADA Builder</strong>
      <span class="sp"></span>
      <button :class="{ on: mode === 'edit' }" @click="mode = 'edit'">✎ Edit</button>
      <button :class="{ on: mode === 'run' }" @click="mode = 'run'">▶ Run</button>
    </div>
    <div class="cols">
      <aside class="palette">
        <div class="ptitle">Components</div>
        <button v-for="p in palette" :key="p.type" :disabled="mode === 'run'" @click="addComponent(p.type)">
          <span class="ico">{{ p.ico }}</span> {{ p.label }}
        </button>
        <div class="hint">{{ mode === 'edit' ? 'Drag a port to draw a pipe.' : 'Click pumps/valves to toggle.' }}</div>
      </aside>
      <div ref="fitEl" class="fit">
        <div ref="host" class="paper"></div>
      </div>
      <aside class="inspector">
        <div class="ptitle">Inspector</div>
        <div class="empty">Select a component.</div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.builder { width: 100%; }
.toolbar { display: flex; align-items: center; gap: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px; font-size: 13px; color: #334155; }
.toolbar .sp { flex: 1; }
.toolbar button, .palette button { font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 10px; background: #fff; color: #475569; cursor: pointer; }
.toolbar button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.cols { display: flex; gap: 8px; }
.palette, .inspector { width: 180px; flex: none; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
.palette button { display: flex; align-items: center; gap: 6px; width: 100%; margin-bottom: 6px; text-align: left; }
.palette button:disabled { opacity: .45; cursor: not-allowed; }
.ptitle { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
.hint { font-size: 11px; color: #64748b; margin-top: 10px; }
.empty { font-size: 12px; color: #94a3b8; }
.ico { width: 18px; text-align: center; }
.fit { position: relative; flex: 1; height: 70vh; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 6px; }
.paper { position: absolute; top: 0; left: 0; }
</style>

<style>
.wp-flow { stroke-dasharray: 12 12; }
.wp-on { animation: wp-flowmove 0.55s linear infinite; }
@keyframes wp-flowmove { to { stroke-dashoffset: -24; } }
.wp-spin { transform-box: fill-box; transform-origin: center; animation: wp-spin-kf 0.9s linear infinite; }
@keyframes wp-spin-kf { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 2: Temporarily wire the builder into `App.vue` to test it (will be finalized in Task 7)**

In `src/App.vue`, add the import and a screens entry so you can reach the builder now:

```js
import ScadaBuilder from './views/ScadaBuilder.vue'
```

Add to the `screens` array (after the `farm` entry):

```js
  { id: 'builder', ico: '✚', label: 'SCADA Builder', title: 'SCADA Builder', comp: ScadaBuilder },
```

- [ ] **Step 3: Verify add + drag + link in the browser**

Run: `npm run dev`
Click **SCADA Builder** in the sidebar. Then:
1. Click each palette button — each component appears on the canvas. Expected: tank, hopper, pump, valve, gauge, control box, zone all render.
2. Drag a component — it moves. Expected: smooth drag, ports move with it.
3. Hover a port (small grey circle), drag from it to another component's port. Expected: a grey pipe with a green dashed centerline is created and stays attached when you drag either endpoint's element.
4. No console errors.

- [ ] **Step 4: Commit (optional)**

```bash
git add src/views/ScadaBuilder.vue src/App.vue
git commit -m "feat: scaffold SCADA builder palette, canvas, and pipe linking"
```

---

## Task 4: Inspector — select, rename, sim params, delete

**Files:**
- Modify: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Consumes: `selectEl`, `sel`, `graph`, `mode` from Task 3.
- Produces: a populated `sel` reactive object and write-back functions (`applyName`, `applyRange`, `togglePumpInit`, `toggleValveInit`, `applyPct`, `deleteSel`) bound to inspector inputs.

- [ ] **Step 1: Replace the `sel`/`selectEl` stubs with the full inspector state**

In `src/views/ScadaBuilder.vue`, replace these two lines from Task 3:

```js
const sel = reactive({ id: null }) // expanded in Task 4
function selectEl(model) { sel.id = model ? model.id : null } // expanded in Task 4
```

with:

```js
const sel = reactive({
  id: null, type: null, name: '', hasName: false, hasRange: false,
  isPump: false, isValve: false, isControl: false,
  simMin: 0, simMax: 8, on: false, open: false, pct: 100,
})
function selModel() { return sel.id ? graph.getCell(sel.id) : null }
function selectEl(model) {
  if (!model) { sel.id = null; sel.type = null; return }
  const t = model.get('type')
  sel.id = model.id; sel.type = t
  sel.hasName = t !== 's.PG'
  sel.name = sel.hasName ? (model.attr('name/text') || '') : ''
  sel.hasRange = (t === 's.Cyl' || t === 's.Hopper' || t === 's.PG')
  sel.isPump = t === 's.Pump'; sel.isValve = t === 's.Valve'; sel.isControl = t === 's.Control'
  sel.simMin = model.get('simMin') ?? (t === 's.PG' ? 0 : 20)
  sel.simMax = model.get('simMax') ?? (t === 's.PG' ? 8 : 95)
  sel.on = !!model.get('on'); sel.open = !!model.get('open'); sel.pct = model.get('pct') ?? 100
}
function applyName() { const m = selModel(); if (m) m.attr('name/text', sel.name) }
function applyRange() { const m = selModel(); if (m) { m.set('simMin', Number(sel.simMin)); m.set('simMax', Number(sel.simMax)) } }
function togglePumpInit() { const m = selModel(); if (m) { m.set('on', sel.on) } }
function toggleValveInit() { const m = selModel(); if (m) { m.set('open', sel.open) } }
function applyPct() { const m = selModel(); if (m) { m.set('pct', Number(sel.pct)); if (mode.value !== 'run') control0(m) } }
function control0(m) { m.attr('barFill/width', (m.size().width - 16) * (Number(sel.pct)) / 100); m.attr('val/text', Number(sel.pct) > 0 ? Number(sel.pct) + '% open' : 'Closed') }
function deleteSel() { const m = selModel(); if (m) { m.remove(); selectEl(null) } }
```

- [ ] **Step 2: Replace the inspector markup in the template**

Replace this block from Task 3:

```html
      <aside class="inspector">
        <div class="ptitle">Inspector</div>
        <div class="empty">Select a component.</div>
      </aside>
```

with:

```html
      <aside class="inspector">
        <div class="ptitle">Inspector</div>
        <div v-if="!sel.id" class="empty">Select a component.</div>
        <div v-else class="fields">
          <label v-if="sel.hasName">Name
            <input type="text" v-model="sel.name" @input="applyName">
          </label>
          <template v-if="sel.hasRange">
            <label>Sim min
              <input type="number" v-model="sel.simMin" @input="applyRange">
            </label>
            <label>Sim max
              <input type="number" v-model="sel.simMax" @input="applyRange">
            </label>
          </template>
          <label v-if="sel.isPump" class="chk">
            <input type="checkbox" v-model="sel.on" @change="togglePumpInit"> Running
          </label>
          <label v-if="sel.isValve" class="chk">
            <input type="checkbox" v-model="sel.open" @change="toggleValveInit"> Open
          </label>
          <label v-if="sel.isControl">Open %
            <input type="range" min="0" max="100" v-model="sel.pct" @input="applyPct">
            <span class="pctval">{{ sel.pct }}%</span>
          </label>
          <button class="del" @click="deleteSel">🗑 Delete</button>
        </div>
      </aside>
```

- [ ] **Step 3: Add inspector field styles**

Add to the scoped `<style>` block:

```css
.fields { display: flex; flex-direction: column; gap: 10px; }
.fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; font-weight: 600; }
.fields label.chk { flex-direction: row; align-items: center; gap: 6px; }
.fields input[type=text], .fields input[type=number] { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 12px; }
.fields input[type=range] { accent-color: #2563eb; }
.pctval { font-size: 11px; color: #2563eb; }
.del { border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626; border-radius: 5px; padding: 5px; font-weight: 600; cursor: pointer; font-size: 12px; }
</style>
```

(Note: the existing scoped block already ends with `</style>` — merge these rules in before that closing tag rather than adding a second scoped block.)

- [ ] **Step 4: Verify the inspector in the browser**

Run: `npm run dev` (SCADA Builder screen, Edit mode)
1. Add a tank, click it. Expected: inspector shows Name + Sim min/max fields. Edit the name → label on canvas updates live.
2. Change Sim max to 60 → no error (effect visible in Run mode later).
3. Add a pump, select it. Expected: Name field + "Running" checkbox.
4. Add a valve → "Open" checkbox; add a control → "Open %" slider that updates the blue bar fill and `NN% open` text on the element live.
5. Add a gauge, select it. Expected: Sim min/max only, no name field.
6. Click Delete on a selected element → it disappears, inspector returns to empty state.
7. Click blank canvas → inspector clears.

- [ ] **Step 5: Commit (optional)**

```bash
git add src/views/ScadaBuilder.vue
git commit -m "feat: add SCADA builder inspector (rename, sim params, delete)"
```

---

## Task 5: Run mode — live simulation and click toggles

**Files:**
- Modify: `src/views/ScadaBuilder.vue` (verification only; the wiring already exists from Tasks 2–3)

**Interfaces:**
- Consumes: `simulateTick`, `mode` watcher, `startSim`/`stopSim`, the `element:pointerclick` run-mode toggles — all added in Task 3.
- Produces: confirmed end-to-end live behavior. No new code unless a defect is found.

- [ ] **Step 1: Verify live simulation end-to-end**

Run: `npm run dev` (SCADA Builder screen)
Build a small chain in Edit mode: Zone → (pipe) → Tank → (pipe) → Pump → (pipe) → Valve → (pipe) → Hopper. Add a Gauge and a Control. Draw pipes from each upstream element's output port to the next element's port.

Switch to **Run** mode. Expected:
1. Palette buttons disabled; dragging/linking disabled.
2. Tank and hopper fill levels drift up/down within their sim range.
3. Gauge needle arc + value wobble; arc turns red near the top of its range.
4. Pumps spin and pipes whose **source** is a running pump animate green flow; pipes off an inactive source show only the grey tube (no green motion).
5. Click a pump → it stops spinning, its downstream pipe flow stops. Click again → resumes.
6. Click a valve → indicator toggles green/grey; downstream pipe flow follows.
7. Select a control and move the inspector slider → connected pipe flow speed changes (faster near 100%, slower near 0%, stops at 0%).
8. Switch back to **Edit** → simulation pauses, drag/link works again. No console errors.

- [ ] **Step 2: If any behavior above fails, fix in `simulate.js` or the paper config, then re-verify Step 1**

(Only if needed. Common culprits: a pipe's `source()` has no `id` because it was drawn endpoint-first — ensure you drag from the source port to the target port; the `flowPipe` source-check handles a missing source by leaving the pipe inactive.)

- [ ] **Step 3: Commit (optional)**

```bash
git add src/views/ScadaBuilder.vue src/scada/simulate.js
git commit -m "feat: verify live run-mode simulation and toggles"
```

---

## Task 6: Persistence — save / load / delete / new

**Files:**
- Modify: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Consumes: `graph`, `selectEl`, `counters` from Task 3.
- Produces: localStorage-backed layout management under key `scada.builder.layouts` (a `{ [name]: serializedGraph }` map), plus toolbar controls.

- [ ] **Step 1: Add persistence state and functions to `<script setup>`**

Add near the other refs (after `const mode = ref('edit')`):

```js
const LS_KEY = 'scada.builder.layouts'
const names = ref([])
const currentName = ref('')
function loadIndex() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
function refreshNames() { names.value = Object.keys(loadIndex()) }
function saveLayout() {
  const name = (prompt('Save layout as:', currentName.value || 'My SCADA') || '').trim()
  if (!name) return
  const idx = loadIndex(); idx[name] = graph.toJSON()
  localStorage.setItem(LS_KEY, JSON.stringify(idx))
  currentName.value = name; refreshNames()
}
function loadLayout(name) {
  if (!name) return
  const idx = loadIndex(); if (!idx[name]) return
  mode.value = 'edit'
  graph.fromJSON(idx[name])
  // keep auto-naming from colliding with loaded names
  graph.getElements().forEach(el => {
    const txt = el.attr && el.attr('name/text')
    if (txt) { const m = /^(.*?)\s+(\d+)$/.exec(txt); if (m) counters[m[1]] = Math.max(counters[m[1]] || 0, Number(m[2])) }
  })
  currentName.value = name; selectEl(null)
}
function deleteLayout() {
  if (!currentName.value) return
  if (!confirm(`Delete layout "${currentName.value}"?`)) return
  const idx = loadIndex(); delete idx[currentName.value]
  localStorage.setItem(LS_KEY, JSON.stringify(idx))
  currentName.value = ''; refreshNames()
}
function newLayout() {
  if (!confirm('Clear the canvas and start a new layout?')) return
  mode.value = 'edit'; graph.clear(); selectEl(null); currentName.value = ''
  for (const k in counters) delete counters[k]
}
```

Add `refreshNames()` at the end of the `onMounted` callback (after `window.addEventListener('resize', onResize)`).

- [ ] **Step 2: Add toolbar controls to the template**

Replace the toolbar block from Task 3:

```html
    <div class="toolbar">
      <strong>SCADA Builder</strong>
      <span class="sp"></span>
      <button :class="{ on: mode === 'edit' }" @click="mode = 'edit'">✎ Edit</button>
      <button :class="{ on: mode === 'run' }" @click="mode = 'run'">▶ Run</button>
    </div>
```

with:

```html
    <div class="toolbar">
      <strong>SCADA Builder</strong>
      <button @click="newLayout">＋ New</button>
      <button @click="saveLayout">💾 Save</button>
      <select class="loadsel" :value="currentName" @change="loadLayout($event.target.value)">
        <option value="">Load…</option>
        <option v-for="n in names" :key="n" :value="n">{{ n }}</option>
      </select>
      <button :disabled="!currentName" @click="deleteLayout">🗑 Delete</button>
      <span class="sp"></span>
      <button :class="{ on: mode === 'edit' }" @click="mode = 'edit'">✎ Edit</button>
      <button :class="{ on: mode === 'run' }" @click="mode = 'run'">▶ Run</button>
    </div>
```

- [ ] **Step 3: Add the load-select style**

Add to the scoped `<style>` block (before its closing `</style>`):

```css
.loadsel { font-size: 12px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; background: #fff; color: #475569; }
```

- [ ] **Step 4: Verify persistence in the browser**

Run: `npm run dev` (SCADA Builder screen)
1. Build a layout (a few components + pipes). Set some sim ranges and a control %.
2. Click **Save**, enter "Test A". Expected: "Test A" appears in the Load dropdown.
3. Click **New**, confirm. Expected: canvas clears.
4. Pick "Test A" from the Load dropdown. Expected: the exact layout returns (positions, names, pipes, sim params).
5. Switch to Run — simulation works on the loaded layout (custom attrs survived `toJSON`/`fromJSON`).
6. Reload the browser tab, return to SCADA Builder, load "Test A". Expected: still there (localStorage persisted).
7. With "Test A" current, click **Delete**, confirm. Expected: removed from the dropdown.
8. No console errors.

- [ ] **Step 5: Commit (optional)**

```bash
git add src/views/ScadaBuilder.vue
git commit -m "feat: add localStorage save/load/delete for SCADA layouts"
```

---

## Task 7: Finalize navigation and full regression check

**Files:**
- Modify: `src/App.vue` (confirm the entry from Task 3 Step 2 is correct and final)

**Interfaces:**
- Consumes: `ScadaBuilder.vue`.
- Produces: the permanent `✚ SCADA Builder` sidebar entry.

- [ ] **Step 1: Confirm the `App.vue` builder entry is present and correct**

`src/App.vue` should import `ScadaBuilder` and include in `screens`:

```js
  { id: 'builder', ico: '✚', label: 'SCADA Builder', title: 'SCADA Builder', comp: ScadaBuilder },
```

(Added in Task 3 Step 2 — verify it is still there, spelled exactly, and that the import line exists.)

- [ ] **Step 2: Full regression pass**

Run: `npm run dev`
1. Click through **every** sidebar screen (KPI, Water, Solar, Power, Boiler, Mfg, Tags, HVAC, Air, Wind, Tank Farm). Expected: all render as before; Water screen flow/pumps/gauges still animate. No console errors.
2. Open **SCADA Builder**: add components, link pipes, edit via inspector, switch to Run (live sim + toggles), save/load/delete. All work.
3. Switch away from the builder to another screen and back. Expected: builder remounts cleanly (fresh empty canvas — session graph is not retained across remount by design; saved layouts reload via the dropdown). No leaked intervals or console errors.

- [ ] **Step 3: Production build sanity check**

Run: `npm run build`
Expected: build completes with no errors. (Vite compiles all SFCs including the new view.)

- [ ] **Step 4: Commit (optional)**

```bash
git add src/App.vue
git commit -m "feat: add SCADA Builder to sidebar navigation"
```

---

## Notes / Known limitations (from spec, intentional)

- Pipe flow uses a **direct source-element check**, not the full upstream dependency chain of the hardcoded Water screen. A pipe whose source is a running pump / open valve / non-empty tank / zone / open control animates; otherwise it shows only the grey tube.
- All component values are **auto-simulated** demo data — no binding to real tags or `usePlantData` state.
- Switching screens and returning gives a **fresh empty canvas**; persistence is explicit via Save/Load (localStorage).
- No JSON file export/import, no undo/redo, no multi-select (out of scope per spec).
