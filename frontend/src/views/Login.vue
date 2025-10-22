<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950">
    <div class="relative w-full max-w-md px-8 py-10 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl shadow-blue-900/25 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
      <div class="absolute -top-24 -right-24 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="absolute -bottom-28 -left-24 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl"></div>

      <div class="relative">
        <div class="flex justify-center mb-6">
          <img
            src="../pic/64.png"
            alt="Logo"
            class="h-14 w-14 rounded-2xl object-contain"
          />
        </div>
        <h1 class="text-3xl font-semibold text-center text-white tracking-tight">
          GMOD 管理面板
        </h1>
        <p class="mt-2 text-sm text-center text-slate-400">
          登录后即可管理服务器实例与管理员账号
        </p>

        <form @submit.prevent="handleLogin" class="mt-8 space-y-6 relative">
          <div class="space-y-2">
            <label class="block text-xs uppercase tracking-wide text-slate-400">账号</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">👤</span>
              <input
                v-model="form.username"
                type="text"
                required
                autocomplete="username"
                class="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900/70 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/70 focus:border-blue-400/50 transition"
                placeholder="请输入账号"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs uppercase tracking-wide text-slate-400">密码</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">🔒</span>
              <input
                v-model="form.password"
                type="password"
                required
                autocomplete="current-password"
                class="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900/70 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/70 focus:border-blue-400/50 transition"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <Transition name="fade">
            <div
              v-if="errorMessage"
              class="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg py-2 text-center"
            >
              {{ errorMessage }}
            </div>
          </Transition>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 hover:from-blue-500 hover:via-blue-600 hover:to-purple-500 shadow-lg shadow-blue-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <p class="mt-6 text-xs text-center text-slate-500">
          登录遇到问题？请联系系统管理员
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await authStore.login(form.value)

    if (data.user.role === 'SUPER_ADMIN') {
      router.push('/admin/users')
    } else {
      router.push('/user/instances')
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
</style>

