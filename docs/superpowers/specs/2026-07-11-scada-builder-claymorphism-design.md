# SCADA Builder Claymorphism — Design

Date: 2026-07-11

## Goal

Apply claymorphism styling to `ScadaBuilder.vue`'s UI chrome (toolbar,
palette, inspector, canvas overlays, dialogs), matching the treatment
already applied to `LoginView.vue` and the app shell (`Dashboard.vue`/
`style.css`), so the one surviving screen visually matches the rest of the
app. Full intensity — every button/input/panel gets the clay treatment, not
just panel-level cards (per explicit decision: a dense tool UI risks losing
scannability under heavy decoration, but the call was made to apply it
fully anyway).

## Scope

`src/views/ScadaBuilder.vue`'s `<style scoped>` block only (currently lines
1106–1273, ~168 lines). No template or script changes — claymorphism is a
pure CSS treatment, no new classes needed anywhere in this file.

**Not in scope:** the trailing unscoped `<style>` block (lines 1275–1281,
SVG diagram-edge flow animation) and the JointJS canvas/paper background +
node/shape rendering (`src/scada/shapes.js`) — both are diagram *content*,
not UI chrome, per an earlier explicit scope decision.

## Existing Token System

The file already has its own design-token block on `.builder` (light) with
a `.builder.dark` override (line 1114 originally) — `--surface`,
`--surface-2`, `--bar`, `--border`, `--text`, `--muted`, `--accent`,
`--accent-soft`, `--r-sm`/`--r-md`/`--r-lg`. This claymorphism pass extends
that *same* system rather than introducing a parallel one:

- **New tokens:** `--surface-elevated` (a second surface tier — see below),
  `--shadow-raised` (panel-level clay shadow), `--shadow-inset` (recessed
  form-control shadow), `--shadow-sm` (button-level clay shadow, lighter
  than panel-level so dense button clusters don't stack into visual mud).
  Each gets a light and dark value, following the same pattern the file
  already uses for `--surface`/`--border`/etc.
- **`--surface-elevated`:** the original dark-mode CSS already distinguishes
  two background tiers that aren't captured by the existing token set —
  floating panels (toolbar/palette/inspector/cov/chartov/dlg) render at
  `#1e293b` in dark mode while the canvas/base area (`.fit`) renders at
  `#0f172a`/`#111827`. Light mode has no such distinction (both were
  `#ffffff`). This token makes that existing layering explicit and
  token-driven instead of hardcoded per-selector.
- **Radius scale bump:** `--r-sm`/`--r-md`/`--r-lg` go from `6/8/10px` to
  `10/14/20px` for a visibly puffier look; the many ad hoc raw-px radii
  scattered through the file (`4px`/`5px`/`6px`/`7px`/`14px`/`16px`) get
  consolidated onto this scale.

## Conversion Rule Set

- **Panels/cards** (`.toolbar`, `.palette`, `.inspector`, `.fit`, `.cov`,
  `.chartov`, `.dlg`) — `border: 1px solid X` removed, replaced with
  `box-shadow: var(--shadow-raised)`. Selection-state rings (`.cov.sel`,
  `.chartov.sel`) keep their accent ring but combine it with the raised
  shadow via a comma-separated `box-shadow` list, rather than swapping to a
  `border-color`.
- **Form controls** (`.fields input/select/textarea/color`, `.cdlg-input`,
  `.dlgbody input/textarea/select`, `.loadsel`) — get `box-shadow:
  var(--shadow-inset)` instead of a border, reading as a recessed well
  (standard claymorphism convention for text entry).
- **Buttons** (toolbar/palette buttons, `.pctstep`/`.seg`/`.ctrlbtns`/
  `.cov .covbtns`/`.cdlg-actions`/`.dlgbody .primary` buttons, `.del`,
  `.fshead button`, `.fsbtn`) — get `box-shadow: var(--shadow-sm)` (or a
  colored variant for semantic buttons, see below) instead of a border.
  Per the "full puffy" decision, toolbar/palette buttons get a visible
  resting-state shadow, not just on hover.
- **Semantic/status colors preserved, not reflavored:** alarm red
  (`.alarmbar`/`.abadge`/`.aitem`), danger red (`.cdlg-ok.danger`/`.del`),
  success green (`.ctrlbtns .open`/`.cov .covbtns .open`) keep their
  meaning-carrying background colors exactly as-is. Only their edges
  (border → colored soft shadow) and radius get the clay conversion.
- **Deliberate exception — `.newcomp`:** its dashed border is a distinct
  "add new item" affordance (a standard UI convention), not a panel edge.
  Left untouched by the border→shadow conversion.
- **Deep elevation shadows preserved:** `.fsmodal`/`.fsinner` and `.dlg`'s
  existing large drop-shadows (`0 24px 60px rgba(0,0,0,.32-.35)`) are
  genuine modal-elevation shadows, distinct in purpose from the clay
  panel-shadow tokens — left as literal values, not tokenized.
- **True dividers preserved:** `.tgroup`'s `border-right` (a separator
  between button clusters inside the toolbar) and `.targets`' `border-top`
  (a section divider inside the inspector) are inline separators, not panel
  edges — left as thin borders, just token-ified for dark-mode correctness
  where they weren't already.

## Dark-Mode Consolidation

Converting borders to shadows removes what the old `.builder.dark`
override block (lines 1224–1236 originally) was keyed off of
(`border-color: #334155` on now-borderless elements). Since panel/form/
button backgrounds and text colors are being switched to token references
(`var(--surface-elevated)`, `var(--text)`, `var(--muted)`, etc.) as part of
this same conversion, most of that override block becomes redundant and is
deleted — the tokens already resolve correctly per-mode. Three genuinely
unique dark-only rules survive (a root background, one intentional
light/dark accent-hue difference on the mode-switch "on" button that
predates this change, and the existing danger-icon dark tint) — see the
plan for exact residual content.

One pre-existing gap this consolidation incidentally fixes: `.fsinner`
(the fullscreen chart modal) had no dark-mode override at all and stayed
white regardless of theme. Switching its background to `var(--surface)`
makes it correctly go dark — a direct, in-scope side effect of the same
selector being touched for the border-removal, not a separate fix.

## Testing (manual — no test framework in this repo)

1. `npm run build` — must succeed with no errors.
2. `npm run dev` → open SCADA Builder → confirm toolbar/palette/inspector/
   canvas-frame show soft puffy shadows instead of flat borders, in light
   mode.
3. Toggle dark mode (Moon icon) → confirm the same puffy treatment holds,
   with the toolbar/palette/inspector/on-canvas overlays (cov/chartov)
   visibly distinct in tone from the canvas background (the elevated vs.
   base tier), and the fullscreen chart modal now goes dark too.
4. Open the fullscreen trend-chart modal and the "new custom component"
   dialog → confirm both render correctly styled in both light and dark.
5. Confirm alarm banner, danger delete button, and open/close status
   buttons still read as their semantic colors (red/red/green) — not
   reflavored to the neutral clay palette.
6. Confirm the diagram canvas itself (shapes, connections, selection
   handles) is visually unchanged — only the chrome around it changed.
7. Exercise a few interactive controls (drag a component, edit a property
   field, use a pctstep/segmented control) to confirm nothing is
   functionally broken by the CSS-only change.
