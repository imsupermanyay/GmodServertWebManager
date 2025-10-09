<template>
  <div class="instance-detail-page">
    <div class="page-header">
      <el-button @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>{{ instance?.name || '实例详情' }}</h2>
      <div class="header-actions">
        <StatusBadge v-if="instance" :status="instance.status" />
        <el-button
          v-if="instance?.status === 'stopped'"
          type="success"
          @click="handleStart"
          :loading="actionLoading"
        >
          <el-icon><VideoPlay /></el-icon>
          启动
        </el-button>
        <el-button
          v-if="instance?.status === 'running'"
          type="warning"
          @click="handleStop"
          :loading="actionLoading"
        >
          <el-icon><VideoPause /></el-icon>
          停止
        </el-button>
        <el-button
          v-if="instance?.status === 'running'"
          type="primary"
          @click="handleRestart"
          :loading="actionLoading"
        >
          <el-icon><RefreshRight /></el-icon>
          重启
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>实例信息</span>
            </div>
          </template>
          <div v-if="instance" class="info-content">
            <div class="info-row">
              <span class="label">实例ID:</span>
              <span class="value">{{ instance.id }}</span>
            </div>
            <div class="info-row">
              <span class="label">实例名称:</span>
              <span class="value">{{ instance.name }}</span>
            </div>
            <div class="info-row">
              <span class="label">安装路径:</span>
              <span class="value">{{ instance.path }}</span>
            </div>
            <div class="info-row">
              <span class="label">端口:</span>
              <span class="value">{{ instance.port }}</span>
            </div>
            <div class="info-row">
              <span class="label">游戏模式:</span>
              <span class="value">{{ instance.gamemode }}</span>
            </div>
            <div class="info-row">
              <span class="label">地图:</span>
              <span class="value">{{ instance.map }}</span>
            </div>
            <div class="info-row">
              <span class="label">最大玩家:</span>
              <span class="value">{{ instance.maxPlayers }}</span>
            </div>
            <div v-if="instance.status === 'running'" class="info-row">
              <span class="label">在线玩家:</span>
              <span class="value">{{ instance.players || 0 }} / {{ instance.maxPlayers }}</span>
            </div>
            <div v-if="instance.workshopCollection" class="info-row">
              <span class="label">创意工坊合集:</span>
              <span class="value">{{ instance.workshopCollection }}</span>
            </div>
            <div v-if="instance.uptime" class="info-row">
              <span class="label">运行时间:</span>
              <span class="value">{{ formatUptime(instance.uptime) }}</span>
            </div>
            <div v-if="instance.pid" class="info-row">
              <span class="label">进程ID:</span>
              <span class="value">{{ instance.pid }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="logs-card">
          <template #header>
            <div class="card-header">
              <span>实例日志</span>
              <div class="header-actions-small">
                <el-input-number
                  v-model="logLines"
                  :min="50"
                  :max="1000"
                  :step="50"
                  size="small"
                  style="width: 120px"
                />
                <el-button size="small" @click="loadLogs">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
                <el-switch
                  v-model="autoRefresh"
                  active-text="自动刷新"
                  inactive-text=""
                  @change="toggleAutoRefresh"
                />
              </div>
            </div>
          </template>
          <div class="logs-container" ref="logsContainerRef">
            <pre v-if="logs" class="logs-content">{{ logs }}</pre>
            <el-empty v-else description="暂无日志" />
          </div>
        </el-card>

        <el-card class="command-card" v-if="instance?.status === 'running'">
          <template #header>
            <div class="card-header">
              <span>控制台命令</span>
            </div>
          </template>
          <el-form @submit.prevent="handleExecuteCommand">
            <el-input
              v-model="command"
              placeholder="输入控制台命令，例如: status"
              clearable
            >
              <template #append>
                <el-button
                  type="primary"
                  @click="handleExecuteCommand"
                  :loading="commandLoading"
                >
                  执行
                </el-button>
              </template>
            </el-input>
          </el-form>
          <div class="command-tips">
            <el-text type="info" size="small">
              常用命令: status (服务器状态), say (发送消息), changelevel (切换地图)
            </el-text>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="bindings-card">
          <template #header>
            <div class="card-header">
              <span>绑定的仓库</span>
            </div>
          </template>
          <div v-loading="bindingsLoading">
            <el-empty v-if="bindings.length === 0" description="暂无绑定" />
            <div v-else class="bindings-list">
              <div
                v-for="binding in bindings"
                :key="binding.id"
                class="binding-item"
              >
                <div class="binding-info">
                  <div class="binding-name">
                    <el-icon><FolderOpened /></el-icon>
                    {{ binding.repo?.name || `仓库 #${binding.repoId}` }}
                  </div>
                  <div class="binding-path">{{ binding.targetPath }}</div>
                  <el-tag v-if="binding.autoUpdate" type="success" size="small">
                    自动更新
                  </el-tag>
                </div>
                <el-button
                  type="primary"
                  size="small"
                  @click="handleSyncBinding(binding.id)"
                >
                  <el-icon><Refresh /></el-icon>
                  同步
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  VideoPlay,
  VideoPause,
  RefreshRight,
  Refresh,
  FolderOpened
} from '@element-plus/icons-vue'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  getInstance,
  startInstance,
  stopInstance,
  restartInstance,
  getInstanceLogs,
  executeCommand,
  type Instance
} from '@/api/instances'
import { getInstanceBindings, syncBinding, type Binding } from '@/api/bindings'

const route = useRoute()
const router = useRouter()

const instance = ref<Instance | null>(null)
const logs = ref('')
const logLines = ref(100)
const command = ref('')
const bindings = ref<Binding[]>([])
const actionLoading = ref(false)
const commandLoading = ref(false)
const bindingsLoading = ref(false)
const autoRefresh = ref(false)
const logsContainerRef = ref<HTMLElement>()

let refreshInterval: number | null = null

const instanceId = parseInt(route.params.id as string)

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分钟`
}

const goBack = () => {
  router.back()
}

const loadInstance = async () => {
  try {
    instance.value = await getInstance(instanceId)
  } catch (error) {
    ElMessage.error('加载实例信息失败')
  }
}

const loadLogs = async () => {
  try {
    const response = await getInstanceLogs(instanceId, logLines.value)
    logs.value = response.logs
    // 滚动到底部
    await nextTick()
    if (logsContainerRef.value) {
      logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight
    }
  } catch (error) {
    ElMessage.error('加载日志失败')
  }
}

const loadBindings = async () => {
  bindingsLoading.value = true
  try {
    bindings.value = await getInstanceBindings(instanceId)
  } catch (error) {
    ElMessage.error('加载绑定列表失败')
  } finally {
    bindingsLoading.value = false
  }
}

const handleStart = async () => {
  actionLoading.value = true
  try {
    await startInstance(instanceId)
    ElMessage.success('实例启动成功')
    await loadInstance()
    await loadLogs()
  } catch (error) {
    ElMessage.error('实例启动失败')
  } finally {
    actionLoading.value = false
  }
}

const handleStop = async () => {
  try {
    await ElMessageBox.confirm('确定要停止该实例吗?', '确认操作', {
      type: 'warning'
    })

    actionLoading.value = true
    await stopInstance(instanceId)
    ElMessage.success('实例停止成功')
    await loadInstance()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('实例停止失败')
    }
  } finally {
    actionLoading.value = false
  }
}

const handleRestart = async () => {
  try {
    await ElMessageBox.confirm('确定要重启该实例吗?', '确认操作', {
      type: 'warning'
    })

    actionLoading.value = true
    await restartInstance(instanceId)
    ElMessage.success('实例重启成功')
    await loadInstance()
    await loadLogs()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('实例重启失败')
    }
  } finally {
    actionLoading.value = false
  }
}

const handleExecuteCommand = async () => {
  if (!command.value.trim()) {
    ElMessage.warning('请输入命令')
    return
  }

  commandLoading.value = true
  try {
    await executeCommand(instanceId, command.value)
    ElMessage.success('命令执行成功')
    command.value = ''
    // 延迟刷新日志
    setTimeout(loadLogs, 1000)
  } catch (error) {
    ElMessage.error('命令执行失败')
  } finally {
    commandLoading.value = false
  }
}

const handleSyncBinding = async (bindingId: number) => {
  try {
    const loading = ElMessage.loading('正在同步，请稍候...')
    await syncBinding(bindingId)
    loading.close()
    ElMessage.success('同步成功')
  } catch (error) {
    ElMessage.error('同步失败')
  }
}

const toggleAutoRefresh = (value: boolean) => {
  if (value) {
    refreshInterval = window.setInterval(() => {
      loadInstance()
      loadLogs()
    }, 5000)
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }
}

onMounted(() => {
  loadInstance()
  loadLogs()
  loadBindings()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.instance-detail-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h2 {
  flex: 1;
  margin: 0;
  font-size: 24px;
  color: #ffffff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-card,
.logs-card,
.command-card,
.bindings-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.header-actions-small {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #2d2d2d;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #909399;
  font-size: 14px;
}

.value {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

.logs-container {
  height: 500px;
  overflow-y: auto;
  background-color: #0a0a0a;
  border: 1px solid #2d2d2d;
  border-radius: 4px;
}

.logs-content {
  margin: 0;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #00ff00;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.command-tips {
  margin-top: 12px;
}

.bindings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.binding-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #2d2d2d;
  border-radius: 4px;
}

.binding-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.binding-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.binding-path {
  font-size: 12px;
  color: #909399;
}

:deep(.el-card) {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

:deep(.el-card__header) {
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

:deep(.el-card__body) {
  background-color: #1f1f1f;
}
</style>
