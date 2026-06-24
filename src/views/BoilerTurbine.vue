<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import GaugeCard from '../components/GaugeCard.vue'
import BarCard from '../components/BarCard.vue'
import TrendChart from '../components/TrendChart.vue'
import PillList from '../components/PillList.vue'

const b = computed(() => state.boiler)
const trend = computed(() => [
  { label: 'Pressure bar', color: '#0d9488', data: b.value.prsA },
  { label: 'Main Steam °C', color: '#ef4444', data: b.value.tmpA },
])
const interlocks = [
  { name: 'Flame Detector', led: 'g', cls: 'run', st: 'HEALTHY' },
  { name: 'Drum Level Trip', led: 'g', cls: 'run', st: 'NORMAL' },
  { name: 'Overspeed', led: 'g', cls: 'run', st: 'ARMED' },
  { name: 'Vibration High', led: 'a', cls: 'warn', st: 'ALERT' },
]
</script>

<template>
  <div>
    <div class="scr-head"><h2>Boiler &amp; Turbine HMI</h2><span class="sub">Thermal cycle control</span></div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr)">
      <GaugeCard :value="b.bDrum" :max="100" unit="%" name="DRUM LEVEL %" />
      <GaugeCard :value="b.bPrs" :max="200" unit="bar" name="STEAM PRESS bar" />
      <GaugeCard :value="b.bRpm" :max="36" unit="rpm" :decimals="1" name="TURBINE RPM ×100" />
    </div>
    <div class="grid" style="grid-template-columns:1.3fr 1fr;margin-top:14px">
      <div class="card"><h3>Temperature Profile °C</h3>
        <BarCard :labels="['FUR','SH','RH','FW','EXH']" :data="b.temps" color="#f59e0b" style="height:175px" />
      </div>
      <div class="card"><h3>Key Readings</h3>
        <div class="stat-row" style="grid-template-columns:1fr 1fr">
          <div class="mini"><b>{{ b.steam.toFixed(0) }}</b><span>Steam Flow t/h</span></div>
          <div class="mini"><b>{{ b.fuel.toFixed(0) }}</b><span>Fuel kg/h</span></div>
          <div class="mini"><b>{{ b.o2.toFixed(1) }}</b><span>Flue O₂ %</span></div>
          <div class="mini"><b>{{ b.eff.toFixed(0) }}</b><span>Efficiency %</span></div>
          <div class="mini"><b>{{ b.vib.toFixed(1) }}</b><span>Vibration mm/s</span></div>
          <div class="mini"><b>{{ b.brg.toFixed(0) }}°</b><span>Bearing °C</span></div>
        </div>
      </div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Steam Pressure &amp; Temp Trend <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:150px" /></div>
      <div class="card"><h3>Interlocks</h3><PillList :items="interlocks" /></div>
    </div>
  </div>
</template>
