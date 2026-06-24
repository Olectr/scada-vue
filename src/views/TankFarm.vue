<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import TrendChart from '../components/TrendChart.vue'
import DoughnutCard from '../components/DoughnutCard.vue'
import PillList from '../components/PillList.vue'
import TankCard from '../components/TankCard.vue'

const f = computed(() => state.farm)
const split = computed(() => [f.value.tanks.k1, f.value.tanks.k2, f.value.tanks.k3, f.value.tanks.k4])
const trend = computed(() => [
  { label: 'Inventory m³', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: f.value.invA },
])
const pumps = [
  { name: 'Transfer Pump TP-1', spin: true, on: true, cls: 'run', st: 'RUNNING' },
  { name: 'Transfer Pump TP-2', spin: true, on: false, cls: 'stop', st: 'IDLE' },
  { name: 'Loading Arm LA-1', led: 'g', cls: 'run', st: 'OPEN' },
  { name: 'Vapor Recovery VRU', led: 'g', cls: 'run', st: 'ON' },
  { name: 'Tank K-103 Hi-Lvl', led: 'a', cls: 'warn', st: 'ALERT' },
]

const META = [
  { key: 'k1', name: 'Central Storage Tank A', sub: 'Main Distribution Center', vtitle: 'Tank Level Visualization', cap: 500000, insp: '15-04-2024' },
  { key: 'k2', name: 'Backup Storage Tank A', sub: 'Secondary Distribution Node', vtitle: 'Tank Level Monitoring', cap: 300000, insp: '10-04-2024' },
  { key: 'k3', name: 'Emergency Storage Tank C', sub: 'Emergency Distribution Hub', vtitle: 'Tank Level Alerts', cap: 250000, insp: '12-04-2024' },
  { key: 'k4', name: 'Overflow Storage Tank D', sub: 'Overflow Management System', vtitle: 'Tank Level Emergency Protocol', cap: 120000, insp: '18-04-2024' },
]
const statusOf = lv => (lv < 25 || lv > 92) ? 'critical' : (lv < 40 || lv > 82) ? 'warning' : 'normal'
const cards = computed(() => META.map((m, i) => {
  const lv = f.value.tanks[m.key], c = f.value.cells[i]
  return {
    id: m.key, name: m.name, sub: m.sub, vtitle: m.vtitle, status: statusOf(lv), level: lv,
    volume: Math.round(lv / 100 * m.cap).toLocaleString(), capacity: m.cap.toLocaleString(),
    temp: Math.round(c.t), prs: Math.round(c.p), fill: Math.round(c.fr), drain: Math.round(c.dr),
    inspection: m.insp,
  }
}))
</script>

<template>
  <div>
    <div class="scr-head"><h2>Tank Farm / Storage</h2><span class="sub">Bulk inventory · transfers</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Total Inventory" :value="f.inv.toLocaleString()" unit="m³" delta="across 4 tanks" delta-class="accent" :bar="68" />
      <KpiCard label="Avg Temp" :value="f.temp.toFixed(1)" unit="°C" delta="ambient" delta-class="up" :bar="55" />
      <KpiCard label="Vapor Pressure" :value="f.vap.toFixed(1)" unit="kPa" delta="within limit" delta-class="up" :bar="40" />
      <KpiCard label="Active Tanks" value="4 / 4" value-class="accent" delta="all in service" delta-class="up" :bar="100" />
    </div>

    <div class="tanks-panel">
      <div class="tp-head">
        <h2>Storage Tanks</h2>
        <button class="tp-sched">🛡️ Schedule Maintenance</button>
      </div>
      <div class="tanks-grid">
        <TankCard v-for="c in cards" :key="c.id" v-bind="c" />
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
      <div class="card"><h3>Inventory Split</h3>
        <DoughnutCard :labels="['Crude', 'Diesel', 'Gasoline', 'Naphtha']" :data="split"
          :colors="['#0d9488', '#f59e0b', '#10b981', '#38bdf8']" style="height:175px" />
      </div>
      <div class="card"><h3>Pumps &amp; Valves</h3><PillList :items="pumps" /></div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-top:14px">
      <div class="card"><h3>Total Inventory Trend <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:150px" /></div>
      <div class="card"><h3>Tank Details</h3>
        <div class="pills">
          <div class="pill">Largest Tank <b class="accent">K-103 {{ Math.round(f.tanks.k3) }}%</b></div>
          <div class="pill">Avg Temp <b class="accent">{{ f.temp.toFixed(1) }} °C</b></div>
          <div class="pill">Vapor Pressure <b class="accent">{{ f.vap.toFixed(1) }} kPa</b></div>
          <div class="pill">Transfer Status <b class="accent">TP-1 Active</b></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tanks-panel { background: #fff; border: 1px solid #eef2f7; border-radius: 16px; padding: 20px;
  margin-top: 14px; box-shadow: 0 1px 3px rgba(16,40,60,.05); }
.tp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tp-head h2 { font-size: 18px; font-weight: 700; color: #1e293b; }
.tp-sched { font-size: 13px; font-weight: 500; color: #2563eb; background: #eff4ff;
  border: 1px solid #dbeafe; border-radius: 9px; padding: 9px 15px; cursor: pointer; transition: .15s; }
.tp-sched:hover { background: #dbeafe; }
.tanks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .tanks-grid { grid-template-columns: 1fr; } }
</style>
