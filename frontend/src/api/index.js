import axios from 'axios'
import { useAuthStore } from '../stores/auth'

// 根据环境变量决定 API 地址
// 开发环境: 直接请求后端服务器
// 生产环境: 使用 nginx 代理
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // 支持跨域携带 cookie
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证相关
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials)
}

// 用户相关
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getMe: () => api.get('/users/me')
}

// 实例相关
export const instancesAPI = {
  getAll: () => api.get('/instances'),
  getMy: () => api.get('/instances/my'),
  create: (data) => api.post('/instances', data),
  update: (id, data) => api.patch(`/instances/${id}`, data),
  delete: (id) => api.delete(`/instances/${id}`),
  start: (id) => api.post(`/instances/${id}/start`),
  stop: (id) => api.post(`/instances/${id}/stop`),
  restart: (id) => api.post(`/instances/${id}/restart`),
  getLogs: (id) => api.get(`/instances/${id}/logs`)
}

export default api
