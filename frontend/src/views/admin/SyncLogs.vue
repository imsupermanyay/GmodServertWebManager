<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-100">文件同步管理</h1>
      <button
        @click="showSyncDialog = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        手动同步到测试服
      </button>
    </div>

    <!-- 同步对话框 -->
    <div
      v-if="showSyncDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showSyncDialog = false"
    >
      <div class="bg-gray-800 rounded-lg p-6 w-96">
        <h2 class="text-xl font-bold text-gray-100 mb-4">触发同步</h2>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            选择游戏模式
          </label>
          <select
            v-model="selectedGamemode"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">请选择游戏模式</option>
            <option v-for="mode in gamemodes" :key="mode.id" :value="mode.name">
              {{ mode.name }}
            </option>
          </select>
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="showSyncDialog = false"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            @click="triggerSync"
            :disabled="!selectedGamemode || syncLoading"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ syncLoading ? '同步中...' : '开始同步' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="mb-4 flex gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          筛选游戏模式
        </label>
        <select
          v-model="filterGamemode"
          @change="loadLogs"
          class="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
        >
          <option value="">全部模式</option>
          <option v-for="mode in gamemodes" :key="mode.id" :value="mode.name">
            {{ mode.name }}
          </option>
        </select>
      </div>
      <div class="flex items-end">
        <button
          @click="loadLogs"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          刷新
        </button>
      </div>
    </div>

    <!-- 同步日志列表 -->
    <div class="bg-gray-800 rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-400">
        加载中...
      </div>
      <div v-else-if="logs.length === 0" class="p-8 text-center text-gray-400">
        暂无同步日志
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-900">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                游戏模式
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                仓库名称
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                类型
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                消息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                开始时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                完成时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-gray-800 divide-y divide-gray-700">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-750">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ log.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ log.gamemodeName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ log.repositoryName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="{
                    'bg-green-900 text-green-300': log.status === 'success',
                    'bg-red-900 text-red-300': log.status === 'failed',
                    'bg-yellow-900 text-yellow-300': log.status === 'in_progress'
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ getStatusText(log.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                <span
                  :class="{
                    'bg-purple-900 text-purple-300': log.isManualSync,
                    'bg-gray-700 text-gray-300': !log.isManualSync
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ log.isManualSync ? '手动同步' : '自动同步' }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-300 max-w-xs truncate" :title="log.message">
                {{ log.message }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ log.completedAt ? formatDate(log.completedAt) : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                <button
                  v-if="log.errorDetails"
                  @click="showErrorDetails(log)"
                  class="text-blue-400 hover:text-blue-300"
                >
                  查看错误
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-700">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-400">
              显示第 <span class="font-medium">{{ (currentPage - 1) * limit + 1 }}</span> 到
              <span class="font-medium">{{ Math.min(currentPage * limit, total) }}</span> 条，
              共 <span class="font-medium">{{ total }}</span> 条记录
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                v-for="page in displayPages"
                :key="page"
                @click="changePage(page)"
                :class="{
                  'bg-blue-600 text-white': page === currentPage,
                  'bg-gray-800 text-gray-300 hover:bg-gray-700': page !== currentPage
                }"
                class="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium"
              >
                {{ page }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误详情对话框 -->
    <div
      v-if="showErrorDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showErrorDialog = false"
    >
      <div class="bg-gray-800 rounded-lg p-6 w-3/4 max-w-4xl max-h-3/4 overflow-auto">
        <h2 class="text-xl font-bold text-gray-100 mb-4">错误详情</h2>
        <pre class="bg-gray-900 p-4 rounded-lg text-red-400 text-sm overflow-auto">{{ selectedError }}</pre>
        <div class="flex justify-end mt-4">
          <button
            @click="showErrorDialog = false"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { syncAPI, gamemodesAPI } from '../../api'
import { useNotificationStore } from '../../stores/notifications'

const notificationStore = useNotificationStore()

const logs = ref([])
const gamemodes = ref([])
const loading = ref(false)
const syncLoading = ref(false)
const showSyncDialog = ref(false)
const showErrorDialog = ref(false)
const selectedGamemode = ref('')
const filterGamemode = ref('')
const selectedError = ref('')

const currentPage = ref(1)
const limit = ref(50)
const total = ref(0)
const totalPages = ref(0)

const displayPages = computed(() => {
  const pages = []
  const maxDisplay = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxDisplay / 2))
  let end = Math.min(totalPages.value, start + maxDisplay - 1)

  if (end - start < maxDisplay - 1) {
    start = Math.max(1, end - maxDisplay + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

onMounted(async () => {
  await loadGamemodes()
  await loadLogs()
  // 每10秒自动刷新一次
  setInterval(() => {
    loadLogs()
  }, 10000)
})

async function loadGamemodes() {
  try {
    const response = await gamemodesAPI.getAll()
    gamemodes.value = response.data
  } catch (error) {
    notificationStore.addNotification('加载游戏模式失败', 'error')
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: limit.value
    }
    if (filterGamemode.value) {
      params.gamemodeName = filterGamemode.value
    }
    const response = await syncAPI.getSyncLogs(params)
    logs.value = response.data.logs
    total.value = response.data.total
    totalPages.value = response.data.totalPages
  } catch (error) {
    notificationStore.addNotification('加载同步日志失败', 'error')
  } finally {
    loading.value = false
  }
}

async function triggerSync() {
  if (!selectedGamemode.value) return

  syncLoading.value = true
  try {
    await syncAPI.manualSync(selectedGamemode.value)
    notificationStore.addNotification('同步任务已加入队列，请稍后查看日志', 'success')
    showSyncDialog.value = false
    selectedGamemode.value = ''
    // 3秒后刷新日志
    setTimeout(() => {
      loadLogs()
    }, 3000)
  } catch (error) {
    notificationStore.addNotification(
      error.response?.data?.message || '触发同步失败',
      'error'
    )
  } finally {
    syncLoading.value = false
  }
}

function changePage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadLogs()
}

function showErrorDetails(log) {
  selectedError.value = log.errorDetails
  showErrorDialog.value = true
}

function getStatusText(status) {
  const statusMap = {
    success: '成功',
    failed: '失败',
    in_progress: '进行中'
  }
  return statusMap[status] || status
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.hover\:bg-gray-750:hover {
  background-color: rgb(42, 46, 54);
}
</style>
