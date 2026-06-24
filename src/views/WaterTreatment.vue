<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import JointWaterScada from '../components/JointWaterScada.vue'
import BarCard from '../components/BarCard.vue'
import TrendChart from '../components/TrendChart.vue'
import PillList from '../components/PillList.vue'

const w = computed(() => state.water)
const tanks = [['t1', 'RAW'], ['t2', 'CLARIFIER'], ['t3', 'CLEAN']]
const quality = computed(() => [w.value.ph, w.value.turb, w.value.cl, w.value.do])
const trend = computed(() => [
  { label: 'Inflow', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: w.value.inA },
  { label: 'Outflow', color: '#f59e0b', data: w.value.outA },
])
const pumps = [
  { name: 'Intake Pump P-101', spin: true, on: true, cls: 'run', st: 'RUNNING' },
  { name: 'Dosing Pump P-102', spin: true, on: true, cls: 'run', st: 'RUNNING' },
  { name: 'Backwash Pump P-103', spin: true, on: false, cls: 'stop', st: 'STOPPED' },
  { name: 'Distribution P-104', spin: true, on: true, cls: 'run', st: 'RUNNING' },
  { name: 'Inlet Valve V-201', led: 'g', cls: 'run', st: 'OPEN 78%' },
]
</script>

<template>
  <div>
    <div class="scr-head"><h2>Water Treatment Plant</h2><span class="sub">Process · P&amp;ID monitor</span></div>

    <div class="card" style="margin-bottom:14px;padding:0;overflow:hidden"><h3 style="margin:0;padding:10px 12px">Process Diagram <span class="tag">DRAG · CLICK PUMP TO OPERATE</span></h3>
      <JointWaterScada />
    </div>

    <div class="grid" style="grid-template-columns:1.3fr 1fr 1fr">
      <div class="card"><h3>Tank Levels</h3>
        <div class="tank-row">
          <div v-for="[id, nm] in tanks" :key="id" class="tank-cell">
            <div class="tank"><div class="liq" :style="{ height: w.tanks[id] + '%' }"></div></div>
            <div class="pc">{{ Math.round(w.tanks[id]) }}%</div><div class="nm">{{ nm }}</div>
          </div>
        </div>
      </div>
      <div class="card"><h3>Pumps &amp; Valves</h3><PillList :items="pumps" /></div>
      <div class="card"><h3>Water Quality</h3>
        <BarCard :labels="['pH', 'Turb', 'Cl', 'DO']" :data="quality" :color="['#0d9488', '#f59e0b', '#10b981', '#38bdf8']" style="height:175px" />
      </div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Flow Trend <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:150px" /></div>
      <div class="card"><h3>Flow &amp; Pressure</h3>
        <div class="pills">
          <div class="pill">Inlet Flow <b class="accent">{{ Math.round(w.in) }} m³/h</b></div>
          <div class="pill">Outlet Flow <b class="accent">{{ Math.round(w.out) }} m³/h</b></div>
          <div class="pill">Header Pressure <b class="accent">{{ w.prs.toFixed(1) }} bar</b></div>
          <div class="pill">Backwash Cycle <b class="accent">{{ w.bw }}</b></div>
        </div>
      </div>
    </div>
  </div>
</template>
