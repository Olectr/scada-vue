<!-- src/views/LoginView.vue -->
<script setup>
import { ref, computed } from 'vue'
import { motion } from 'motion-v'
import { Lock, CheckCircle2 } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'

const { login, authError } = useAuth()

// idle -> verifying -> verified. Cosmetic only; login() fires immediately
// on click and is never blocked by this state machine.
const state = ref('idle')

const ringAnimate = computed(() => {
  if (state.value === 'verified') return { scale: [1, 1.15, 1], opacity: 1 }
  if (state.value === 'verifying') return { scale: [1, 1.08, 1], opacity: 0.9 }
  return { scale: [1, 1.05, 1], opacity: 0.6 }
})

const ringTransition = computed(() => {
  if (state.value === 'verified') return { duration: 0.4, ease: 'easeOut' }
  if (state.value === 'verifying') return { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
  return { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
})

const lockAnimate = computed(() => (
  state.value === 'verified' ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }
))

const checkAnimate = computed(() => (
  state.value === 'verified' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }
))

function handleSignIn() {
  state.value = 'verifying'
  login().catch(() => { state.value = 'idle' })
  setTimeout(() => { if (state.value === 'verifying') state.value = 'verified' }, 300)
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <motion.div class="badge-ring" :class="state" :animate="ringAnimate" :transition="ringTransition">
        <motion.div class="badge-icon" :animate="lockAnimate" :transition="{ duration: 0.2 }">
          <Lock :size="32" />
        </motion.div>
        <motion.div
          class="badge-icon"
          :animate="checkAnimate"
          :transition="{ duration: 0.25, delay: 0.15 }"
        >
          <CheckCircle2 :size="32" />
        </motion.div>
      </motion.div>
      <img class="mark-logo" src="/olectr-logo.png" alt="Olectr" />
      <p v-if="authError" class="error">{{ authError }}</p>
      <button class="signin-btn" :disabled="state !== 'idle'" @click="handleSignIn">
        {{ state === 'idle' ? 'Sign in' : 'Verifying…' }}
      </button>
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
  border: none; border-radius: 32px;
  box-shadow:
    10px 10px 20px rgba(16, 40, 60, 0.10),
    -10px -10px 20px rgba(255, 255, 255, 0.75),
    inset 1px 1px 1px rgba(255, 255, 255, 0.4);
}
.badge-ring {
  position: relative;
  width: 72px; height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: var(--panel);
  box-shadow:
    6px 6px 12px rgba(16, 40, 60, 0.12),
    -6px -6px 12px rgba(255, 255, 255, 0.8),
    inset -2px -2px 4px rgba(255, 255, 255, 0.6),
    inset 2px 2px 4px rgba(16, 40, 60, 0.06);
  display: flex; align-items: center; justify-content: center;
}
.badge-ring.verified {
  box-shadow:
    6px 6px 12px rgba(13, 148, 136, 0.18),
    -6px -6px 12px rgba(255, 255, 255, 0.8),
    inset -2px -2px 4px rgba(255, 255, 255, 0.6),
    inset 2px 2px 4px rgba(13, 148, 136, 0.08);
}
.badge-icon {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--teal);
}
.mark-logo { display: block; width: 160px; height: auto; margin: 0 auto; }
.error { color: var(--red); margin: 16px 0 0; font-size: 12px; }
.signin-btn {
  margin-top: 24px; padding: 10px 32px; border: none; border-radius: 20px;
  background: var(--teal); color: #fff; font-weight: 700; font-size: 13px;
  letter-spacing: .5px; cursor: pointer;
  box-shadow:
    4px 4px 10px rgba(13, 148, 136, 0.35),
    -2px -2px 6px rgba(255, 255, 255, 0.3);
}
.signin-btn:hover { background: var(--teal-dim); }
.signin-btn:disabled { opacity: 0.7; cursor: default; box-shadow: none; }
</style>
