# Login Verify Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a motion-driven lock→verified animation to the existing Zitadel `LoginView.vue`, purely visual (no new form fields), using `motion-v`.

**Architecture:** A small `state` ref (`'idle' | 'verifying' | 'verified'`) drives `computed` animate/transition targets on `<motion.div>` wrappers around a lock/checkmark badge sitting above the existing "Sign in" button. Click still calls the real `login()` (`signinRedirect()`) immediately — the animation is cosmetic feedback layered on top, not a gate on the redirect.

**Tech Stack:** Vue 3 (`<script setup>`), `motion-v` (new dep — component-based `<motion.div :animate :transition>` API, no Vue plugin registration required for a plain Vite app), `lucide-vue-next` (already a dep — reuse `Lock`/`CheckCircle2` icons instead of hand-rolled SVG, matching the icon pattern already used in `ScadaBuilder.vue:7`).

## Global Constraints

- No username/password/OTP input fields — animation only, spec: "purely visual — no username/password/OTP fields."
- Light theme, existing CSS vars only (`--teal`, `--panel`, `--line`, `--txt`) — no dark/neon reference styling.
- `login()` must be called immediately on click, with no artificial delay blocking it.
- No changes to `useAuth.js`, `router/`, or `auth/oidc.js` — OIDC flow itself is untouched.
- Card and badge use claymorphism: soft dual-tone `box-shadow` (light highlight + soft dark shadow, no hard 1px borders), larger `border-radius`, subtle inset highlight. Same `--panel`/`--teal` palette — no new color vars.
- `motion-v` transition durations/delays are in **seconds**, not milliseconds (confirmed against library docs) — do not mix up with the `setTimeout(..., 300)` millisecond value used for the JS state transition.
- Repo has no test framework (`package.json` has no `test` script, no vitest/jest, no `*.spec.*` files) — verification is manual via `npm run dev`, per the existing [Zitadel spec](../specs/2026-07-07-zitadel-login-design.md)'s own manual-testing approach. No automated test steps in this plan.

---

### Task 1: Add `motion-v` dependency

**Files:**
- Modify: `package.json` (dependency)

**Interfaces:**
- Produces: `motion` export from `motion-v`, importable as `import { motion } from 'motion-v'` in any component (e.g. `<motion.div>`, `<motion.button>`). No Vue plugin registration needed — confirmed via library docs, unlike `@vueuse/motion`'s `MotionPlugin`.

- [ ] **Step 1: Install the dependency**

Run: `cd /Users/ravikanojiya/scada-vue && npm install motion-v`

Expected: `package.json` gains `"motion-v": "^<version>"` under `dependencies`, `package-lock.json` updates, no install errors.

- [ ] **Step 2: Manually verify the app still boots**

Run: `npm run dev`, open `http://localhost:5173` in a browser.

Expected: app loads with no console errors. Existing behavior (redirect to `/login` if unauthenticated) is unchanged — this step only installs the package, no code uses it yet.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add motion-v for login animation"
```

---

### Task 2: Animated lock→verified badge on `LoginView.vue`

**Files:**
- Modify: `src/views/LoginView.vue`

**Interfaces:**
- Consumes: `motion` from `motion-v` (Task 1).
- Consumes: `login`, `authError` from `useAuth()` (unchanged, already imported at `src/views/LoginView.vue:5`).
- Produces: none consumed elsewhere — this is the leaf UI change.

- [ ] **Step 1: Write the full updated component**

Current `src/views/LoginView.vue`:

```vue
<!-- src/views/LoginView.vue -->
<script setup>
import { useAuth } from '../composables/useAuth'

const { login, authError } = useAuth()
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="mark">SC<b>A</b>DA</div>
     <div> <small>AUTOMATION</small></div>
      <p v-if="authError" class="error">{{ authError }}</p>
      <button class="signin-btn" @click="login">Sign in</button>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg);
}
.login-card {
  text-align: center; padding: 40px 56px; background: var(--panel);
  border: 1px solid var(--line); box-shadow: var(--shadow);
}
.mark { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: var(--txt); }
.mark b { color: var(--teal); }
.login-card small { color: var(--muted); letter-spacing: 2px; font-size: 10px; }
.error { color: var(--red); margin: 16px 0 0; font-size: 12px; }
.signin-btn {
  margin-top: 24px; padding: 10px 32px; border: none; background: var(--teal);
  color: #fff; font-weight: 700; font-size: 13px; letter-spacing: .5px; cursor: pointer;
}
.signin-btn:hover { background: var(--teal-dim); }
</style>
```

Replace with:

```vue
<!-- src/views/LoginView.vue -->
<script setup>
import { ref, computed } from 'vue'
import { motion } from 'motion-v'
import { Lock, CheckCircle2 } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'

const { login, authError } = useAuth()

// idle -> verifying -> verified. Cosmetic only; login() fires immediately
// on click and is never blocked by this state machine.
const state = ref('idle')

const ringAnimate = computed(() => {
  if (state.value === 'verified') return { scale: [1, 1.15, 1], opacity: 1 }
  if (state.value === 'verifying') return { scale: [1, 1.08, 1], opacity: 0.9 }
  return { scale: [1, 1.05, 1], opacity: 0.6 }
})

const ringTransition = computed(() => {
  if (state.value === 'verified') return { duration: 0.4, ease: 'easeOut' }
  if (state.value === 'verifying') return { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
  return { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
})

const lockAnimate = computed(() => (
  state.value === 'verified' ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }
))

const checkAnimate = computed(() => (
  state.value === 'verified' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }
))

function handleSignIn() {
  state.value = 'verifying'
  login()
  setTimeout(() => { state.value = 'verified' }, 300)
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <motion.div class="badge-ring" :class="state" :animate="ringAnimate" :transition="ringTransition">
        <motion.div class="badge-icon" :animate="lockAnimate" :transition="{ duration: 0.2 }">
          <Lock :size="32" />
        </motion.div>
        <motion.div
          class="badge-icon badge-icon-check"
          :animate="checkAnimate"
          :transition="{ duration: 0.25, delay: 0.15 }"
        >
          <CheckCircle2 :size="32" />
        </motion.div>
      </motion.div>
      <div class="mark">SC<b>A</b>DA</div>
     <div> <small>AUTOMATION</small></div>
      <p v-if="authError" class="error">{{ authError }}</p>
      <button class="signin-btn" :disabled="state !== 'idle'" @click="handleSignIn">
        {{ state === 'idle' ? 'Sign in' : 'Verifying…' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
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
.mark { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: var(--txt); }
.mark b { color: var(--teal); }
.login-card small { color: var(--muted); letter-spacing: 2px; font-size: 10px; }
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
</style>
```

- [ ] **Step 2: Manually verify idle animation**

Run: `npm run dev` (if not already running), open `http://localhost:5173/login` (or navigate there via an unauthenticated `/`).

Expected: badge ring around the lock icon slowly breathes (scale 1 → 1.05 → 1 loop, ~1.4s cycle) on load, no console errors.

- [ ] **Step 3: Manually verify click behavior**

In the browser, open devtools Network tab, then click "Sign in".

Expected: button text changes to "Verifying…" and disables immediately; ring pulse visibly speeds up (~0.5s cycle); browser begins navigating toward `auth.mpstech.in` (visible in Network tab or as a page navigation) without any delay from the animation.

- [ ] **Step 4: Manually verify the verified fallback state**

In devtools, throttle the network to "Slow 3G" (or temporarily block `auth.mpstech.in` in devtools request blocking), then click "Sign in" again.

Expected: ~300ms after click, the lock icon crossfades out and the checkmark icon crossfades in, ring scale-bounces once (1 → 1.15 → 1) and its background tints teal, while the (slow) redirect is still pending in the background. Un-throttle/unblock the network afterward.

- [ ] **Step 5: Manually verify the existing error banner still works**

Temporarily edit `src/composables/useAuth.js` `initAuth()` to force `authError.value = 'Cannot reach identity provider'` (or simulate by blocking `auth.mpstech.in` before the app boots), reload `/login`.

Expected: error banner still renders below the badge (unchanged from before), badge stays in idle state. Revert the temporary edit afterward — do not commit it.

- [ ] **Step 6: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: add lock-to-verified motion animation on login"
```
