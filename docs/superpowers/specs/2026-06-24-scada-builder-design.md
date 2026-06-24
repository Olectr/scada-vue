# SCADA Builder — Design Spec

**Date:** 2026-06-24
**Status:** Approved, ready for implementation plan

## Goal

Let any user build their own SCADA P&ID diagram from a palette of components
(tank, hopper, pump, valve, pressure gauge, control, zone), wire them together
with pipes, and run it live — all reachable from a single new sidebar button.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Build mode | Drag-drop canvas (palette + JointJS paper + property inspector) |
| Live behavior | Live/animated like the existing Water screen, on the user's own layout |
| Data source | Auto-simulated — each placed component self-generates drifting demo values |
| Persistence | localStorage named save / load / delete |
| Entry point | New nav item `✚ SCADA Builder` in `App.vue` |

## Approach

New self-contained `ScadaBuilder.vue` view that reuses JointJS. The six shape
definitions currently inlined in `src/components/JointWaterScada.vue` are
extracted into a shared module so both screens use one source of truth. No
behavioral change to other screens.

Rejected: edit-mode bolted onto the existing Water screen (couples builder to a
working demo, breakage risk); a heavier diagram library (JointJS already
supports interactive port linking).

## Architecture

### Files

| File | Action | Purpose |
|------|--------|---------|
| `src/scada/shapes.js` | new | Custom JointJS shape defs + `FlowPipe` link, gradients, port config helper. Exported for reuse. |
| `src/scada/simulate.js` | new | Generic per-element-type simulation tick. |
| `src/views/ScadaBuilder.vue` | new | Palette + canvas + inspector + toolbar; the builder UI. |
| `src/App.vue` | edit | Add `builder` entry to the `screens` array. |
| `src/components/JointWaterScada.vue` | edit | Import shapes from `src/scada/shapes.js` instead of defining inline. Behavior unchanged; verify the live screen still works. |

### `src/scada/shapes.js`

Exports:
- `SILVER`, `STEEL` gradient configs.
- `portGrp`, `portsCfg` helpers (active magnet ports so they are linkable in the builder).
- Element classes: `CylTank`, `Hopper`, `Pump`, `Valve`, `Zone`, `PGauge` (moved verbatim from `JointWaterScada.vue`).
- `FlowPipe` — custom `joint.dia.Link` with markup of two paths: grey tube (`wrap`) + green dashed flow (`line`). One interactive link renders both pipe layers.
- `arc(frac)` helper for gauge arcs.
- A `cellNamespace` object bundling all custom shapes, passed to `Graph` / `Paper` so `fromJSON` can rebuild them on load.

Ports must use an **active** magnet (`magnet: true`) so the user can drag a pipe
out of a port in Edit mode (the existing screen uses `magnet: 'passive'` because
it never draws links interactively; the shared helper keeps passive for static
use and the builder enables linking via paper config / `validateMagnet`).

### `src/scada/simulate.js`

Exports `simulateTick(graph)` (and start/stop helpers). Called once per second
in Run mode. For each element, branch on its `type`:

- **CylTank / Hopper** — `level` drifts within `[simMin, simMax]` (default 20–95);
  update the `fill` rect geometry.
- **Pump** — `on` boolean; when on, spin `imp`, set inner fill green, `pressure`
  drifts 1.4–3.4; when off, stop.
- **Valve** — `open` boolean; indicator fill green/grey.
- **PGauge** — `value` drifts within range (default 0–8); set `bgArc`/`fgArc`/text,
  red arc when high.
- **Control** — `pct` 0–100 (slider in inspector / overlay); used to set the
  animation speed of pipes whose source is this element.
- **Zone** — static label, always an active source.

Per-element sim parameters (`simMin`, `simMax`, `on`, `open`, `pct`, ...) are
stored as custom attributes on the element model so they serialize with
`toJSON()`.

**Pipe flow rule (intentionally simple):** a `FlowPipe` animates when its
**source** element is active — pump on, valve open, zone always, tank/hopper
non-empty, control pct > 0. Animation duration scales with the source control's
pct if present (fast at 100%, slow at low %), mirroring the existing screen.
This is a direct source-element check, **not** the full hardcoded upstream
dependency chain of the Water screen. Documented limitation.

### `src/views/ScadaBuilder.vue`

Layout — three columns + top toolbar:

- **Toolbar:** `New` (clear canvas, with confirm) · `Save` (prompt for name → localStorage) · `Load ▼` (dropdown of saved names) · `Delete` (remove current named layout) · **Edit ⇄ Run** toggle.
- **Left palette:** one button per component type. Click adds an instance at canvas center with a default name (`Tank 1`, `Pump 2`, ...auto-incrementing).
- **Center canvas:** JointJS `Paper` (async, white bg). Scaled-to-fit like the Water screen.
- **Right inspector:** shows the selected element — fields: name (text), delete (button), and type-specific sim params (tank/gauge min–max, pump initial on, valve initial open, control initial pct). Empty-state hint when nothing selected.

Modes:
- **Edit:** elements movable; ports linkable (drag port → port creates a `FlowPipe`); clicking an element selects it for the inspector. Sim paused.
- **Run:** dragging + linking disabled; sim tick runs; clicking a pump toggles on/off, clicking a valve toggles open/closed; control sliders are live. Inspector read-only or hidden.

### Persistence

- localStorage key `scada.builder.layouts` → `{ [name]: serializedGraph }`.
- Save: `graph.toJSON()` (includes custom attrs) under the entered name; update index.
- Load: `graph.fromJSON(data)` with the shared `cellNamespace`; rebind sim.
- Delete: remove the named entry.
- Survives refresh. No backend.

## Out of scope (YAGNI)

- Binding components to real tags / `usePlantData` state (decided: auto-sim only).
- JSON file export/import (decided: localStorage only).
- Full upstream gating chains (simple source-element rule instead).
- Undo/redo, multi-select, copy-paste, alignment guides.
- Multiple pages / tabs per layout.

## Addendum (2026-06-24) — Control links

The Control component drives other components:
- Inspector shows a checklist of all pumps/valves; checking sets the control's
  `targets` (array of element ids), persisted via `toJSON`.
- **Open / Close** buttons set every linked pump `on` and valve `open` true/false.
- The **% slider** sets the flow speed of pipes whose source is a linked
  component; `0%` stops that flow.
- Edit-mode feedback is instant via `refreshLinks(graph)` (a links-only pass that
  re-animates pipes from current state without advancing the value simulation).
  Shared `setPumpVisual` / `setValveVisual` / `setControlBar` helpers keep
  edit-mode rendering identical to the running sim.

## Success criteria

1. New `✚ SCADA Builder` item appears in the sidebar and opens the builder.
2. User can add each of the 7 component types from the palette.
3. User can drag components and draw pipes between ports in Edit mode.
4. User can rename / delete / set sim params via the inspector.
5. Toggling to Run mode animates flow and live values; pumps/valves toggle on click.
6. Save → refresh → Load restores the exact layout and resumes sim.
7. The existing Water screen still renders and behaves identically after the shape extraction.
