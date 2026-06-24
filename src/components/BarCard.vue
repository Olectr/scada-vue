<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, BarElement, LinearScale, CategoryScale, Legend, Tooltip,
} from 'chart.js'

ChartJS.register(BarElement, LinearScale, CategoryScale, Legend, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  color: { type: [String, Array], default: '#f59e0b' },
  horizontal: { type: Boolean, default: false },
})

const GRID = '#eef2f6'
const chartData = computed(() => ({
  labels: [...props.labels],
  datasets: [{ data: [...props.data], backgroundColor: props.color, borderRadius: 4, barPercentage: 0.65 }],
}))
const chartOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
  indexAxis: props.horizontal ? 'y' : 'x',
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: !props.horizontal, color: GRID }, border: { display: false }, beginAtZero: true },
    y: { grid: { display: !!props.horizontal, color: GRID }, border: { display: false }, beginAtZero: true },
  },
}))
</script>

<template>
  <div class="chart-box"><Bar :data="chartData" :options="chartOptions" /></div>
</template>
