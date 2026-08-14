import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n, { setLocale } from './i18n'
import { useAuth } from './composables/useAuth'
import './style.css'

// expose setLocale globally for language switching
window.__setLocale = setLocale

const { initAuth } = useAuth()

initAuth().finally(() => {
  createApp(App).use(router).use(i18n).mount('#app')
})
