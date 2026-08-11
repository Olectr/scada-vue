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

// Background HMI flow lines: orthogonal P&ID-style routing across a 1600x900 viewBox.
const flowPaths = [
  { d: 'M 0 150 H 500 V 400 H 1600', duration: 4, delay: 0 },
  { d: 'M 1600 700 H 1000 V 300 H 600 V 100 H 0', duration: 5, delay: 0.6 },
  { d: 'M 200 900 V 600 H 900 V 750 H 1600', duration: 3.5, delay: 1.2 },
  { d: 'M 0 500 H 300 V 850 H 800', duration: 6, delay: 1.8 },
  { d: 'M 1600 200 H 1200 V 550 H 700 V 900', duration: 4.5, delay: 2.4 },
]

// Blinking status LEDs scattered around the canvas, avoiding the centered card.
const leds = [
  { x: 80, y: 80, color: 'teal', duration: 2.6, delay: 0 },
  { x: 1500, y: 120, color: 'amber', duration: 3.1, delay: 0.4 },
  { x: 150, y: 820, color: 'teal', duration: 2.2, delay: 0.9 },
  { x: 1450, y: 800, color: 'amber', duration: 2.8, delay: 1.3 },
  { x: 60, y: 450, color: 'teal', duration: 3.4, delay: 0.2 },
  { x: 1540, y: 450, color: 'amber', duration: 2.5, delay: 1.6 },
  { x: 400, y: 60, color: 'teal', duration: 2.9, delay: 0.7 },
  { x: 1200, y: 840, color: 'teal', duration: 2.3, delay: 2.0 },
]
</script>

<template>
  <div class="login-screen">
    <svg class="hmi-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path
        v-for="(p, i) in flowPaths"
        :key="'path-' + i"
        :d="p.d"
        class="flow-line"
        :style="{ animationDuration: p.duration + 's', animationDelay: p.delay + 's' }"
      />
      <circle
        v-for="(p, i) in flowPaths"
        :key="'pulse-' + i"
        r="3"
        class="flow-pulse"
        :style="{ offsetPath: `path('${p.d}')`, animationDuration: p.duration + 's', animationDelay: p.delay + 's' }"
      />
      <circle
        v-for="(l, i) in leds"
        :key="'led-' + i"
        :cx="l.x"
        :cy="l.y"
        r="4"
        class="status-led"
        :class="'status-led--' + l.color"
        :style="{ animationDuration: l.duration + 's', animationDelay: l.delay + 's' }"
      />
    </svg>
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
      <img class="mark-logo" src="https://metrion.blr1.cdn.digitaloceanspaces.com/metrion-logo.svg" alt="Metrion" />
      <p v-if="authError" class="error">{{ authError }}</p>
      <button class="signin-btn" :disabled="state !== 'idle'" @click="handleSignIn">
        {{ state === 'idle' ? 'Sign in' : 'Verifying…' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  position: relative;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh;
  background: radial-gradient(ellipse at center, var(--login-bg-2) 0%, var(--login-bg-1) 70%);
  --login-bg-1: #0a1420;
  --login-bg-2: #0f1f30;
  --login-panel: #101d2c;
  --login-border: rgba(13, 148, 136, .25);
  --login-teal: #0d9488;
  --login-teal-glow: #2dd4bf;
  --login-amber: #f59e0b;
  --login-red: #ef4444;
  --login-text: #e6edf3;
  --login-text-dim: #7d92a6;
}
.login-card {
  position: relative;
  z-index: 1;
  text-align: center; padding: 40px 56px;
  background: var(--login-panel);
  border: 1px solid var(--login-border);
  border-radius: 32px;
  box-shadow:
    0 0 40px rgba(13, 148, 136, 0.12),
    0 20px 60px rgba(0, 0, 0, 0.5);
}
.hmi-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}
.flow-line {
  fill: none;
  stroke: var(--login-teal);
  stroke-width: 1.5;
  opacity: 0.22;
  stroke-dasharray: 12 8;
  animation-name: flow-dash;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.flow-pulse {
  fill: var(--login-teal-glow);
  opacity: 0.9;
  offset-distance: 0%;
  animation-name: flow-pulse-move;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.status-led {
  opacity: 0.15;
  animation-name: led-blink;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
.status-led--teal { fill: var(--login-teal-glow); }
.status-led--amber { fill: var(--login-amber); }
@keyframes flow-dash {
  to { stroke-dashoffset: -200; }
}
@keyframes flow-pulse-move {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
@keyframes led-blink {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .flow-line { animation: none; opacity: 0.15; }
  .flow-pulse { display: none; }
  .status-led { animation: none; opacity: 0.4; }
}
.badge-ring {
  position: relative;
  width: 72px; height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: var(--login-panel);
  box-shadow:
    0 0 18px rgba(45, 212, 191, 0.25),
    inset 0 0 12px rgba(13, 148, 136, 0.15),
    0 0 0 1px var(--login-border);
  display: flex; align-items: center; justify-content: center;
}
.badge-ring.verified {
  box-shadow:
    0 0 26px rgba(45, 212, 191, 0.45),
    inset 0 0 14px rgba(13, 148, 136, 0.25),
    0 0 0 1px rgba(45, 212, 191, 0.4);
}
.badge-icon {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--login-teal-glow);
}
.mark-logo {
  display: block; width: 160px; height: auto; margin: 0 auto;
  filter: brightness(0) invert(1);
}
.error { color: var(--login-red); margin: 16px 0 0; font-size: 12px; }
.signin-btn {
  margin-top: 24px; padding: 10px 32px; border: none; border-radius: 20px;
  background: var(--login-teal); color: #fff; font-weight: 700; font-size: 13px;
  letter-spacing: .5px; cursor: pointer;
  box-shadow:
    0 0 18px rgba(13, 148, 136, 0.45),
    0 4px 10px rgba(0, 0, 0, 0.3);
}
.signin-btn:hover { background: var(--login-teal-glow); }
.signin-btn:disabled { opacity: 0.6; cursor: default; box-shadow: none; }
</style>
