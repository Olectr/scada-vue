# Login Verify Animation — Design

Date: 2026-07-11

## Goal

Add a motion-driven lock→verified animation to the existing Zitadel
`LoginView.vue` (see
[2026-07-07-zitadel-login-design.md](2026-07-07-zitadel-login-design.md)).
Purely visual — no username/password/OTP fields. The screen still has a
single "Sign in" button that kicks off `signinRedirect()`; the animation is
feedback layered on top of that click, not a new auth mechanism.

## Scope

- `src/views/LoginView.vue` — add animated badge + state machine.
- `package.json` — add `motion-v` dependency.

No changes to `useAuth.js`, `router/`, `auth/oidc.js`, or the Zitadel app
config — the OIDC flow itself is untouched.

## Dependency

`motion-v` — official Motion (ex-Framer Motion) Vue port. Component-based
API (`<motion.div :animate :transition>`), no Vue plugin registration
needed for a plain Vite app. Switched from the originally-considered
`@vueuse/motion` for closer parity with the reference mockup's
framer-motion source and more confidently-documented variant-switching
syntax.

## Visual Style

Light theme, consistent with rest of app — no dark/neon reference styling.
Badge uses existing CSS vars (`--teal`, `--panel`, `--line`, `--txt`).

Claymorphism treatment on the card and badge: soft dual-tone shadows (light
highlight + soft dark shadow, no hard 1px borders), larger border-radius,
subtle inset highlight for a puffy 3D look. Applied via `box-shadow`/
`border-radius` only — no new color vars, same `--panel`/`--teal` palette.

## Component: animated badge

Sits above the existing "Sign in" button in `.login-card`. Inline SVG,
~96px circle:

- Outer ring (teal stroke)
- Center icon: lock (idle/verifying) that crossfades to a checkmark
  (verified)

## State Machine

`ref` `state = 'idle' | 'verifying' | 'verified'`, driven by computed
`animate`/`transition` targets bound to `<motion.div>` elements:

| State | Ring | Icon | Button |
|---|---|---|---|
| `idle` | slow breathing pulse (scale 1 ↔ 1.05, opacity loop) | lock, teal | "Sign in", enabled |
| `verifying` | faster pulse | lock, teal (unchanged) | "Verifying…", disabled |
| `verified` | scale-bounce, stroke → success-teal | checkmark crossfade-in | (moot — redirect in flight) |

## Interaction

1. Idle animation loops on mount (`useMotion` variant loop, no user input).
2. Click "Sign in":
   - `state = 'verifying'`
   - `login()` called immediately (no artificial delay) — `signinRedirect()`
     begins navigating away right away, per prior decision not to block the
     real redirect for animation purposes.
   - `setTimeout(() => state = 'verified', 300)` as a cosmetic fallback in
     case the redirect is slow; does not block or delay the `login()` call
     itself.
3. If `authError` is already set (e.g. issuer unreachable at boot, per
   existing `initAuth()` error handling), badge stays `idle` and the
   existing error banner shows as today — no verifying/verified animation
   plays since there's nothing to verify.

## Error Handling

No new error paths. Existing `authError` display (`LoginView.vue:13`)
unchanged. Animation state is independent of auth state; a failed
`signinRedirect()` call (rare — it's a browser navigation, not a promise
that typically rejects) is not specially handled, matching current
behavior.

## Testing (manual)

1. `npm run dev` → hit `/login` → confirm idle badge breathing-pulses on
   load.
2. Click "Sign in" → confirm ring speeds up, button shows "Verifying…" and
   disables, browser begins navigating to `auth.mpstech.in` (network tab or
   visible redirect).
3. Throttle network heavily (or block `auth.mpstech.in` briefly) → confirm
   badge reaches `verified` (checkmark) state ~300ms after click, without
   blocking the pending redirect.
4. Confirm no console errors from `motion-v` on mount/unmount
   (navigating away mid-animation).
