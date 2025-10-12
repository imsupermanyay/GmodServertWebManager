<template>
  <div class="flex flex-col gap-6 h-[calc(100vh-5rem)] text-slate-100">
    <header class="flex flex-col gap-4 flex-none xl:flex-row xl:items-start xl:justify-between">
      <div class="space-y-2">
        <button
          class="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition"
          @click="goBack"
        >
          <span class="text-lg">←</span>
          返回实例列表
        </button>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-3xl font-semibold tracking-tight text-white">
            {{ instanceData?.name || '实例详情' }}
          </h1>
          <span
            v-if="instanceData"
            class="px-3 py-1 text-xs font-semibold rounded-full border"
            :class="getStatusBadge(instanceData.status)"
          >
            {{ getStatusText(instanceData.status) }}
          </span>
        </div>
        <p class="text-sm text-slate-400">
          监控实例状态、资源占用与控制台输出，快速定位问题与执行运维操作。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          @click="refreshAll"
          :disabled="isLoading"
          class="px-4 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          手动刷新
        </button>
        <button
          @click="startInstance"
          :disabled="!instanceData || instanceData.status === 'RUNNING'"
          class="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          启动
        </button>
        <button
          @click="stopInstance"
          :disabled="!instanceData || instanceData.status === 'STOPPED'"
          class="px-4 py-2 text-sm font-medium rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          停止
        </button>
        <button
          @click="restartInstance"
          :disabled="!instanceData || instanceData.status !== 'RUNNING'"
          class="px-4 py-2 text-sm font-medium rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          重启
        </button>
      </div>
    </header>

    <div v-if="!instanceData && isLoading" class="flex-1 rounded-xl border border-white/10 bg-slate-900/50 flex items-center justify-center text-slate-400">
      正在加载实例信息，请稍候…
    </div>

    <div v-else-if="!instanceData" class="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 flex items-center justify-center text-rose-200">
      未找到实例，或您无权访问该实例。
    </div>

    <div v-else class="flex-1 grid gap-5 overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section class="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl shadow-black/30 min-h-0">
        <div class="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-none">
          <div>
            <h2 class="text-lg font-semibold text-white">控制台输出</h2>
            <p class="text-xs text-slate-400 mt-1">
              最新日志自动停靠在底部，支持关闭自动刷新后手动浏览历史输出。
            </p>
          </div>
          <div class="flex items-center gap-4 text-xs text-slate-400">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                v-model="autoRefresh"
                class="rounded border-slate-600 bg-slate-800 text-blue-400 focus:ring-blue-500"
              />
              自动刷新（5 秒）
            </label>
            <button class="text-blue-300 hover:text-blue-200 transition" @click="refreshLogs">
              立即刷新
            </button>
          </div>
        </div>
        <div
          ref="consoleRef"
          class="flex-1 bg-slate-950 text-emerald-300 text-xs font-mono overflow-auto whitespace-pre-wrap px-5 py-4 scroll-sleek"
        >
          {{ detailLogs || '暂无日志输出。' }}
        </div>
        <div class="flex-none border-t border-white/5 px-5 py-3 bg-slate-900/50 rounded-b-2xl">
          <form @submit.prevent="sendCommand" class="flex gap-2">
            <input
              v-model="commandInput"
              type="text"
              placeholder="输入命令并按 Enter 发送..."
              :disabled="!instanceData || instanceData.status !== 'RUNNING'"
              class="flex-1 px-3 py-2 text-sm bg-slate-950 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              :disabled="!instanceData || instanceData.status !== 'RUNNING' || !commandInput.trim()"
              class="px-4 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              发送
            </button>
          </form>
          <p class="text-[11px] text-slate-500 mt-2">提示：仅当实例运行时可发送命令</p>
        </div>
      </section>

      <div class="flex flex-col gap-5 overflow-hidden">
        <section class="flex-1 min-h-0 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/25 flex flex-col">
          <div class="flex items-center justify-between mb-3 flex-none">
            <div>
              <h2 class="text-lg font-semibold text-white">运行概览</h2>
              <p class="text-xs text-slate-400 mt-1">实例状态、关键时间与端口映射。</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-200 overflow-auto pr-1 scroll-sleek">
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 md:col-span-2">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">端口映射</p>
              <p class="text-white font-semibold mt-1 font-mono text-sm">
                {{ formattedPorts }}
              </p>
            </div>

            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">运行时长</p>
              <p class="text-white font-semibold mt-1">{{ formattedUptime }}</p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">Docker ID</p>
              <p class="font-mono text-xs break-all text-slate-200 mt-1">
                {{ instanceData.dockerId || '未设置' }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">镜像</p>
              <p class="font-mono text-xs break-all text-slate-200 mt-1">
                {{ instanceData.dockerImage || 'hackebein/garrysmod:latest' }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 md:col-span-2">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">容器名称</p>
              <p class="text-white font-semibold mt-1">
                {{ instanceData.containerName || '未设置' }}
              </p>
            </div>

          </div>
        </section>

        <section class="flex-1 min-h-0 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/25 flex flex-col">
          <div class="flex items-center justify-between mb-3 flex-none">
            <h2 class="text-lg font-semibold text-white">资源监控</h2>
            <p class="text-xs text-slate-400">CPU、内存、网络与磁盘实时占用情况。</p>
          </div>
          <div
            v-if="detailStats"
            class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-200 overflow-auto pr-1 scroll-sleek"
          >
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">CPU 使用率</p>
              <p class="text-2xl font-semibold text-white mt-1">
                {{ formatPercentage(detailStats.cpuPercent) }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">内存使用</p>
              <p class="text-2xl font-semibold text-white mt-1">
                {{ formatBytes(detailStats.memoryUsage) }}
              </p>
              <p class="text-[11px] text-slate-400 mt-1">
                共 {{ formatBytes(detailStats.memoryLimit) }}
                · {{ formatPercentage(detailStats.memoryPercent) }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">网络</p>
              <p class="text-sm font-medium text-white mt-1">
                ↑ {{ formatBytes(detailStats.network.txBytes) }}
              </p>
              <p class="text-[11px] text-slate-400">
                ↓ {{ formatBytes(detailStats.network.rxBytes) }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">磁盘 I/O</p>
              <p class="text-sm font-medium text-white mt-1">
                读 {{ formatBytes(detailStats.blockIO.read) }}
              </p>
              <p class="text-[11px] text-slate-400">
                写 {{ formatBytes(detailStats.blockIO.write) }}
              </p>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400 flex-1 flex items-center">
            实例未运行，暂未获取到实时资源数据。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { instancesAPI } from '../../api'
import { useNotificationStore } from '../../stores/notifications'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const notifications = useNotificationStore()

const instanceData = ref(null)
const detailLogs = ref('')
const autoRefresh = ref(true)
const isLoading = ref(false)
const commandInput = ref('')

const consoleRef = ref(null)
let refreshTimer = null
let refreshInFlight = false

const containerInfo = computed(() => instanceData.value?.containerInfo || null)
const detailStats = computed(() => containerInfo.value?.stats || null)
const portMappings = computed(() => containerInfo.value?.ports || [])
const formattedUptime = computed(() =>
  formatDuration(containerInfo.value?.uptimeSeconds || 0)
)

// 格式化端口显示
const formattedPorts = computed(() => {
  if (!portMappings.value || portMappings.value.length === 0) {
    return '未设置'
  }

  // 找到 27015 端口的映射
  const port27015 = portMappings.value.find(p => p.containerPort && p.containerPort.includes('27015'))

  if (port27015 && port27015.hostPort) {
    return `${port27015.hostPort} → ${port27015.containerPort}`
  }

  // 如果没找到，显示第一个端口
  const firstPort = portMappings.value[0]
  if (firstPort && firstPort.hostPort) {
    return `${firstPort.hostPort} → ${firstPort.containerPort}`
  }

  return '未分配'
})

const statusBadgeClasses = {
  RUNNING: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200',
  STOPPED: 'border-slate-500/60 bg-slate-700/40 text-slate-200',
  RESTARTING: 'border-amber-400/60 bg-amber-500/20 text-amber-200',
  ERROR: 'border-rose-400/60 bg-rose-500/20 text-rose-200'
}

const getStatusBadge = (status) => {
  return statusBadgeClasses[status] || 'border-slate-500/60 bg-slate-700/40 text-slate-200'
}

const decodeUtf8 = (value) => {
  if (!value) return ''
  try {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder('utf-8', { fatal: false })
    return decoder.decode(encoder.encode(value))
  } catch (error) {
    return value
  }
}

const scrollConsoleToBottom = () => {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
}

const loadDetail = async () => {
  if (refreshInFlight) return
  refreshInFlight = true
  isLoading.value = !instanceData.value

  try {
    const [infoResponse, logsResponse] = await Promise.all([
      instancesAPI.getInfo(props.id),
      instancesAPI.getLogs(props.id)
    ])
    instanceData.value = infoResponse.data
    detailLogs.value = decodeUtf8(logsResponse.data)
    scrollConsoleToBottom()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '获取实例信息失败',
      { title: '实例详情' }
    )
  } finally {
    isLoading.value = false
    refreshInFlight = false
  }
}

const refreshAll = () => {
  loadDetail()
}

const refreshLogs = async () => {
  try {
    const response = await instancesAPI.getLogs(props.id)
    detailLogs.value = decodeUtf8(response.data)
    scrollConsoleToBottom()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '获取日志失败',
      { title: '日志刷新失败' }
    )
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  if (!autoRefresh.value) return
  refreshTimer = setInterval(() => {
    loadDetail()
  }, 5000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(autoRefresh, (value) => {
  if (value) {
    loadDetail()
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

watch(detailLogs, () => {
  scrollConsoleToBottom()
})

const startInstance = async () => {
  try {
    await instancesAPI.start(props.id)
    notifications.success('实例启动成功')
    await loadDetail()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '启动失败',
      { title: '启动实例失败' }
    )
  }
}

const stopInstance = async () => {
  if (!confirm('确定要停止这个实例吗？')) return
  try {
    await instancesAPI.stop(props.id)
    notifications.success('实例已停止')
    await loadDetail()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '停止失败',
      { title: '停止实例失败' }
    )
  }
}

const restartInstance = async () => {
  if (!confirm('确定要重启这个实例吗？')) return
  try {
    await instancesAPI.restart(props.id)
    notifications.success('实例重启成功')
    await loadDetail()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '重启失败',
      { title: '重启实例失败' }
    )
  }
}

const sendCommand = async () => {
  const command = commandInput.value.trim()
  if (!command) return

  try {
    await instancesAPI.execCommand(props.id, { command })
    notifications.success(`命令已发送: ${command}`)
    commandInput.value = ''
    // 等待一下再刷新日志，让命令执行结果出现
    setTimeout(() => {
      refreshLogs()
    }, 1000)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '发送命令失败',
      { title: '命令执行失败' }
    )
  }
}

const goBack = () => {
  router.push({ name: 'MyInstances' })
}

const getStatusText = (status) => {
  const texts = {
    RUNNING: '运行中',
    STOPPED: '已停止',
    RESTARTING: '重启中',
    ERROR: '错误'
  }
  return texts[status] || status || '未知'
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let value = bytes
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const formatPercentage = (value = 0) => {
  if (!value || Number.isNaN(value)) {
    return '0%'
  }
  return `${value.toFixed(1)}%`
}

function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds || 0)
  if (seconds <= 0) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days) parts.push(`${days}天`)
  if (hours) parts.push(`${hours}小时`)
  if (minutes) parts.push(`${minutes}分钟`)
  if (parts.length === 0) {
    parts.push(`${seconds % 60}秒`)
  }
  return parts.join('')
}

onMounted(() => {
  loadDetail()
  startAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.scroll-sleek {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.scroll-sleek::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scroll-sleek::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-sleek::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.55), rgba(14, 165, 233, 0.55));
  border-radius: 9999px;
  border: 2px solid rgba(15, 23, 42, 0.4);
  transition: background 0.2s ease;
}

.scroll-sleek::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.8), rgba(14, 165, 233, 0.8));
}

.card-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

.card-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.card-leave-active {
  transition: all 0.25s ease;
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
</style>
