<script setup>
import { ref, computed } from 'vue'
import { usePlantData } from './composables/usePlantData'
import KpiOverview from './views/KpiOverview.vue'
import WaterTreatment from './views/WaterTreatment.vue'
import SolarPlant from './views/SolarPlant.vue'
import PowerDistribution from './views/PowerDistribution.vue'
import BoilerTurbine from './views/BoilerTurbine.vue'
import ManufacturingLine from './views/ManufacturingLine.vue'
import TagMonitor from './views/TagMonitor.vue'
import HvacBms from './views/HvacBms.vue'
import CompressedAir from './views/CompressedAir.vue'
import WindPower from './views/WindPower.vue'
import TankFarm from './views/TankFarm.vue'

const { state } = usePlantData()

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
