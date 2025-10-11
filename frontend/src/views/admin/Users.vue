<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">管理员管理</h1>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        创建管理员
      </button>
    </div>

    <!-- 管理员列表 -->
    <div class="bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">账号</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.username }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span
                class="px-2 py-1 rounded-full text-xs"
                :class="user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'"
              >
                {{ user.role === 'SUPER_ADMIN' ? '超级管理员' : '普通管理员' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span
                class="px-2 py-1 rounded-full text-xs"
                :class="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ user.isActive ? '激活' : '禁用' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(user.createdAt).toLocaleString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <button
                v-if="user.role !== 'SUPER_ADMIN'"
                @click="editUser(user)"
                class="text-blue-600 hover:text-blue-800 mr-3"
              >
                编辑
              </button>
              <button
                v-if="user.role !== 'SUPER_ADMIN'"
                @click="deleteUser(user.id)"
                class="text-red-600 hover:text-red-800"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建管理员模态框 -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">创建管理员</h3>
        <form @submit.prevent="createUser">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">账号</label>
            <input
              v-model="createForm.username"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <input
              v-model="createForm.password"
              type="password"
              required
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑管理员模态框 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">编辑管理员</h3>
        <form @submit.prevent="updateUser">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">账号</label>
            <input
              v-model="editForm.username"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">新密码（留空则不修改）</label>
            <input
              v-model="editForm.password"
              type="password"
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usersAPI } from '../../api'

const users = ref([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const createForm = ref({ username: '', password: '' })
const editForm = ref({ id: null, username: '', password: '' })

const loadUsers = async () => {
  try {
    const response = await usersAPI.getAll()
    users.value = response.data
  } catch (error) {
    alert('加载用户列表失败')
  }
}

const createUser = async () => {
  try {
    await usersAPI.create(createForm.value)
    showCreateModal.value = false
    createForm.value = { username: '', password: '' }
    await loadUsers()
    alert('创建成功')
  } catch (error) {
    alert(error.response?.data?.message || '创建失败')
  }
}

const editUser = (user) => {
  editForm.value = { id: user.id, username: user.username, password: '' }
  showEditModal.value = true
}

const updateUser = async () => {
  try {
    const data = { username: editForm.value.username }
    if (editForm.value.password) {
      data.password = editForm.value.password
    }
    await usersAPI.update(editForm.value.id, data)
    showEditModal.value = false
    await loadUsers()
    alert('更新成功')
  } catch (error) {
    alert(error.response?.data?.message || '更新失败')
  }
}

const deleteUser = async (id) => {
  if (!confirm('确定要删除这个管理员吗？')) return

  try {
    await usersAPI.delete(id)
    await loadUsers()
    alert('删除成功')
  } catch (error) {
    alert(error.response?.data?.message || '删除失败')
  }
}

onMounted(() => {
  loadUsers()
})
</script>
