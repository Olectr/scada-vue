# Reservoir Dashboard Process Graphic — Design

**Ticket:** [SCADA] Build reservoir management page — water injection flow diagram (Reservoir B/C paths via PA-51 pumps), per-well injection rate cards (A-40, A-02, A-03, A-06 with m³/h), total vs produced water injection summary panel, and status indicator dots per line.

**Acceptance:** injection totals auto-sum from well cards; status dots reflect live valve/pump state.

**Reference:** `Reservoir-Dashboard-fixed.png` (eigen "Reservoir Dashboard" screen).

## Scope decision

"Page" here means the same thing it meant for the two preceding process-graphic tickets
(AITRON-868 Chemical Distillation, AITRON-871 Gas Treatment): a **starter template in the
SCADA Builder**, loaded from the Add ▸ Template… dropdown — not a new Vue route. The app has
exactly one authenticated route (`/` → `Dashboard` → `ScadaBuilder`); every process graphic in
this codebase is a `loadTemplate(kind)` branch that constructs JointJS cells. Reservoir
Dashboard follows that pattern.

Unlike the previous two tickets, this one has acceptance criteria about **live behavior**
(auto-summing totals, state-driven dots), which the existing shape set cannot express. So the
work is: three new shapes + their simulation, then the template that arranges them.

## Architecture

Three new JointJS shapes in `src/scada/shapes.js`, each with a live-behavior function in
`src/scada/simulate.js`, wired into `src/views/ScadaBuilder.vue` (palette, inspector, metrics,
type labels) exactly like the existing shapes:

### 1. Injection well card — `s.Well` (`WellCard`)

Dark tile showing `Brønn` / well tag, with the live injection rate underneath.

- Fields: `rate` (m³/h, live), `simMin`/`simMax` (drift band), `produced` (bool — this well
  takes produced water), `name` attr = the well tag (`A-40`).
- Port: `in` at top-centre.
- Live rule: the card injects **only when injection water actually reaches it** through the
  pipe network (`flowing[id]` from the existing two-pass flow solver). Fed → rate drifts inside
  `simMin..simMax`; not fed → `0`. This is what makes a closed valve or a stopped pump visibly
  drop the totals.
- A well is a hydraulic **sink** (it has no outgoing pipe), so upstream pipes animate into it
  under the existing `canDrain` seeding — no solver change needed.

### 2. Injection summary panel — `s.Sum` (`SumPanel`)

Two-row readout: `Total vanninjeksjon:` and `Prod. vanninjeksjon:`.

- `total` = Σ `rate` over **every** `s.Well` on the screen.
- `prod` = Σ `rate` over wells with `produced === true`.
- Derived every tick, after all wells have been updated (a second pass in `simulateTick`, since
  `graph.getElements()` order is not guaranteed). No configuration, no manual entry — this is
  the "totals auto-sum from well cards" criterion.

### 3. Status dot — `s.Dot` (`StatusDot`)

Small square/circle chip bound to one pump or valve.

- Fields: `watch` (cell id of the bound pump/valve), `round` (square vs circle — the reference
  uses both). The field is deliberately **not** called `target`: `dia.Graph` reserves
  `source`/`target` for link endpoints and re-indexes any cell whose `target` changes, which
  throws when the value is cleared.
- Colors: green = pump running / valve open, red = stopped / closed, amber = unbound or the
  target no longer exists.
- Only `s.Pump`, `s.Valve`, and `s.Custom` with `onoff`/`openclose` behavior are bindable;
  anything else reads as amber rather than inventing a state.
- Repainted from `simulateTick` (run mode), from `refreshLinks` (edit-mode toggles, control
  open/close), and on layout load — so the dot is never stale relative to what it watches.

## Data flow

```
pipe network ──(existing solver: flowing[id])──▶ s.Well.rate ──▶ s.Sum.total / .prod
pump.on / valve.open ─────────────────────────▶ s.Dot fill color
```

Both new live rules read state that already exists; neither feeds back into the solver.
`s.Sum` and `s.Dot` are annotations, so they join `NON_SINK` in `propagateFlow` — a dot sitting
next to a line must never terminate a hydraulic path.

## The template — `loadTemplate('reservoir')`

Recreates the reference screen inside the 1500×660 stage:

- **Source:** `U-29` supply zone → main flow meter (FE) → header, splitting into two trains.
- **Train B (top):** PT tap → pump `PA-51-0010B` → PT taps → `Reservoir B` vessel → PT tap.
- **Train C (bottom):** PT tap → pump `PA-51-0010A` → PT taps → `Reservoir C` vessel.
- **Sea discharge:** a gate valve per train dropping to a `SJØ` outfall.
- **Produced water (bottom left):** `VD-44-004` vessel → `HV-51-0274` valve → produced-water
  flow meter → joins the injection header.
- **Wells:** `A-22` off the top train; `A-40`, `A-02`, `A-03`, `A-06` in a row off the manifold.
  `A-03` and `A-06` are flagged `produced` (they take the produced-water stream), so the
  summary's two rows differ.
- **Summary panel** centred between the trains and the well row.
- **Status dots:** bound to both pumps, both sea valves, and `HV-51-0274`.
- Cyan pipes (`#22d3ee`) for injection water, lighter blue for sea discharge, matching the
  reference's palette against the dark canvas.

## Error handling

- Dot with a deleted/absent target → amber, no exception (`graph.getCell` guarded).
- Summary with no wells on screen → `0` / `0`.
- Pausing the sim (leaving Run mode) zeroes well rates and the summary, consistent with how
  `stopSim` already zeroes flow meters and pressure taps.

## Testing

No test runner exists in this repo. Verification is `npm run build` (syntax/import gate) plus
manual browser checks:

1. Load Add ▸ Template… ▸ Reservoir Dashboard; the screen renders as described.
2. Run mode: well cards show non-zero m³/h; the summary's Total equals the sum of all five
   cards, and Prod. equals the sum of `A-03` + `A-06`.
3. Click pump `PA-51-0010A` in Run mode to stop it → its dot turns red, its train's wells drop
   to `0 m³/h`, and Total drops accordingly.
4. Close `HV-51-0274` → its dot turns red and the produced-water contribution stops.
5. Save → reload → load the layout: dots repaint to the correct colors immediately.
