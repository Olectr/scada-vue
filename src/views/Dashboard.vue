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
