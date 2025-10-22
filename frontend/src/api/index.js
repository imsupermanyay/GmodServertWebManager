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
  withCredentials: true,  // 支持跨域携带 cookie
  timeout: 20000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.getAuthToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
//打印请求debug
// api.interceptors.request.use((config) => {
//   console.log('[request]', config.method, config.url, config.data);
//   return config;
// });
// //打印回应debug
// api.interceptors.response.use(
//   (response) => {
//     console.log('[response]', response.status, response.config.url);
//     return response;
//   },
//   (error) => {
//     console.error('[response error]', error);
//     return Promise.reject(error);
//   }
// );
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
  startServer: (id) => api.post(`/instances/${id}/server/start`),
  stopServer: (id) => api.post(`/instances/${id}/server/stop`),
  restartServer: (id) => api.post(`/instances/${id}/server/restart`),
  getLogs: (id, params) => api.get(`/instances/${id}/logs`, { params }),
  getInfo: (id) => api.get(`/instances/${id}/info`),
  execCommand: (id, data) => api.post(`/instances/${id}/exec`, data),
  getModeLinkInstances: () => api.get('/instances/links/instances'),
  getModeLinkGamemodes: () => api.get('/instances/links/gamemodes'),
  bindModeLink: (data) => api.post('/instances/links/bind', data),
  unbindModeLink: (data) => api.post('/instances/links/unbind', data),
  // 文件管理
  listFiles: (id, path) => api.get(`/instances/${id}/files`, { params: { path } }),
  uploadFile: (id, path, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/instances/${id}/files/upload`, formData, {
      params: { path },
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadFileToFolder: (id, path, relativePath, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/instances/${id}/files/upload-folder`, formData, {
      params: { path, relativePath },
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  downloadFile: (id, path) => api.get(`/instances/${id}/files/download`, {
    params: { path },
    responseType: 'blob'
  }),
  downloadFolder: (id, path) => api.get(`/instances/${id}/files/download-folder`, {
    params: { path },
    responseType: 'blob'
  }),
  downloadMultiple: (id, paths) => api.post(`/instances/${id}/files/download-multiple`,
    { paths },
    { responseType: 'blob' }
  ),
  deleteFile: (id, path) => api.delete(`/instances/${id}/files`, { params: { path } })
}

// CFG 模板相关
export const cfgTemplatesAPI = {
  getAll: () => api.get('/cfg-templates'),
  getOne: (id) => api.get(`/cfg-templates/${id}`),
  create: (data) => api.post('/cfg-templates', data),
  update: (id, data) => api.patch(`/cfg-templates/${id}`, data),
  delete: (id) => api.delete(`/cfg-templates/${id}`)
}

// 启动项相关
export const startupOptionsAPI = {
  getAll: () => api.get('/startup-options'),
  getOne: (id) => api.get(`/startup-options/${id}`),
  create: (data) => api.post('/startup-options', data),
  update: (id, data) => api.patch(`/startup-options/${id}`, data),
  delete: (id) => api.delete(`/startup-options/${id}`)
}

// 模式管理相关
export const gamemodesAPI = {
  getAll: () => api.get('/gamemodes'),
  getOne: (id) => api.get(`/gamemodes/${id}`),
  create: (data) => api.post('/gamemodes', data),
  update: (id, data) => api.patch(`/gamemodes/${id}`, data),
  delete: (id) => api.delete(`/gamemodes/${id}`)
}

export default api
