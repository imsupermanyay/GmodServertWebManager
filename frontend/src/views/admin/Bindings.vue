<template>
  <div class="bindings-page">
    <div class="page-header">
      <h2>绑定管理</h2>
      <el-button-group>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          创建绑定
        </el-button>
        <el-button type="success" @click="handleBatchCreate">
          <el-icon><Connection /></el-icon>
          批量绑定
        </el-button>
      </el-button-group>
    </div>

    <el-card class="table-card">
      <el-table :data="bindings" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="实例" width="200">
          <template #default="{ row }">
            {{ row.instance?.name || `实例 #${row.instanceId}` }}
          </template>
        </el-table-column>
        <el-table-column label="仓库" width="200">
          <template #default="{ row }">
            {{ row.repo?.name || `仓库 #${row.repoId}` }}
          </template>
        </el-table-column>
        <el-table-column prop="targetPath" label="目标路径" min-width="200" />
        <el-table-column label="自动更新" width="100">
          <template #default="{ row }">
            <el-tag :type="row.autoUpdate ? 'success' : 'info'" size="small">
              {{ row.autoUpdate ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button type="success" size="small" @click="handleSync(row)">
              <el-icon><Refresh /></el-icon>
              同步
            </el-button>
            <el-button type="info" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑绑定对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑绑定' : '创建绑定'"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="实例" prop="instanceId">
          <el-select v-model="form.instanceId" placeholder="请选择实例" style="width: 100%">
            <el-option
              v-for="instance in instances"
              :key="instance.id"
              :label="instance.name"
              :value="instance.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库" prop="repoId">
          <el-select v-model="form.repoId" placeholder="请选择仓库" style="width: 100%">
            <el-option
              v-for="repo in repos"
              :key="repo.id"
              :label="repo.name"
              :value="repo.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标路径" prop="targetPath">
          <el-input
            v-model="form.targetPath"
            placeholder="例如: garrysmod/addons/myAddon"
          />
        </el-form-item>
        <el-form-item label="自动更新">
          <el-switch v-model="form.autoUpdate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量绑定对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量绑定"
      width="600px"
    >
      <el-form :model="batchForm" :rules="batchRules" ref="batchFormRef" label-width="100px">
        <el-form-item label="选择实例" prop="instanceIds">
          <el-select
            v-model="batchForm.instanceIds"
            multiple
            placeholder="请选择要绑定的实例"
            style="width: 100%"
          >
            <el-option
              v-for="instance in instances"
              :key="instance.id"
              :label="instance.name"
              :value="instance.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库" prop="repoId">
          <el-select v-model="batchForm.repoId" placeholder="请选择仓库" style="width: 100%">
            <el-option
              v-for="repo in repos"
              :key="repo.id"
              :label="repo.name"
              :value="repo.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标路径" prop="targetPath">
          <el-input
            v-model="batchForm.targetPath"
            placeholder="例如: garrysmod/addons/myAddon"
          />
        </el-form-item>
        <el-form-item label="自动更新">
          <el-switch v-model="batchForm.autoUpdate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus, Connection, Refresh } from '@element-plus/icons-vue'
import {
  getAllBindings,
  createBinding,
  updateBinding,
  deleteBinding,
  syncBinding,
  batchCreateBindings,
  type Binding
} from '@/api/bindings'
import { getAllInstances, type Instance } from '@/api/instances'
import { getAllRepos, type Repo } from '@/api/repos'

const loading = ref(false)
const bindings = ref<Binding[]>([])
const instances = ref<Instance[]>([])
const repos = ref<Repo[]>([])
const dialogVisible = ref(false)
const batchDialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const batchFormRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  instanceId: 0,
  repoId: 0,
  targetPath: '',
  autoUpdate: false
})

const batchForm = reactive({
  instanceIds: [] as number[],
  repoId: 0,
  targetPath: '',
  autoUpdate: false
})

const rules = {
  instanceId: [{ required: true, message: '请选择实例', trigger: 'change' }],
  repoId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  targetPath: [{ required: true, message: '请输入目标路径', trigger: 'blur' }]
}

const batchRules = {
  instanceIds: [{ required: true, message: '请选择实例', trigger: 'change' }],
  repoId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  targetPath: [{ required: true, message: '请输入目标路径', trigger: 'blur' }]
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const loadData = async () => {
  loading.value = true
  try {
    const [bindingsData, instancesData, reposData] = await Promise.all([
      getAllBindings(),
      getAllInstances(),
      getAllRepos()
    ])
    bindings.value = bindingsData
    instances.value = instancesData
    repos.value = reposData
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = 0
  form.instanceId = 0
  form.repoId = 0
  form.targetPath = ''
  form.autoUpdate = false
  dialogVisible.value = true
}

const handleBatchCreate = () => {
  batchForm.instanceIds = []
  batchForm.repoId = 0
  batchForm.targetPath = ''
  batchForm.autoUpdate = false
  batchDialogVisible.value = true
}

const handleEdit = (row: Binding) => {
  isEdit.value = true
  form.id = row.id
  form.instanceId = row.instanceId
  form.repoId = row.repoId
  form.targetPath = row.targetPath
  form.autoUpdate = row.autoUpdate
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data = {
        instanceId: form.instanceId,
        repoId: form.repoId,
        targetPath: form.targetPath,
        autoUpdate: form.autoUpdate
      }

      if (isEdit.value) {
        await updateBinding(form.id, data)
        ElMessage.success('更新绑定成功')
      } else {
        await createBinding(data)
        ElMessage.success('创建绑定成功')
      }
      dialogVisible.value = false
      loadData()
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新绑定失败' : '创建绑定失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleBatchSubmit = async () => {
  if (!batchFormRef.value) return

  await batchFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await batchCreateBindings({
        instanceIds: batchForm.instanceIds,
        repoId: batchForm.repoId,
        targetPath: batchForm.targetPath,
        autoUpdate: batchForm.autoUpdate
      })
      ElMessage.success(`成功创建 ${batchForm.instanceIds.length} 个绑定`)
      batchDialogVisible.value = false
      loadData()
    } catch (error) {
      ElMessage.error('批量创建绑定失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row: Binding) => {
  try {
    await ElMessageBox.confirm('确定要删除该绑定吗?', '确认删除', {
      type: 'warning'
    })

    await deleteBinding(row.id)
    ElMessage.success('删除绑定成功')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除绑定失败')
    }
  }
}

const handleSync = async (row: Binding) => {
  try {
    const loading = ElMessage.loading('正在同步，请稍候...')
    await syncBinding(row.id)
    loading.close()
    ElMessage.success('同步成功')
  } catch (error) {
    ElMessage.error('同步失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.bindings-page {
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

.table-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
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
</style>
