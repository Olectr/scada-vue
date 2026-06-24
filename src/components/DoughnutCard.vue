<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Legend, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  colors: { type: Array, required: true },
})

const chartData = computed(() => ({
  labels: [...props.labels],
  datasets: [{ data: [...props.data], backgroundColor: props.colors, borderWidth: 0 }],
}))
const chartOptions = {
  cutout: '62%', responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
  plugins: { legend: { position: 'right', labels: { boxWidth: 10, padding: 10 } } },
}
</script>

<template>
  <div class="chart-box"><Doughnut :data="chartData" :options="chartOptions" /></div>
</template>
