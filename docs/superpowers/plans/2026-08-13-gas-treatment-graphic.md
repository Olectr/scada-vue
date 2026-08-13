# Gas Treatment Process Graphic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Gas Treatment" starter template to the SCADA Builder — a 4-vessel train (T-001–T-004) with per-stage pressure gauges + temp readouts, inline heat exchangers between stages, an ejector skid, a metering skid, a gas export launcher, and 5 labeled output routes — and upgrade the Pressure Gauge component everywhere so its needle and green/yellow/red bands reflect the live value against configurable thresholds.

**Architecture:** The gauge upgrade is an in-place rework of the existing `s.PG` JointJS shape (`src/scada/shapes.js`) plus its simulation (`src/scada/simulate.js`): a single dynamic arc becomes three static color-band arcs (from configurable `bandYellow`/`bandRed` % thresholds) with a needle that rotates to the live value. This is global — every gauge in the app gets it. The new template is built the same way the existing "Chemical Distillation" template is (`loadTemplate('chemical')` in `src/views/ScadaBuilder.vue`): a local set of helper closures that construct and wire up JointJS cells directly, no new shared infrastructure beyond the gauge rework and one new curated P&ID symbol.

**Tech Stack:** Vue 3 `<script setup>`, `@joint/core` (JointJS), no test runner in this repo — verification is `npm run build` (syntax/import gate) plus manual browser checks via `npm run dev`.

## Global Constraints

- The gauge visual upgrade (bands + needle) applies to **every** `s.PG` gauge in the app, not just the new template — per design decision, this is an in-place shape rework, not a new gauge type.
- Band **colors** are fixed (green/yellow/red) — only the two threshold percentages (`bandYellow`, `bandRed`) are user-configurable, per design decision.
- `src/components/JointWaterScada.vue` is confirmed dead code (no route or component imports it — `src/views/Dashboard.vue` only renders `ScadaBuilder`). It uses the old `arc()`/`bgArc`/`fgArc` gauge API that Task 1 removes, so it is deleted rather than migrated, per user decision.
- Ejector skid / Metering skid / Gas export launcher are one-off labeled boxes built inline in the template (`makeCustom` with a literal def) — they are not added to the curated `PID_DEFS` palette, since they're not reusable symbols.
- No automated tests exist in this repo (`package.json` has no test runner). Every task's verification is `npm run build` + a manual browser check.

---

### Task 1: Rework the gauge shape's geometry — bands + needle instead of a single dynamic arc

**Files:**
- Modify: `src/scada/shapes.js`
- Delete: `src/components/JointWaterScada.vue`

**Interfaces:**
- Produces: `arcSeg(f0, f1, radius?)` (path between two fractions of the dial sweep), `needlePoint(frac, radius?)` (needle tip `[x, y]`), `tickPoint(frac, radius?)` (tick label `[x, y]`) — all exported from `src/scada/shapes.js`. `PGauge`'s attrs gain `bandG`/`bandY`/`bandR` (path), `tick0`..`tick4` (text), `needle` (line), `hub` (circle) selectors; `bgArc`/`fgArc` and the old `arc()` export are removed.
- Consumes: nothing new.

- [ ] **Step 1: Delete the dead static Water screen component**

```bash
git rm src/components/JointWaterScada.vue
```

- [ ] **Step 2: Replace the gauge arc helper with dial-geometry helpers**

In `src/scada/shapes.js`, find:

```js
// gauge arc helper
const A0 = 130, SWEEP = 280, R = 40, CX = 48, CY = 48
export function arc(frac) {
  const a0 = A0, a1 = A0 + SWEEP * Math.max(0, Math.min(1, frac))
  const p = (deg) => [CX + R * Math.cos(deg * Math.PI / 180), CY + R * Math.sin(deg * Math.PI / 180)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  const large = (a1 - a0) > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`
}
```

Replace with:

```js
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
```

- [ ] **Step 3: Replace the `PGauge` shape definition**

Find:

```js
export const PGauge = joint.dia.Element.define('s.PG', { size: { width: 96, height: 96 }, attrs: {
  bgArc: { d: '', fill: 'none', stroke: '#e2e8f0', strokeWidth: 9, strokeLinecap: 'round' },
  fgArc: { d: '', fill: 'none', stroke: '#dc2626', strokeWidth: 9, strokeLinecap: 'round' },
  unit: { x: 48, y: 44, textAnchor: 'middle', fill: '#6b7c8f', fontSize: 12 },
  val: { x: 48, y: 70, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 24, fontWeight: 'bold' },
} }, { markup: svg`<path @selector="bgArc"/><path @selector="fgArc"/><text @selector="unit">Ⓟ bar</text><text @selector="val"/>` })
```

Replace with:

```js
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
```

(`SCALE_BASE`'s `'s.PG': { w: 96, h: 96 }` entry further down the file is unchanged — the dial's outer size doesn't change.)

- [ ] **Step 4: Verify the file builds cleanly**

Run: `npm run build`
Expected: Build fails at this point — that's expected. `src/scada/simulate.js` and `src/views/ScadaBuilder.vue` still import the now-removed `arc` export. Confirm the error specifically names `arc` and `shapes.js` (not something else, e.g. a typo in this step's edits). Task 2 fixes this.

- [ ] **Step 5: Commit**

```bash
git add -A src/scada/shapes.js src/components/JointWaterScada.vue
git commit -m "feat: rework gauge dial to band arcs + needle geometry"
```

---

### Task 2: Drive the gauge's bands and needle from simulate.js

**Files:**
- Modify: `src/scada/simulate.js`

**Interfaces:**
- Consumes: `arcSeg`, `needlePoint`, `tickPoint` from `../scada/shapes` (Task 1).
- Produces: `layoutGaugeBands(elm)` (exported) — draws the 3 band arcs + 5 tick labels from `elm`'s `simMin`/`simMax`/`bandYellow`/`bandRed`. Call on gauge creation and whenever those fields change; NOT every sim tick. `gauge(elm, graph, nodeFlow, ctrlPct)` (unexported, called every tick from `simulateTick`) now updates only the needle + value text.

- [ ] **Step 1: Swap the `arc` import for the new geometry helpers**

Find (top of file):

```js
// Generic per-element-type simulation for the SCADA builder.
// Auto-generates drifting demo values and animates pipe flow based on the
// pipe's SOURCE element state (simple source-check, not a full upstream chain).
import { clamp, drift, rnd, state } from '../composables/usePlantData'
import { arc } from './shapes'
```

Replace with:

```js
// Generic per-element-type simulation for the SCADA builder.
// Auto-generates drifting demo values and animates pipe flow based on the
// pipe's SOURCE element state (simple source-check, not a full upstream chain).
import { clamp, drift, rnd, state } from '../composables/usePlantData'
import { arcSeg, needlePoint, tickPoint } from './shapes'
```

- [ ] **Step 2: Replace `gauge()` and add `layoutGaugeBands()`**

Find:

```js
function gauge(elm, graph, nodeFlow, ctrlPct) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  const tag = elm.get('tag')
  let v = tag ? (Number(readTag(tag)) || 0) : gaugePressure(elm, graph, nodeFlow, ctrlPct) // bound tag or pump pressure via tap
  if (v == null) v = 0
  v = Math.max(lo, Math.min(hi, v))
  elm.set('value', v, { silent: true })
  const frac = hi > lo ? (v - lo) / (hi - lo) : 0
  const col = frac > 0.85 ? '#dc2626' : '#16a34a'
  elm.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(frac), stroke: col }, val: { text: v.toFixed(1) } })
}
```

Replace with:

```js
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
}

function gauge(elm, graph, nodeFlow, ctrlPct) {
  const lo = elm.get('simMin') ?? 0, hi = elm.get('simMax') ?? 8
  const tag = elm.get('tag')
  let v = tag ? (Number(readTag(tag)) || 0) : gaugePressure(elm, graph, nodeFlow, ctrlPct) // bound tag or pump pressure via tap
  if (v == null) v = 0
  v = Math.max(lo, Math.min(hi, v))
  elm.set('value', v, { silent: true })
  const frac = hi > lo ? (v - lo) / (hi - lo) : 0
  const [nx, ny] = needlePoint(frac)
  elm.attr({ needle: { x2: nx, y2: ny }, val: { text: v.toFixed(1) } })
}
```

- [ ] **Step 3: Verify the file builds cleanly**

Run: `npm run build`
Expected: Build still fails — `src/views/ScadaBuilder.vue` still imports the removed `arc` export (Task 3 fixes this). Confirm the error now only references `ScadaBuilder.vue`, not `simulate.js` — that isolates this task's edit as correct.

- [ ] **Step 4: Commit**

```bash
git add src/scada/simulate.js
git commit -m "feat: drive gauge needle + static bands from simulate.js"
```

---

### Task 3: Wire band thresholds into the ScadaBuilder property panel

**Files:**
- Modify: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Consumes: `layoutGaugeBands` from `../scada/simulate` (Task 2).
- Produces: every `s.PG` element gains `bandYellow`/`bandRed` fields (defaults 60/85); property panel shows "Yellow at %"/"Red at %" inputs when a gauge is selected; `applyBands()` function.

- [ ] **Step 1: Import `layoutGaugeBands` and drop the removed `arc` import**

Find (line 5):

```js
import { simulateTick, refreshLinks, setPumpVisual, setValveVisual, setTankMarks, TAGS } from '../scada/simulate'
```

Replace with:

```js
import { simulateTick, refreshLinks, setPumpVisual, setValveVisual, setTankMarks, layoutGaugeBands, TAGS } from '../scada/simulate'
```

(This file never imported `arc` directly — it only broke via `../scada/shapes`'s `import { ... } from '../scada/shapes'`, which doesn't list `arc`. The build failure from Task 1/2 was `simulate.js`'s own now-fixed import; this file was never actually broken. No `shapes.js` import line changes needed here.)

- [ ] **Step 2: Give new gauges default band thresholds**

Find (`makeEl`, the `gauge` case):

```js
    case 'gauge': return new PGauge({ position: { x, y }, attrs: { name: { text: nextName('Gauge') } }, value: 4, simMin: 0, simMax: 8, ports: portsCfg([{ id: 'p', x: 48, y: 96 }], true), metrics: defaultMetrics(['value']) })
```

Replace with:

```js
    case 'gauge': { const g = new PGauge({ position: { x, y }, attrs: { name: { text: nextName('Gauge') } }, value: 4, simMin: 0, simMax: 8, bandYellow: 60, bandRed: 85, ports: portsCfg([{ id: 'p', x: 48, y: 96 }], true), metrics: defaultMetrics(['value']) }); layoutGaugeBands(g); return g }
```

- [ ] **Step 3: Backfill band thresholds on gauges saved before this change**

Find (in `migrateCells`):

```js
    if (e.get('type') === 's.Custom') {
      if (!e.get('shape')) { // migrate a pre-flexible custom (had attrs.box.fill, no config props)
        e.set('shape', 'box'); e.set('behavior', 'static')
        const oldFill = e.attr('box/fill'); if (oldFill) e.set('fillColor', oldFill)
        if (!e.get('borderColor')) e.set('borderColor', '#6366f1')
      }
      if (e.get('svgBody') && !e.get('svgVB')) e.set('svgVB', parseSvgVB(e.get('svgBody'))) // backfill for pre-svgVB saves
      renderCustom(e) // re-apply shape/icon/colors after load
    }
    applyScale(e) // re-apply per-element scale on fixed-art shapes (no-op at scale 1 / other types)
```

Replace with:

```js
    if (e.get('type') === 's.Custom') {
      if (!e.get('shape')) { // migrate a pre-flexible custom (had attrs.box.fill, no config props)
        e.set('shape', 'box'); e.set('behavior', 'static')
        const oldFill = e.attr('box/fill'); if (oldFill) e.set('fillColor', oldFill)
        if (!e.get('borderColor')) e.set('borderColor', '#6366f1')
      }
      if (e.get('svgBody') && !e.get('svgVB')) e.set('svgVB', parseSvgVB(e.get('svgBody'))) // backfill for pre-svgVB saves
      renderCustom(e) // re-apply shape/icon/colors after load
    }
    if (e.get('type') === 's.PG') {
      // backfill band thresholds on gauges saved before banded dials existed, then redraw
      if (e.get('bandYellow') == null) e.set('bandYellow', 60)
      if (e.get('bandRed') == null) e.set('bandRed', 85)
      layoutGaugeBands(e)
    }
    applyScale(e) // re-apply per-element scale on fixed-art shapes (no-op at scale 1 / other types)
```

- [ ] **Step 4: Add `bandYellow`/`bandRed` to the selection state**

Find:

```js
const sel = reactive({
  id: null, type: null, name: '', hasName: false, hasRange: false,
  isPump: false, isValve: false, isControl: false,
  simMin: 0, simMax: 8, on: false, open: false, pct: 100,
```

Replace with:

```js
const sel = reactive({
  id: null, type: null, name: '', hasName: false, hasRange: false,
  isPump: false, isValve: false, isControl: false,
  simMin: 0, simMax: 8, bandYellow: 60, bandRed: 85, on: false, open: false, pct: 100,
```

- [ ] **Step 5: Populate the new fields when a gauge is selected**

Find (in `selectEl`):

```js
  sel.hasRange = (t === 's.Cyl' || t === 's.Hopper' || t === 's.PG')
  sel.isPump = t === 's.Pump'; sel.isValve = t === 's.Valve'; sel.isControl = t === 's.Control'
  sel.simMin = model.get('simMin') ?? (t === 's.PG' ? 0 : 20)
  sel.simMax = model.get('simMax') ?? (t === 's.PG' ? 8 : 70)
```

Replace with:

```js
  sel.hasRange = (t === 's.Cyl' || t === 's.Hopper' || t === 's.PG')
  sel.isPump = t === 's.Pump'; sel.isValve = t === 's.Valve'; sel.isControl = t === 's.Control'
  sel.simMin = model.get('simMin') ?? (t === 's.PG' ? 0 : 20)
  sel.simMax = model.get('simMax') ?? (t === 's.PG' ? 8 : 70)
  sel.bandYellow = model.get('bandYellow') ?? 60
  sel.bandRed = model.get('bandRed') ?? 85
```

- [ ] **Step 6: Redraw bands on range change, and add `applyBands()`**

Find:

```js
function applyRange() {
  const m = selModel(); if (!m) return
  const lo = Number(sel.simMin), hi = Number(sel.simMax)
  if (!Number.isNaN(lo)) m.set('simMin', lo)
  if (!Number.isNaN(hi)) m.set('simMax', hi)
  if (m.get('type') === 's.Cyl') setTankMarks(m) // move the range marker lines live
}
```

Replace with:

```js
function applyRange() {
  const m = selModel(); if (!m) return
  const lo = Number(sel.simMin), hi = Number(sel.simMax)
  if (!Number.isNaN(lo)) m.set('simMin', lo)
  if (!Number.isNaN(hi)) m.set('simMax', hi)
  if (m.get('type') === 's.Cyl') setTankMarks(m) // move the range marker lines live
  else if (m.get('type') === 's.PG') layoutGaugeBands(m) // range change also redraws tick labels
}
function applyBands() {
  const m = selModel(); if (!m || m.get('type') !== 's.PG') return
  const y = Number(sel.bandYellow), r = Number(sel.bandRed)
  if (!Number.isNaN(y)) m.set('bandYellow', y)
  if (!Number.isNaN(r)) m.set('bandRed', r)
  layoutGaugeBands(m)
}
```

- [ ] **Step 7: Add the property panel inputs**

Find:

```html
          <template v-if="sel.hasRange">
            <label>{{ sel.type === 's.PG' ? 'Min' : 'Low mark %' }}
              <input type="number" v-model="sel.simMin" @input="applyRange">
            </label>
            <label>{{ sel.type === 's.PG' ? 'Max' : 'High mark %' }}
              <input type="number" v-model="sel.simMax" @input="applyRange">
            </label>
            <label>Bind live tag
              <select v-model="sel.tag" @change="applyTag">
                <option value="">— simulated —</option>
                <option v-for="t in tagList" :key="t.path" :value="t.path">{{ t.label }}</option>
              </select>
            </label>
          </template>
```

Replace with:

```html
          <template v-if="sel.hasRange">
            <label>{{ sel.type === 's.PG' ? 'Min' : 'Low mark %' }}
              <input type="number" v-model="sel.simMin" @input="applyRange">
            </label>
            <label>{{ sel.type === 's.PG' ? 'Max' : 'High mark %' }}
              <input type="number" v-model="sel.simMax" @input="applyRange">
            </label>
            <template v-if="sel.type === 's.PG'">
              <label>Yellow at %
                <input type="number" v-model="sel.bandYellow" @input="applyBands">
              </label>
              <label>Red at %
                <input type="number" v-model="sel.bandRed" @input="applyBands">
              </label>
            </template>
            <label>Bind live tag
              <select v-model="sel.tag" @change="applyTag">
                <option value="">— simulated —</option>
                <option v-for="t in tagList" :key="t.path" :value="t.path">{{ t.label }}</option>
              </select>
            </label>
          </template>
```

- [ ] **Step 8: Verify the file builds cleanly**

Run: `npm run build`
Expected: Build succeeds (`✓ built in ...`), no errors. This confirms Tasks 1–3 together leave the app in a working state.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open the SCADA Builder in a browser.

1. From the "Components" palette, click "Pressure Gauge" to add one to the canvas. Confirm it renders a dial with 3 color bands (green/yellow/red), 5 tick numbers around the rim, and a needle — not the old single growing arc.
2. Select the gauge. Confirm the inspector shows Min/Max fields (unchanged) plus new "Yellow at %"/"Red at %" fields showing `60`/`85`.
3. Change "Yellow at %" to `30` — confirm the green/yellow band boundary visibly redraws immediately (green band shrinks).
4. Set "Bind live tag" to "Water · Header pressure" — confirm the needle starts moving on its own within a few seconds (simulation tick) and the value text updates.
5. Export the layout (Add menu isn't relevant here — use the overflow menu's Save, or the toolbar Export/Download), reload the page, re-import it — confirm the gauge keeps its band settings and still renders correctly.

Expected: all 5 checks pass with no console errors.

- [ ] **Step 10: Commit**

```bash
git add src/views/ScadaBuilder.vue
git commit -m "feat: add band-threshold property panel controls for gauges"
```

---

### Task 4: Add the inline heat-exchanger P&ID symbol

**Files:**
- Modify: `src/scada/pidSymbols.js`
- Modify: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Produces: a new `PID_DEFS` entry with `key: 'pidHxInline'` (small circle-with-cross inline exchanger symbol, 44×44, static behavior, left/right ports via the shared `def()` defaults).

- [ ] **Step 1: Add the `pidHxInline` symbol**

In `src/scada/pidSymbols.js`, find:

```js
  {
    key: 'pidCooler',
    ...def('Air Cooler', {
      w: 110, h: 56,
      svg: `<svg viewBox="0 0 110 56" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="102" height="40" rx="4" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M18 8 V48 M32 8 V48 M46 8 V48 M60 8 V48 M74 8 V48 M88 8 V48" stroke="#7c8894" stroke-width="1.2"/><rect x="24" y="2" width="10" height="6" fill="${MGREY}" stroke="${S}"/><rect x="76" y="2" width="10" height="6" fill="${MGREY}" stroke="${S}"/></svg>`,
    }),
  },
  {
    key: 'pidPump',
```

Replace with:

```js
  {
    key: 'pidCooler',
    ...def('Air Cooler', {
      w: 110, h: 56,
      svg: `<svg viewBox="0 0 110 56" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="102" height="40" rx="4" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M18 8 V48 M32 8 V48 M46 8 V48 M60 8 V48 M74 8 V48 M88 8 V48" stroke="#7c8894" stroke-width="1.2"/><rect x="24" y="2" width="10" height="6" fill="${MGREY}" stroke="${S}"/><rect x="76" y="2" width="10" height="6" fill="${MGREY}" stroke="${S}"/></svg>`,
    }),
  },
  {
    key: 'pidHxInline',
    ...def('Inline Exchanger', {
      w: 44, h: 44,
      svg: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="19" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M7 7 L37 37 M37 7 L7 37" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidPump',
```

- [ ] **Step 2: Give it a palette row icon**

In `src/views/ScadaBuilder.vue`, find:

```js
const PID_PALETTE_ICON = { pidColumn: Cylinder, pidDrum: Cylinder, pidLevelBox: Gauge, pidHxH: Merge, pidHxV: Merge, pidCooler: Wind, pidPump: Fan, pidValve: Diamond, pidCtrlValve: SlidersHorizontal, pid3Way: Waypoints, pidFlowBox: Waves, pidTempBox: Gauge, pidLight: CircleDot, pidAccum: Cylinder }
```

Replace with:

```js
const PID_PALETTE_ICON = { pidColumn: Cylinder, pidDrum: Cylinder, pidLevelBox: Gauge, pidHxH: Merge, pidHxV: Merge, pidCooler: Wind, pidHxInline: Merge, pidPump: Fan, pidValve: Diamond, pidCtrlValve: SlidersHorizontal, pid3Way: Waypoints, pidFlowBox: Waves, pidTempBox: Gauge, pidLight: CircleDot, pidAccum: Cylinder }
```

(`Merge` is already imported at the top of this file — no new import needed.)

- [ ] **Step 3: Verify the file builds cleanly**

Run: `npm run build`
Expected: Build succeeds, no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the SCADA Builder.

1. Open the "P&ID Symbols" accordion section in the left rail. Confirm an "Inline Exchanger" row appears (alongside Column, Vessel, Heat Exchanger, etc.), with a merge-style icon.
2. Click it — confirm a small grey circle with a diagonal cross appears on the canvas, centered on the stage.
3. Drag a `FlowPipe` (or use two other components) to connect into its left/right ports — confirm the ports are there and connectable.

Expected: all 3 checks pass with no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/scada/pidSymbols.js src/views/ScadaBuilder.vue
git commit -m "feat: add inline heat exchanger P&ID symbol"
```

---

### Task 5: Build the Gas Treatment template

**Files:**
- Modify: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Consumes: `layoutGaugeBands` (Task 2/3, already imported), `pidHxInline` (Task 4, via `PID_DEFS`), everything `loadTemplate('chemical')` already consumes (`PID_DEFS`, `makeCustom`, `CylTank`, `PGauge`, `Note`, `FlowPipe`, `portsCfg`, `defaultMetrics`, `setTankMarks`, `nextName`, `graph`).
- Produces: `loadTemplate('gas')` — a fully-wired Gas Treatment screen; a `"Gas Treatment"` entry in the template `<select>`.

- [ ] **Step 1: Add the template branch**

Find the end of the `chemical` branch and the closing of the `if`/`else if` chain in `loadTemplate`:

```js
    lbl('Residues ◀', 15, 470, GREY); const vRes = mkP('pidValve', 150, 465)
    lbl('Recycle ◀', 15, 510, GREY); const vRec = mkP('pidValve', 150, 505)
    lbl('Storage ◀', 15, 550, NITRO); const vSto = mkP('pidValve', 150, 545)
    lbl('Crude ◀', 15, 590, GREY); const pumpOut = mk('pump'); pumpOut.position(140, 580)
    pipe(pumpReb, 'l', vRes, 'right', GREY); pipe(pumpReb, 'l', vRec, 'right', GREY); pipe(pumpReb, 'l', vSto, 'right', NITRO)
    pipe(pumpOut, 'r', v50, 'right', GREY)
  }
  currentName.value = ''; selectEl(null); syncOverlays(); resetHistory()
}
```

Replace with (only the `}` before `currentName.value` changes — the rest of the `chemical` branch above it is untouched):

```js
    lbl('Residues ◀', 15, 470, GREY); const vRes = mkP('pidValve', 150, 465)
    lbl('Recycle ◀', 15, 510, GREY); const vRec = mkP('pidValve', 150, 505)
    lbl('Storage ◀', 15, 550, NITRO); const vSto = mkP('pidValve', 150, 545)
    lbl('Crude ◀', 15, 590, GREY); const pumpOut = mk('pump'); pumpOut.position(140, 580)
    pipe(pumpReb, 'l', vRes, 'right', GREY); pipe(pumpReb, 'l', vRec, 'right', GREY); pipe(pumpReb, 'l', vSto, 'right', NITRO)
    pipe(pumpOut, 'r', v50, 'right', GREY)
  } else if (kind === 'gas') {
    // eigen-style Gas Treatment train — 4-vessel separator cascade (T-001..T-004), each stage
    // cooled by an inline exchanger, with a live pressure gauge + temp readout per stage, an
    // ejector skid off T-003, and a metering/export header after T-004.
    const GREY = '#c5cdd6', GAS = '#f59e0b'
    const pidDef = key => PID_DEFS.find(d => d.key === key)
    const mkP = (key, x, y, over) => { const e = makeCustom({ ...pidDef(key), ...(over || {}) }, x, y); graph.addCell(e); return e }
    const skid = (label, x, y, w, h) => {
      const e = makeCustom({ label, shape: 'box', w, h, color: '#eef2f6', border: '#4b5866' }, x, y)
      e.attr('name/text', label); graph.addCell(e); return e
    }
    const lbl = (text, x, y, color, w) => {
      const n = new Note({ position: { x, y }, size: { width: w || 230, height: 18 },
        attrs: { box: { fill: 'transparent', stroke: 'none' }, name: { text, fill: color || '#94a3b8', fontSize: 12, fontWeight: 700 } } })
      graph.addCell(n); return n
    }
    const pipe = (s, sp, t, tp, color, width) => {
      const l = new FlowPipe({ source: { id: s.id, port: sp }, target: { id: t.id, port: tp } })
      l.attr('line/stroke', color || GREY); l.attr('line/strokeWidth', width || 5); l.attr('wrap/strokeWidth', (width || 5) + 5)
      graph.addCell(l); return l
    }
    const route = (s, sp, x, y, text, color) => {
      const l = new FlowPipe({ source: { id: s.id, port: sp }, target: { x, y } })
      l.attr('line/stroke', color || GREY); l.attr('line/strokeWidth', 4); l.attr('wrap/strokeWidth', 9)
      l.attr('line/targetMarker', { type: 'path', d: 'M 10 -6 0 0 10 6 Z', fill: color || GREY })
      graph.addCell(l); lbl(text, x + 14, y - 9, color || GREY)
    }
    const tank4 = (name, x, lvl) => {
      const tk = new CylTank({ position: { x, y: 260 }, attrs: { name: { text: name } },
        ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true),
        level: lvl, simMin: 20, simMax: 70, metrics: defaultMetrics(['level']) })
      setTankMarks(tk); graph.addCell(tk); return tk
    }
    const mkGauge = (x, tag, lo, hi, warn, danger) => {
      const g = new PGauge({ position: { x, y: 20 }, attrs: { name: { text: nextName('Gauge') } },
        value: (lo + hi) / 2, simMin: lo, simMax: hi, bandYellow: warn, bandRed: danger, tag,
        ports: portsCfg([{ id: 'p', x: 48, y: 96 }], true), metrics: defaultMetrics(['value']) })
      layoutGaugeBands(g); graph.addCell(g); return g
    }
    const temp = (x, y, val) => { const t = mkP('pidTempBox', x, y); t.set('value', val); return t }

    const t1 = tank4('T-001', 40, 39)
    const t2 = tank4('T-002', 300, 54)
    const t3 = tank4('T-003', 560, 65)
    const t4 = tank4('T-004', 820, 43)

    mkGauge(67, 'water.prs', 0, 8, 55, 80); temp(73, 128, 25)
    mkGauge(327, 'air.prs', 0, 10, 55, 78); temp(333, 128, 27)
    mkGauge(587, 'boiler.bPrs', 100, 160, 60, 80); temp(593, 128, 29)
    mkGauge(847, 'solar.irr', 500, 1000, 60, 85); temp(853, 128, 45)

    const hx1 = mkP('pidHxInline', 223, 380)
    const hx2 = mkP('pidHxInline', 483, 380)
    const hx3 = mkP('pidHxInline', 743, 380)
    pipe(t1, 'bot', hx1, 'left', GAS); pipe(hx1, 'right', t2, 'top', GAS)
    pipe(t2, 'bot', hx2, 'left', GAS); pipe(hx2, 'right', t3, 'top', GAS)
    pipe(t3, 'bot', hx3, 'left', GAS); pipe(hx3, 'right', t4, 'top', GAS)

    const ejector = skid('Ejector skid', 560, 570, 150, 60)
    pipe(t3, 'bot', ejector, 'left', GREY); pipe(ejector, 'right', t3, 'top', GREY)

    const metering = skid('Metering skid', 1020, 20, 140, 56)
    const launcher = skid('Gas export launcher', 1020, 160, 170, 56)
    pipe(t4, 'top', metering, 'left', GAS)
    pipe(t4, 'top', launcher, 'left', GAS)

    route(t4, 'top', 1260, 40, 'To gas lift manifold', GAS)
    route(metering, 'right', 1260, 140, 'To gas rejection system', GAS)
    route(launcher, 'right', 1260, 240, 'To gas export pipeline', GAS)
    route(t1, 'bot', 1260, 460, 'To 2nd stage separator heater', GREY)
    route(t2, 'bot', 1260, 540, 'To inlet separator', GREY)
  }
  currentName.value = ''; selectEl(null); syncOverlays(); resetHistory()
}
```

- [ ] **Step 2: Add the dropdown option**

Find:

```html
              <select class="loadsel" value="" @change="loadTemplate($event.target.value); $event.target.value = ''" @click.stop>
                <option value="">Template…</option>
                <option value="water">Water Treatment</option>
                <option value="dual">Dual Pump</option>
                <option value="chemical">Chemical Distillation</option>
              </select>
```

Replace with:

```html
              <select class="loadsel" value="" @change="loadTemplate($event.target.value); $event.target.value = ''" @click.stop>
                <option value="">Template…</option>
                <option value="water">Water Treatment</option>
                <option value="dual">Dual Pump</option>
                <option value="chemical">Chemical Distillation</option>
                <option value="gas">Gas Treatment</option>
              </select>
```

- [ ] **Step 3: Verify the file builds cleanly**

Run: `npm run build`
Expected: Build succeeds, no errors.

- [ ] **Step 4: Manual verification against the ticket's acceptance criteria**

Run: `npm run dev`, open the SCADA Builder, use the "Add" menu's Template dropdown to load "Gas Treatment" (confirm the canvas replace confirmation appears if there's existing content, then the new screen loads).

1. Confirm 4 vessels appear left-to-right, labeled T-001, T-002, T-003, T-004, each showing a cyan level-fill bar with a live-updating percentage (e.g. 39, 54, 65, 43 initially).
2. Confirm each vessel has a pressure gauge above it (dial with green/yellow/red bands + needle) and a small temperature readout box below the gauge (e.g. "25.0 °C") — one gauge+temp pair per stage.
3. Confirm 3 small circle-with-cross heat exchanger icons sit between T-001/T-002, T-002/T-003, and T-003/T-004, connected inline on the pipe.
4. Confirm "Ejector skid" (near T-003), "Metering skid", and "Gas export launcher" (both after T-004) render as labeled boxes.
5. Confirm 5 output lines with arrowheads run to the right margin, each ending near its label: "To gas lift manifold", "To gas rejection system", "To gas export pipeline", "To 2nd stage separator heater", "To inlet separator".
6. Wait ~5–10 seconds and confirm at least one gauge's needle visibly moves and its value text updates (the tag-bound live simulation).
7. Select the T-003 gauge (bound to `boiler.bPrs`, range 100–160, bands at 60%/80%) — watch it over ~20–30 seconds and confirm the needle crosses from the green band into yellow (and occasionally red) as the underlying plant value drifts, with the value text agreeing with the needle's position. This is the ticket's acceptance criterion: needle/colors reflect the live value against the configured bands.
8. Save the layout (Save in the overflow menu), reload the page, load it back — confirm the whole screen reappears intact.

Expected: all 8 checks pass with no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/ScadaBuilder.vue
git commit -m "feat: add Gas Treatment process graphic template"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (gauge upgrade: bands, needle, ticks, configurable thresholds) → Tasks 1–3. §2 (inline heat-exchanger symbol) → Task 4. §3 (template: 4 vessels, per-stage gauge+temp, 3 heat exchangers, ejector/metering/launcher skids, 5 output routes with arrowheads) → Task 5. The dead-code discovery (`JointWaterScada.vue`) that the original spec didn't anticipate is resolved in Task 1 per the user's explicit decision to delete it. Testing section's 4 manual checks are covered by Task 3 Step 9 (bands/threshold editing + regression-safety of the global gauge change) and Task 5 Step 4 (full template + live band/needle behavior + export/import).
- **Placeholder scan:** None — every step has literal, complete code.
- **Type/name consistency:** `arcSeg`/`needlePoint`/`tickPoint` (Task 1 exports) match their use in Task 2. `layoutGaugeBands` (Task 2 export) matches its imports/calls in Task 3 and Task 5. `bandYellow`/`bandRed` field names match across Tasks 2, 3, and 5's `mkGauge` helper. `pidHxInline` key matches between Task 4's `PID_DEFS` entry, its `PID_PALETTE_ICON` entry, and Task 5's `mkP('pidHxInline', ...)` calls.
