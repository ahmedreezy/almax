import axios from 'axios'
import { getApiBaseUrl } from './apiBase'

const devApi = axios.create({
  baseURL: getApiBaseUrl()
})

devApi.interceptors.request.use(config => {
  const token = localStorage.getItem('devToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

devApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('devToken')
      window.location.href = '/#/dev/login'
      return new Promise(() => {})
    }
    return Promise.reject(error)
  }
)

export default devApi
