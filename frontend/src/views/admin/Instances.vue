<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">游戏实例管理</h1>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        创建实例
      </button>
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
            class="px-2 py-1 rounded-full text-xs"
            :class="getStatusClass(instance.status)"
          >
            {{ getStatusText(instance.status) }}
          </span>
        </div>

        <div class="space-y-2 text-sm text-gray-600 mb-4">
          <p><span class="font-medium">Docker ID:</span> {{ instance.dockerId || '未设置' }}</p>
          <p><span class="font-medium">容器名:</span> {{ instance.containerName || '未设置' }}</p>
          <p><span class="font-medium">管理员:</span> {{ instance.admin?.username || '未分配' }}</p>
        </div>

        <div class="flex space-x-2">
          <button
            @click="editInstance(instance)"
            class="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            编辑
          </button>
          <button
            @click="deleteInstance(instance.id)"
            class="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 创建实例模态框 -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">创建游戏实例</h3>
        <form @submit.prevent="createInstance">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">实例名称</label>
            <input
              v-model="createForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: gmod-server-1"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">宿主机目录（可选）</label>
            <input
              v-model="createForm.hostDirectory"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: /srv/gmod/server1"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">容器目录（可选）</label>
            <input
              v-model="createForm.containerDirectory"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: /app/garrysmod"
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

    <!-- 编辑实例模态框 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">编辑实例</h3>
        <form @submit.prevent="updateInstance">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">实例名称</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">宿主机目录</label>
            <input
              v-model="editForm.hostDirectory"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">容器目录</label>
            <input
              v-model="editForm.containerDirectory"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">分配管理员</label>
            <select
              v-model="editForm.adminId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option :value="null">不分配</option>
              <option v-for="user in adminUsers" :key="user.id" :value="user.id">
                {{ user.username }}
              </option>
            </select>
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
import { instancesAPI, usersAPI } from '../../api'

const instances = ref([])
const adminUsers = ref([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const createForm = ref({
  name: '',
  hostDirectory: '',
  containerDirectory: ''
})
const editForm = ref({
  id: null,
  name: '',
  hostDirectory: '',
  containerDirectory: '',
  adminId: null
})

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
    const response = await instancesAPI.getAll()
    instances.value = response.data
  } catch (error) {
    alert('加载实例列表失败')
  }
}

const loadAdminUsers = async () => {
  try {
    const response = await usersAPI.getAll()
    adminUsers.value = response.data.filter(u => u.role === 'ADMIN')
  } catch (error) {
    console.error('加载管理员列表失败')
  }
}

const createInstance = async () => {
  try {
    await instancesAPI.create(createForm.value)
    showCreateModal.value = false
    createForm.value = { name: '', hostDirectory: '', containerDirectory: '' }
    await loadInstances()
    alert('创建成功')
  } catch (error) {
    alert(error.response?.data?.message || '创建失败')
  }
}

const editInstance = (instance) => {
  editForm.value = {
    id: instance.id,
    name: instance.name,
    hostDirectory: instance.hostDirectory || '',
    containerDirectory: instance.containerDirectory || '',
    adminId: instance.adminId || null
  }
  showEditModal.value = true
}

const updateInstance = async () => {
  try {
    const { id, ...data } = editForm.value
    await instancesAPI.update(id, data)
    showEditModal.value = false
    await loadInstances()
    alert('更新成功')
  } catch (error) {
    alert(error.response?.data?.message || '更新失败')
  }
}

const deleteInstance = async (id) => {
  if (!confirm('确定要删除这个实例吗？')) return

  try {
    await instancesAPI.delete(id)
    await loadInstances()
    alert('删除成功')
  } catch (error) {
    alert(error.response?.data?.message || '删除失败')
  }
}

onMounted(() => {
  loadInstances()
  loadAdminUsers()
})
</script>
