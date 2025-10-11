import { defineStore } from 'pinia'
import { authAPI } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
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
        const response = await authAPI.login(credentials)
        this.token = response.data.access_token
        this.user = response.data.user
        localStorage.setItem('token', this.token)
        return response.data
      } catch (error) {
        throw error
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
    },

    setUser(user) {
      this.user = user
    }
  }
})
