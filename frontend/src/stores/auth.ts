import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, me as apiMe, type User } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  /**
   * 登录
   */
  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      const response = await apiLogin({ username, password })
      user.value = response.user
      return response
    } finally {
      loading.value = false
    }
  }

  /**
   * 登出
   */
  const logout = async () => {
    loading.value = true
    try {
      await apiLogout()
      user.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取当前用户信息
   */
  const fetchUser = async () => {
    loading.value = true
    try {
      const response = await apiMe()
      user.value = response.user
      return response.user
    } catch (error) {
      user.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 清除用户信息
   */
  const clearUser = () => {
    user.value = null
  }

  return {
    user,
    loading,
    isLoggedIn,
    isSuperAdmin,
    isAdmin,
    login,
    logout,
    fetchUser,
    clearUser
  }
})
