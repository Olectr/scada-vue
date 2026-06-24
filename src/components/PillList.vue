<script setup>
// items: [{ name, st, cls, led?, spin?, on? }]
defineProps({ items: { type: Array, required: true } })
</script>

<template>
  <div class="pills">
    <div v-for="(it, i) in items" :key="i" class="pill">
      <span>
        <span v-if="it.spin" :class="['spin', it.on ? '' : 'off']"></span>
        <span v-else :class="['led', it.led]"></span>
        {{ it.name }}
      </span>
      <span class="st" :class="it.cls">{{ it.st }}</span>
    </div>
  </div>
</template>
