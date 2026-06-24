<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import GaugeCard from '../components/GaugeCard.vue'
import TrendChart from '../components/TrendChart.vue'
import PillList from '../components/PillList.vue'

const m = computed(() => state.mfg)
const trend = computed(() => [
  { label: 'Actual', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: m.value.act },
  { label: 'Target', color: '#f59e0b', data: m.value.tgt },
])
const stations = [
  { name: 'ST1 Assembly', led: 'g', cls: 'run', st: 'RUN' },
  { name: 'ST2 Weld', led: 'g', cls: 'run', st: 'RUN' },
  { name: 'ST3 Inspect', led: 'a', cls: 'stop', st: 'SLOW' },
  { name: 'ST4 Paint', led: 'g', cls: 'run', st: 'RUN' },
  { name: 'ST5 Pack', led: 'r', cls: 'fault', st: 'FAULT' },
]
</script>

<template>
  <div>
    <div class="scr-head"><h2>Manufacturing Line</h2><span class="sub">OEE · production monitor</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="OEE" :value="m.oee.toFixed(0)" unit="%" value-class="accent" delta="target 85%" delta-class="up" :bar="82" />
      <KpiCard label="Throughput" :value="m.rate.toFixed(0)" unit="u/min" delta="▲ on plan" delta-class="up" />
      <KpiCard label="Good Parts" :value="m.good.toLocaleString()" value-class="up" delta="shift total" />
      <KpiCard label="Reject Rate" :value="m.rej.toFixed(1)" unit="%" value-class="down" delta="scrap" delta-class="down" />
    </div>
    <div class="grid" style="grid-template-columns:repeat(6,1fr);margin-top:14px">
      <GaugeCard v-for="(v, i) in m.lines" :key="i" :value="v" :name="'LINE ' + (i + 1)" />
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Target vs Actual <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:170px" /></div>
      <div class="card"><h3>Station Status</h3><PillList :items="stations" /></div>
    </div>
  </div>
</template>
