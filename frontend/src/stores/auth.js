import { defineStore } from 'pinia'
import { authAPI } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isSuperAdmin: (state) => state.user?.role === 'SUPER_ADMIN',
    isAdmin: (state) => state.user?.role === 'ADMIN'
  },

  actions: {
    async login(credentials) {
      try {
        console.log('发送登录请求')
        const response = await authAPI.login(credentials)
        console.log('登录成功，保存 JWT token')

        // 保存 JWT token 和用户信息
        this.token = response.data.access_token
        this.user = response.data.user

        localStorage.setItem('token', response.data.access_token)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        return response.data
      } catch (error) {
        console.error('登录失败', error)
        throw error
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    setUser(user) {
      this.user = user
    },

    // 获取 JWT Bearer Token
    getAuthToken() {
      return this.token
    }
  }
})
