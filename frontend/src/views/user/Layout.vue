<template>
  <div class="min-h-screen bg-gray-100">
    <!-- 导航栏 -->
    <nav class="bg-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <div class="flex space-x-8">
            <router-link
              to="/user/instances"
              class="px-3 py-2 rounded-md text-sm font-medium bg-blue-500 text-white"
            >
              我的实例
            </router-link>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-700">{{ authStore.user?.username }}</span>
            <button
              @click="handleLogout"
              class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 内容区域 -->
    <div class="max-w-7xl mx-auto px-4 py-8">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
