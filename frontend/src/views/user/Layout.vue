<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-gray-900 text-slate-100">
    <nav class="sticky top-0 z-40 backdrop-blur-md bg-slate-900/80 border-b border-white/10 shadow-lg shadow-slate-900/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-3">
            <img
              src="../../pic/64.png"
              alt="Logo"
              class="h-9 w-9 rounded-xl object-contain"
            />
            <div>
              <p class="text-sm uppercase tracking-[0.35em] text-slate-400">Instance</p>
              <h1 class="text-lg font-semibold text-slate-100">管理员控制中心</h1>
            </div>
          </div>
          <div class="flex items-center space-x-6">
            <router-link
              to="/user/instances"
              class="relative px-4 py-2 text-sm font-medium rounded-lg transition bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/30 hover:border-blue-300/60 hover:text-white"
            >
              我的实例
              <span class="absolute inset-x-2 -bottom-px h-[2px] bg-blue-400/70 rounded-full"></span>
            </router-link>
            <div class="flex items-center gap-3">
              <div class="text-sm text-slate-300 bg-slate-800/60 border border-white/10 px-3 py-1.5 rounded-lg shadow-inner shadow-black/40">
                {{ authStore.user?.username }}
              </div>
              <button
                @click="handleLogout"
                class="px-4 py-2 text-sm font-semibold rounded-lg border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:border-red-300/60 transition"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
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

<style scoped>
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.35s ease;
}
</style>

