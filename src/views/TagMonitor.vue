<script setup>
import { computed } from 'vue'
import { state } from '../composables/usePlantData'
import KpiCard from '../components/KpiCard.vue'
import TrendChart from '../components/TrendChart.vue'
import DoughnutCard from '../components/DoughnutCard.vue'

const t = computed(() => state.tags)
const trend = computed(() => [
  { label: 'Msgs/sec', color: '#0d9488', fill: 'rgba(13,148,136,.10)', data: t.value.mpsA },
])
function qClass(q) { return q === 'GOOD' ? 'q-good' : q === 'UNCERT' ? 'q-unc' : 'q-bad' }
function fmtVal(row) { return row.unit === 'bool' ? (row.val ? 1 : 0) : row.val.toFixed(1) }
</script>

<template>
  <div>
    <div class="scr-head"><h2>MQTT / OPC UA Tag Monitor</h2><span class="sub">Live tag table · quality codes</span></div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      <KpiCard label="Total Tags" :value="t.total" delta="subscribed" delta-class="accent" />
      <KpiCard label="Good Quality" :value="t.good" value-class="up" delta="healthy" />
      <KpiCard label="Msgs / sec" :value="t.mps" delta="throughput" delta-class="accent" />
      <KpiCard label="Avg Latency" :value="t.lat" unit="ms" delta="low" delta-class="up" />
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
      <div class="card"><h3>Message Throughput <span class="tag">LIVE</span></h3><TrendChart :series="trend" style="height:140px" /></div>
      <div class="card"><h3>Quality Distribution</h3>
        <DoughnutCard :labels="['Good','Uncertain','Bad']" :data="t.qual" :colors="['#10b981','#f59e0b','#ef4444']" style="height:140px" />
      </div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Live Tags <span class="tag">MQTT / OPC UA</span></h3>
      <div class="scrollbox" style="max-height:none">
        <table>
          <thead><tr><th>Tag / Topic</th><th>Source</th><th>Value</th><th>Unit</th><th>Quality</th><th>Updated</th></tr></thead>
          <tbody>
            <tr v-for="row in t.rows" :key="row.topic">
              <td class="mono">{{ row.topic }}</td>
              <td>{{ row.src }}</td>
              <td><b>{{ fmtVal(row) }}</b></td>
              <td>{{ row.unit }}</td>
              <td :class="qClass(row.q)">● {{ row.q }}</td>
              <td style="color:var(--muted)">{{ row.ts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
