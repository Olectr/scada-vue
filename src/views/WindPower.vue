<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import GaugeCard from '../components/GaugeCard.vue'
import TrendChart from '../components/TrendChart.vue'

const w = computed(() => state.wind)
const trend = computed(() => [
  { label: 'Farm Output MW', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: w.value.pwrA },
  { label: 'Wind m/s', color: '#f59e0b', data: w.value.wsA },
])
</script>

<template>
  <div>
    <div class="scr-head"><h2>Wind Power Plant</h2><span class="sub">Turbine farm · 6 × WTG</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Farm Output" :value="w.pwr.toFixed(1)" unit="MW" delta="▲ generating" delta-class="up" :bar="72" />
      <KpiCard label="Wind Speed" :value="w.ws.toFixed(1)" unit="m/s" :delta="'gust ' + w.gust.toFixed(1)" delta-class="accent" :bar="60" />
      <KpiCard label="Capacity Factor" :value="w.cf.toFixed(0)" unit="%" delta="rolling" delta-class="accent" :bar="Math.round(w.cf)" />
      <KpiCard label="Availability" :value="w.avail.toFixed(1)" unit="%" value-class="up" delta="fleet" delta-class="up" :bar="Math.round(w.avail)" />
    </div>
    <div class="grid" style="grid-template-columns:repeat(6,1fr);margin-top:14px">
      <GaugeCard v-for="(v, i) in w.turbs" :key="i" :value="v" :max="100" unit="%" :name="'WTG ' + (i + 1)" />
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Output vs Wind Trend <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:160px" /></div>
      <div class="card"><h3>Met Mast</h3>
        <div class="pills">
          <div class="pill">Wind Direction <b class="accent">{{ Math.round(w.dir) }}°</b></div>
          <div class="pill">Gust Speed <b class="accent">{{ w.gust.toFixed(1) }} m/s</b></div>
          <div class="pill">Capacity Factor <b class="accent">{{ w.cf.toFixed(0) }} %</b></div>
          <div class="pill">Turbines Online <b class="accent">{{ w.turbs.filter(t => t > 45).length }} / 6</b></div>
        </div>
      </div>
    </div>
  </div>
</template>
