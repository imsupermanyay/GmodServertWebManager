<template>
  <div class="instances-page">
    <div class="page-header">
      <h2>实例管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建实例
      </el-button>
    </div>

    <el-card class="table-card">
      <el-table :data="instances" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <StatusBadge :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="port" label="端口" width="100" />
        <el-table-column prop="gamemode" label="游戏模式" width="150" />
        <el-table-column prop="map" label="地图" width="150" />
        <el-table-column prop="maxPlayers" label="最大玩家" width="100" />
        <el-table-column label="在线" width="100">
          <template #default="{ row }">
            <span v-if="row.status === 'running'">
              {{ row.players || 0 }} / {{ row.maxPlayers }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="320">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'stopped'"
              type="success"
              size="small"
              @click="handleStart(row)"
            >
              启动
            </el-button>
            <el-button
              v-if="row.status === 'running'"
              type="warning"
              size="small"
              @click="handleStop(row)"
            >
              停止
            </el-button>
            <el-button
              v-if="row.status === 'running'"
              type="primary"
              size="small"
              @click="handleRestart(row)"
            >
              重启
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

    <!-- 创建/编辑实例对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑实例' : '创建实例'"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="实例名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入实例名称" />
        </el-form-item>
        <el-form-item label="安装路径" prop="path">
          <el-input v-model="form.path" placeholder="例如: D:/GmodServer" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="form.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="最大玩家数" prop="maxPlayers">
          <el-input-number v-model="form.maxPlayers" :min="1" :max="128" />
        </el-form-item>
        <el-form-item label="游戏模式" prop="gamemode">
          <el-input v-model="form.gamemode" placeholder="例如: sandbox" />
        </el-form-item>
        <el-form-item label="地图" prop="map">
          <el-input v-model="form.map" placeholder="例如: gm_flatgrass" />
        </el-form-item>
        <el-form-item label="创意工坊合集">
          <el-input v-model="form.workshopCollection" placeholder="创意工坊合集ID(可选)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  getAllInstances,
  createInstance,
  updateInstance,
  deleteInstance,
  startInstance,
  stopInstance,
  restartInstance,
  type Instance
} from '@/api/instances'

const loading = ref(false)
const instances = ref<Instance[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  name: '',
  path: '',
  port: 27015,
  maxPlayers: 16,
  gamemode: 'sandbox',
  map: 'gm_flatgrass',
  workshopCollection: ''
})

const rules = {
  name: [{ required: true, message: '请输入实例名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入安装路径', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  maxPlayers: [{ required: true, message: '请输入最大玩家数', trigger: 'blur' }],
  gamemode: [{ required: true, message: '请输入游戏模式', trigger: 'blur' }],
  map: [{ required: true, message: '请输入地图', trigger: 'blur' }]
}

const loadInstances = async () => {
  loading.value = true
  try {
    instances.value = await getAllInstances()
  } catch (error) {
    ElMessage.error('加载实例列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = 0
  form.name = ''
  form.path = ''
  form.port = 27015
  form.maxPlayers = 16
  form.gamemode = 'sandbox'
  form.map = 'gm_flatgrass'
  form.workshopCollection = ''
  dialogVisible.value = true
}

const handleEdit = (row: Instance) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.path = row.path
  form.port = row.port
  form.maxPlayers = row.maxPlayers
  form.gamemode = row.gamemode
  form.map = row.map
  form.workshopCollection = row.workshopCollection || ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data: any = {
        name: form.name,
        path: form.path,
        port: form.port,
        maxPlayers: form.maxPlayers,
        gamemode: form.gamemode,
        map: form.map
      }
      if (form.workshopCollection) {
        data.workshopCollection = form.workshopCollection
      }

      if (isEdit.value) {
        await updateInstance(form.id, data)
        ElMessage.success('更新实例成功')
      } else {
        await createInstance(data)
        ElMessage.success('创建实例成功')
      }
      dialogVisible.value = false
      loadInstances()
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新实例失败' : '创建实例失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row: Instance) => {
  try {
    await ElMessageBox.confirm(`确定要删除实例 "${row.name}" 吗?`, '确认删除', {
      type: 'warning'
    })

    await deleteInstance(row.id)
    ElMessage.success('删除实例成功')
    loadInstances()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除实例失败')
    }
  }
}

const handleStart = async (row: Instance) => {
  try {
    await startInstance(row.id)
    ElMessage.success('实例启动成功')
    loadInstances()
  } catch (error) {
    ElMessage.error('实例启动失败')
  }
}

const handleStop = async (row: Instance) => {
  try {
    await ElMessageBox.confirm(`确定要停止实例 "${row.name}" 吗?`, '确认操作', {
      type: 'warning'
    })

    await stopInstance(row.id)
    ElMessage.success('实例停止成功')
    loadInstances()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('实例停止失败')
    }
  }
}

const handleRestart = async (row: Instance) => {
  try {
    await ElMessageBox.confirm(`确定要重启实例 "${row.name}" 吗?`, '确认操作', {
      type: 'warning'
    })

    await restartInstance(row.id)
    ElMessage.success('实例重启成功')
    loadInstances()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('实例重启失败')
    }
  }
}

onMounted(() => {
  loadInstances()
})
</script>

<style scoped>
.instances-page {
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
