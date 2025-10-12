<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <button
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-3"
          @click="goBack"
        >
          ← 返回实例列表
        </button>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold text-gray-900">
            {{ instanceData?.name || '实例详情' }}
          </h1>
          <span
            v-if="instanceData"
            class="px-3 py-1 text-xs font-semibold rounded-full"
            :class="getStatusBadge(instanceData.status)"
          >
            {{ getStatusText(instanceData.status) }}
          </span>
        </div>
        <p class="text-sm text-gray-600 mt-1">
          全屏查看实例控制台、资源占用与网络信息，便于快速排查问题。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          @click="refreshAll"
          :disabled="isLoading"
          class="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
        >
          手动刷新
        </button>
        <button
          @click="startInstance"
          :disabled="!instanceData || instanceData.status === 'RUNNING'"
          class="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          启动
        </button>
        <button
          @click="stopInstance"
          :disabled="!instanceData || instanceData.status === 'STOPPED'"
          class="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          停止
        </button>
        <button
          @click="restartInstance"
          :disabled="!instanceData || instanceData.status !== 'RUNNING'"
          class="px-4 py-2 text-sm font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
        >
          重启
        </button>
      </div>
    </header>

    <div v-if="!instanceData && isLoading" class="bg-white rounded-xl shadow p-6 text-gray-500">
      正在加载实例信息，请稍候…
    </div>

    <div v-else-if="!instanceData" class="bg-white rounded-xl shadow p-6 text-red-500">
      未找到实例，或您无权访问该实例。
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-2">
      <section class="bg-white rounded-xl shadow overflow-hidden xl:col-span-2">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">控制台输出</h2>
            <p class="text-xs text-gray-500 mt-1">
              最新日志自动滚动到最底部，可随时切换自动刷新。
            </p>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                v-model="autoRefresh"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              自动刷新（5 秒）
            </label>
            <button class="text-blue-600 hover:text-blue-700" @click="refreshLogs">
              立即刷新
            </button>
          </div>
        </div>
        <div
          ref="consoleRef"
          class="bg-gray-900 text-green-400 text-xs font-mono h-[480px] xl:h-[520px] overflow-auto whitespace-pre-wrap px-6 py-4"
        >
          {{ detailLogs || '暂无日志输出。' }}
        </div>
      </section>

      <section class="bg-white rounded-xl shadow p-6 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">运行概览</h2>
            <p class="text-xs text-gray-500 mt-1">实例运行状态及关键时间信息。</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">运行时长</p>
            <p class="text-gray-900 font-semibold mt-1">{{ formattedUptime }}</p>
          </div>
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">最近启动</p>
            <p class="text-gray-900 font-semibold mt-1">
              {{ formatDateTime(containerInfo?.startedAt) }}
            </p>
          </div>
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">IP 地址</p>
            <p class="text-gray-900 font-semibold mt-1">
              {{ containerInfo?.network?.ipAddress || '未分配' }}
            </p>
          </div>
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">重启次数</p>
            <p class="text-gray-900 font-semibold mt-1">
              {{ containerInfo?.restartCount ?? 0 }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">Docker ID</p>
            <p class="font-mono text-xs break-all mt-1">
              {{ instanceData.dockerId || '未设置' }}
            </p>
          </div>
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">镜像</p>
            <p class="font-mono text-xs break-all mt-1">
              {{ instanceData.dockerImage || 'hackebein/garrysmod:latest' }}
            </p>
          </div>
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 md:col-span-2">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">容器名称</p>
            <p class="text-gray-900 font-semibold mt-1">
              {{ instanceData.containerName || '未设置' }}
            </p>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">端口映射</h3>
          <div
            v-if="portMappings.length"
            class="space-y-2 font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
          >
            <p
              v-for="(port, index) in portMappings"
              :key="index"
            >
              {{ (port.hostIp && port.hostIp !== '0.0.0.0') ? port.hostIp : '任意' }}:
              {{ port.hostPort || '自动' }}
              <span class="text-gray-500"> → </span>
              {{ port.containerPort }}
            </p>
          </div>
          <p v-else class="text-xs text-gray-500">暂无端口映射信息。</p>
        </div>
      </section>

      <section class="bg-white rounded-xl shadow p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">资源监控</h2>
          <p class="text-xs text-gray-500">实时查看 CPU、内存、网络与磁盘占用。</p>
        </div>
        <div
          v-if="detailStats"
          class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700"
        >
          <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">CPU 使用率</p>
            <p class="text-xl font-semibold text-gray-900 mt-1">
              {{ formatPercentage(detailStats.cpuPercent) }}
            </p>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">内存使用</p>
            <p class="text-xl font-semibold text-gray-900 mt-1">
              {{ formatBytes(detailStats.memoryUsage) }}
            </p>
            <p class="text-[11px] text-gray-500 mt-1">
              共 {{ formatBytes(detailStats.memoryLimit) }}
              · {{ formatPercentage(detailStats.memoryPercent) }}
            </p>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">网络</p>
            <p class="text-sm font-medium text-gray-900 mt-1">
              ↑ {{ formatBytes(detailStats.network.txBytes) }}
            </p>
            <p class="text-[11px] text-gray-500">
              ↓ {{ formatBytes(detailStats.network.rxBytes) }}
            </p>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p class="text-gray-400 uppercase tracking-wide text-[11px]">磁盘 I/O</p>
            <p class="text-sm font-medium text-gray-900 mt-1">
              读 {{ formatBytes(detailStats.blockIO.read) }}
            </p>
            <p class="text-[11px] text-gray-500">
              写 {{ formatBytes(detailStats.blockIO.write) }}
            </p>
          </div>
        </div>
        <p v-else class="text-xs text-gray-500">实例未运行或暂时无法获取资源数据。</p>
      </section>
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

const consoleRef = ref(null)
const refreshTimer = ref(null)
const refreshInFlight = ref(false)

const containerInfo = computed(() => instanceData.value?.containerInfo || null)
const detailStats = computed(() => containerInfo.value?.stats || null)
const portMappings = computed(() => containerInfo.value?.ports || [])
const formattedUptime = computed(() =>
  formatDuration(containerInfo.value?.uptimeSeconds || 0)
)

const scrollConsoleToBottom = () => {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
}

const loadDetail = async () => {
  if (refreshInFlight.value) return
  refreshInFlight.value = true
  isLoading.value = !instanceData.value

  try {
    const [infoResponse, logsResponse] = await Promise.all([
      instancesAPI.getInfo(props.id),
      instancesAPI.getLogs(props.id)
    ])
    instanceData.value = infoResponse.data
    detailLogs.value = logsResponse.data
    scrollConsoleToBottom()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '获取实例信息失败',
      { title: '实例详情' }
    )
  } finally {
    isLoading.value = false
    refreshInFlight.value = false
  }
}

const refreshAll = () => {
  loadDetail()
}

const refreshLogs = async () => {
  try {
    const response = await instancesAPI.getLogs(props.id)
    detailLogs.value = response.data
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
  refreshTimer.value = setInterval(() => {
    loadDetail()
  }, 5000)
}

const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

watch(autoRefresh, () => {
  if (autoRefresh.value) {
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

const getStatusBadge = (status) => {
  const classes = {
    RUNNING: 'bg-green-100 text-green-800',
    STOPPED: 'bg-gray-100 text-gray-800',
    RESTARTING: 'bg-yellow-100 text-yellow-800',
    ERROR: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
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
  loadDetail().then(() => {
    scrollConsoleToBottom()
  })
  startAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>
