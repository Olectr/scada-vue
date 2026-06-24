<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
ChartJS.register(ArcElement, Tooltip)

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  color: { type: String, default: '#14b8a6' },
  track: { type: String, default: '#e8edf2' },
  center: { type: String, default: '' },
  sub: { type: String, default: '' },
  height: { type: Number, default: 120 },
  thickness: { type: String, default: '76%' },
  big: { type: Boolean, default: false },
})
const data = computed(() => ({
  datasets: [{ data: [props.value, Math.max(0, props.max - props.value)], backgroundColor: [props.color, props.track], borderWidth: 0, borderRadius: 6 }],
}))
const opts = computed(() => ({
  cutout: props.thickness, responsive: true, maintainAspectRatio: false, animation: { duration: 350 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
}))
const txt = computed(() => props.center || Math.round(props.value / props.max * 100) + '%')
</script>

<template>
  <div class="ring" :style="{ height: height + 'px' }">
    <Doughnut :data="data" :options="opts" />
    <div class="ring-c" :class="{ big }"><b>{{ txt }}</b><span v-if="sub">{{ sub }}</span></div>
  </div>
</template>

<style scoped>
.ring { position: relative; width: 100%; }
.ring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.ring-c b { font-size: 13px; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
.ring-c.big b { font-size: 34px; }
.ring-c span { font-size: 11px; color: #94a3b8; margin-top: 2px; }
</style>
