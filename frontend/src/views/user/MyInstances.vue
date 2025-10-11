<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">我的游戏实例</h1>
      <p class="text-sm text-gray-600 mt-2">管理您分配的所有游戏实例</p>
    </div>

    <!-- 实例列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="instance in instances"
        :key="instance.id"
        class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-bold text-gray-800">{{ instance.name }}</h3>
          <span
            class="px-2 py-1 rounded-full text-xs font-medium"
            :class="getStatusClass(instance.status)"
          >
            {{ getStatusText(instance.status) }}
          </span>
        </div>

        <div class="space-y-2 text-sm text-gray-600 mb-4">
          <p><span class="font-medium">容器名:</span> {{ instance.containerName || '未设置' }}</p>
          <p><span class="font-medium">状态:</span> {{ getStatusText(instance.status) }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="grid grid-cols-3 gap-2 mb-3">
          <button
            @click="startInstance(instance.id)"
            :disabled="instance.status === 'RUNNING'"
            class="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            开机
          </button>
          <button
            @click="stopInstance(instance.id)"
            :disabled="instance.status === 'STOPPED'"
            class="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            关机
          </button>
          <button
            @click="restartInstance(instance.id)"
            :disabled="instance.status !== 'RUNNING'"
            class="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重启
          </button>
        </div>

        <button
          @click="viewLogs(instance)"
          class="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          查看控制台
        </button>
      </div>
    </div>

    <!-- 控制台日志模态框 -->
    <div v-if="showLogsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div class="flex justify-between items-center p-6 border-b">
          <h3 class="text-xl font-bold">{{ currentInstance?.name }} - 控制台输出</h3>
          <button
            @click="showLogsModal = false"
            class="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        <div class="flex-1 overflow-auto p-6">
          <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono whitespace-pre-wrap">{{ logs || '暂无日志' }}</pre>
        </div>
        <div class="p-6 border-t">
          <button
            @click="loadLogs(currentInstance.id)"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            刷新
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { instancesAPI } from '../../api'

const instances = ref([])
const showLogsModal = ref(false)
const currentInstance = ref(null)
const logs = ref('')

const getStatusClass = (status) => {
  const classes = {
    RUNNING: 'bg-green-100 text-green-800',
    STOPPED: 'bg-gray-100 text-gray-800',
    RESTARTING: 'bg-yellow-100 text-yellow-800',
    ERROR: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
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
    alert('加载实例列表失败')
  }
}

const startInstance = async (id) => {
  try {
    await instancesAPI.start(id)
    await loadInstances()
    alert('启动成功')
  } catch (error) {
    alert(error.response?.data?.message || '启动失败')
  }
}

const stopInstance = async (id) => {
  if (!confirm('确定要停止这个实例吗？')) return

  try {
    await instancesAPI.stop(id)
    await loadInstances()
    alert('停止成功')
  } catch (error) {
    alert(error.response?.data?.message || '停止失败')
  }
}

const restartInstance = async (id) => {
  if (!confirm('确定要重启这个实例吗？')) return

  try {
    await instancesAPI.restart(id)
    await loadInstances()
    alert('重启成功')
  } catch (error) {
    alert(error.response?.data?.message || '重启失败')
  }
}

const viewLogs = (instance) => {
  currentInstance.value = instance
  loadLogs(instance.id)
  showLogsModal.value = true
}

const loadLogs = async (id) => {
  try {
    const response = await instancesAPI.getLogs(id)
    logs.value = response.data
  } catch (error) {
    logs.value = '获取日志失败: ' + (error.response?.data?.message || error.message)
  }
}

onMounted(() => {
  loadInstances()
})
</script>
