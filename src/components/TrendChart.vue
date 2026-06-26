<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler,
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, Filler)

const props = defineProps({
  // series: [{ label, color, fill?, data: number[] }]
  series: { type: Array, required: true },
})

const GRID = '#eef2f6'
const chartData = computed(() => ({
  labels: (props.series[0]?.data || []).map((_, i) => i),
  datasets: props.series.map(s => ({
    label: s.label,
    data: [...s.data],
    borderColor: s.color,
    backgroundColor: s.fill || 'transparent',
    fill: !!s.fill,
    tension: 0.35,
    pointRadius: 0,
    borderWidth: 2,
  })),
}))
const chartOptions = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 3, padding: 12 } },
    tooltip: { enabled: true },
  },
  scales: {
    x: { display: false, grid: { display: false } },
    y: { grid: { color: GRID }, ticks: { maxTicksLimit: 5 }, border: { display: false } },
  },
}
</script>

<template>
  <div class="chart-box"><Line :data="chartData" :options="chartOptions" /></div>
</template>

<style scoped>
/* fill the host box so a parent setting height:100% (e.g. the builder chart overlay) sizes the canvas */
.chart-box { width: 100%; height: 100%; }
</style>
