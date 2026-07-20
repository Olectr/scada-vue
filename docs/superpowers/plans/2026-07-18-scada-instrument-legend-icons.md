# SCADA Instrument Legend Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 new static instrument icon shapes (Manual Valve, NRV, Pressure Transmitter, Valve, Turbidity, Flow Transmitter, Radar Level Sensor, Chlorine Analyzer, Hydrostatic Level Sensor) as placeable components in the ScadaBuilder palette.

**Architecture:** One new parameterized JointJS shape `s.Instrument` (tile + icon glyph path + label) added to `src/scada/shapes.js`, driven by a 9-entry `INSTRUMENT_DEFS` preset array — mirrors the existing `Custom` shape's "one type, many presets" pattern instead of 9 near-duplicate `Element.define` blocks. Wired into `ScadaBuilder.vue`'s existing palette/`makeEl`/inspector plumbing.

**Tech Stack:** Vue 3 `<script setup>`, `@joint/core` (JointJS), `lucide-vue-next` (palette row icons).

## Global Constraints

- Static icons only — no live value/state binding, no `metrics`, no simulate.js changes (spec: "No live data").
- New shape key `instValve` for the legend's "Valve" instrument bubble — must NOT collide with the existing large pipeline `s.Valve` shape.
- Reuse existing palette/`makeEl`/`TYPE_LABEL` plumbing in `ScadaBuilder.vue` — no new parallel systems.
- No changes to `Valve`, `Tap`, or `FlowMeter` shapes.

---

### Task 1: Add `Instrument` shape + `INSTRUMENT_DEFS` to shapes.js

**Files:**
- Modify: `src/scada/shapes.js`

**Interfaces:**
- Produces: `Instrument` (JointJS element class, exported), `INSTRUMENT_DEFS` (exported array of `{ key: string, label: string, glyph: string }`), registered as `joint.shapes.s.Instrument`.

- [ ] **Step 1: Add the `Instrument` element definition**

Open `src/scada/shapes.js`. Add this block directly after the existing `Note` shape definition (after the line ending `` `<rect @selector="box"/><text @selector="name"/>` }) `` for `Note`, before the `FlowMeter` comment):

```js
// New: instrument legend icon — small badge (tile + line-art glyph + label) for
// placing standard instrument symbols (valves, transmitters, sensors) on canvas.
// One shape, many presets (see INSTRUMENT_DEFS) — mirrors the Custom-shape pattern.
export const Instrument = joint.dia.Element.define('s.Instrument', { size: { width: 72, height: 88 }, attrs: {
  tile: { x: 8, y: 0, width: 56, height: 56, rx: 8, fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1.5 },
  glyph: { d: '', transform: 'translate(16.8,8.8) scale(1.6)', fill: 'none', stroke: '#334155', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
  name: { x: 36, y: 72, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
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
```

- [ ] **Step 2: Register `Instrument` under `joint.shapes.s`**

Find this block near the bottom of `src/scada/shapes.js`:

```js
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
  Custom,
  FlowPipe,
  Leader,
})
```

Add `Instrument,` to the object (after `Note,` is fine):

```js
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
```

- [ ] **Step 3: Verify the file builds cleanly**

Run: `npm run build`
Expected: Build completes successfully (`✓ built in ...`), no errors referencing `shapes.js`. (This only checks syntax/imports — `Instrument` isn't used anywhere yet, so no visual check is possible until Task 2.)

- [ ] **Step 4: Commit**

```bash
git add src/scada/shapes.js
git commit -m "feat: add Instrument shape and 9 legend icon presets"
```

---

### Task 2: Wire the 9 instrument icons into the ScadaBuilder palette

**Files:**
- Modify: `src/views/ScadaBuilder.vue`

**Interfaces:**
- Consumes: `Instrument`, `INSTRUMENT_DEFS` from `../scada/shapes` (Task 1).
- Produces: 9 new palette entries with `type: 'instrument'`, each placeable on canvas as an `s.Instrument` element with its own glyph + label.

- [ ] **Step 1: Import `Instrument`, `INSTRUMENT_DEFS`, and new palette-row icons**

In `src/views/ScadaBuilder.vue`, find the shapes import (line 4):

```js
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, Control, Chart, Quality, Tap, FlowMeter, Note, Custom, customPath, FlowPipe, Leader, portsCfg } from '../scada/shapes'
```

Replace with:

```js
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, Control, Chart, Quality, Tap, FlowMeter, Note, Custom, customPath, FlowPipe, Leader, portsCfg, Instrument, INSTRUMENT_DEFS } from '../scada/shapes'
```

Find the lucide-vue-next import (line 7):

```js
import { FilePlus2, Save, Trash2, Undo2, Redo2, Copy, Download, Upload, Image as ImageIcon, Sparkles, Moon, Pencil, Play, X, Lock as LockIcon, Cylinder, Triangle, Fan, Diamond, Gauge, CircleDot, Waves, SlidersHorizontal, Flag, FlaskConical, LineChart, Tag, Shapes, Plus, PanelLeft, PanelRight } from 'lucide-vue-next'
```

Replace with (adds `Disc, ArrowRightCircle, Merge, Droplets, Wind, Radar, Waypoints` for the 9 new palette rows):

```js
import { FilePlus2, Save, Trash2, Undo2, Redo2, Copy, Download, Upload, Image as ImageIcon, Sparkles, Moon, Pencil, Play, X, Lock as LockIcon, Cylinder, Triangle, Fan, Diamond, Gauge, CircleDot, Waves, SlidersHorizontal, Flag, FlaskConical, LineChart, Tag, Shapes, Plus, PanelLeft, PanelRight, Disc, ArrowRightCircle, Merge, Droplets, Wind, Radar, Waypoints } from 'lucide-vue-next'
```

- [ ] **Step 2: Add a per-key icon map for the instrument palette rows**

Find line 8:

```js
const PALETTE_ICON = { tank: Cylinder, hopper: Triangle, pump: Fan, valve: Diamond, gauge: Gauge, tap: CircleDot, flow: Waves, control: SlidersHorizontal, zone: Flag, quality: FlaskConical, chart: LineChart, note: Tag }
```

Add a new map directly below it:

```js
const PALETTE_ICON = { tank: Cylinder, hopper: Triangle, pump: Fan, valve: Diamond, gauge: Gauge, tap: CircleDot, flow: Waves, control: SlidersHorizontal, zone: Flag, quality: FlaskConical, chart: LineChart, note: Tag }
const INSTRUMENT_PALETTE_ICON = { manualValve: Disc, nrv: ArrowRightCircle, pressureTransmitter: Gauge, instValve: Merge, turbidity: Droplets, flowTransmitter: Wind, radarLevel: Radar, chlorineAnalyzer: FlaskConical, hydrostaticLevel: Waypoints }
```

- [ ] **Step 3: Append the 9 instrument entries to the `palette` array**

Find the `palette` array (around line 178):

```js
const palette = [
  { type: 'tank', label: 'Tank', ico: '🛢' },
  { type: 'hopper', label: 'Hopper', ico: '⏏' },
  { type: 'pump', label: 'Pump', ico: '⚙' },
  { type: 'valve', label: 'Valve', ico: '▽' },
  { type: 'gauge', label: 'Pressure Gauge', ico: 'Ⓟ' },
  { type: 'tap', label: 'Pressure Tap', ico: '◉' },
  { type: 'flow', label: 'Flow Meter', ico: '🌊' },
  { type: 'control', label: 'Control', ico: '🎚' },
  { type: 'zone', label: 'Zone', ico: '⚑' },
  { type: 'quality', label: 'Water Quality', ico: '🧪' },
  { type: 'chart', label: 'Chart', ico: '📈' },
  { type: 'note', label: 'Label', ico: '📝' },
]
```

Add a `...` spread of the instrument entries before the closing `]`:

```js
const palette = [
  { type: 'tank', label: 'Tank', ico: '🛢' },
  { type: 'hopper', label: 'Hopper', ico: '⏏' },
  { type: 'pump', label: 'Pump', ico: '⚙' },
  { type: 'valve', label: 'Valve', ico: '▽' },
  { type: 'gauge', label: 'Pressure Gauge', ico: 'Ⓟ' },
  { type: 'tap', label: 'Pressure Tap', ico: '◉' },
  { type: 'flow', label: 'Flow Meter', ico: '🌊' },
  { type: 'control', label: 'Control', ico: '🎚' },
  { type: 'zone', label: 'Zone', ico: '⚑' },
  { type: 'quality', label: 'Water Quality', ico: '🧪' },
  { type: 'chart', label: 'Chart', ico: '📈' },
  { type: 'note', label: 'Label', ico: '📝' },
  ...INSTRUMENT_DEFS.map(def => ({ type: 'instrument', key: def.key, label: def.label, icon: INSTRUMENT_PALETTE_ICON[def.key] })),
]
```

- [ ] **Step 4: Add the `instrument` case to `makeEl`**

Find `makeEl` (around line 224):

```js
function makeEl(type) {
  const x = STAGE_W / 2 - 75, y = STAGE_H / 2 - 100
  switch (type) {
    case 'tank': { const tk = new CylTank({ position: { x, y }, attrs: { name: { text: nextName('Tank') } }, ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true), level: 60, simMin: 20, simMax: 70, metrics: defaultMetrics(['level']) }); setTankMarks(tk); return tk }
```

Change the function signature to accept an optional `key`, and add the `instrument` case right before the closing `}` of the `switch`:

```js
function makeEl(type, key) {
  const x = STAGE_W / 2 - 75, y = STAGE_H / 2 - 100
  switch (type) {
    case 'tank': { const tk = new CylTank({ position: { x, y }, attrs: { name: { text: nextName('Tank') } }, ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true), level: 60, simMin: 20, simMax: 70, metrics: defaultMetrics(['level']) }); setTankMarks(tk); return tk }
```

(leave every other `case` line unchanged) then, immediately before the final `}` that closes the `switch` block (the line right after `case 'note': return new Note(...)`), add:

```js
    case 'instrument': { const def = INSTRUMENT_DEFS.find(d => d.key === key); if (!def) return null; return new Instrument({ position: { x, y }, attrs: { glyph: { d: def.glyph }, name: { text: nextName(def.label) } } }) }
```

- [ ] **Step 5: Widen `addComponent` to pass the instrument's `key` through**

Find `addComponent` (around line 241):

```js
function addComponent(type) {
  const el = makeEl(type); if (!el) return
  graph.addCell(el)
  // if a Control is open in the inspector, refresh its link checklist to include the new part
  if (sel.isControl && (type === 'pump' || type === 'valve')) selectEl(selModel())
}
```

Replace with:

```js
function addComponent(item) {
  const type = typeof item === 'string' ? item : item.type
  const key = typeof item === 'string' ? undefined : item.key
  const el = makeEl(type, key); if (!el) return
  graph.addCell(el)
  // if a Control is open in the inspector, refresh its link checklist to include the new part
  if (sel.isControl && (type === 'pump' || type === 'valve')) selectEl(selModel())
}
```

(`typeof item === 'string'` keeps the two other call sites — `mk` at line 73 and the template-scene builders at lines 357/363, which call `makeEl(tp)` directly, not `addComponent` — unaffected; this step only touches `addComponent`'s own body.)

- [ ] **Step 6: Update the palette template to pass the item and resolve the row icon**

Find the palette button in the template (around line 901):

```html
        <button v-for="p in palette" :key="p.type" :disabled="mode === 'run'" @click="addComponent(p.type)">
          <component :is="PALETTE_ICON[p.type]" :size="16" class="ico" /> {{ p.label }}
        </button>
```

Replace with:

```html
        <button v-for="p in palette" :key="p.key || p.type" :disabled="mode === 'run'" @click="addComponent(p)">
          <component :is="p.icon || PALETTE_ICON[p.type]" :size="16" class="ico" /> {{ p.label }}
        </button>
```

(`:key` switches to `p.key || p.type` because the 9 new rows all share `type: 'instrument'` — Vue needs a unique key per row.)

- [ ] **Step 7: Add the `s.Instrument` fallback label**

Find `TYPE_LABEL` (line 456):

```js
const TYPE_LABEL = { 's.Cyl': 'Tank', 's.Hopper': 'Hopper', 's.Pump': 'Pump', 's.Valve': 'Valve', 's.PG': 'Pressure Gauge', 's.Control': 'Control', 's.Zone': 'Zone', 's.Chart': 'Chart', 's.Quality': 'Water Quality', 's.Tap': 'Pressure Tap', 's.Flow': 'Flow Meter', 's.Note': 'Label', 's.Custom': 'Custom' }
```

Replace with:

```js
const TYPE_LABEL = { 's.Cyl': 'Tank', 's.Hopper': 'Hopper', 's.Pump': 'Pump', 's.Valve': 'Valve', 's.PG': 'Pressure Gauge', 's.Control': 'Control', 's.Zone': 'Zone', 's.Chart': 'Chart', 's.Quality': 'Water Quality', 's.Tap': 'Pressure Tap', 's.Flow': 'Flow Meter', 's.Note': 'Label', 's.Custom': 'Custom', 's.Instrument': 'Instrument' }
```

(This is the generic "Type" chip shown in the inspector — line 964, `sel.info.type`. The specific name, e.g. "Manual Valve", still shows via `nameOf()`/the element's own `name/text` attr, which `makeEl`'s `instrument` case already sets in Step 4 — no change needed there.)

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open the ScadaBuilder view in a browser.

1. Confirm 9 new rows appear in the "Components" palette after "Label": Manual Valve, NRV, Pressure Transmitter, Valve, Turbidity, Flow Transmitter, Radar Level Sensor, Chlorine Analyzer, Hydrostatic Level Sensor — each with a distinct row icon.
2. Click each of the 9 rows once. Confirm each adds a small white-tiled badge to the canvas with a distinct glyph and the correct label underneath.
3. Drag one of the new badges — confirm it moves and stays where dropped.
4. Click one to select it — confirm the inspector shows `Type: Instrument` and the correct name (e.g. "Manual Valve 1").
5. Use the toolbar's Export (Download icon) to export the diagram, then Import (Upload icon) to reload it — confirm all 9 placed instruments reappear with correct glyph + label (JSON round-trip).

Expected: all 5 checks pass with no console errors.

- [ ] **Step 9: Commit**

```bash
git add src/views/ScadaBuilder.vue
git commit -m "feat: add 9 instrument icons to ScadaBuilder palette"
```

---

## Self-Review Notes

- **Spec coverage:** All 9 icons (Task 1) + palette/canvas placement (Task 2) + no-live-data constraint (no `metrics`/watchers added) + `instValve` distinct from `s.Valve` — all covered.
- **Placeholder scan:** None — every step has literal code.
- **Type consistency:** `Instrument`/`INSTRUMENT_DEFS` names match between Task 1 (produced) and Task 2 (consumed); `def.key`/`def.label`/`def.glyph` field names used consistently.
