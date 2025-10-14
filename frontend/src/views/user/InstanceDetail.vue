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
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="flex flex-wrap gap-2">
          <button
            @click="refreshAll"
            :disabled="isLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            手动刷新
          </button>
          <button
            @click="openCfgEditor"
            :disabled="!instanceData"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-purple-400/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 hover:border-purple-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            编辑 CFG
          </button>
          <button
            @click="openStartupViewer"
            :disabled="!instanceData"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            查看启动项
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            @click="startInstance"
            :disabled="!instanceData || isContainerRunning || containerActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            启动容器
          </button>
          <button
            @click="stopInstance"
            :disabled="!instanceData || !isContainerRunning || containerActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            关闭容器
          </button>
          <button
            @click="restartInstance"
            :disabled="!instanceData || !isContainerRunning || containerActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            重启容器
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            @click="startServer"
            :disabled="!instanceData || !isContainerRunning || serverActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            启动服务器
          </button>
          <button
            @click="stopServer"
            :disabled="!instanceData || !isContainerRunning || serverActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            关闭服务器
          </button>
          <button
            @click="restartServer"
            :disabled="!instanceData || !isContainerRunning || serverActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            重启服务器
          </button>
        </div>
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
                {{ instanceData.dockerImage || 'lacledeslan/steamcmd:latest' }}
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

    <!-- CFG 编辑模态框 -->
    <div v-if="showCfgModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50">
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">编辑 CFG 配置</h3>
          <button @click="showCfgModal = false" class="text-slate-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto max-h-[calc(90vh-140px)] scroll-sleek">
          <div class="p-6 space-y-6">
            <!-- 模板内容（只读） -->
            <div v-if="cfgTemplateContent">
              <label class="block text-sm font-medium text-slate-300 mb-2">
                CFG 模板内容（只读）
              </label>
              <pre class="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-emerald-300 font-mono text-xs whitespace-pre-wrap">{{ cfgTemplateContent }}</pre>
            </div>
            <div v-else class="text-sm text-slate-400 bg-slate-800/50 border border-white/5 rounded-lg px-4 py-3">
              未设置 CFG 模板
            </div>

            <!-- 自定义配置（可编辑） -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                自定义配置（可编辑）
              </label>
              <textarea
                v-model="customCfgContent"
                rows="12"
                class="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-slate-200 font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-blue-400/50 transition"
                placeholder="在此添加您的自定义配置..."
              ></textarea>
              <p class="text-xs text-slate-400 mt-2">
                自定义配置将追加到模板内容之后，并自动写入容器的 /opt/steam/gamemode/cfg/server.cfg 文件
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-white/10 flex justify-end space-x-3">
          <button
            @click="showCfgModal = false"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
          >
            取消
          </button>
          <button
            @click="saveCfg"
            :disabled="isSavingCfg"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {{ isSavingCfg ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 启动项查看模态框 -->
    <div v-if="showStartupModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50">
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">查看启动项</h3>
          <button @click="showStartupModal = false" class="text-slate-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto max-h-[calc(90vh-120px)] scroll-sleek p-6">
          <div v-if="startupOptionContent">
            <label class="block text-sm font-medium text-slate-300 mb-3">
              启动项内容
            </label>
            <pre class="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-emerald-300 font-mono text-xs whitespace-pre-wrap">{{ startupOptionContent }}</pre>
            <p class="text-xs text-slate-400 mt-3">
              此启动项将在容器启动时自动应用
            </p>
          </div>
          <div v-else class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-slate-400 text-sm">未设置启动项</p>
            <p class="text-slate-500 text-xs mt-2">请联系超级管理员为此实例配置启动项</p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            @click="showStartupModal = false"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { instancesAPI, cfgTemplatesAPI, startupOptionsAPI } from '../../api'
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
const logCursor = ref(null)
const autoRefresh = ref(true)
const isLoading = ref(false)
const commandInput = ref('')
const showCfgModal = ref(false)
const cfgTemplateContent = ref('')
const customCfgContent = ref('')
const isSavingCfg = ref(false)
const showStartupModal = ref(false)
const startupOptionContent = ref('')
const containerActionLoading = ref(false)
const serverActionLoading = ref(false)

const consoleRef = ref(null)
let refreshTimer = null
let refreshInFlight = false

const containerInfo = computed(() => instanceData.value?.containerInfo || null)
const detailStats = computed(() => containerInfo.value?.stats || null)
const portMappings = computed(() => containerInfo.value?.ports || [])
const formattedUptime = computed(() =>
  formatDuration(containerInfo.value?.uptimeSeconds || 0)
)
const isContainerRunning = computed(() => instanceData.value?.status === 'RUNNING')


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

// 已不需要 decodeUtf8，后端已经处理好编码和特殊字符

const scrollConsoleToBottom = () => {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
}

const appendLogs = (text) => {
  if (!text) return

  const needsSeparator =
    detailLogs.value &&
    !detailLogs.value.endsWith('\n') &&
    !text.startsWith('\n')

  detailLogs.value += needsSeparator ? `\n${text}` : text
}

const applyLogsPayload = (payload, reset = false) => {
  const logsText = payload?.logs ?? ''

  if (reset || detailLogs.value === '' || logCursor.value === null) {
    detailLogs.value = logsText
  } else if (logsText) {
    appendLogs(logsText)
  }

  if (typeof payload?.cursor === 'number') {
    logCursor.value = payload.cursor
  } else if (reset && !payload?.cursor) {
    logCursor.value = null
  }
}

const loadDetail = async (reset = false) => {
  if (refreshInFlight) return
  refreshInFlight = true

  const shouldShowLoading = reset || !instanceData.value
  if (shouldShowLoading) {
    isLoading.value = true
  }

  if (reset) {
    logCursor.value = null
  }

  const useCursor = !reset && logCursor.value !== null
  const logParams = useCursor ? { since: logCursor.value } : undefined

  try {
    const [infoResponse, logsResponse] = await Promise.all([
      instancesAPI.getInfo(props.id),
      instancesAPI.getLogs(props.id, logParams)
    ])
    instanceData.value = infoResponse.data
    applyLogsPayload(logsResponse.data, reset || !useCursor)
    scrollConsoleToBottom()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '获取实例信息失败',
      { title: '实例详情' }
    )
  } finally {
    if (shouldShowLoading) {
      isLoading.value = false
    }
    refreshInFlight = false
  }
}

const refreshAll = () => {
  loadDetail(true)
}

const refreshLogs = async (reset = false) => {
  if (reset) {
    logCursor.value = null
  }

  const useCursor = !reset && logCursor.value !== null
  const logParams = useCursor ? { since: logCursor.value } : undefined

  try {
    const response = await instancesAPI.getLogs(props.id, logParams)
    applyLogsPayload(response.data, reset || !useCursor)
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
  if (containerActionLoading.value) return

  containerActionLoading.value = true
  try {
    await instancesAPI.start(props.id)
    notifications.success('实例启动成功')
    await loadDetail(true)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '启动失败',
      { title: '启动实例失败' }
    )
  } finally {
    containerActionLoading.value = false
  }
}

const stopInstance = async () => {
  if (!confirm('确定要停止这个实例吗？')) return
  if (containerActionLoading.value) return

  containerActionLoading.value = true
  try {
    await instancesAPI.stop(props.id)
    notifications.success('实例已停止')
    await loadDetail(true)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '停止失败',
      { title: '停止实例失败' }
    )
  } finally {
    containerActionLoading.value = false
  }
}

const restartInstance = async () => {
  if (!confirm('确定要重启这个实例吗？')) return
  if (containerActionLoading.value) return

  containerActionLoading.value = true
  try {
    await instancesAPI.restart(props.id)
    notifications.success('实例重启成功')
    await loadDetail(true)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '重启失败',
      { title: '重启实例失败' }
    )
  } finally {
    containerActionLoading.value = false
  }
}

const startServer = async () => {
  if (!instanceData.value || serverActionLoading.value) return
  if (!isContainerRunning.value) {
    notifications.error('容器未运行，无法启动服务器', { title: '启动服务器失败' })
    return
  }

  serverActionLoading.value = true
  try {
    const response = await instancesAPI.startServer(props.id)
    notifications.success(response.data?.message || '服务器启动命令已发送')
    setTimeout(() => {
      refreshLogs()
    }, 1500)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '启动服务器失败',
      { title: '启动服务器失败' }
    )
  } finally {
    serverActionLoading.value = false
  }
}

const stopServer = async () => {
  if (!instanceData.value || serverActionLoading.value) return

  serverActionLoading.value = true
  try {
    const response = await instancesAPI.stopServer(props.id)
    notifications.success(response.data?.message || '服务器停止命令已执行')
    setTimeout(() => {
      refreshLogs()
    }, 1000)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '停止服务器失败',
      { title: '停止服务器失败' }
    )
  } finally {
    serverActionLoading.value = false
  }
}

const restartServer = async () => {
  if (!instanceData.value || serverActionLoading.value) return

  serverActionLoading.value = true
  try {
    const response = await instancesAPI.restartServer(props.id)
    notifications.success(response.data?.message || '服务器重启命令已发送')
    setTimeout(() => {
      refreshLogs()
    }, 1500)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '重启服务器失败',
      { title: '重启服务器失败' }
    )
  } finally {
    serverActionLoading.value = false
  }
}
const sendCommand = async () => {
  const command = commandInput.value.trim()
  if (!command) return

  try {
    const response = await instancesAPI.execCommand(props.id, { command })
    const output = response.data?.output || ''
    const timestamp = new Date().toLocaleTimeString()

    appendLogs(`[${timestamp}] > ${command}\n${output || '(无输出)'}`)
    scrollConsoleToBottom()

    notifications.success(`命令已发送: ${command}`)
    commandInput.value = ''

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

const openCfgEditor = async () => {
  if (!instanceData.value) return

  try {
    // 加载 CFG 模板内容
    cfgTemplateContent.value = ''
    if (instanceData.value.cfgTemplateId) {
      const response = await cfgTemplatesAPI.getOne(instanceData.value.cfgTemplateId)
      cfgTemplateContent.value = response.data.content
    }

    // 加载自定义配置
    customCfgContent.value = instanceData.value.customCfg || ''

    showCfgModal.value = true
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '加载配置失败',
      { title: '打开配置编辑器失败' }
    )
  }
}

const saveCfg = async () => {
  if (!instanceData.value) return

  isSavingCfg.value = true
  try {
    // 更新实例的自定义配置
    await instancesAPI.update(instanceData.value.id, {
      customCfg: customCfgContent.value
    })

    notifications.success('CFG 配置已保存并写入容器')
    showCfgModal.value = false

    // 刷新实例数据
    await loadDetail()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '保存失败',
      { title: '保存 CFG 配置失败' }
    )
  } finally {
    isSavingCfg.value = false
  }
}

const openStartupViewer = async () => {
  if (!instanceData.value) return

  try {
    // 加载启动项内容
    startupOptionContent.value = ''
    if (instanceData.value.startupOptionId) {
      const response = await startupOptionsAPI.getOne(instanceData.value.startupOptionId)
      startupOptionContent.value = response.data.content
    }

    showStartupModal.value = true
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '加载启动项失败',
      { title: '打开启动项查看器失败' }
    )
  }
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
