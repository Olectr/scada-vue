<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import BarCard from '../components/BarCard.vue'
import TrendChart from '../components/TrendChart.vue'
import PillList from '../components/PillList.vue'

const p = computed(() => state.power)
const trend = computed(() => [
  { label: 'L1', color: '#0d9488', data: p.value.L1 },
  { label: 'L2', color: '#f59e0b', data: p.value.L2 },
  { label: 'L3', color: '#10b981', data: p.value.L3 },
])
const breakers = [
  { name: 'CB-Main 11kV', led: 'g', cls: 'run', st: 'CLOSED' },
  { name: 'CB-Bus Tie', led: 'g', cls: 'run', st: 'CLOSED' },
  { name: 'CB-Feeder 6', led: 'a', cls: 'stop', st: 'OPEN' },
  { name: 'CB-Backup Gen', led: 'g', cls: 'run', st: 'STANDBY' },
]
</script>

<template>
  <div>
    <div class="scr-head"><h2>Power Distribution</h2><span class="sub">Feeders · breakers · busbar</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Bus Voltage" :value="p.v.toFixed(1)" unit="kV" value-class="accent" delta="nominal" delta-class="up" />
      <KpiCard label="Total Load" :value="p.load.toFixed(1)" unit="MW" delta="6 feeders" />
      <KpiCard label="Frequency" :value="p.freq.toFixed(2)" unit="Hz" delta="stable" delta-class="up" />
      <KpiCard label="Power Factor" :value="p.pf.toFixed(2)" delta="good" delta-class="up" />
    </div>
    <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-top:14px">
      <div class="card"><h3>Feeder Load MW</h3>
        <BarCard :labels="['F1','F2','F3','F4','F5','F6']" :data="p.feeders" color="#0d9488" horizontal style="height:200px" />
      </div>
      <div class="card"><h3>3-Phase Loading <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:200px" /></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:14px">
      <div class="card"><h3>Breakers</h3><PillList :items="breakers" /></div>
      <div class="card"><h3>Transformer</h3>
        <div class="stat-row" style="grid-template-columns:1fr 1fr">
          <div class="mini"><b>{{ p.txt.toFixed(0) }}°</b><span>Oil Temp °C</span></div>
          <div class="mini"><b>{{ p.txl.toFixed(0) }}%</b><span>Loading</span></div>
          <div class="mini"><b>{{ p.txtap }}</b><span>Tap Pos</span></div>
          <div class="mini"><b>{{ p.thd.toFixed(1) }}%</b><span>THD</span></div>
        </div>
      </div>
      <div class="card"><h3>Energy Today</h3>
        <div class="stat-row" style="grid-template-columns:1fr 1fr">
          <div class="mini"><b>{{ p.imp.toFixed(0) }}</b><span>Import MWh</span></div>
          <div class="mini"><b>{{ p.exp.toFixed(0) }}</b><span>Export MWh</span></div>
          <div class="mini"><b>{{ p.peak }}</b><span>Peak MW</span></div>
          <div class="mini"><b>{{ p.react.toFixed(1) }}</b><span>MVAr</span></div>
        </div>
      </div>
    </div>
  </div>
</template>
