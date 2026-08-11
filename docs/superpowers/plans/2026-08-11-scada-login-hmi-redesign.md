# SCADA Login Page HMI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the login page as a dark, animated industrial-HMI panel (P&ID-style flow lines, traveling signal pulses, blinking status LEDs) while keeping the existing auth logic, verify-state machine, and copy unchanged.

**Architecture:** Single-file change to `src/views/LoginView.vue`. A new `<svg class="hmi-bg">` layer sits absolutely-positioned behind the existing centered login card. Flow-line/pulse/LED positions and timings are plain JS data arrays in `<script setup>`, rendered via `v-for`, animated with scoped CSS `@keyframes` (no new JS animation library calls beyond the `motion-v` usage already present for the lock→check badge). All new visuals are scoped local CSS custom properties on `.login-screen` — no edits to global `src/style.css`.

**Tech Stack:** Vue 3 `<script setup>` SFC, scoped CSS, native SVG + CSS `@keyframes`/`offset-path` (no new npm dependencies).

## Global Constraints

- Scope is `src/views/LoginView.vue` only. Do not modify `src/style.css`, `Dashboard.vue`, `ScadaBuilder.vue`, or any other file.
- No new npm dependencies — use only `vue`, `motion-v`, `lucide-vue-next` (already imported in this file).
- `useAuth()` usage, `handleSignIn()`, and the `state` (`idle`/`verifying`/`verified`) machine including `ringAnimate`/`ringTransition`/`lockAnimate`/`checkAnimate` computed values must remain functionally unchanged — only their associated CSS `box-shadow`/`color` values change.
- New colors are local CSS custom properties on `.login-screen` (`--login-*` prefix) — do not touch or rename existing global tokens (`--bg`, `--panel`, `--teal`, etc.) used elsewhere in the app.
- All new background animation must be disabled/frozen under `@media (prefers-reduced-motion: reduce)`.
- No unit test infra exists for this view and none is added — verification is manual, via the dev server, per task.

---

### Task 1: Dark theme base — screen background + card panel

**Files:**
- Modify: `src/views/LoginView.vue` (`<style scoped>` block — `.login-screen` and `.login-card` rules)

**Interfaces:**
- Produces: local CSS custom properties `--login-bg-1`, `--login-bg-2`, `--login-panel`, `--login-border`, `--login-teal`, `--login-teal-glow`, `--login-amber`, `--login-red`, `--login-text`, `--login-text-dim`, declared on `.login-screen` and available to all descendant rules added in later tasks.

- [ ] **Step 1: Replace `.login-screen` and `.login-card` rules**

Find this block in `src/views/LoginView.vue`:

```css
.login-screen {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg);
}
.login-card {
  text-align: center; padding: 40px 56px; background: var(--panel);
  border: none; border-radius: 32px;
  box-shadow:
    10px 10px 20px rgba(16, 40, 60, 0.10),
    -10px -10px 20px rgba(255, 255, 255, 0.75),
    inset 1px 1px 1px rgba(255, 255, 255, 0.4);
}
```

Replace it with:

```css
.login-screen {
  position: relative;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh;
  background: radial-gradient(ellipse at center, var(--login-bg-2) 0%, var(--login-bg-1) 70%);
  --login-bg-1: #0a1420;
  --login-bg-2: #0f1f30;
  --login-panel: #101d2c;
  --login-border: rgba(13, 148, 136, .25);
  --login-teal: #0d9488;
  --login-teal-glow: #2dd4bf;
  --login-amber: #f59e0b;
  --login-red: #ef4444;
  --login-text: #e6edf3;
  --login-text-dim: #7d92a6;
}
.login-card {
  position: relative;
  z-index: 1;
  text-align: center; padding: 40px 56px;
  background: var(--login-panel);
  border: 1px solid var(--login-border);
  border-radius: 32px;
  box-shadow:
    0 0 40px rgba(13, 148, 136, 0.12),
    0 20px 60px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`
Open: `http://localhost:5173/login`
Expected: page background is dark navy (radial gradient), login card is a dark panel with a faint teal border/glow — no console errors. Badge icon, logo, and button will still look mismatched (light-theme colors) — that's expected, fixed in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: dark HMI background and card panel for login screen"
```

---

### Task 2: Dark theme — badge ring, logo, button, error text

**Files:**
- Modify: `src/views/LoginView.vue` (`<style scoped>` block — `.badge-ring`, `.badge-ring.verified`, `.badge-icon`, `.mark-logo`, `.error`, `.signin-btn`, `.signin-btn:hover`, `.signin-btn:disabled` rules)

**Interfaces:**
- Consumes: `--login-panel`, `--login-border`, `--login-teal`, `--login-teal-glow`, `--login-red` custom properties produced in Task 1.

- [ ] **Step 1: Replace badge/logo/error/button rules**

Find this block:

```css
.badge-ring {
  position: relative;
  width: 72px; height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: var(--panel);
  box-shadow:
    6px 6px 12px rgba(16, 40, 60, 0.12),
    -6px -6px 12px rgba(255, 255, 255, 0.8),
    inset -2px -2px 4px rgba(255, 255, 255, 0.6),
    inset 2px 2px 4px rgba(16, 40, 60, 0.06);
  display: flex; align-items: center; justify-content: center;
}
.badge-ring.verified {
  box-shadow:
    6px 6px 12px rgba(13, 148, 136, 0.18),
    -6px -6px 12px rgba(255, 255, 255, 0.8),
    inset -2px -2px 4px rgba(255, 255, 255, 0.6),
    inset 2px 2px 4px rgba(13, 148, 136, 0.08);
}
.badge-icon {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--teal);
}
.mark-logo { display: block; width: 160px; height: auto; margin: 0 auto; }
.error { color: var(--red); margin: 16px 0 0; font-size: 12px; }
.signin-btn {
  margin-top: 24px; padding: 10px 32px; border: none; border-radius: 20px;
  background: var(--teal); color: #fff; font-weight: 700; font-size: 13px;
  letter-spacing: .5px; cursor: pointer;
  box-shadow:
    4px 4px 10px rgba(13, 148, 136, 0.35),
    -2px -2px 6px rgba(255, 255, 255, 0.3);
}
.signin-btn:hover { background: var(--teal-dim); }
.signin-btn:disabled { opacity: 0.7; cursor: default; box-shadow: none; }
```

Replace it with:

```css
.badge-ring {
  position: relative;
  width: 72px; height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: var(--login-panel);
  box-shadow:
    0 0 18px rgba(45, 212, 191, 0.25),
    inset 0 0 12px rgba(13, 148, 136, 0.15),
    0 0 0 1px var(--login-border);
  display: flex; align-items: center; justify-content: center;
}
.badge-ring.verified {
  box-shadow:
    0 0 26px rgba(45, 212, 191, 0.45),
    inset 0 0 14px rgba(13, 148, 136, 0.25),
    0 0 0 1px rgba(45, 212, 191, 0.4);
}
.badge-icon {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--login-teal-glow);
}
.mark-logo {
  display: block; width: 160px; height: auto; margin: 0 auto;
  filter: brightness(0) invert(1);
}
.error { color: var(--login-red); margin: 16px 0 0; font-size: 12px; }
.signin-btn {
  margin-top: 24px; padding: 10px 32px; border: none; border-radius: 20px;
  background: var(--login-teal); color: #fff; font-weight: 700; font-size: 13px;
  letter-spacing: .5px; cursor: pointer;
  box-shadow:
    0 0 18px rgba(13, 148, 136, 0.45),
    0 4px 10px rgba(0, 0, 0, 0.3);
}
.signin-btn:hover { background: var(--login-teal-glow); }
.signin-btn:disabled { opacity: 0.6; cursor: default; box-shadow: none; }
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev` (if not already running)
Open: `http://localhost:5173/login`
Expected: Metrion logo renders light/white (inverted) and legible on the dark card. Lock icon glows teal inside the badge ring. Sign-in button is teal with a glow shadow. Click "Sign in" — badge should still animate lock → checkmark (teal glow pulses), button shows "Verifying…" then the app proceeds through the normal OIDC flow. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: restyle login badge, logo, and button for dark theme"
```

---

### Task 3: Static HMI background — flow-line paths, pulses, and status LEDs (no animation yet)

**Files:**
- Modify: `src/views/LoginView.vue` (`<script setup>` — add data arrays; `<template>` — add `<svg>` layer; `<style scoped>` — add base rules for the new elements)

**Interfaces:**
- Produces: `flowPaths` array (`{ d: string, duration: number, delay: number }[]`) and `leds` array (`{ x: number, y: number, color: 'teal'|'amber', duration: number, delay: number }[]`) in `<script setup>`, consumed by the `<template>` `v-for` loops added in this task and by the animation CSS added in Tasks 4–5.
- Produces: CSS classes `.hmi-bg`, `.flow-line`, `.flow-pulse`, `.status-led`, `.status-led--teal`, `.status-led--amber` — consumed (extended with `animation-name` etc.) by Tasks 4 and 5.

- [ ] **Step 1: Add `flowPaths` and `leds` data to `<script setup>`**

Find the end of `handleSignIn` in the `<script setup>` block:

```js
function handleSignIn() {
  state.value = 'verifying'
  login().catch(() => { state.value = 'idle' })
  setTimeout(() => { if (state.value === 'verifying') state.value = 'verified' }, 300)
}
```

Add immediately after it (still inside `<script setup>`, before the closing `</script>`):

```js

// Background HMI flow lines: orthogonal P&ID-style routing across a 1600x900 viewBox.
const flowPaths = [
  { d: 'M 0 150 H 500 V 400 H 1600', duration: 4, delay: 0 },
  { d: 'M 1600 700 H 1000 V 300 H 600 V 100 H 0', duration: 5, delay: 0.6 },
  { d: 'M 200 900 V 600 H 900 V 750 H 1600', duration: 3.5, delay: 1.2 },
  { d: 'M 0 500 H 300 V 850 H 800', duration: 6, delay: 1.8 },
  { d: 'M 1600 200 H 1200 V 550 H 700 V 900', duration: 4.5, delay: 2.4 },
]

// Blinking status LEDs scattered around the canvas, avoiding the centered card.
const leds = [
  { x: 80, y: 80, color: 'teal', duration: 2.6, delay: 0 },
  { x: 1500, y: 120, color: 'amber', duration: 3.1, delay: 0.4 },
  { x: 150, y: 820, color: 'teal', duration: 2.2, delay: 0.9 },
  { x: 1450, y: 800, color: 'amber', duration: 2.8, delay: 1.3 },
  { x: 60, y: 450, color: 'teal', duration: 3.4, delay: 0.2 },
  { x: 1540, y: 450, color: 'amber', duration: 2.5, delay: 1.6 },
  { x: 400, y: 60, color: 'teal', duration: 2.9, delay: 0.7 },
  { x: 1200, y: 840, color: 'teal', duration: 2.3, delay: 2.0 },
]
```

- [ ] **Step 2: Add the `<svg>` background layer to the template**

Find:

```html
<template>
  <div class="login-screen">
    <div class="login-card">
```

Replace with:

```html
<template>
  <div class="login-screen">
    <svg class="hmi-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path
        v-for="(p, i) in flowPaths"
        :key="'path-' + i"
        :d="p.d"
        class="flow-line"
        :style="{ animationDuration: p.duration + 's', animationDelay: p.delay + 's' }"
      />
      <circle
        v-for="(p, i) in flowPaths"
        :key="'pulse-' + i"
        r="3"
        class="flow-pulse"
        :style="{ offsetPath: `path('${p.d}')`, animationDuration: p.duration + 's', animationDelay: p.delay + 's' }"
      />
      <circle
        v-for="(l, i) in leds"
        :key="'led-' + i"
        :cx="l.x"
        :cy="l.y"
        r="4"
        class="status-led"
        :class="'status-led--' + l.color"
        :style="{ animationDuration: l.duration + 's', animationDelay: l.delay + 's' }"
      />
    </svg>
    <div class="login-card">
```

- [ ] **Step 3: Add base (unanimated) CSS for the new elements**

Find the `.login-card { ... }` rule (added in Task 1) and add these new rules directly after it:

```css
.hmi-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}
.flow-line {
  fill: none;
  stroke: var(--login-teal);
  stroke-width: 1.5;
  opacity: 0.22;
  stroke-dasharray: 12 8;
}
.flow-pulse {
  fill: var(--login-teal-glow);
  opacity: 0.9;
}
.status-led {
  opacity: 0.15;
}
.status-led--teal { fill: var(--login-teal-glow); }
.status-led--amber { fill: var(--login-amber); }
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev` (if not already running)
Open: `http://localhost:5173/login`
Expected: faint teal dashed lines and small dots/circles are visible behind the login card, static (not moving yet). No console errors, no layout shift of the login card.

- [ ] **Step 5: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: add static HMI flow-line/pulse/LED background markup"
```

---

### Task 4: Animate flow lines and signal pulses

**Files:**
- Modify: `src/views/LoginView.vue` (`<style scoped>` — `.flow-line`, `.flow-pulse` rules, plus new `@keyframes`)

**Interfaces:**
- Consumes: `.flow-line`, `.flow-pulse` classes and `animationDuration`/`animationDelay` inline styles produced in Task 3.

- [ ] **Step 1: Add animation properties and keyframes**

Find:

```css
.flow-line {
  fill: none;
  stroke: var(--login-teal);
  stroke-width: 1.5;
  opacity: 0.22;
  stroke-dasharray: 12 8;
}
.flow-pulse {
  fill: var(--login-teal-glow);
  opacity: 0.9;
}
```

Replace with:

```css
.flow-line {
  fill: none;
  stroke: var(--login-teal);
  stroke-width: 1.5;
  opacity: 0.22;
  stroke-dasharray: 12 8;
  animation-name: flow-dash;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.flow-pulse {
  fill: var(--login-teal-glow);
  opacity: 0.9;
  offset-distance: 0%;
  animation-name: flow-pulse-move;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes flow-dash {
  to { stroke-dashoffset: -200; }
}
@keyframes flow-pulse-move {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev` (if not already running)
Open: `http://localhost:5173/login`
Expected: dashed lines appear to flow continuously; a small glowing dot travels along each line's path, looping. Motion is subtle (low opacity), card remains the clear focal point, no jank/no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: animate HMI flow-line dash offset and traveling signal pulses"
```

---

### Task 5: Animate status LEDs

**Files:**
- Modify: `src/views/LoginView.vue` (`<style scoped>` — `.status-led` rule, plus new `@keyframes`)

**Interfaces:**
- Consumes: `.status-led` class and `animationDuration`/`animationDelay` inline styles produced in Task 3.

- [ ] **Step 1: Add animation properties and keyframes**

Find:

```css
.status-led {
  opacity: 0.15;
}
```

Replace with:

```css
.status-led {
  opacity: 0.15;
  animation-name: led-blink;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes led-blink {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 1; }
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev` (if not already running)
Open: `http://localhost:5173/login`
Expected: the 8 small LED dots blink up/down on staggered timing (not synchronized), scattered around the screen edges, teal/amber mix. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: animate HMI status LED blink"
```

---

### Task 6: Reduced-motion support and final QA pass

**Files:**
- Modify: `src/views/LoginView.vue` (`<style scoped>` — add `@media (prefers-reduced-motion: reduce)` block at the end)

**Interfaces:**
- Consumes: `.flow-line`, `.flow-pulse`, `.status-led` classes from Tasks 3–5.

- [ ] **Step 1: Add the reduced-motion override**

Find the closing `</style>` tag at the end of the file. Add this block immediately before it (after the `.signin-btn:disabled` rule):

```css
@media (prefers-reduced-motion: reduce) {
  .flow-line { animation: none; opacity: 0.15; }
  .flow-pulse { display: none; }
  .status-led { animation: none; opacity: 0.4; }
}
```

- [ ] **Step 2: Manually verify reduced motion**

Run: `npm run dev` (if not already running)
Open Chrome DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → set to `reduce`.
Reload `http://localhost:5173/login`.
Expected: flow lines are static (no dash movement), pulses are hidden, LEDs are static dim dots — page is still fully usable, sign-in button still works.
Turn the emulation back off (or set to "no preference") afterward.

- [ ] **Step 3: Full manual QA pass against the spec's testing checklist**

With DevTools emulation off, on `http://localhost:5173/login`:
- [ ] Background renders animated flow lines + blinking LEDs, non-distracting (card is still the clear focal point).
- [ ] Card, logo, sign-in button, and lock→check verify animation are legible against the dark theme.
- [ ] Click "Sign in" — confirm `idle → verifying → verified` still runs and the browser proceeds into the OIDC redirect flow (or shows the expected `authError` if credentials/config are invalid in the local environment).
- [ ] If reachable, force an `authError` (e.g. temporarily break `VITE_ZITADEL_CLIENT_ID` in `.env`, reload, attempt sign-in) and confirm the red error text is legible on the dark background, then restore `.env`.
- [ ] Resize the browser window narrower/wider — card stays centered, no horizontal scrollbar introduced by the SVG background.

- [ ] **Step 4: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: reduced-motion support for HMI login background"
```
