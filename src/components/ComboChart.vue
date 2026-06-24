<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend, Tooltip } from 'chart.js'
ChartJS.register(BarElement, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  sales: { type: Array, required: true },
  costs: { type: Array, required: true },
})
const GRID = '#eef2f6'
const chartData = computed(() => ({
  labels: [...props.labels],
  datasets: [
    { type: 'bar', label: 'Sales', data: [...props.sales], backgroundColor: '#14b8a6', borderRadius: 3, barPercentage: .8, categoryPercentage: .65 },
    { type: 'bar', label: 'Costs', data: [...props.costs], backgroundColor: '#3b82f6', borderRadius: 3, barPercentage: .8, categoryPercentage: .65 },
    { type: 'line', label: 'Trend', data: [...props.sales], borderColor: '#ec4899', backgroundColor: 'transparent', tension: .4, pointRadius: 0, borderWidth: 2 },
  ],
}))
const opts = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
  plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 3, padding: 10, font: { size: 10 } } }, tooltip: { enabled: true } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } },
    y: { grid: { color: GRID }, ticks: { maxTicksLimit: 5, color: '#94a3b8' }, border: { display: false }, beginAtZero: true },
  },
}
</script>

<template>
  <div class="chart-box"><Bar :data="chartData" :options="opts" /></div>
</template>
