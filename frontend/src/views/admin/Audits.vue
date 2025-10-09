<template>
  <div class="audits-page">
    <div class="page-header">
      <h2>审计日志</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索操作或目标"
          style="width: 200px"
          clearable
          @clear="loadAudits"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="loadAudits">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="操作类型">
          <el-select
            v-model="filters.action"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <el-option label="创建" value="创建" />
            <el-option label="更新" value="更新" />
            <el-option label="删除" value="删除" />
            <el-option label="启动" value="启动" />
            <el-option label="停止" value="停止" />
            <el-option label="重启" value="重启" />
            <el-option label="登录" value="登录" />
            <el-option label="登出" value="登出" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAudits">应用筛选</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="audits" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户" width="150" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" min-width="200" />
        <el-table-column prop="details" label="详情" min-width="300" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP地址" width="150" />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadAudits"
          @current-change="loadAudits"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Download } from '@element-plus/icons-vue'
import { getAuditLogs, exportAuditLogs, type AuditLog } from '@/api/audits'

const loading = ref(false)
const audits = ref<AuditLog[]>([])
const searchKeyword = ref('')
const dateRange = ref<[string, string] | null>(null)

const filters = reactive({
  action: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const getActionType = (action: string) => {
  if (action.includes('创建') || action.includes('启动') || action.includes('登录')) return 'success'
  if (action.includes('删除') || action.includes('停止')) return 'danger'
  if (action.includes('更新') || action.includes('修改') || action.includes('重启')) return 'warning'
  return 'info'
}

const loadAudits = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }

    if (filters.action) {
      params.action = filters.action
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const response = await getAuditLogs(params)
    audits.value = response.logs
    pagination.total = response.total
    pagination.totalPages = response.totalPages
  } catch (error) {
    ElMessage.error('加载审计日志失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.action = ''
  dateRange.value = null
  searchKeyword.value = ''
  pagination.page = 1
  loadAudits()
}

const handleExport = async () => {
  try {
    const params: any = {}

    if (filters.action) {
      params.action = filters.action
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const blob = await exportAuditLogs(params)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().getTime()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  loadAudits()
})
</script>

<style scoped>
.audits-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #ffffff;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
  margin-bottom: 20px;
}

.table-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

:deep(.el-table) {
  background-color: #1f1f1f;
  color: #ffffff;
}

:deep(.el-table th.el-table__cell) {
  background-color: #2d2d2d;
  color: #ffffff;
}

:deep(.el-table tr) {
  background-color: #1f1f1f;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid #2d2d2d;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #2d2d2d !important;
}

:deep(.el-card) {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

:deep(.el-card__body) {
  background-color: #1f1f1f;
}
</style>
