<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js'
ChartJS.register(BarElement, LinearScale, CategoryScale, Legend, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  a: { type: Array, required: true },
  b: { type: Array, required: true },
  colorA: { type: String, default: '#14b8a6' },
  colorB: { type: String, default: '#a855f7' },
  labelA: { type: String, default: 'A' },
  labelB: { type: String, default: 'B' },
})
const chartData = computed(() => ({
  labels: [...props.labels],
  datasets: [
    { label: props.labelA, data: [...props.a], backgroundColor: props.colorA, borderRadius: 3, barPercentage: .8, categoryPercentage: .7 },
    { label: props.labelB, data: [...props.b], backgroundColor: props.colorB, borderRadius: 3, barPercentage: .8, categoryPercentage: .7 },
  ],
}))
const opts = {
  indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
  plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } }, tooltip: { enabled: true } },
  scales: {
    x: { grid: { color: '#eef2f6' }, ticks: { color: '#94a3b8', font: { size: 9 } }, border: { display: false }, beginAtZero: true },
    y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
  },
}
</script>

<template>
  <div class="chart-box"><Bar :data="chartData" :options="opts" /></div>
</template>
