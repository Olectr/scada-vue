<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import GaugeCard from '../components/GaugeCard.vue'
import BarCard from '../components/BarCard.vue'
import TrendChart from '../components/TrendChart.vue'
import PillList from '../components/PillList.vue'

const h = computed(() => state.hvac)
const trend = computed(() => [
  { label: 'Supply Air °C', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: h.value.supA },
])
const equip = [
  { name: 'AHU-1 Supply Fan', spin: true, on: true, cls: 'run', st: 'RUNNING' },
  { name: 'AHU-2 Supply Fan', spin: true, on: true, cls: 'run', st: 'RUNNING' },
  { name: 'Chiller CH-1', led: 'g', cls: 'run', st: 'COOLING' },
  { name: 'Chiller CH-2', led: 'a', cls: 'warn', st: 'STANDBY' },
  { name: 'Exhaust Fan EF-3', spin: true, on: false, cls: 'stop', st: 'OFF' },
]
</script>

<template>
  <div>
    <div class="scr-head"><h2>HVAC / Building Management</h2><span class="sub">Air handling · zone climate</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Supply Air" :value="h.sup.toFixed(1)" unit="°C" delta="setpoint 14 °C" delta-class="accent" :bar="62" />
      <KpiCard label="Return Air" :value="h.ret.toFixed(1)" unit="°C" delta="▲ stable" delta-class="up" :bar="74" />
      <KpiCard label="CO₂ Level" :value="Math.round(h.co2)" unit="ppm" delta="indoor air" delta-class="accent" :bar="58" />
      <KpiCard label="Humidity" :value="h.rh.toFixed(0)" unit="%" delta="target 45%" delta-class="up" :bar="48" />
    </div>
    <div class="grid" style="grid-template-columns:1.3fr 1fr 1fr;margin-top:14px">
      <div class="card"><h3>Zone Temperatures °C</h3>
        <BarCard :labels="['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']" :data="h.zones" color="#0d9488" style="height:175px" />
      </div>
      <GaugeCard :value="h.chL" :max="100" unit="%" name="CHILLER LOAD %" />
      <div class="card"><h3>Equipment</h3><PillList :items="equip" /></div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Supply Air Temp Trend <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:150px" /></div>
      <div class="card"><h3>Setpoints</h3>
        <div class="pills">
          <div class="pill">Zone Setpoint <b class="accent">{{ h.setp }} °C</b></div>
          <div class="pill">Supply Fan <b class="accent">{{ h.fanHz.toFixed(0) }} Hz</b></div>
          <div class="pill">Chiller Load <b class="accent">{{ h.chL.toFixed(0) }} %</b></div>
          <div class="pill">RH Target <b class="accent">45 %</b></div>
        </div>
      </div>
    </div>
  </div>
</template>
