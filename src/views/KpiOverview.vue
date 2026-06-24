<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import RingStat from '../components/RingStat.vue'
import TrendChart from '../components/TrendChart.vue'
import BarCard from '../components/BarCard.vue'
import DoughnutCard from '../components/DoughnutCard.vue'
import RadarCard from '../components/RadarCard.vue'
import PeakChart from '../components/PeakChart.vue'
import ComboChart from '../components/ComboChart.vue'
import DualBar from '../components/DualBar.vue'

const k = computed(() => state.kpi)
const NEON = { teal: '#14b8a6', purple: '#a855f7', blue: '#3b82f6', green: '#22c55e', pink: '#ec4899', cyan: '#06b6d4' }

const kpis = [
  { name: 'KPI Sales', plan: '4,200', val: '1,435', pct: 34, color: NEON.teal },
  { name: 'KPI New Clients', plan: '3,200', val: '1,148', pct: 36, color: NEON.purple },
  { name: 'KPI Costs', plan: '1,850', val: '614', pct: 33, color: NEON.blue },
  { name: 'KPI Average Check', plan: '4,000', val: '1,300', pct: 33, color: NEON.cyan },
]
const influx = computed(() => [
  { label: 'New Clients', color: NEON.purple, fill: 'rgba(168,85,247,.12)', data: k.value.gen },
  { label: 'Returning', color: NEON.teal, data: k.value.dem },
])
const avgCheck = computed(() => [
  { label: 'Average Check', color: NEON.teal, fill: 'rgba(20,184,166,.15)', data: k.value.dem },
])
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const sales = [220, 260, 300, 280, 320, 400, 420, 360, 390, 300, 280, 320]
const costs = [120, 150, 170, 160, 180, 210, 200, 190, 205, 160, 150, 170]
const depts = { labels: ['Eastern District', 'Northern District', 'Southern District', 'Western District'], data: [1180, 980, 860, 790], colors: [NEON.teal, NEON.purple, NEON.blue, NEON.green] }
const cats = { labels: ['Bathroom', 'Bedroom', 'Kitchen', 'Living', 'Garden', 'Decor'], data: [80, 65, 90, 70, 55, 75] }
const top5 = { labels: ['Product 3', 'Product 7', 'Product 1', 'Product 5', 'Product 2'], data: [5407, 4630, 3481, 2675, 2446] }
const peaks = { years: ['2022', '2023', '2024', '2025'], values: [2400, 2900, 3300, 3810], colors: [NEON.teal, NEON.purple, NEON.blue, NEON.green] }
const remains = { labels: ['Kitchen', 'Bathroom', 'Decor', 'Living', 'Garden'], a: [1573, 1535, 1303, 1606, 752], b: [1151, 896, 1402, 1593, 1393] }
</script>

<template>
  <div>
    <div class="scr-head"><h2>Sales Analytics</h2><span class="sub">Performance dashboard</span></div>

    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <div v-for="c in kpis" :key="c.name" class="card kpibox">
        <div class="kpibox-top">
          <div>
            <div class="kpibox-name">{{ c.name }}</div>
            <div class="kpibox-plan"><b>{{ c.plan }}</b> Plan</div>
          </div>
          <div class="kpibox-ring"><RingStat :value="c.pct" :color="c.color" :height="58" thickness="70%" /></div>
        </div>
        <div class="kpibox-val">{{ c.val }}</div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:2fr 1fr 1fr;margin-top:14px">
      <div class="card"><h3>Influx of New Clients <span class="hnum">1,148 · 3,810</span></h3>
        <TrendChart :series="influx" style="height:200px" />
      </div>
      <div class="card"><h3>Regular Clients</h3>
        <RingStat :value="55" :color="NEON.green" center="55%" big :height="200" thickness="80%" />
      </div>
      <div class="card"><h3>Total Sales <span class="hnum">3,810</span></h3>
        <PeakChart v-bind="peaks" style="height:200px" />
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 2fr 1fr;margin-top:14px">
      <div class="card"><h3>Departments</h3>
        <DoughnutCard :labels="depts.labels" :data="depts.data" :colors="depts.colors" style="height:210px" />
      </div>
      <div class="card"><h3>Sales <span class="hnum">1,435</span> · Costs <span class="hnum pink">614</span></h3>
        <ComboChart :labels="months" :sales="sales" :costs="costs" style="height:210px" />
      </div>
      <div class="card"><h3>Product Categories</h3>
        <RadarCard :labels="cats.labels" :data="cats.data" :color="NEON.teal" style="height:210px" />
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 2fr 1fr;margin-top:14px">
      <div class="card"><h3>Top-5 Products</h3>
        <BarCard :labels="top5.labels" :data="top5.data" :color="NEON.teal" horizontal style="height:200px" />
      </div>
      <div class="card"><h3>Average Check <span class="hnum">1,300</span></h3>
        <TrendChart :series="avgCheck" style="height:200px" />
      </div>
      <div class="card"><h3>Remains &amp; Sales</h3>
        <DualBar :labels="remains.labels" :a="remains.a" :b="remains.b"
          :color-a="NEON.teal" :color-b="NEON.purple" label-a="Remains" label-b="Sales" style="height:200px" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpibox { display: flex; flex-direction: column; gap: 8px; }
.kpibox-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.kpibox-name { font-size: 12px; color: #94a3b8; font-weight: 600; }
.kpibox-plan { font-size: 13px; color: #64748b; margin-top: 5px; }
.kpibox-plan b { font-size: 19px; color: #1e293b; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpibox-ring { width: 58px; flex-shrink: 0; }
.kpibox-val { font-size: 30px; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
.hnum { font-size: 13px; color: #14b8a6; font-weight: 700; }
.hnum.pink { color: #ec4899; }
</style>
