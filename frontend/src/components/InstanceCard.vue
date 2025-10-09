<template>
  <el-card class="instance-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="card-title">
          <el-icon><Monitor /></el-icon>
          <span>{{ instance.name }}</span>
        </div>
        <StatusBadge :status="instance.status" />
      </div>
    </template>

    <div class="card-body">
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
      <div v-if="instance.uptime" class="info-row">
        <span class="label">运行时间:</span>
        <span class="value">{{ formatUptime(instance.uptime) }}</span>
      </div>
    </div>

    <template #footer>
      <div class="card-footer">
        <el-button-group>
          <el-button
            v-if="instance.status === 'stopped'"
            type="success"
            size="small"
            :loading="loading"
            @click="handleStart"
          >
            <el-icon><VideoPlay /></el-icon>
            启动
          </el-button>
          <el-button
            v-if="instance.status === 'running'"
            type="warning"
            size="small"
            :loading="loading"
            @click="handleStop"
          >
            <el-icon><VideoPause /></el-icon>
            停止
          </el-button>
          <el-button
            v-if="instance.status === 'running'"
            type="primary"
            size="small"
            :loading="loading"
            @click="handleRestart"
          >
            <el-icon><RefreshRight /></el-icon>
            重启
          </el-button>
        </el-button-group>

        <el-button
          type="info"
          size="small"
          @click="handleViewDetail"
        >
          <el-icon><View /></el-icon>
          详情
        </el-button>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor, VideoPlay, VideoPause, RefreshRight, View } from '@element-plus/icons-vue'
import StatusBadge from './StatusBadge.vue'
import type { Instance } from '@/api/instances'
import { startInstance, stopInstance, restartInstance } from '@/api/instances'

interface Props {
  instance: Instance
}

const props = defineProps<Props>()
const emit = defineEmits<{
  refresh: []
}>()

const router = useRouter()
const loading = ref(false)

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分钟`
}

const handleStart = async () => {
  loading.value = true
  try {
    await startInstance(props.instance.id)
    ElMessage.success('实例启动成功')
    emit('refresh')
  } catch (error) {
    ElMessage.error('实例启动失败')
  } finally {
    loading.value = false
  }
}

const handleStop = async () => {
  try {
    await ElMessageBox.confirm('确定要停止该实例吗?', '确认操作', {
      type: 'warning'
    })

    loading.value = true
    await stopInstance(props.instance.id)
    ElMessage.success('实例停止成功')
    emit('refresh')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('实例停止失败')
    }
  } finally {
    loading.value = false
  }
}

const handleRestart = async () => {
  try {
    await ElMessageBox.confirm('确定要重启该实例吗?', '确认操作', {
      type: 'warning'
    })

    loading.value = true
    await restartInstance(props.instance.id)
    ElMessage.success('实例重启成功')
    emit('refresh')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('实例重启失败')
    }
  } finally {
    loading.value = false
  }
}

const handleViewDetail = () => {
  router.push(`/user/instances/${props.instance.id}`)
}
</script>

<style scoped>
.instance-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
  transition: all 0.3s;
}

.instance-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.card-body {
  padding: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

:deep(.el-card__header) {
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

:deep(.el-card__body) {
  background-color: #1f1f1f;
}

:deep(.el-card__footer) {
  background-color: #1f1f1f;
  border-top: 1px solid #2d2d2d;
}
</style>
