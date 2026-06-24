<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const props = defineProps({
  years: { type: Array, required: true },
  values: { type: Array, required: true },
  colors: { type: Array, default: () => ['#14b8a6', '#a855f7', '#3b82f6', '#22c55e'] },
})
// each year = a translucent triangle peak (spike at its index, zero elsewhere)
const chartData = computed(() => ({
  labels: [...props.years],
  datasets: props.values.map((v, i) => ({
    label: props.years[i],
    data: props.values.map((_, j) => (j === i ? v : 0)),
    borderColor: props.colors[i % props.colors.length],
    backgroundColor: props.colors[i % props.colors.length] + '40',
    fill: true, tension: 0, pointRadius: 0, borderWidth: 1.5,
  })),
}))
const opts = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } }, stacked: true },
    y: { display: false, beginAtZero: true },
  },
}
</script>

<template>
  <div class="chart-box"><Line :data="chartData" :options="opts" /></div>
</template>
