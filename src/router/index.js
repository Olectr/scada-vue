// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import LoginView from '../views/LoginView.vue'
import AuthCallback from '../views/AuthCallback.vue'
import { useAuth } from '../composables/useAuth'

const routes = [
  { path: '/', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/auth/callback', name: 'auth-callback', component: AuthCallback },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    return { name: 'login' }
  }
  return true
})

export default router
