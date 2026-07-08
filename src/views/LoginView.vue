<!-- src/views/LoginView.vue -->
<script setup>
import { useAuth } from '../composables/useAuth'

const { login, authError } = useAuth()
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="mark">SC<b>A</b>DA</div>
      <small>AUTOMATION</small>
      <p v-if="authError" class="error">{{ authError }}</p>
      <button class="signin-btn" @click="login">Sign in</button>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg);
}
.login-card {
  text-align: center; padding: 40px 56px; background: var(--panel);
  border: 1px solid var(--line); box-shadow: var(--shadow);
}
.mark { font-size: 22px; font-weight: 900; letter-spacing: 1px; color: var(--txt); }
.mark b { color: var(--teal); }
.login-card small { color: var(--muted); letter-spacing: 2px; font-size: 10px; }
.error { color: var(--red); margin: 16px 0 0; font-size: 12px; }
.signin-btn {
  margin-top: 24px; padding: 10px 32px; border: none; background: var(--teal);
  color: #fff; font-weight: 700; font-size: 13px; letter-spacing: .5px; cursor: pointer;
}
.signin-btn:hover { background: var(--teal-dim); }
</style>
