import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import { getApiBaseUrl } from './utils/apiBase'
import { getToken } from './utils/userAuth'
import { lightbox } from './utils/lightbox'

axios.defaults.baseURL = getApiBaseUrl()
axios.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const app = createApp(App)
app.config.globalProperties.$lightbox = lightbox
app.use(router).mount('#app')
