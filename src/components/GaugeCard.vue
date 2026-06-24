<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { clamp } from '../composables/usePlantData'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '%' },
  name: String,
  decimals: { type: Number, default: 0 },
})

const COL = { teal: '#0d9488', amber: '#f59e0b', red: '#ef4444', grid: '#eef2f6' }
const color = computed(() => {
  const pct = clamp(props.value / props.max, 0, 1)
  return pct > 0.85 ? COL.red : pct > 0.7 ? COL.amber : COL.teal
})

const chartData = computed(() => ({
  datasets: [{
    data: [props.value, Math.max(0, props.max - props.value)],
    backgroundColor: [color.value, COL.grid],
    borderWidth: 0,
  }],
}))
const chartOptions = {
  cutout: '78%', responsive: true, maintainAspectRatio: false,
  animation: { duration: 250 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
}
</script>

<template>
  <div class="card gauge-wrap">
    <div class="gauge">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="v"><b>{{ value.toFixed(decimals) }}</b><span>{{ unit }}</span></div>
    </div>
    <div class="gauge-name">{{ name }}</div>
  </div>
</template>
