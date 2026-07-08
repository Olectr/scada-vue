import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import './style.css'

const { initAuth } = useAuth()

initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
