<!-- src/views/Dashboard.vue -->
<script setup>
import { ref, computed } from 'vue'
import { usePlantData } from '../composables/usePlantData'
import { useAuth } from '../composables/useAuth'
import ScadaBuilder from './ScadaBuilder.vue'

const { state } = usePlantData()
const { user, logout } = useAuth()

const screens = [
  { id: 'builder', ico: '✚', label: 'SCADA Builder', title: 'SCADA Builder', comp: ScadaBuilder },
]
const active = ref('builder')
const current = computed(() => screens.find(s => s.id === active.value))
const drawer = ref(false)
function go(id) { active.value = id; drawer.value = false }
</script>

<template>
  <div class="app">
    <header class="topbar">
      <button class="burger" :class="{ open: drawer }" @click="drawer = !drawer" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <img class="topbar-logo" src="/olectr-logo.png" alt="Olectr" />
      <div class="right">
        <div class="conn"><span class="dot"></span> {{ state.broker }}</div>
        <div class="conn">Date <b style="color:var(--txt)">23/06/2026</b></div>
        <div class="clock">{{ state.clock }}</div>
        <div class="user-box" v-if="user">
          <span class="user-email">{{ user.profile.email }}</span>
          <button class="logout-btn" @click="logout">Logout</button>
        </div>
      </div>
    </header>

    <div class="backdrop" :class="{ show: drawer }" @click="drawer = false"></div>

    <aside class="side" :class="{ open: drawer }">
      
      <nav class="nav">
        <a v-for="s in screens" :key="s.id" :class="{ active: active === s.id }" @click="go(s.id)">
          <span class="ico">{{ s.ico }}</span> {{ s.label }}
        </a>
      </nav>
      <div class="foot">SCADA AUTOMATION · v1.0<br>OPC UA + MQTT</div>
    </aside>

    <main class="main">
      <Transition name="fade" mode="out-in">
        <component :is="current.comp" :key="active" />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.user-box { display: flex; align-items: center; gap: 8px; padding-left: 14px; border-left: 1px solid var(--line); }
.user-email { font-size: 11px; color: var(--muted); }
.logout-btn {
  font-size: 11px; font-weight: 600; color: var(--teal); background: none;
  border: 1px solid var(--teal-dim); border-radius: 4px; padding: 4px 10px; cursor: pointer;
}
.logout-btn:hover { background: var(--soft); }
@media (max-width: 720px) { .user-email { display: none; } }
</style>
