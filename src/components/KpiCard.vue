<script setup>
defineProps({
  label: String,
  value: [String, Number],
  unit: String,
  delta: String,
  deltaClass: { type: String, default: '' },
  valueClass: { type: String, default: '' },
  bar: { type: Number, default: null },
  barColor: { type: String, default: '' },
})
</script>

<template>
  <div class="card kpi">
    <div class="lbl">{{ label }}</div>
    <div class="val" :class="valueClass">{{ value }}<small v-if="unit">{{ unit }}</small></div>
    <div class="delta" :class="deltaClass">{{ delta }}</div>
    <div v-if="bar !== null" class="bar"><i :style="{ width: bar + '%', background: barColor || undefined }"></i></div>
  </div>
</template>
