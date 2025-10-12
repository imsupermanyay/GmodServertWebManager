<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100 tracking-tight">我的游戏实例</h1>
        <p class="text-sm text-slate-400 mt-1">
          实时管理分配给您的所有 Garry's Mod 服务器实例。
        </p>
      </div>
      <button
        @click="loadInstances"
        class="group self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/70 hover:text-white transition"
      >
        <span class="inline-flex h-2 w-2 rounded-full bg-blue-300 group-hover:animate-ping"></span>
        刷新列表
      </button>
    </header>

    <section
      v-if="instances.length === 0"
      class="flex flex-col items-center justify-center border border-dashed border-slate-600/70 rounded-xl px-10 py-14 text-slate-400 bg-slate-900/30"
    >
      <p class="text-base font-medium">暂未分配任何实例</p>
      <p class="text-sm mt-2">请联系超级管理员创建或分配新的实例。</p>
    </section>

    <TransitionGroup
      name="card-stagger"
      tag="section"
      class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6"
      v-else
    >
      <article
        v-for="instance in instances"
        :key="instance.id"
        class="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 shadow-lg shadow-black/30 backdrop-blur transition-transform duration-300 ease-out hover:-translate-y-2 hover:border-blue-400/40 hover:shadow-blue-400/20 flex flex-col"
      >
        <div
          class="p-6 flex-1 cursor-pointer"
          @click="goToDetail(instance)"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span
                  class="h-2.5 w-2.5 rounded-full shadow-inner"
                  :class="getStatusIndicatorClass(instance.status)"
                ></span>
                <h3 class="text-lg font-semibold text-white">
                  {{ instance.name }}
                </h3>
              </div>
              <p class="text-xs text-slate-400 mt-2">
                容器：{{ instance.containerName || '未设置' }}
              </p>
            </div>
            <span
              class="px-2 py-1 text-xs font-semibold rounded-full border"
              :class="getStatusClass(instance.status)"
            >
              {{ getStatusText(instance.status) }}
            </span>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-3 py-2">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">
                Docker ID
              </p>
              <p
                class="font-mono text-[11px] truncate text-slate-200"
                :title="instance.dockerId || '未设置'"
              >
                {{ instance.dockerId || '未设置' }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-3 py-2">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">
                镜像
              </p>
              <p
                class="font-mono text-[11px] truncate text-slate-200"
                :title="instance.dockerImage || 'hackebein/garrysmod:latest'"
              >
                {{ instance.dockerImage || 'hackebein/garrysmod:latest' }}
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 pb-6 pt-0">
          <div class="text-[11px] uppercase tracking-wide text-blue-300">
            点击卡片查看详情
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <button
              @click.stop="startInstance(instance.id)"
              :disabled="instance.status === 'RUNNING'"
              class="px-3 py-2 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30 hover:border-emerald-300/70 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              启动
            </button>
            <button
              @click.stop="stopInstance(instance.id)"
              :disabled="instance.status === 'STOPPED'"
              class="px-3 py-2 text-xs font-medium rounded-lg bg-rose-500/20 text-rose-200 border border-rose-400/40 hover:bg-rose-500/30 hover:border-rose-300/70 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              停止
            </button>
            <button
              @click.stop="restartInstance(instance.id)"
              :disabled="instance.status !== 'RUNNING'"
              class="px-3 py-2 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 hover:border-amber-300/70 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              重启
            </button>
          </div>
        </div>
        <div class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-transparent transition-opacity"></div>
      </article>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { instancesAPI } from '../../api'
import { useNotificationStore } from '../../stores/notifications'

const router = useRouter()
const instances = ref([])
const notifications = useNotificationStore()

const statusBadgeClasses = {
  RUNNING: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200',
  STOPPED: 'border-slate-500/60 bg-slate-600/30 text-slate-200',
  RESTARTING: 'border-amber-400/60 bg-amber-500/20 text-amber-200',
  ERROR: 'border-rose-400/60 bg-rose-500/20 text-rose-200'
}

const indicatorClasses = {
  RUNNING: 'bg-emerald-400 shadow-emerald-400/40',
  STOPPED: 'bg-slate-500 shadow-slate-500/40',
  RESTARTING: 'bg-amber-400 shadow-amber-400/40 animate-pulse',
  ERROR: 'bg-rose-500 shadow-rose-500/40'
}

const getStatusClass = (status) => {
  return statusBadgeClasses[status] || 'border-slate-500/60 bg-slate-700/30 text-slate-200'
}

const getStatusIndicatorClass = (status) => {
  return indicatorClasses[status] || 'bg-slate-500'
}

const getStatusText = (status) => {
  const texts = {
    RUNNING: '运行中',
    STOPPED: '已停止',
    RESTARTING: '重启中',
    ERROR: '错误'
  }
  return texts[status] || status
}

const loadInstances = async () => {
  try {
    const response = await instancesAPI.getMy()
    instances.value = response.data
  } catch (error) {
    notifications.error('加载实例列表失败', { title: '请求失败' })
  }
}

const startInstance = async (id) => {
  try {
    await instancesAPI.start(id)
    notifications.success('实例启动成功')
    await loadInstances()
  } catch (error) {
    notifications.error(error.response?.data?.message || '启动失败', { title: '启动实例失败' })
  }
}

const stopInstance = async (id) => {
  if (!confirm('确定要停止这个实例吗？')) return

  try {
    await instancesAPI.stop(id)
    notifications.success('实例已停止')
    await loadInstances()
  } catch (error) {
    notifications.error(error.response?.data?.message || '停止失败', { title: '停止实例失败' })
  }
}

const restartInstance = async (id) => {
  if (!confirm('确定要重启这个实例吗？')) return

  try {
    await instancesAPI.restart(id)
    notifications.success('实例重启成功')
    await loadInstances()
  } catch (error) {
    notifications.error(error.response?.data?.message || '重启失败', { title: '重启实例失败' })
  }
}

const goToDetail = (instance) => {
  router.push({ name: 'MyInstanceDetail', params: { id: instance.id } })
}

onMounted(() => {
  loadInstances()
})
</script>

<style scoped>
.card-stagger-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

.card-stagger-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.card-stagger-leave-active {
  transition: all 0.25s ease;
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
</style>

