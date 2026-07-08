<!-- src/views/AuthCallback.vue -->
<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import userManager from '../auth/oidc'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login } = useAuth()
const error = ref(null)

onMounted(async () => {
  try {
    await userManager.signinRedirectCallback()
    router.push('/')
  } catch (e) {
    error.value = e.message || 'Login failed'
  }
})
</script>

<template>
  <div class="callback-screen">
    <template v-if="error">
      <p class="error">{{ error }}</p>
      <button class="retry-btn" @click="login">Try again</button>
    </template>
    <p v-else>Signing you in…</p>
  </div>
</template>

<style scoped>
.callback-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg); color: var(--txt); font-size: 13px; gap: 16px;
}
.error { color: var(--red); }
.retry-btn {
  padding: 8px 24px; border: none; background: var(--teal); color: #fff;
  font-weight: 700; cursor: pointer;
}
</style>
