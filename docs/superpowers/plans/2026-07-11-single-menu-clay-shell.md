# Single-Menu Claymorphic Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the dashboard sidebar to a single "SCADA Builder" menu entry, delete the 11 now-unused view files, swap the sidebar logo mark for the Olectr logo image, and apply a claymorphism treatment to the app shell (topbar/sidebar/nav/burger) — matching the styling already applied to `LoginView.vue`.

**Architecture:** Two sequential tasks. Task 1 trims `Dashboard.vue` to a single-entry `screens` array and deletes the 11 view files it stops importing (must happen together — deleting the files first would break the build, trimming imports first would leave dead files). Task 2 restyles the shell CSS in `style.css` with claymorphism and removes the CSS rules that were exclusively used by the now-deleted views.

**Tech Stack:** Vue 3 (`<script setup>`), plain CSS (no new dependencies).

## Global Constraints

- `src/views/ScadaBuilder.vue` is NOT modified. It is self-contained: its own `<style scoped>` block, its own class namespace (confirmed via grep — zero occurrences of `.card`, `.grid`, `.scr-head`, `.chart-box` etc. in that file).
- No new CSS custom properties — claymorphism uses only existing `--teal`/`--panel`/`--soft` values and rgba decompositions of `--teal` (`#0d9488` = `rgb(13,148,136)`) and the `--shadow` token's base color (`rgba(16,40,60,…)`), matching the formula already used in `LoginView.vue`.
- Repo has no test framework — verification is `npm run build` succeeding plus manual browser checks, per the design spec's own testing section.
- `grep -rln` for the 11 deleted view names across `src/` returns only `Dashboard.vue` (verified) — no other file references them, safe to delete outright.
- Router (`src/router/index.js`) is untouched — `/` still routes to `Dashboard.vue`, no changes needed there.

---

### Task 1: Trim Dashboard.vue to one menu entry, delete unused views

**Files:**
- Modify: `src/views/Dashboard.vue`
- Delete: `src/views/BoilerTurbine.vue`
- Delete: `src/views/CompressedAir.vue`
- Delete: `src/views/HvacBms.vue`
- Delete: `src/views/KpiOverview.vue`
- Delete: `src/views/ManufacturingLine.vue`
- Delete: `src/views/PowerDistribution.vue`
- Delete: `src/views/SolarPlant.vue`
- Delete: `src/views/TagMonitor.vue`
- Delete: `src/views/TankFarm.vue`
- Delete: `src/views/WaterTreatment.vue`
- Delete: `src/views/WindPower.vue`

**Interfaces:**
- Produces: `.logo-img` class on the new `<img>` logo element in `Dashboard.vue`'s template — Task 2 adds the corresponding CSS rule for this class in `style.css`.
- Consumes: `/olectr-logo.png` (already in `public/`, added in a prior change — verify it still exists before starting).

- [ ] **Step 1: Verify the logo asset exists**

Run: `ls /Users/ravikanojiya/scada-vue/public/olectr-logo.png`

Expected: file exists (added in a prior commit). If missing, STOP and report BLOCKED — do not proceed without it.

- [ ] **Step 2: Verify no other file references the 11 views being deleted**

Run: `grep -rln "BoilerTurbine\|CompressedAir\|HvacBms\|KpiOverview\|ManufacturingLine\|PowerDistribution\|SolarPlant\|TagMonitor\|TankFarm\|WaterTreatment\|WindPower" /Users/ravikanojiya/scada-vue/src --include="*.vue" --include="*.js"`

Expected output: exactly one line, `/Users/ravikanojiya/scada-vue/src/views/Dashboard.vue`. If any other file appears, STOP and report BLOCKED — do not delete without understanding that reference first.

- [ ] **Step 3: Write the full updated Dashboard.vue**

Current `src/views/Dashboard.vue`:

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

Replace with:

```vue
<!-- src/views/Dashboard.vue -->
<script setup>
import { ref, computed } from 'vue'
import { usePlantData } from '../composables/usePlantData'
import { useAuth } from '../composables/useAuth'
import ScadaBuilder from './ScadaBuilder.vue'

const { state } = usePlantData()
const { user, logout } = useAuth()

const screens = [
  { id: 'builder', ico: '✚', label: 'SCADA Builder', title: 'SCADA Builder', comp: ScadaBuilder },
]
const active = ref('builder')
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
        <img class="logo-img" src="/olectr-logo.png" alt="Olectr" />
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

- [ ] **Step 4: Delete the 11 unused view files**

Run:

```bash
cd /Users/ravikanojiya/scada-vue
git rm src/views/BoilerTurbine.vue src/views/CompressedAir.vue src/views/HvacBms.vue \
  src/views/KpiOverview.vue src/views/ManufacturingLine.vue src/views/PowerDistribution.vue \
  src/views/SolarPlant.vue src/views/TagMonitor.vue src/views/TankFarm.vue \
  src/views/WaterTreatment.vue src/views/WindPower.vue
```

Expected: 11 files staged for deletion, no errors.

- [ ] **Step 5: Verify build succeeds**

Run: `npm run build`

Expected: succeeds with no errors (the `.logo-img` class has no CSS rule yet — that's Task 2's job; a missing CSS rule doesn't fail a Vite build, only looks unstyled, which is expected and fine at this checkpoint).

- [ ] **Step 6: Commit**

```bash
git add src/views/Dashboard.vue
git commit -m "feat: reduce sidebar to single SCADA Builder menu entry"
```

(The `git rm` in Step 4 already staged the deletions — this commit captures both the deletions and the `Dashboard.vue` edit together, since they must land as one atomic change per the Architecture note above.)

---

### Task 2: Claymorphism restyle + dead CSS removal in style.css

**Files:**
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `.logo-img` class name from Task 1's `Dashboard.vue` template — this task adds its CSS rule.
- Produces: none consumed elsewhere — this is a pure styling change.

- [ ] **Step 1: Write the full updated style.css**

Current `src/style.css` (188 lines) — full current content:

```css
:root{
  --bg:#f3f5f8;
  --panel:#ffffff;
  --line:#e4e9ef;
  --teal:#0d9488;
  --teal-dim:#5eb8b0;
  --amber:#f59e0b;
  --red:#ef4444;
  --green:#10b981;
  --txt:#1f2d3d;
  --muted:#6b7c8f;
  --soft:#f7f9fb;
  --font:'Satoshi','Segoe UI',system-ui,Roboto,Arial,sans-serif;
  --shadow:0 1px 3px rgba(16,40,60,.06),0 1px 2px rgba(16,40,60,.04);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--txt);height:100vh;overflow:hidden}
#app{height:100vh}
.app{display:grid;grid-template-columns:230px 1fr;grid-template-rows:56px 1fr;height:100vh}

/* Top bar */
.topbar{grid-column:1/3;background:#fff;border-bottom:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-between;padding:0 18px;box-shadow:var(--shadow)}
.topbar h1{font-size:13px;letter-spacing:2px;font-weight:600;color:var(--txt);text-transform:uppercase}
.topbar .right{display:flex;align-items:center;gap:18px}
.clock{font-variant-numeric:tabular-nums;font-size:14px;color:var(--teal);font-weight:600}
.conn{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 1.6s infinite}
@keyframes pulse{50%{opacity:.4}}

/* Sidebar */
.side{background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;padding:14px 0}
.logo{display:flex;align-items:center;gap:8px;padding:6px 18px 18px;border-bottom:1px solid var(--line);margin-bottom:10px}
.logo .mark{font-weight:800;font-size:20px;letter-spacing:-1px;color:var(--teal);transform:skewX(-8deg)}
.logo .mark b{color:var(--txt)}
.logo small{display:block;font-size:8px;letter-spacing:3px;color:var(--amber);margin-top:2px}
.nav{flex:1;overflow:auto}
.nav a{display:flex;align-items:center;gap:11px;padding:11px 18px;font-size:13px;color:var(--muted);
  cursor:pointer;border-left:3px solid transparent;text-decoration:none;transition:.15s}
.nav a:hover{background:var(--soft);color:var(--txt)}
.nav a.active{background:linear-gradient(90deg,#e6f5f3,transparent);color:var(--teal);border-left-color:var(--teal);font-weight:600}
.nav a .ico{width:18px;text-align:center;font-size:14px}
.side .foot{padding:12px 18px;font-size:9px;color:#a9b8c4;letter-spacing:1px}

/* Main */
.main{overflow:auto;padding:18px;position:relative}
.scr-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}
.scr-head h2{font-size:18px;font-weight:600;letter-spacing:.5px}
.scr-head .sub{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
.fade-enter-active{transition:all .25s}
.fade-enter-from{opacity:0;transform:translateY(6px)}

.grid{display:grid;gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:0;padding:16px;position:relative;box-shadow:var(--shadow)}
.card h3{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;
  display:flex;align-items:center;justify-content:space-between}
.card h3 .tag{font-size:9px;color:var(--teal);border:1px solid var(--teal-dim);padding:1px 6px;border-radius:4px}

/* KPI */
.kpi{display:flex;flex-direction:column;gap:6px}
.kpi .val{font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--txt)}
.kpi .val small{font-size:13px;color:var(--muted);font-weight:400;margin-left:3px}
.kpi .lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.kpi .delta{font-size:11px;font-weight:600}
.up{color:var(--green)} .down{color:var(--red)} .accent{color:var(--teal)}
.kpi .bar{height:4px;background:#eef2f6;border-radius:3px;overflow:hidden;margin-top:4px}
.kpi .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--teal-dim),var(--teal))}

/* gauge */
.gauge-wrap{display:flex;flex-direction:column;align-items:center;gap:4px}
.gauge{position:relative;width:130px;height:130px}
.gauge .v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2;pointer-events:none}
.gauge .v b{font-size:26px;font-weight:700;color:var(--txt);font-variant-numeric:tabular-nums}
.gauge .v span{font-size:10px;color:var(--muted)}
.gauge-name{font-size:12px;color:var(--txt);letter-spacing:1px}

/* tank */
.tank{width:70px;height:150px;border:2px solid var(--line);border-radius:8px;position:relative;
  background:#eef4f7;overflow:hidden;margin:0 auto}
.tank .liq{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(180deg,#38bdf8,#0e7490);transition:height .8s ease}
.tank .liq::before{content:'';position:absolute;top:-6px;left:0;right:0;height:8px;background:#7dd3fc;opacity:.7;border-radius:50%}
.tank-row{display:flex;gap:14px;justify-content:space-around}
.tank-cell{text-align:center}
.tank-cell .pc{font-size:14px;font-weight:700;color:var(--teal);margin-top:6px}
.tank-cell .nm{font-size:10px;color:var(--muted)}

/* pills */
.pills{display:flex;flex-direction:column;gap:8px}
.pill{display:flex;align-items:center;justify-content:space-between;background:var(--soft);border:1px solid var(--line);
  border-radius:7px;padding:9px 12px;font-size:12px}
.pill .st{font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px}
.st.run{background:rgba(16,185,129,.14);color:var(--green)}
.st.stop{background:rgba(107,124,143,.14);color:var(--muted)}
.st.fault{background:rgba(239,68,68,.14);color:var(--red)}
.st.warn{background:rgba(245,158,11,.14);color:var(--amber)}
.spin{display:inline-block;width:14px;height:14px;border:2px solid var(--teal);border-top-color:transparent;
  border-radius:50%;animation:sp .9s linear infinite;margin-right:8px;vertical-align:-2px}
.spin.off{border-color:#c3cfd9;animation:none}
@keyframes sp{to{transform:rotate(360deg)}}

/* chart box */
.chart-box{position:relative;width:100%;height:160px}

/* table */
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;color:var(--muted);font-weight:600;font-size:10px;letter-spacing:1px;text-transform:uppercase;
  padding:8px 10px;border-bottom:1px solid var(--line)}
td{padding:9px 10px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
tr:hover td{background:var(--soft)}
.q-good{color:var(--green)} .q-bad{color:var(--red)} .q-unc{color:var(--amber)}
.mono{font-family:'SF Mono',Consolas,monospace;font-size:11px;color:var(--teal)}

/* stat blocks */
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.mini{background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:12px;text-align:center}
.mini b{display:block;font-size:22px;color:var(--txt);font-variant-numeric:tabular-nums}
.mini span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}

.led{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
.led.g{background:var(--green);box-shadow:0 0 6px var(--green)}
.led.r{background:var(--red);box-shadow:0 0 6px var(--red)}
.led.a{background:var(--amber);box-shadow:0 0 6px var(--amber)}

/* alarms */
.alarms{display:flex;flex-direction:column;gap:6px}
.alarm{display:flex;align-items:center;gap:10px;font-size:12px;padding:8px 10px;border-radius:6px;
  background:#fef2f2;border-left:3px solid var(--red)}
.alarm.warn{background:#fffbeb;border-left-color:var(--amber)}
.alarm .t{margin-left:auto;color:var(--muted);font-size:10px}

.flow{display:flex;align-items:center;justify-content:space-around;padding:10px 0;flex-wrap:wrap;gap:10px}
.node{text-align:center;font-size:10px;color:var(--muted)}
.node .box{width:64px;height:48px;border:1px solid var(--teal-dim);border-radius:8px;display:flex;
  align-items:center;justify-content:center;font-size:18px;color:var(--teal);background:#e9f6f4;margin-bottom:4px}
.arrow{color:var(--teal);font-size:20px;animation:flowp 1.5s infinite}
@keyframes flowp{50%{opacity:.3}}
.scrollbox{max-height:230px;overflow:auto}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:#cdd8e1;border-radius:4px}
::-webkit-scrollbar-track{background:transparent}

/* ---------- hamburger + drawer backdrop (hidden on desktop) ---------- */
.burger{display:none;flex-direction:column;justify-content:center;gap:4px;width:34px;height:34px;
  margin-right:12px;border:1px solid var(--line);border-radius:7px;background:#fff;cursor:pointer;padding:0 7px}
.burger span{display:block;height:2px;width:100%;background:var(--txt);border-radius:2px;transition:.25s}
.burger.open span:nth-child(1){transform:translateY(6px) rotate(45deg)}
.burger.open span:nth-child(2){opacity:0}
.burger.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.backdrop{display:none;position:fixed;inset:0;background:rgba(16,40,60,.45);z-index:40;opacity:0;
  transition:opacity .25s;pointer-events:none}

/* ================= TABLET ( ≤1024px ) ================= */
@media (max-width:1024px){
  body{overflow:auto}
  /* sidebar becomes off-canvas drawer */
  .app{grid-template-columns:1fr}
  .topbar{grid-column:1/2}
  .burger{display:flex}
  .side{position:fixed;top:0;left:0;bottom:0;width:240px;z-index:50;
    transform:translateX(-100%);transition:transform .28s ease;box-shadow:0 0 24px rgba(16,40,60,.18)}
  .side.open{transform:translateX(0)}
  .backdrop{display:block}
  .backdrop.show{opacity:1;pointer-events:auto}
  /* grids collapse to 2 columns; gauge banks to 3 */
  .grid{grid-template-columns:repeat(2,1fr)!important}
  .grid[style*="repeat(6"]{grid-template-columns:repeat(3,1fr)!important}
  .stat-row{grid-template-columns:repeat(2,1fr)!important}
}

/* ================= MOBILE ( ≤640px ) ================= */
@media (max-width:640px){
  .main{padding:12px}
  .topbar{padding:0 12px}
  .topbar h1{font-size:11px;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .topbar .right{gap:10px}
  .conn{display:none}            /* hide broker + date text, keep clock */
  .clock{font-size:12px}
  /* layout grids single column; gauge banks + mini stats stay 2-up */
  .grid{grid-template-columns:1fr!important}
  .grid[style*="repeat(6"],.stat-row{grid-template-columns:repeat(2,1fr)!important}
  .side{width:82vw;max-width:300px}
  .chart-box{height:150px!important}
  .scr-head{flex-direction:column;align-items:flex-start;gap:2px}
  /* wide tag table scrolls horizontally inside its box */
  .scrollbox{overflow:auto}
  table{min-width:560px}
}
```

Replace with:

```css
:root{
  --bg:#f3f5f8;
  --panel:#ffffff;
  --line:#e4e9ef;
  --teal:#0d9488;
  --teal-dim:#5eb8b0;
  --amber:#f59e0b;
  --red:#ef4444;
  --green:#10b981;
  --txt:#1f2d3d;
  --muted:#6b7c8f;
  --soft:#f7f9fb;
  --font:'Satoshi','Segoe UI',system-ui,Roboto,Arial,sans-serif;
  --shadow:0 1px 3px rgba(16,40,60,.06),0 1px 2px rgba(16,40,60,.04);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--txt);height:100vh;overflow:hidden}
#app{height:100vh}
.app{display:grid;grid-template-columns:230px 1fr;grid-template-rows:56px 1fr;height:100vh}

/* Top bar (claymorphism: soft dual-tone shadow instead of hard border) */
.topbar{grid-column:1/3;background:#fff;
  display:flex;align-items:center;justify-content:space-between;padding:0 18px;
  box-shadow:0 6px 16px rgba(16,40,60,.08),0 1px 0 rgba(255,255,255,.6) inset;
  position:relative;z-index:2}
.topbar h1{font-size:13px;letter-spacing:2px;font-weight:600;color:var(--txt);text-transform:uppercase}
.topbar .right{display:flex;align-items:center;gap:18px}
.clock{font-variant-numeric:tabular-nums;font-size:14px;color:var(--teal);font-weight:600}
.conn{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 1.6s infinite}
@keyframes pulse{50%{opacity:.4}}

/* Sidebar (claymorphism: soft dual-tone shadow instead of hard border) */
.side{background:#fff;display:flex;flex-direction:column;padding:14px 0;
  box-shadow:6px 0 16px rgba(16,40,60,.08)}
.logo{display:flex;align-items:center;justify-content:center;padding:14px 18px 20px;margin-bottom:10px}
.logo-img{width:120px;height:auto;display:block}
.nav{flex:1;overflow:auto;padding:0 10px}
.nav a{display:flex;align-items:center;gap:11px;padding:11px 16px;font-size:13px;color:var(--muted);
  cursor:pointer;border-radius:14px;text-decoration:none;transition:.15s;margin-bottom:4px}
.nav a:hover{background:var(--soft);color:var(--txt)}
.nav a.active{background:var(--panel);color:var(--teal);font-weight:600;
  box-shadow:4px 4px 10px rgba(16,40,60,.10),-4px -4px 10px rgba(255,255,255,.8),
    inset 1px 1px 2px rgba(255,255,255,.6)}
.nav a .ico{width:18px;text-align:center;font-size:14px}
.side .foot{padding:12px 18px;font-size:9px;color:#a9b8c4;letter-spacing:1px}

/* Main */
.main{overflow:auto;padding:18px;position:relative}
.fade-enter-active{transition:all .25s}
.fade-enter-from{opacity:0;transform:translateY(6px)}

::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:#cdd8e1;border-radius:4px}
::-webkit-scrollbar-track{background:transparent}

/* ---------- hamburger + drawer backdrop (hidden on desktop) ---------- */
.burger{display:none;flex-direction:column;justify-content:center;gap:4px;width:34px;height:34px;
  margin-right:12px;border-radius:12px;background:#fff;cursor:pointer;padding:0 7px;
  box-shadow:3px 3px 8px rgba(16,40,60,.10),-3px -3px 8px rgba(255,255,255,.8)}
.burger span{display:block;height:2px;width:100%;background:var(--txt);border-radius:2px;transition:.25s}
.burger.open span:nth-child(1){transform:translateY(6px) rotate(45deg)}
.burger.open span:nth-child(2){opacity:0}
.burger.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.backdrop{display:none;position:fixed;inset:0;background:rgba(16,40,60,.45);z-index:40;opacity:0;
  transition:opacity .25s;pointer-events:none}

/* ================= TABLET ( ≤1024px ) ================= */
@media (max-width:1024px){
  body{overflow:auto}
  /* sidebar becomes off-canvas drawer */
  .app{grid-template-columns:1fr}
  .topbar{grid-column:1/2}
  .burger{display:flex}
  .side{position:fixed;top:0;left:0;bottom:0;width:240px;z-index:50;
    transform:translateX(-100%);transition:transform .28s ease;box-shadow:0 0 24px rgba(16,40,60,.18)}
  .side.open{transform:translateX(0)}
  .backdrop{display:block}
  .backdrop.show{opacity:1;pointer-events:auto}
}

/* ================= MOBILE ( ≤640px ) ================= */
@media (max-width:640px){
  .main{padding:12px}
  .topbar{padding:0 12px}
  .topbar h1{font-size:11px;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .topbar .right{gap:10px}
  .conn{display:none}            /* hide broker + date text, keep clock */
  .clock{font-size:12px}
  .side{width:82vw;max-width:300px}
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`

Expected: succeeds with no errors.

- [ ] **Step 3: Manually verify in browser**

Run: `npm run dev`, open `http://localhost:5173`, log in.

Expected: sidebar shows only "SCADA Builder" (active), Olectr logo above it (~120px wide, centered). Topbar reads "SCADA Builder". Topbar/sidebar/nav-item/burger show soft puffy shadows instead of flat 1px borders. SCADA Builder tool itself renders and functions identically to before. Narrow the viewport to ≤1024px and confirm the hamburger button still opens/closes the sidebar drawer.

- [ ] **Step 4: Commit**

```bash
git add src/style.css
git commit -m "feat: apply claymorphism to app shell, remove dead CSS from deleted views"
```
