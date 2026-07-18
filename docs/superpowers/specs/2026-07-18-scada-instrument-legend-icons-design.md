# SCADA Instrument Legend Icons — Design

## Context

Reference: a live water-utility SCADA screen (`scada.html` / screenshot) has a
"LEGEND" panel with 9 instrument icon cards: Manual Valve, NRV, Pressure
Transmitter, Valve, Turbidity, Flow Transmitter, Radar Level Sensor, Chlorine
Analyzer, Hydrostatic Level Sensor. This project's `ScadaBuilder` (drag/drop
P&ID editor) does not yet have these as placeable components.

Scope decided in brainstorming: **new legend icon set only**, static (no live
value/state wiring), added to the existing component library so they're
placeable in `ScadaBuilder` alongside Tank/Pump/Valve/etc.

## Existing infra (reused, not replaced)

- `src/scada/shapes.js` — JointJS shape defs, registered under `joint.shapes.s`.
- `src/views/ScadaBuilder.vue` — palette (`palette` array + `PALETTE_ICON` map),
  `makeEl(type)` factory, `TYPE_LABEL` map for the inspector header.
- Precedent: the existing `Custom` shape already proves the "one parameterized
  element type, many presets" pattern (tile + icon glyph + label), avoiding
  9 near-duplicate `Element.define` blocks.

## Design

### 1. One new shape type: `s.Instrument`

Added to `shapes.js`, markup: rounded-rect tile background + a `<path>`
selector (`glyph`) for the icon linework + a label `<text>` below the tile.
Visual size ~72×88 (tile ~56×56, label under it) — consistent footprint with
existing small badge shapes (`Tap`, `FlowMeter`).

```js
export const Instrument = joint.dia.Element.define('s.Instrument', {
  size: { width: 72, height: 88 },
  attrs: {
    tile: { x: 8, y: 0, width: 56, height: 56, rx: 8, fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1.5 },
    glyph: { d: '', fill: 'none', stroke: '#334155', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    name: { x: 36, y: 72, textAnchor: 'middle', fill: '#1f2d3d', fontSize: 11, fontWeight: 'bold' },
  },
}, { markup: svg`<rect @selector="tile"/><path @selector="glyph"/><text @selector="name"/>` })
```

Glyph paths are authored in a 24×24 box and positioned/scaled inside the tile
via a `transform` on the path attrs (computed from the preset, e.g.
`translate(20,16) scale(1.5)`).

### 2. Preset config: `INSTRUMENT_DEFS`

Exported array of 9 presets, each `{ key, label, glyph }`:

| key | label | glyph concept |
|---|---|---|
| `manualValve` | Manual Valve | handwheel (ellipse) + stem + valve body (bowtie) |
| `nrv` | NRV | pipe stub + arrow-in-circle (one-way) |
| `pressureTransmitter` | Pressure Transmitter | dial circle + needle + transmitter stem/box below |
| `instValve` | Valve | ISA bowtie valve symbol (two triangles meeting at a point) |
| `turbidity` | Turbidity | droplet outline + 2–3 small dots (particles) |
| `flowTransmitter` | Flow Transmitter | pipe segment + chevron flow arrows |
| `radarLevel` | Radar Level Sensor | small device box + 2 downward concentric arcs |
| `chlorineAnalyzer` | Chlorine Analyzer | flask/beaker outline + droplet |
| `hydrostaticLevel` | Hydrostatic Level Sensor | vertical probe rod + sensor tip circle |

`instValve` is a distinct key from the existing pipeline `Valve` shape
(`s.Valve`) — the legend's "Valve" is a small instrument-bubble symbol, not
the large actuated gate valve already on canvas.

### 3. ScadaBuilder integration

- Import `Instrument, INSTRUMENT_DEFS` from `../scada/shapes`.
- `palette` array: append 9 entries, one per `INSTRUMENT_DEFS` item —
  `{ type: 'instrument', key: def.key, label: def.label, ico: '<lucide-name>' }`.
- `PALETTE_ICON`: since these 9 share `type: 'instrument'`, extend the palette
  icon lookup to be keyed by `key` for this type (small distinct lucide icon
  per row in the sidebar list — cosmetic only, separate from the on-canvas glyph).
- `makeEl(type, key)`: add an `instrument` case that looks up the preset by
  `key`, creates `new Instrument({ position, attrs: { glyph: { d, transform },
  name: { text: nextName(def.label) } } })`. `addComponent` passes the full
  palette item through (currently only passes `type` — widen the call site to
  pass `p` and destructure `key` where needed).
- `TYPE_LABEL['s.Instrument']` → read the element's stored label at runtime
  (fall back to `'Instrument'`) since all 9 share one JointJS type.

### 4. No live data

No `metrics`, no watchers, no simulate.js changes. Pure static marker, same
tier as `Note`/`Zone` today. Wiring live values is an explicit non-goal for
this pass — can be a follow-up once these exist on canvas.

### 5. Testing

Manual only (no test harness in this repo for the builder UI):
`npm run dev` → open ScadaBuilder → add each of the 9 new palette items →
confirm each renders its distinct glyph + label, drags, and survives
save/export → import round-trip (localStorage JSON, same as existing
components).

## Out of scope

- Live value/state binding for any of the 9 icons.
- Recreating the full OHT water-plant screen from the reference screenshot.
- Changing the existing `Valve`/`Tap`/`FlowMeter` shapes.
