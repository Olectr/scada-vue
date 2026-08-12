<!-- src/views/Dashboard.vue -->
<script setup>
import { usePlantData } from '../composables/usePlantData'
import ScadaBuilder from './ScadaBuilder.vue'

const { state } = usePlantData()
const now = new Date()
const pad2 = (n) => String(n).padStart(2, '0')
const today = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`
const version = `v1.0.0 · © ${now.getFullYear()} Metrion`
</script>

<template>
  <ScadaBuilder :clock="state.clock" :today="today" :version="version" />
</template>
