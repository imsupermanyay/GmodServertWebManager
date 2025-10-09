<template>
  <div class="repos-page">
    <div class="page-header">
      <h2>仓库管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        添加仓库
      </el-button>
    </div>

    <el-card class="table-card">
      <el-table :data="repos" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="url" label="仓库URL" min-width="300" />
        <el-table-column prop="branch" label="分支" width="120" />
        <el-table-column prop="localPath" label="本地路径" width="200" />
        <el-table-column label="最后拉取" width="180">
          <template #default="{ row }">
            {{ row.lastPulled ? formatTime(row.lastPulled) : '未拉取' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="300">
          <template #default="{ row }">
            <el-button type="success" size="small" @click="handleClone(row)">
              克隆
            </el-button>
            <el-button type="primary" size="small" @click="handlePull(row)">
              拉取
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

    <!-- 创建/编辑仓库对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑仓库' : '添加仓库'"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="仓库名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入仓库名称" />
        </el-form-item>
        <el-form-item label="仓库URL" prop="url">
          <el-input v-model="form.url" placeholder="例如: https://github.com/user/repo.git" />
        </el-form-item>
        <el-form-item label="分支" prop="branch">
          <el-input v-model="form.branch" placeholder="例如: main" />
        </el-form-item>
        <el-form-item label="本地路径" prop="localPath">
          <el-input v-model="form.localPath" placeholder="例如: D:/Repos/MyRepo" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="仓库描述(可选)"
          />
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
import {
  getAllRepos,
  createRepo,
  updateRepo,
  deleteRepo,
  cloneRepo,
  pullRepo,
  type Repo
} from '@/api/repos'

const loading = ref(false)
const repos = ref<Repo[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  name: '',
  url: '',
  branch: 'main',
  localPath: '',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }],
  url: [{ required: true, message: '请输入仓库URL', trigger: 'blur' }],
  branch: [{ required: true, message: '请输入分支名称', trigger: 'blur' }],
  localPath: [{ required: true, message: '请输入本地路径', trigger: 'blur' }]
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const loadRepos = async () => {
  loading.value = true
  try {
    repos.value = await getAllRepos()
  } catch (error) {
    ElMessage.error('加载仓库列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = 0
  form.name = ''
  form.url = ''
  form.branch = 'main'
  form.localPath = ''
  form.description = ''
  dialogVisible.value = true
}

const handleEdit = (row: Repo) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.url = row.url
  form.branch = row.branch
  form.localPath = row.localPath
  form.description = row.description || ''
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
        url: form.url,
        branch: form.branch,
        localPath: form.localPath
      }
      if (form.description) {
        data.description = form.description
      }

      if (isEdit.value) {
        await updateRepo(form.id, data)
        ElMessage.success('更新仓库成功')
      } else {
        await createRepo(data)
        ElMessage.success('添加仓库成功')
      }
      dialogVisible.value = false
      loadRepos()
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新仓库失败' : '添加仓库失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row: Repo) => {
  try {
    await ElMessageBox.confirm(`确定要删除仓库 "${row.name}" 吗?`, '确认删除', {
      type: 'warning'
    })

    await deleteRepo(row.id)
    ElMessage.success('删除仓库成功')
    loadRepos()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除仓库失败')
    }
  }
}

const handleClone = async (row: Repo) => {
  try {
    await ElMessageBox.confirm(`确定要克隆仓库 "${row.name}" 吗?`, '确认操作', {
      type: 'info'
    })

    const loading = ElMessage.loading('正在克隆仓库，请稍候...')
    await cloneRepo(row.id)
    loading.close()
    ElMessage.success('克隆仓库成功')
    loadRepos()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('克隆仓库失败')
    }
  }
}

const handlePull = async (row: Repo) => {
  try {
    const loading = ElMessage.loading('正在拉取更新，请稍候...')
    await pullRepo(row.id)
    loading.close()
    ElMessage.success('拉取更新成功')
    loadRepos()
  } catch (error) {
    ElMessage.error('拉取更新失败')
  }
}

onMounted(() => {
  loadRepos()
})
</script>

<style scoped>
.repos-page {
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
