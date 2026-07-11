# Single-Menu Claymorphic Shell — Design

Date: 2026-07-11

## Goal

Reduce the dashboard's sidebar menu to a single "SCADA Builder" entry, apply
a claymorphism treatment to the app shell (topbar/sidebar), and swap the
sidebar's text logo mark for the Olectr logo image — matching the branding
already applied to [LoginView.vue](../plans/2026-07-11-login-verify-animation.md).

## Scope

- `src/views/Dashboard.vue` — trim `screens` array to one entry, remove 11
  now-dead imports, swap sidebar logo mark for `<img>`.
- `src/style.css` — claymorphism restyle of `.topbar`, `.side`, `.logo`,
  `.nav a`/`.nav a.active`, `.burger`; removal of CSS rules exclusively used
  by the deleted views.
- Delete: `src/views/BoilerTurbine.vue`, `CompressedAir.vue`, `HvacBms.vue`,
  `KpiOverview.vue`, `ManufacturingLine.vue`, `PowerDistribution.vue`,
  `SolarPlant.vue`, `TagMonitor.vue`, `TankFarm.vue`, `WaterTreatment.vue`,
  `WindPower.vue`.

**Not in scope:** `src/views/ScadaBuilder.vue` internals. It is
self-contained — its own `<style scoped>` block, its own class namespace
(`abadge`, `cdlg-*`, `ctrlbtns`, etc.), no shared classes with the deleted
views or the global shell CSS being restyled (confirmed via grep — zero
occurrences of `.card`, `.grid`, `.scr-head` etc. in `ScadaBuilder.vue`).
Its existing indigo/slate toolbar/panel theme is untouched.

## Verified Facts

- `grep -rln` for the 11 view names across `src/` returns only
  `Dashboard.vue` — nothing else imports or references them. Safe to
  delete outright.
- `App.vue` is a 3-line `<router-view />` shell; the menu lives entirely in
  `Dashboard.vue`'s `screens` array and sidebar template — no router config
  changes needed (`/` still routes to `Dashboard.vue`).
- Global shell CSS (`.topbar`, `.side`, `.logo`, `.nav`, `.burger`,
  `.backdrop`) lives in `src/style.css`, not scoped inside `Dashboard.vue`.
  `Dashboard.vue`'s own `<style scoped>` only contains `.user-box`/
  `.user-email`/`.logout-btn` rules — untouched by this change.

## Dashboard.vue Changes

`screens` array becomes:

```js
const screens = [
  { id: 'builder', ico: '✚', label: 'SCADA Builder', title: 'SCADA Builder', comp: ScadaBuilder },
]
```

All other imports (`KpiOverview`, `WaterTreatment`, `SolarPlant`,
`PowerDistribution`, `BoilerTurbine`, `ManufacturingLine`, `TagMonitor`,
`HvacBms`, `CompressedAir`, `WindPower`, `TankFarm`) removed. `active` still
defaults to `'kpi'` today — becomes `'builder'` (the only valid id).
`current`/`go`/`drawer` logic unchanged (still generic over `screens`, just
operating on a 1-element array) — nav still highlights the active item,
hamburger/drawer still functions on narrow viewports.

Sidebar logo block:

```html
<div class="logo">
  <img class="logo-img" src="/olectr-logo.png" alt="Olectr" />
</div>
```

Replaces the current:

```html
<div class="logo">
  <div>
    <div class="mark">SC<b>A</b>DA</div>
    <small>AUTOMATION</small>
  </div>
</div>
```

## style.css Changes

**Claymorphism** (soft dual-tone shadows, larger radii, no hard 1px
borders — same formula as `LoginView.vue`'s clay treatment: rgba
decompositions of `--teal`/the `--shadow` token's base color
`rgba(16,40,60,…)`, no new CSS vars):

- `.topbar` — remove `border-bottom:1px solid var(--line)`, replace
  `box-shadow:var(--shadow)` with a soft downward dual-tone shadow.
- `.side` — remove `border-right:1px solid var(--line)`, add a soft
  dual-tone shadow on its trailing edge.
- `.logo` — remove `border-bottom:1px solid var(--line)`; add `.logo-img`
  sizing rule (matches `LoginView.vue`'s `.mark-logo`: `width`, `height:
  auto`, centered).
- `.nav a.active` — keep the teal accent, restyle as a soft inset/raised
  pill (rounded, dual-tone shadow) instead of the flat gradient +
  border-left treatment.
- `.burger` — soften into a small rounded clay button (dual-tone shadow
  instead of a flat 1px border).

**Dead rule removal** (exclusively used by the 11 deleted views, confirmed
unreferenced by `ScadaBuilder.vue`): `.scr-head` and its children, `.grid`,
`.card` and its children, `.kpi` and its children, `.gauge*`, `.tank*`,
`.pills`/`.pill`/`.st.*`, `.spin*`, `.stat-row`/`.mini`, `.led*`,
`.alarms`/`.alarm`, `.flow`/`.node`/`.arrow`, `.scrollbox`, `.chart-box`
(Chart.js container, confirmed unused by `ScadaBuilder.vue`), the `table`/
`th`/`td` rules, `.mono`. Also the responsive-media-query lines that target
these selectors (`.grid{grid-template-columns...}`, `.stat-row{...}`,
`.chart-box{...}` overrides inside `@media` blocks).

**Kept:** `.main` (layout container, still used), `.fade-enter-active`/
`.fade-enter-from` (still used by `Dashboard.vue`'s `<Transition>`),
`.conn`/`.clock`/`.dot`/`@keyframes pulse` (topbar broker/date/clock
widgets, unrelated to the deleted views), `.burger`/`.backdrop` and their
`@media` rules (mobile drawer behavior, still needed since sidebar stays).

## Testing (manual — no test framework in this repo)

1. `npm run build` — must succeed with no errors.
2. `npm run dev` → log in → confirm sidebar shows only "SCADA Builder",
   already active, Olectr logo rendered above it.
3. Confirm topbar title reads "SCADA Builder".
4. Confirm SCADA Builder tool itself renders and functions identically to
   before (untouched component).
5. Narrow the viewport (≤1024px) → confirm hamburger button still opens/
   closes the sidebar drawer, single nav item visible, claymorphic styling
   holds at mobile width.
6. Visually confirm topbar/sidebar/nav-item/burger show soft puffy shadows
   (claymorphism) instead of flat 1px borders.
