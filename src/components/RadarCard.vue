<script setup>
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  color: { type: String, default: '#14b8a6' },
})
const chartData = computed(() => ({
  labels: [...props.labels],
  datasets: [{
    data: [...props.data], backgroundColor: props.color + '33', borderColor: props.color,
    borderWidth: 2, pointBackgroundColor: props.color, pointRadius: 2,
  }],
}))
const opts = computed(() => ({
  responsive: true, maintainAspectRatio: false, animation: { duration: 350 },
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: {
    r: {
      grid: { color: '#e8edf2' }, angleLines: { color: '#e8edf2' },
      pointLabels: { color: '#64748b', font: { size: 10 } },
      ticks: { display: false, backdropColor: 'transparent' }, beginAtZero: true,
    },
  },
}))
</script>

<template>
  <div class="chart-box"><Radar :data="chartData" :options="opts" /></div>
</template>
