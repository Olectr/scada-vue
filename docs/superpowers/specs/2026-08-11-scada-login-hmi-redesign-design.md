# SCADA Login Page — Industrial HMI Redesign

## Purpose

Current login page ([LoginView.vue](../../../src/views/LoginView.vue)) uses the app's light neumorphic theme with no visual tie to SCADA/industrial context. Redesign it as a dark, animated industrial HMI (Human-Machine Interface) panel that signals "this is a control-room product" on first impression, while keeping the existing auth mechanism and verifying/verified state machine unchanged.

## Scope

- **In scope:** `src/views/LoginView.vue` only — markup, scoped styles, and a new background animation.
- **Out of scope:** global theme (`src/style.css`), Dashboard, ScadaBuilder, or any other view. The rest of the app keeps its current light theme. No new dependencies — `motion-v` and `lucide-vue-next` are already used in this file.
- **Unchanged:** `useAuth()` composable, `handleSignIn()` logic, OIDC flow, `state` machine (`idle` → `verifying` → `verified`), error display (`authError`).

## Visual Design

### Layout
Full-viewport dark background replaces `var(--bg)` light background, scoped to `.login-screen` only (new local CSS variables, not edits to global `style.css`). Login card stays centered, same structural position as today. Metrion logo remains at the top of the card; since the current SVG (`https://metrion.blr1.cdn.digitaloceanspaces.com/metrion-logo.svg`) is dark-on-transparent, apply a CSS `filter: brightness(0) invert(1)` (or `invert(1) brightness(1.8)`, tuned visually) so it reads as light-on-dark. If the inverted mark looks wrong against teal glow, fall back to `filter: drop-shadow` outline instead of full invert.

### Palette (local to `.login-screen`, does not touch global tokens)
| Token | Value | Use |
|---|---|---|
| `--login-bg-1` | `#0a1420` | base background |
| `--login-bg-2` | `#0f1f30` | radial gradient outer stop |
| `--login-panel` | `#101d2c` | card background |
| `--login-border` | `rgba(13,148,136,.25)` | card border |
| `--login-teal` | `#0d9488` | primary accent (matches existing `--teal`) |
| `--login-teal-glow` | `#2dd4bf` | glow/highlight accent |
| `--login-amber` | `#f59e0b` | idle-status LED blink |
| `--login-red` | `#ef4444` | error (matches existing `--red`) |
| `--login-text` | `#e6edf3` | primary text |
| `--login-text-dim` | `#7d92a6` | secondary text |

### Animated background
An absolutely-positioned `<svg>` behind `.login-card`, `viewBox` spanning the screen, `pointer-events: none`:

- **Flow lines:** 4–6 right-angle "P&ID style" paths (`<path>` with orthogonal routing, `stroke: var(--login-teal)`, low opacity ~0.15–0.25, `stroke-width: 1.5`). Each animates `stroke-dashoffset` via `motion-v` (`animate`/`transition` with `repeat: Infinity`, `ease: 'linear'`), duration staggered 3–6s per path, to read as continuous flow.
- **Signal pulses:** one small `motion.circle` (r≈3, fill `var(--login-teal-glow)`) per path, animated along the path's point sequence (interpolated `cx`/`cy` keyframes matching the path geometry, since CSS `offset-path` support/motion-v API will be confirmed during implementation — fallback is keyframed cx/cy at the path's corner points).
- **Status LEDs:** 6–10 small static circles scattered around the canvas at fixed positions, each blinking (`opacity` keyframes 0.2 → 1 → 0.2) on staggered random-looking delays, colored teal/amber mix.
- Overall opacity kept low so the login card stays the clear focal point.

### Card & badge
- Card background switches from the light neumorphic shadow treatment to `var(--login-panel)` fill, `1px solid var(--login-border)`, and a soft outer `box-shadow` in teal (glow instead of the current light/dark neumorphic pair).
- Existing `badge-ring` / `badge-icon` (`Lock` → `CheckCircle2`) animation logic (`ringAnimate`, `ringTransition`, `lockAnimate`, `checkAnimate`) is unchanged in `<script setup>`. Only the ring's `box-shadow` values in `<style>` change from the light neumorphic shadows to a dark-panel + teal-glow treatment (including the existing `.verified` variant, restyled to a stronger teal glow).
- Sign-in button keeps its copy/behavior; restyled with `var(--login-teal)` fill and a teal glow shadow instead of the current combination (already close — mostly a background/shadow tune against the new dark card).
- Error text keeps `var(--red)` / `var(--login-red)`.

## Accessibility & Performance

- Wrap the flow-line and pulse animations in `@media (prefers-reduced-motion: reduce)`: dash-offset and pulse animations are disabled (static lines shown, no motion); LED blink either removed or slowed drastically. Implemented via a CSS media query (motion-v respects reduced motion only partially, so critical paths get a plain CSS override).
- All animation is CSS/SVG/motion-v-driven — no canvas, no per-frame JS render loop, so no additional runtime perf cost beyond what motion-v already does for the existing badge.
- No new npm dependencies.

## Testing Plan

- Manual: run dev server, visit `/login`, confirm:
  - Background renders with visible but non-distracting animated flow lines and blinking LEDs.
  - Card, logo (inverted/light), sign-in button, and lock→check verify animation are legible against the dark theme.
  - Triggering sign-in still runs the existing `idle → verifying → verified` flow and calls `login()`.
  - `authError` message displays legibly in red on dark background.
  - Toggle OS "reduce motion" setting and confirm background animation freezes/slows, page still usable.
- Visual check at a couple of viewport widths (this page has no existing responsive breakpoints to preserve beyond current centering behavior).
- No unit tests exist for this view today; none added — this is a pure visual/CSS change with no new logic branches.
