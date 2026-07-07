# Zitadel SPA Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the SCADA dashboard SPA behind Zitadel OIDC Authorization Code + PKCE login, no backend.

**Architecture:** `vue-router` splits the app into `/login`, `/auth/callback`, and `/` (dashboard, guarded). A module-scoped `oidc-client-ts` `UserManager` singleton (`src/auth/oidc.js`) handles the PKCE flow and silent renew; `src/composables/useAuth.js` exposes reactive auth state built on that singleton's events, consumed by the router guard and by `Dashboard.vue`'s topbar.

**Tech Stack:** Vue 3.5, Vite 8, `vue-router` (new dep), `oidc-client-ts` (new dep).

## Global Constraints

- Zitadel authority: `https://auth.mpstech.in`
- Zitadel client ID: `380710052102733827`
- Auth method: PKCE, public client, no client secret
- Scope: `openid profile email`
- Token storage: `sessionStorage` (tab-scoped, deliberate — not `localStorage`)
- Redirect URIs (must be registered in Zitadel console by the user, outside this repo): `http://localhost:5173/auth/callback`, `http://localhost:5173/silent-renew.html`, and prod equivalents on the DigitalOcean App Platform domain
- No automated test suite exists in this repo (confirmed: no vitest/jest, no `*.test.js` files). Per the approved spec, the OIDC redirect flow is verified manually against the real Zitadel instance — it cannot be meaningfully unit-tested. Each task below is verified by either `npm run build` (catches import/syntax errors) or a manual dev-server check; there is no TDD red/green step for this plan.
- Full spec: `docs/superpowers/specs/2026-07-07-zitadel-login-design.md`

---

## File Structure

```
index.html                    # unchanged
silent-renew.html             # NEW — Vite multi-page entry for hidden-iframe silent renew
vite.config.js                 # MODIFY — register silent-renew.html as a second build entry
.env.example                   # NEW — documents required env vars
.env                           # NEW — actual dev values (gitignored)
.gitignore                     # MODIFY — add .env
package.json                   # MODIFY — add vue-router, oidc-client-ts (via npm install)
src/
  main.js                      # MODIFY — mount router, call initAuth() before mount
  silent-renew.js              # NEW — entry for silent-renew.html
  App.vue                      # MODIFY — becomes a thin <router-view /> shell
  auth/
    oidc.js                    # NEW — UserManager singleton
  composables/
    useAuth.js                 # NEW — reactive auth state + login/logout/initAuth
  router/
    index.js                   # NEW — routes + auth guard
  views/
    Dashboard.vue               # NEW — old App.vue content, moved, + user email/logout in topbar
    LoginView.vue                # NEW — branded sign-in screen
    AuthCallback.vue             # NEW — processes ?code=...&state=...
```

`Dashboard.vue` is the existing `App.vue` content relocated into `views/` (same responsibility, new location — it's a routed page now, not the app root). All its existing child-view imports (`KpiOverview.vue` etc.) already live in `src/views/`, so those import paths shrink from `./views/X.vue` to `./X.vue`.

---

## Task 1: Install dependencies and scaffold env config

**Files:**
- Modify: `package.json` (via `npm install`, not hand-edited)
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `VITE_ZITADEL_AUTHORITY`, `VITE_ZITADEL_CLIENT_ID` env vars, read via `import.meta.env` by later tasks.

- [ ] **Step 1: Install the two new dependencies**

Run: `npm install vue-router oidc-client-ts`

Expected: `package.json` `dependencies` gains `vue-router` and `oidc-client-ts` entries; `package-lock.json` (or equivalent) updates.

- [ ] **Step 2: Add `.env` to `.gitignore`**

Edit `.gitignore`, add a line:

```
.env
```

(Keep existing entries: `node_modules`, `dist`, `*.local`, `.DS_Store`, `.superpowers/`.)

- [ ] **Step 3: Create `.env.example`**

```
VITE_ZITADEL_AUTHORITY=https://auth.mpstech.in
VITE_ZITADEL_CLIENT_ID=380710052102733827
```

- [ ] **Step 4: Create `.env` with the real values**

```
VITE_ZITADEL_AUTHORITY=https://auth.mpstech.in
VITE_ZITADEL_CLIENT_ID=380710052102733827
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds (env vars aren't consumed yet, this just confirms the install didn't break anything).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: add vue-router, oidc-client-ts, env scaffolding for Zitadel login"
```

(`.env` is gitignored — do not add it.)

---

## Task 2: `UserManager` singleton (`src/auth/oidc.js`)

**Files:**
- Create: `src/auth/oidc.js`

**Interfaces:**
- Consumes: `import.meta.env.VITE_ZITADEL_AUTHORITY`, `import.meta.env.VITE_ZITADEL_CLIENT_ID` (Task 1)
- Produces: default export `userManager` (an `oidc-client-ts` `UserManager` instance) with methods `.signinRedirect()`, `.signinRedirectCallback()`, `.signinSilentCallback()`, `.signoutRedirect()`, `.getUser()`, and `.events` (event emitter with `addUserLoaded`, `addUserUnloaded`, `addSilentRenewError`). Consumed by Task 3 (`useAuth.js`) and Task 6 (`silent-renew.js`).

- [ ] **Step 1: Write the file**

```js
// src/auth/oidc.js
import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

const userManager = new UserManager({
  authority: import.meta.env.VITE_ZITADEL_AUTHORITY,
  client_id: import.meta.env.VITE_ZITADEL_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/login`,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

export default userManager
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds (file isn't imported anywhere yet, this only confirms valid syntax/imports).

- [ ] **Step 3: Commit**

```bash
git add src/auth/oidc.js
git commit -m "feat: add oidc-client-ts UserManager singleton"
```

---

## Task 3: Auth composable (`src/composables/useAuth.js`)

**Files:**
- Create: `src/composables/useAuth.js`

**Interfaces:**
- Consumes: `userManager` default export from `src/auth/oidc.js` (Task 2)
- Produces: named export `useAuth()` returning `{ user, isAuthenticated, authError, initialized, initAuth, login, logout }`:
  - `user`: `Ref<User|null>` — the oidc-client-ts `User` object (has `.profile.email`) or `null`
  - `isAuthenticated`: `ComputedRef<boolean>`
  - `authError`: `Ref<string|null>` — set if `initAuth()` can't reach the issuer
  - `initialized`: `Ref<boolean>` — true once `initAuth()` has resolved
  - `initAuth(): Promise<void>` — loads any existing session from storage
  - `login(): Promise<void>` — redirects to Zitadel
  - `logout(): Promise<void>` — redirects to Zitadel end-session
- Consumed by: Task 5 (`router/index.js` guard), Task 7/8/9 (`Dashboard.vue`, `LoginView.vue`, `AuthCallback.vue`)

- [ ] **Step 1: Write the file**

```js
// src/composables/useAuth.js
import { ref, computed } from 'vue'
import userManager from '../auth/oidc'

const user = ref(null)
const authError = ref(null)
const initialized = ref(false)

userManager.events.addUserLoaded((u) => { user.value = u })
userManager.events.addUserUnloaded(() => { user.value = null })
userManager.events.addSilentRenewError(() => {
  user.value = null
  userManager.signoutRedirect()
})

async function initAuth() {
  try {
    const u = await userManager.getUser()
    user.value = u && !u.expired ? u : null
  } catch (e) {
    authError.value = 'Cannot reach identity provider'
  } finally {
    initialized.value = true
  }
}

function login() {
  return userManager.signinRedirect()
}

function logout() {
  return userManager.signoutRedirect()
}

export function useAuth() {
  return {
    user,
    isAuthenticated: computed(() => !!user.value),
    authError,
    initialized,
    initAuth,
    login,
    logout,
  }
}
```

Module-scoped `user`/`authError`/`initialized` refs mean every call to `useAuth()` shares the same reactive state — this is the app's single source of auth truth, no separate store library needed.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useAuth.js
git commit -m "feat: add useAuth composable wrapping UserManager events"
```

---

## Task 4: Move dashboard into `views/Dashboard.vue`, add user email + logout to topbar

**Files:**
- Create: `src/views/Dashboard.vue`
- Delete (content moves out, replaced in Task 9): none yet — `src/App.vue` is left untouched until Task 9 so the app still builds after every task

**Interfaces:**
- Consumes: `useAuth()` from Task 3 (`user`, `logout`)
- Produces: default export Vue component, used as the `/` route component in Task 5

- [ ] **Step 1: Write the file**

This is `src/App.vue`'s current content, relocated, with imports adjusted for its new location one level deeper, plus a user-email/logout block added to the topbar's `.right` div.

```vue
<!-- src/views/Dashboard.vue -->
<script setup>
import { ref, computed } from 'vue'
import { usePlantData } from '../composables/usePlantData'
import { useAuth } from '../composables/useAuth'
import KpiOverview from './KpiOverview.vue'
import WaterTreatment from './WaterTreatment.vue'
import SolarPlant from './SolarPlant.vue'
import PowerDistribution from './PowerDistribution.vue'
import BoilerTurbine from './BoilerTurbine.vue'
import ManufacturingLine from './ManufacturingLine.vue'
import TagMonitor from './TagMonitor.vue'
import HvacBms from './HvacBms.vue'
import CompressedAir from './CompressedAir.vue'
import WindPower from './WindPower.vue'
import TankFarm from './TankFarm.vue'
import ScadaBuilder from './ScadaBuilder.vue'

const { state } = usePlantData()
const { user, logout } = useAuth()

const screens = [
  { id: 'kpi', ico: '▦', label: 'KPI Overview', title: 'Plant Overview — KPI Dashboard', comp: KpiOverview },
  { id: 'water', ico: '💧', label: 'Water Treatment', title: 'Water Treatment System', comp: WaterTreatment },
  { id: 'solar', ico: '☀', label: 'Solar Plant', title: 'Solar Power Plant', comp: SolarPlant },
  { id: 'power', ico: '⚡', label: 'Power Distribution', title: 'Power Distribution', comp: PowerDistribution },
  { id: 'boiler', ico: '🔥', label: 'Boiler & Turbine', title: 'Boiler & Turbine HMI', comp: BoilerTurbine },
  { id: 'mfg', ico: '⚙', label: 'Manufacturing Line', title: 'Manufacturing Line', comp: ManufacturingLine },
  { id: 'tags', ico: '🏷', label: 'Tag Monitor', title: 'MQTT / OPC UA Tag Monitor', comp: TagMonitor },
  { id: 'hvac', ico: '❄', label: 'HVAC / BMS', title: 'HVAC / Building Management', comp: HvacBms },
  { id: 'air', ico: '💨', label: 'Compressed Air', title: 'Compressed Air System', comp: CompressedAir },
  { id: 'wind', ico: '🌬', label: 'Wind Power', title: 'Wind Power Plant', comp: WindPower },
  { id: 'farm', ico: '🛢', label: 'Tank Farm', title: 'Tank Farm / Storage', comp: TankFarm },
  { id: 'builder', ico: '✚', label: 'SCADA Builder', title: 'SCADA Builder', comp: ScadaBuilder },
]
const active = ref('kpi')
const current = computed(() => screens.find(s => s.id === active.value))
const drawer = ref(false)
function go(id) { active.value = id; drawer.value = false }
</script>

<template>
  <div class="app">
    <header class="topbar">
      <button class="burger" :class="{ open: drawer }" @click="drawer = !drawer" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <h1>{{ current.title }}</h1>
      <div class="right">
        <div class="conn"><span class="dot"></span> {{ state.broker }}</div>
        <div class="conn">Date <b style="color:var(--txt)">23/06/2026</b></div>
        <div class="clock">{{ state.clock }}</div>
        <div class="user-box" v-if="user">
          <span class="user-email">{{ user.profile.email }}</span>
          <button class="logout-btn" @click="logout">Logout</button>
        </div>
      </div>
    </header>

    <div class="backdrop" :class="{ show: drawer }" @click="drawer = false"></div>

    <aside class="side" :class="{ open: drawer }">
      <div class="logo">
        <div>
          <div class="mark">SC<b>A</b>DA</div>
          <small>AUTOMATION</small>
        </div>
      </div>
      <nav class="nav">
        <a v-for="s in screens" :key="s.id" :class="{ active: active === s.id }" @click="go(s.id)">
          <span class="ico">{{ s.ico }}</span> {{ s.label }}
        </a>
      </nav>
      <div class="foot">SCADA AUTOMATION · v1.0<br>OPC UA + MQTT</div>
    </aside>

    <main class="main">
      <Transition name="fade" mode="out-in">
        <component :is="current.comp" :key="active" />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.user-box { display: flex; align-items: center; gap: 8px; padding-left: 14px; border-left: 1px solid var(--line); }
.user-email { font-size: 11px; color: var(--muted); }
.logout-btn {
  font-size: 11px; font-weight: 600; color: var(--teal); background: none;
  border: 1px solid var(--teal-dim); border-radius: 4px; padding: 4px 10px; cursor: pointer;
}
.logout-btn:hover { background: var(--soft); }
@media (max-width: 720px) { .user-email { display: none; } }
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds. `Dashboard.vue` isn't routed to yet (Task 5/9), so this only confirms it compiles standalone.

- [ ] **Step 3: Commit**

```bash
git add src/views/Dashboard.vue
git commit -m "feat: add Dashboard view with user email and logout in topbar"
```

---

## Task 5: `LoginView.vue`

**Files:**
- Create: `src/views/LoginView.vue`

**Interfaces:**
- Consumes: `useAuth()` from Task 3 (`login`, `authError`)
- Produces: default export Vue component, used as the `/login` route component in Task 8

- [ ] **Step 1: Write the file**

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
      <small>AUTOMATION</small>
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

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: add LoginView"
```

---

## Task 6: `AuthCallback.vue`

**Files:**
- Create: `src/views/AuthCallback.vue`

**Interfaces:**
- Consumes: `userManager` from `src/auth/oidc.js` (Task 2), `useAuth()` from Task 3 (`login`), `useRouter()` from `vue-router` (Task 1 dep)
- Produces: default export Vue component, used as the `/auth/callback` route component in Task 8

- [ ] **Step 1: Write the file**

```vue
<!-- src/views/AuthCallback.vue -->
<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import userManager from '../auth/oidc'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login } = useAuth()
const error = ref(null)

onMounted(async () => {
  try {
    await userManager.signinRedirectCallback()
    router.push('/')
  } catch (e) {
    error.value = e.message || 'Login failed'
  }
})
</script>

<template>
  <div class="callback-screen">
    <template v-if="error">
      <p class="error">{{ error }}</p>
      <button class="retry-btn" @click="login">Try again</button>
    </template>
    <p v-else>Signing you in…</p>
  </div>
</template>

<style scoped>
.callback-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg); color: var(--txt); font-size: 13px; gap: 16px;
}
.error { color: var(--red); }
.retry-btn {
  padding: 8px 24px; border: none; background: var(--teal); color: #fff;
  font-weight: 700; cursor: pointer;
}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/views/AuthCallback.vue
git commit -m "feat: add AuthCallback view"
```

---

## Task 7: Silent renew entry (`silent-renew.html` + `src/silent-renew.js` + `vite.config.js`)

**Files:**
- Create: `silent-renew.html` (project root, sibling of `index.html`)
- Create: `src/silent-renew.js`
- Modify: `vite.config.js`

**Interfaces:**
- Consumes: `userManager` from `src/auth/oidc.js` (Task 2) — reused directly rather than re-declaring config, so the silent-renew iframe can never drift out of sync with the main app's OIDC settings.
- Produces: a second build entry served at `/silent-renew.html` in both dev and prod, matching the `silent_redirect_uri` already configured in Task 2.

- [ ] **Step 1: Write `silent-renew.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Signing in…</title>
</head>
<body>
  <script type="module" src="/src/silent-renew.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/silent-renew.js`**

```js
// src/silent-renew.js
import userManager from './auth/oidc'

userManager.signinSilentCallback()
```

- [ ] **Step 3: Modify `vite.config.js` to register the second entry**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  server: { open: true, port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        silentRenew: resolve(__dirname, 'silent-renew.html'),
      },
    },
  },
})
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds and `dist/silent-renew.html` exists.

Run: `ls dist/silent-renew.html`
Expected: file listed (not "No such file or directory").

- [ ] **Step 5: Commit**

```bash
git add silent-renew.html src/silent-renew.js vite.config.js
git commit -m "feat: add silent-renew entry for OIDC automatic token refresh"
```

---

## Task 8: Router (`src/router/index.js`)

**Files:**
- Create: `src/router/index.js`

**Interfaces:**
- Consumes: `Dashboard.vue` (Task 4), `LoginView.vue` (Task 5), `AuthCallback.vue` (Task 6), `useAuth()` (Task 3)
- Produces: default export `router` (a `vue-router` instance), consumed by `src/main.js` in Task 9

- [ ] **Step 1: Write the file**

```js
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import LoginView from '../views/LoginView.vue'
import AuthCallback from '../views/AuthCallback.vue'
import { useAuth } from '../composables/useAuth'

const routes = [
  { path: '/', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/auth/callback', name: 'auth-callback', component: AuthCallback },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    return { name: 'login' }
  }
  return true
})

export default router
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/router/index.js
git commit -m "feat: add router with auth guard"
```

---

## Task 9: Wire it all up — `main.js` and `App.vue`

**Files:**
- Modify: `src/main.js`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `router` (Task 8), `useAuth()` (Task 3)
- Produces: the fully wired app — this is the task where the dashboard actually becomes reachable end-to-end for the first time.

- [ ] **Step 1: Rewrite `src/main.js`**

```js
// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import './style.css'

const { initAuth } = useAuth()

initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
```

`initAuth()` must resolve before mount so the router's first navigation guard sees the restored session (if any) instead of racing it and flashing `/login`.

- [ ] **Step 2: Rewrite `src/App.vue`**

```vue
<!-- src/App.vue -->
<template>
  <router-view />
</template>
```

- [ ] **Step 3: Verify — build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify — manual dev-server check (no Zitadel round-trip yet)**

Run: `npm run dev`, open `http://localhost:5173`

Expected: browser redirects to `http://localhost:5173/login` and shows the branded sign-in card (confirms the guard fires and `LoginView` renders — the "Sign in" button click is verified in Task 10 once redirect URIs are registered).

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/App.vue
git commit -m "feat: wire router and auth into app bootstrap"
```

---

## Task 10: End-to-end verification against real Zitadel

**Files:** none (verification only)

**Prerequisite:** the user must register these redirect URIs in the Zitadel console (`https://auth.mpstech.in` project, application with client ID `380710052102733827`) before this task — it's a console action outside this repo, not something this plan can automate:
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/silent-renew.html`
- Post-logout redirect: `http://localhost:5173/login`

- [ ] **Step 1: Sign-in flow**

Run: `npm run dev`, open `http://localhost:5173`, click "Sign in" on the `/login` screen.

Expected: browser navigates to `auth.mpstech.in`'s hosted login page.

- [ ] **Step 2: Complete login and land on dashboard**

Log in with a valid Zitadel account.

Expected: browser redirects to `/auth/callback` (briefly shows "Signing you in…"), then to `/`. Dashboard renders. Topbar shows the logged-in user's email next to the clock.

- [ ] **Step 3: Session persists across refresh**

Reload the page (`Cmd+R` / `F5`).

Expected: dashboard still renders, no redirect to `/login` (confirms `sessionStorage` session restore via `initAuth()`).

- [ ] **Step 4: Logout**

Click "Logout" in the topbar.

Expected: browser navigates to Zitadel end-session, then back to `/login`. `sessionStorage` no longer has oidc-client-ts keys (check via DevTools → Application → Session Storage).

- [ ] **Step 5: Session does not survive tab close**

After logging back in, close the tab, open a new tab to `http://localhost:5173`.

Expected: redirected to `/login` (confirms `sessionStorage` tab-scoping — this is the accepted trade-off documented in the spec, not a bug).

- [ ] **Step 6: Issuer unreachable handling**

Temporarily break DNS resolution for `auth.mpstech.in` (e.g. add `0.0.0.0 auth.mpstech.in` to `/etc/hosts`, or disconnect network), then reload `http://localhost:5173`.

Expected: `/login` renders with the "Can't reach identity provider" banner instead of a blank page or an uncaught exception in the console. Revert the `/etc/hosts` change (or reconnect network) afterward.

- [ ] **Step 7: Final commit**

If any fixes were needed during verification, commit them individually with descriptive messages before considering this plan complete. No commit needed if verification passed without changes.

---

## Post-Plan Note

Production deploy (DigitalOcean App Platform) needs the same two env vars (`VITE_ZITADEL_AUTHORITY`, `VITE_ZITADEL_CLIENT_ID`) set in the App Platform build environment, and the prod redirect URIs (`https://<app>.ondigitalocean.app/auth/callback`, `.../silent-renew.html`) registered in the Zitadel console. Both are deploy-time/console actions outside this repo's code and outside this plan's scope.
