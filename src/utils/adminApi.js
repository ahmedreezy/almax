import axios from 'axios'
import { getApiBaseUrl } from './apiBase'
import { createAdminPreviewResponse } from './adminPreviewData'
import { disableAdminPreview, isAdminPreviewEnabled } from './adminPreviewMode'

const adminApi = axios.create({
  baseURL: getApiBaseUrl()
})

adminApi.interceptors.request.use(config => {
  if (isAdminPreviewEnabled()) {
    config.adapter = createAdminPreviewResponse
    return config
  }
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('adminToken')
      disableAdminPreview()
      window.location.href = '/#/admin/login'
      return new Promise(() => {}) // never resolves — prevents catch blocks from firing
    }
    return Promise.reject(error)
  }
)

export default adminApi
