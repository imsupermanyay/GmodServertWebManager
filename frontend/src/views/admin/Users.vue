<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建用户
      </el-button>
    </div>

    <el-card class="table-card">
      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="200" />
        <el-table-column label="角色" width="150">
          <template #default="{ row }">
            <el-tag :type="row.role === 'SUPER_ADMIN' ? 'danger' : 'success'">
              {{ row.role === 'SUPER_ADMIN' ? '超级管理员' : '管理员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="200">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="200">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '创建用户'"
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
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
import { getAllUsers, createUser, updateUser, deleteUser, type User } from '@/api/users'

const loading = ref(false)
const users = ref<User[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  username: '',
  password: '',
  role: 'ADMIN' as 'SUPER_ADMIN' | 'ADMIN'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      required: true,
      validator: (rule: any, value: string, callback: any) => {
        if (!isEdit.value && !value) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const loadUsers = async () => {
  loading.value = true
  try {
    users.value = await getAllUsers()
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = 0
  form.username = ''
  form.password = ''
  form.role = 'ADMIN'
  dialogVisible.value = true
}

const handleEdit = (row: User) => {
  isEdit.value = true
  form.id = row.id
  form.username = row.username
  form.password = ''
  form.role = row.role
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      if (isEdit.value) {
        const updateData: any = {
          username: form.username,
          role: form.role
        }
        if (form.password) {
          updateData.password = form.password
        }
        await updateUser(form.id, updateData)
        ElMessage.success('更新用户成功')
      } else {
        await createUser({
          username: form.username,
          password: form.password,
          role: form.role
        })
        ElMessage.success('创建用户成功')
      }
      dialogVisible.value = false
      loadUsers()
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新用户失败' : '创建用户失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗?`, '确认删除', {
      type: 'warning'
    })

    await deleteUser(row.id)
    ElMessage.success('删除用户成功')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除用户失败')
    }
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
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
