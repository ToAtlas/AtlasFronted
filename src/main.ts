import ArcoVue from '@arco-design/web-vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

import { useAuthStore } from '@/stores/auth'
import router from './router'
import '@arco-design/web-vue/dist/arco.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ArcoVue)

const authStore = useAuthStore(pinia)
authStore.initializeAuth()

app.mount('#app')
