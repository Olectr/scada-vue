# Gas Treatment process graphic — design

## Context

Ticket: build a 4-vessel gas treatment train graphic (T-001–T-004) as a new SCADA Builder
template, matching the style of the existing "Chemical Distillation" template
(`loadTemplate('chemical')` in `src/views/ScadaBuilder.vue`). Reference: `Gas-Treatment-2.png`
(eigen+ mockup, attached to the Jira ticket) — used for visual style only; component list and
routing follow the ticket text where the two differ (e.g. ticket lists 5 unique output
destinations; the reference image shows one of them twice).

Acceptance criterion: gauge needles/colors reflect live value against configured red/yellow/green
bands. This is the one criterion with real logic behind it, so it drives most of the design below.

## 1. Gauge component upgrade (global)

The existing `s.PG` pressure gauge (`src/scada/shapes.js`) draws one arc that grows and switches
between two hardcoded colors (green below 85% of range, red above). The reference gauge is a
different, more capable widget: a static 3-color band ring (green/yellow/red) with a needle
rotating to the live value, plus min/quarter/mid/max tick labels — closer to a real analog
process gauge.

Per user decision, this is an **in-place upgrade to `s.PG`**, not a new gauge type. It's a strict
visual upgrade — every existing gauge (Water dashboard, Air, Boiler, any future template) gets
bands + needle + ticks with sensible defaults; nothing currently reading `value`/`simMin`/`simMax`
changes behavior.

### Element fields (new)

- `bandYellow` (number, % of simMin–simMax range, default `60`) — start of the yellow band.
- `bandRed` (number, % of range, default `85`) — start of the red band.

Both are plain numbers on the element model, same pattern as `simMin`/`simMax`.

### shapes.js changes

- New `arcSeg(f0, f1)` helper alongside the existing `arc(frac)` — returns a path for the arc
  between two fractions of the sweep, used to draw each color band as its own segment.
- New `needlePoint(frac, radius)` helper (reuses `arc()`'s angle math) — returns the `{x, y}` tip
  of the needle for a given value fraction.
- `PGauge` attrs gain: `bandG`/`bandY`/`bandR` (three arc-segment paths, replacing the single
  `fgArc`), `needle` (line from center to tip), `hub` (small center circle), and five tick texts
  `tick0`..`tick4`. `bgArc` (the pale full-sweep track) is dropped — the three bands cover the
  full sweep between them.
- `SCALE_BASE` entry for `s.PG` is unchanged (still scales as one group).

### simulate.js changes

- New `layoutGaugeBands(elm)` — draws the three static band arcs from `bandYellow`/`bandRed`, and
  the five tick labels from `simMin`/`simMax`. Runs on element creation, on range/band edit
  (property panel), and in `migrateCells()` for old saves. Not run every sim tick — bands and
  ticks don't depend on the live value.
- `gauge(elm, graph, nodeFlow, ctrlPct)` (existing, runs every tick) — keeps computing `value` the
  same way (bound tag or tap-network pressure), but instead of recoloring a growing arc, it now
  sets the needle's rotation/endpoint via `needlePoint(frac, R)` and updates the value text. Band
  colors are already in place from `layoutGaugeBands`.

### Property panel (ScadaBuilder.vue)

- `sel` gains `bandYellow`/`bandRed` (defaults 60/85, read from the model same as `simMin`).
- New inputs "Yellow at %" / "Red at %", shown alongside the existing Min/Max fields when
  `sel.type === 's.PG'` (extends the existing `sel.hasRange` block).
- `applyBands()` setter (mirrors `applyRange()`): writes `bandYellow`/`bandRed` to the model and
  calls `layoutGaugeBands(m)`.
- `makeEl('gauge')` sets the two new fields to their defaults; `migrateCells()` backfills them
  (and calls `layoutGaugeBands`) for gauges saved before this change.

## 2. New P&ID symbol: inline heat exchanger

`src/scada/pidSymbols.js` gets one new curated `PID_DEFS` entry, `pidHxInline` — small circle with
a diagonal cross (standard P&ID inline heat-exchanger/cooler glyph), ports left/right, static
behavior, roughly 44×44. Same shape as `pidHxH`/`pidCooler` etc. — a reusable palette symbol, not
template-only.

## 3. New template: Gas Treatment

`src/views/ScadaBuilder.vue`: new `else if (kind === 'gas')` branch in `loadTemplate()`, plus a
"Gas Treatment" `<option>` in the template `<select>` next to "Chemical Distillation". Built the
same way as the `chemical` branch — local `mk`/`pipe`/`lbl`/`leader`-style helpers, no new
shared infrastructure required beyond §1 and §2.

Components (left → right):

- **4 vessels**, `s.Cyl` (existing tank shape — matches the reference's cylinder-with-fill-bar
  look directly), named `T-001`–`T-004`, each with its own level/sim range.
- **4 pressure gauges** (the upgraded `s.PG`), one per vessel/stage, each paired with a small
  `pidTempBox` (existing curated meter symbol, unit `°C`) for the stage temperature reading. This
  reads "inlet gauges (pressure/temp per stage)" from the ticket as one dial + one temp box per
  vessel.
- **3 inline heat exchangers** (`pidHxInline`, §2), one on each pipe run between consecutive
  vessels (T-001↔T-002, T-002↔T-003, T-003↔T-004) — "heat exchangers between stages" per ticket.
- **Ejector skid** — a labeled box (`makeCustom` with an inline def, shape `box`, no new
  `PID_DEFS` entry since it's a one-off label not a reusable symbol), looped off T-003.
- **Metering skid** and **Gas export launcher** — same pattern, placed in the output header after
  T-004.
- **5 output routes**, each a `FlowPipe` from its source port to a **dangling `{x, y}` point**
  (no target element/id) with an arrowhead end marker, landing near a text label: *To gas lift
  manifold*, *To gas rejection system*, *To gas export pipeline*, *To 2nd stage separator
  heater*, *To inlet separator*. This is the ticket's full destination list; the reference image's
  duplicate second line to "2nd stage separator heater" is not reproduced.
- `FlowPipe` currently has no `targetMarker` — needs one added (small `shapes.js` change) so these
  dangling routes render an arrowhead at the label end. Only affects links that set it; existing
  pipes are unaffected unless explicitly styled.

## Out of scope

- Per-gauge band **colors** are not configurable (always green/yellow/red) — only the two
  threshold percentages are, per user decision.
- No new persistence/export format changes — `bandYellow`/`bandRed` flow through the existing
  `graph.toJSON()`/`fromJSON()` and `stripMetricDuplicates()` paths automatically as plain model
  fields (same as `simMin`/`simMax`).
- No changes to the AI component generator or "My Components" library.

## Testing

Manual verification only (no automated test suite in this project for canvas rendering):

1. Start dev server, open SCADA Builder, load "Gas Treatment" template — confirm all components
   render, vessels show live level fill, gauges show 3-color bands with needle tracking value.
2. Select a gauge, change "Yellow at %"/"Red at %" in the property panel — confirm bands redraw
   immediately.
3. Load the existing "Water" template (or open the static Water screen) — confirm its pressure
   gauge still renders correctly (bands + needle, no visual regression / no crash from the field
   migration).
4. Export the Gas Treatment screen to JSON, re-import — confirm gauges keep their band settings.
