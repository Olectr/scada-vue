<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import TrendChart from '../components/TrendChart.vue'
import PillList from '../components/PillList.vue'

const a = computed(() => state.air)
const prsTrend = computed(() => [
  { label: 'Header bar', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: a.value.prsA },
])
const flowTrend = computed(() => [
  { label: 'Flow Nm³/min', color: '#f59e0b', data: a.value.flowA },
])
const comps = [
  { name: 'Compressor C-1', spin: true, on: true, cls: 'run', st: 'LOADED' },
  { name: 'Compressor C-2', spin: true, on: true, cls: 'run', st: 'LOADED' },
  { name: 'Compressor C-3', spin: true, on: false, cls: 'stop', st: 'UNLOAD' },
  { name: 'Refrig. Dryer D-1', led: 'g', cls: 'run', st: 'ACTIVE' },
  { name: 'Auto Drain Trap', led: 'g', cls: 'run', st: 'AUTO' },
]
</script>

<template>
  <div>
    <div class="scr-head"><h2>Compressed Air System</h2><span class="sub">Utilities · header &amp; energy</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Header Pressure" :value="a.prs.toFixed(1)" unit="bar" delta="setpoint 7.0" delta-class="accent" :bar="72" />
      <KpiCard label="Air Flow" :value="a.flow.toFixed(0)" unit="Nm³/min" delta="▲ demand" delta-class="up" :bar="64" />
      <KpiCard label="Power Draw" :value="a.kw.toFixed(0)" unit="kW" delta="energy" delta-class="accent" :bar="70" />
      <KpiCard label="Leakage" :value="a.leak.toFixed(0)" unit="%" value-class="down" delta="audit due" delta-class="down" :bar="30" bar-color="var(--red)" />
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Header Pressure Trend <span class="tag">LIVE</span></h3><TrendChart :series="prsTrend" style="height:150px" /></div>
      <div class="card"><h3>Compressors</h3><PillList :items="comps" /></div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Air Flow Trend <span class="tag">LIVE</span></h3><TrendChart :series="flowTrend" style="height:140px" /></div>
      <div class="card"><h3>System Status</h3>
        <div class="pills">
          <div class="pill">Dew Point <b class="accent">{{ a.dp.toFixed(1) }} °C</b></div>
          <div class="pill">System Load <b class="accent">{{ a.load.toFixed(0) }} %</b></div>
          <div class="pill">Specific Power <b class="accent">{{ (a.kw / a.flow).toFixed(2) }} kW/Nm³</b></div>
          <div class="pill">Receiver <b class="accent">{{ a.prs.toFixed(1) }} bar</b></div>
        </div>
      </div>
    </div>
  </div>
</template>
