import { defineStore } from 'pinia'
import { authAPI } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    username: localStorage.getItem('username') || null,
    password: localStorage.getItem('password') || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.username && !!state.password,
    isSuperAdmin: (state) => state.user?.role === 'SUPER_ADMIN',
    isAdmin: (state) => state.user?.role === 'ADMIN'
  },

  actions: {
    async login(credentials) {
      try {
        console.log('发送登录请求')
        const response = await authAPI.login(credentials)
        console.log('登录成功，保存凭证')

        // 保存用户名、密码和用户信息
        this.username = credentials.username
        this.password = credentials.password
        this.user = response.data.user

        localStorage.setItem('username', credentials.username)
        localStorage.setItem('password', credentials.password)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        return response.data
      } catch (error) {
        console.error('登录失败', error)
        throw error
      }
    },

    logout() {
      this.user = null
      this.username = null
      this.password = null
      localStorage.removeItem('username')
      localStorage.removeItem('password')
      localStorage.removeItem('user')
    },

    setUser(user) {
      this.user = user
    },

    // 获取 Basic Auth 凭证
    getBasicAuthHeader() {
      if (this.username && this.password) {
        const credentials = btoa(`${this.username}:${this.password}`)
        return `Basic ${credentials}`
      }
      return null
    }
  }
})
