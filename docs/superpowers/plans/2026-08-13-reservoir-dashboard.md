# Reservoir Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Reservoir Dashboard" starter template to the SCADA Builder — dual water-injection trains (Reservoir B/C via `PA-51-0010A/B`), per-well injection rate cards, a total-vs-produced injection summary that auto-sums from those cards, and status dots bound to live valve/pump state.

**Architecture:** Three new JointJS shapes (`s.Well`, `s.Sum`, `s.Dot`) in `src/scada/shapes.js`, their live rules in `src/scada/simulate.js`, wired into `src/views/ScadaBuilder.vue` (palette, `makeEl`, metrics, inspector, type labels), then a `loadTemplate('reservoir')` branch built the same way as `'chemical'` / `'gas'`. See `docs/superpowers/specs/2026-08-13-reservoir-dashboard-design.md`.

**Tech Stack:** Vue 3 `<script setup>`, `@joint/core`. No test runner in this repo — verification is `npm run build` plus manual browser checks via `npm run dev`.

## Global Constraints

- The summary panel is fully derived: `total` = Σ all well rates, `prod` = Σ rates of wells flagged `produced`. It has no editable value.
- A well card injects only when the flow solver says water reaches it, so totals respond to valve/pump state without any extra plumbing.
- `s.Sum` and `s.Dot` are annotations — they must be added to `NON_SINK` in `propagateFlow` so they never terminate a hydraulic path.
- Only `s.Pump`, `s.Valve`, and `onoff`/`openclose` `s.Custom` are bindable dot targets; anything else renders amber.

---

### Task 1: Add the three shapes

**Files:** Modify `src/scada/shapes.js`

**Interfaces:** Produces `WellCard` (`s.Well`), `SumPanel` (`s.Sum`), `StatusDot` (`s.Dot`), all registered into `joint.shapes.s` as `Well` / `Sum` / `Dot` so `graph.fromJSON()` can resolve them.

- [ ] **Step 1:** Define `WellCard` after the `Chart` shape — rounded dark tile (`box`), static `pre` text (`Brønn`), `name` text (well tag), `rate` text below the tile. Size 78×76, `calc()`-driven so it stays resizable.
- [ ] **Step 2:** Define `SumPanel` — dark box with `l1`/`v1` and `l2`/`v2` text rows, labels defaulting to `Total vanninjeksjon:` / `Prod. vanninjeksjon:`. Size 300×92.
- [ ] **Step 3:** Define `StatusDot` — single `dot` rect, size 18×18, amber default fill.
- [ ] **Step 4:** Register all three in the `Object.assign(joint.shapes.s, {...})` block. Do NOT add them to `SCALE_BASE` (they draw with `calc()`, not fixed-art coordinates).
- [ ] **Step 5:** `npm run build` — expect success (nothing imports them yet).

---

### Task 2: Live behavior in the simulator

**Files:** Modify `src/scada/simulate.js`

**Interfaces:** Produces `setDotVisual(elm, graph)` (exported, also used for edit-mode feedback) and `sumPanel(elm, graph)` (exported); `wellCard(elm, fed)` stays internal.

- [ ] **Step 1:** Add `wellCard(elm, fed)` — `fed ? drift(rate, simMin, simMax, …) : 0`, write `rate` silently, paint `rate/text` as `<n> m³/h`.
- [ ] **Step 2:** Add `sumPanel(elm, graph)` — sum `rate` over every `s.Well`; split out wells with `produced`; write `total`/`prod` silently and paint `v1`/`v2`.
- [ ] **Step 3:** Add `setDotVisual(elm, graph)` — resolve the `watch` id, map pump `on` / valve `open` / custom `onoff`|`openclose` to green `#22c55e` or red `#ef4444`, everything else amber `#f59e0b`; set `rx` from the `round` flag. Name the field `watch`, never `target` — `dia.Graph` re-indexes any cell whose `target` changes as if it were a link and throws when the value is cleared.
- [ ] **Step 4:** In `simulateTick`, add `case 's.Well'` (passing `flowing[elm.id]`) and `case 's.Dot'` to the switch, then run a **second** pass over `s.Sum` elements after the switch loop — well rates must all be current before the totals are summed.
- [ ] **Step 5:** In `refreshLinks`, repaint every `s.Dot` so edit-mode toggles and Control open/close update dots immediately.
- [ ] **Step 6:** Add `'s.Sum': 1, 's.Dot': 1` to `NON_SINK` in `propagateFlow`.
- [ ] **Step 7:** `npm run build` — expect success.

---

### Task 3: Wire the shapes into the builder

**Files:** Modify `src/views/ScadaBuilder.vue`

**Interfaces:** Produces palette entries `well` / `sum` / `dot`, `makeEl` cases for them, inspector controls (well rate band + produced flag; dot target picker + round flag), and metric/type-label entries.

- [ ] **Step 1:** Import `WellCard`, `SumPanel`, `StatusDot` from `../scada/shapes` and `setDotVisual` from `../scada/simulate`; import the `Sigma` and `Circle` lucide icons.
- [ ] **Step 2:** Add `well` / `sum` / `dot` to `PALETTE_ICON` and to the `palette` array.
- [ ] **Step 3:** Add the three `makeEl` cases (well gets an `in` port and a `rate` metric; sum gets `total`/`prod` metrics; dot gets a `state` metric).
- [ ] **Step 4:** Add `METRIC_KEYS_BY_TYPE`, `TYPE_LABEL`, `elemValue`, and `liveFields` entries for the three types.
- [ ] **Step 5:** In `migrateCells`, repaint `s.Dot` elements after load so a loaded layout shows correct colors before the first tick.
- [ ] **Step 6:** In `selectEl`, exclude `s.Sum`/`s.Dot` from `hasName`, and populate `sel.isWell` / `sel.isDot` / `sel.produced` / `sel.roundDot` / `sel.dotTarget` / `sel.dotOptions`.
- [ ] **Step 7:** Add `applyWellRange()`, `applyProduced()`, `applyDotTarget()`, `applyDotRound()` and the matching inspector markup.
- [ ] **Step 8:** In `stopSim`, zero well rates and summary values alongside the existing flow-meter/tap reset.
- [ ] **Step 9:** `npm run build` — expect success.

---

### Task 4: Build the Reservoir Dashboard template

**Files:** Modify `src/views/ScadaBuilder.vue`

**Interfaces:** Produces `loadTemplate('reservoir')` and a `Reservoir Dashboard` option in the template `<select>`.

- [ ] **Step 1:** Add the `else if (kind === 'reservoir')` branch after the `'gas'` branch, using local `lbl` / `pipe` / `pt` / `well` / `dot` helper closures (same shape as the `'gas'` branch).
- [ ] **Step 2:** Lay out: `U-29` supply zone → main FE → two trains (`PA-51-0010B` → Reservoir B, `PA-51-0010A` → Reservoir C) with PT taps, sea-discharge valves to `SJØ` outfalls, the `VD-44-004` produced-water vessel through `HV-51-0274`, five well cards (`A-22`, `A-40`, `A-02`, `A-03`, `A-06`; `A-03`/`A-06` flagged produced), the summary panel, and dots bound to both pumps, both sea valves, and `HV-51-0274`.
- [ ] **Step 3:** Add `<option value="reservoir">Reservoir Dashboard</option>` to the template dropdown.
- [ ] **Step 4:** `npm run build` — expect success.
- [ ] **Step 5:** Manual verification against the ticket's acceptance criteria (see the spec's Testing section, checks 1–5).
- [ ] **Step 6:** Commit.
