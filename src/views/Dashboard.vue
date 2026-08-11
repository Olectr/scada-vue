<!-- src/views/Dashboard.vue -->
<script setup>
import { ref, computed } from 'vue'
import { usePlantData } from '../composables/usePlantData'
import { useAuth } from '../composables/useAuth'
import ScadaBuilder from './ScadaBuilder.vue'

const { state } = usePlantData()
const { user, logout } = useAuth()

const active = 'builder'
const now = new Date()
const year = now.getFullYear()
const pad2 = (n) => String(n).padStart(2, '0')
const today = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`
const version = 'v1.0.0'
</script>

<template>
  <div class="app">
    <header class="topbar">
      <img class="topbar-logo" src="https://metrion.blr1.cdn.digitaloceanspaces.com/metrion-logo.svg" alt="Metrion" />
      <div class="right">
        <div class="conn">Date <b style="color:var(--txt)">{{ today }}</b></div>
        <div class="clock">{{ state.clock }}</div>
        <div class="user-box" v-if="user">
          <span class="user-email">{{ user.profile.email }}</span>
          <button class="logout-btn" @click="logout">Logout</button>
        </div>
      </div>
    </header>

    <main class="main">
      <Transition name="fade" mode="out-in">
        <ScadaBuilder :key="active" />
      </Transition>
    </main>

    <footer class="footer">© {{ year }} Metrion · {{ version }}</footer>
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
