<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import BarCard from '../components/BarCard.vue'
import TrendChart from '../components/TrendChart.vue'

const s = computed(() => state.solar)
const trend = computed(() => [
  { label: 'AC Power kW', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: s.value.pA },
  { label: 'Irradiance W/m²', color: '#f59e0b', data: s.value.iA },
])
</script>

<template>
  <div>
    <div class="scr-head"><h2>Solar Power Plant</h2><span class="sub">PV array · inverter monitor</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Current Output" :value="Math.round(s.pac)" unit="kW" value-class="accent" delta="peak 4.8 MW" delta-class="up" />
      <KpiCard label="Irradiance" :value="Math.round(s.irr)" unit="W/m²" delta="clear sky" />
      <KpiCard label="Today Yield" :value="s.yld.toFixed(1)" unit="MWh" delta="▲ 5%" delta-class="up" />
      <KpiCard label="Perf Ratio" :value="s.pr.toFixed(0)" unit="%" delta="healthy" delta-class="up" />
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Generation vs Irradiance <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:200px" /></div>
      <div class="card"><h3>Inverter Status</h3>
        <div class="scrollbox">
          <table>
            <thead><tr><th>Inverter</th><th>kW</th><th>State</th></tr></thead>
            <tbody>
              <tr v-for="inv in s.inverters" :key="inv.n">
                <td>{{ inv.n }}</td><td>{{ inv.p.toFixed(0) }}</td>
                <td><span :class="inv.s === 'RUN' ? 'q-good' : 'q-unc'">● {{ inv.s }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-top:14px">
      <div class="card"><h3>String Current A</h3>
        <BarCard :labels="['S1','S2','S3','S4','S5','S6']" :data="s.strings" color="#f59e0b" style="height:150px" />
      </div>
      <div class="card"><h3>Module Temp</h3>
        <div class="stat-row" style="grid-template-columns:1fr 1fr">
          <div class="mini"><b>{{ s.tmod.toFixed(0) }}°</b><span>Module °C</span></div>
          <div class="mini"><b>{{ s.tamb.toFixed(0) }}°</b><span>Ambient °C</span></div>
          <div class="mini"><b>{{ s.wind.toFixed(1) }}</b><span>Wind m/s</span></div>
          <div class="mini"><b>{{ Math.round(s.dc) }}</b><span>DC Voltage</span></div>
        </div>
      </div>
      <div class="card"><h3>Grid Export</h3>
        <div class="stat-row" style="grid-template-columns:1fr 1fr">
          <div class="mini"><b>{{ Math.round(s.grid) }}</b><span>Export kW</span></div>
          <div class="mini"><b>{{ s.freq.toFixed(2) }}</b><span>Freq Hz</span></div>
          <div class="mini"><b>{{ s.pf.toFixed(2) }}</b><span>Power Factor</span></div>
          <div class="mini"><b>{{ s.co2.toFixed(1) }}</b><span>CO₂ t saved</span></div>
        </div>
      </div>
      <div class="card"><h3>Array Health</h3>
        <div class="pills">
          <div class="pill"><span><span class="led g"></span>Zone A</span><span class="st run">ONLINE</span></div>
          <div class="pill"><span><span class="led g"></span>Zone B</span><span class="st run">ONLINE</span></div>
          <div class="pill"><span><span class="led a"></span>Zone C</span><span class="st warn">DERATE</span></div>
          <div class="pill"><span><span class="led g"></span>Zone D</span><span class="st run">ONLINE</span></div>
        </div>
      </div>
    </div>
  </div>
</template>
