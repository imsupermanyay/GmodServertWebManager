<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#409eff"><User /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#67c23a"><Monitor /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalInstances }}</div>
              <div class="stat-label">实例总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#e6a23c"><VideoPlay /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.runningInstances }}</div>
              <div class="stat-label">运行中实例</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#f56c6c"><FolderOpened /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalRepos }}</div>
              <div class="stat-label">仓库总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近活动</span>
            </div>
          </template>
          <el-empty v-if="recentActivities.length === 0" description="暂无活动记录" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="formatTime(activity.createdAt)"
              placement="top"
            >
              <el-tag :type="getActivityType(activity.action)" size="small">
                {{ activity.action }}
              </el-tag>
              <span style="margin-left: 8px; color: #909399">{{ activity.username }}</span>
              <span style="margin-left: 8px">{{ activity.target }}</span>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>系统信息</span>
            </div>
          </template>
          <div class="system-info">
            <div class="info-item">
              <span class="label">平台:</span>
              <span class="value">{{ systemInfo.platform }}</span>
            </div>
            <div class="info-item">
              <span class="label">Node版本:</span>
              <span class="value">{{ systemInfo.nodeVersion }}</span>
            </div>
            <div class="info-item">
              <span class="label">系统运行时间:</span>
              <span class="value">{{ systemInfo.uptime }}</span>
            </div>
            <div class="info-item">
              <span class="label">CPU使用率:</span>
              <el-progress :percentage="systemInfo.cpuUsage" />
            </div>
            <div class="info-item">
              <span class="label">内存使用率:</span>
              <el-progress :percentage="systemInfo.memoryUsage" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Monitor, VideoPlay, FolderOpened } from '@element-plus/icons-vue'
import { getAllUsers } from '@/api/users'
import { getAllInstances } from '@/api/instances'
import { getAllRepos } from '@/api/repos'
import { getAuditLogs } from '@/api/audits'
import type { AuditLog } from '@/api/audits'

const stats = ref({
  totalUsers: 0,
  totalInstances: 0,
  runningInstances: 0,
  totalRepos: 0
})

const recentActivities = ref<AuditLog[]>([])

const systemInfo = ref({
  platform: 'Windows',
  nodeVersion: 'v18.x',
  uptime: '0天0小时',
  cpuUsage: 25,
  memoryUsage: 45
})

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const getActivityType = (action: string) => {
  if (action.includes('创建') || action.includes('启动')) return 'success'
  if (action.includes('删除') || action.includes('停止')) return 'danger'
  if (action.includes('更新') || action.includes('修改')) return 'warning'
  return 'info'
}

const loadStats = async () => {
  try {
    const [users, instances, repos, audits] = await Promise.all([
      getAllUsers(),
      getAllInstances(),
      getAllRepos(),
      getAuditLogs({ limit: 10 })
    ])

    stats.value = {
      totalUsers: users.length,
      totalInstances: instances.length,
      runningInstances: instances.filter(i => i.status === 'running').length,
      totalRepos: repos.length
    }

    recentActivities.value = audits.logs
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard {
  width: 100%;
}

.stat-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  font-size: 48px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-item .label {
  width: 120px;
  color: #909399;
  font-size: 14px;
}

.info-item .value {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

:deep(.el-card) {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

:deep(.el-card__header) {
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

:deep(.el-timeline-item__timestamp) {
  color: #909399;
}
</style>
