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
        class="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-200 transition p-6 flex flex-col h-full"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span
                class="h-2.5 w-2.5 rounded-full"
                :class="getStatusIndicatorClass(instance.status)"
              ></span>
              <h3 class="text-lg font-semibold text-gray-900">{{ instance.name }}</h3>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              创建于 {{ formatDateTime(instance.createdAt) }}
            </p>
          </div>
          <span
            class="px-2 py-1 rounded-full text-xs font-semibold"
            :class="getStatusClass(instance.status)"
          >
            {{ getStatusText(instance.status) }}
          </span>
        </div>

        <div class="mt-5 space-y-4 text-sm text-gray-700">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-400 mb-1">Docker ID</p>
            <div
              class="text-xs font-mono bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg break-all"
              :title="instance.dockerId || '未设置'"
            >
              {{ instance.dockerId || '未设置' }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <p class="text-gray-500 uppercase tracking-wide text-[11px]">容器名</p>
              <p class="text-gray-900 font-medium truncate" :title="instance.containerName || '未设置'">
                {{ instance.containerName || '未设置' }}
              </p>
            </div>
            <div class="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <p class="text-gray-500 uppercase tracking-wide text-[11px]">管理员</p>
              <p class="text-gray-900 font-medium">
                {{ instance.admin?.username || '未分配' }}
              </p>
            </div>
          </div>

          <div v-if="instance.dockerImage" class="text-xs">
            <p class="text-gray-500 uppercase tracking-wide text-[11px] mb-1">镜像</p>
            <p class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono break-all">
              {{ instance.dockerImage }}
            </p>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            @click="editInstance(instance)"
            class="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
          >
            编辑
          </button>
          <button
            @click="deleteInstance(instance.id)"
            class="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
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
            <label class="block text-sm font-medium text-gray-700 mb-2">容器目录 <span class="text-red-500">*</span></label>
            <select
              v-model="createForm.containerDirectory"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="/opt/steam/garrysmod/addons">/opt/steam/garrysmod/addons</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">插件目录挂载</p>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">宿主机目录 <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.hostDirectory"
              type="text"
              required
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="将根据实例名称自动生成"
            />
            <p class="text-xs text-gray-500 mt-1">自动生成：/opt/gmodserver/{实例名称}/</p>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Docker 镜像（可选）</label>
            <input
              v-model="createForm.dockerImage"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="默认: hackebein/garrysmod"
            />
            <p class="text-xs text-gray-500 mt-1">留空则使用默认镜像 hackebein/garrysmod</p>
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
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">实例名称不可修改</p>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">容器目录 <span class="text-red-500">*</span></label>
            <select
              v-model="editForm.containerDirectory"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="/opt/steam/garrysmod/addons">/opt/steam/garrysmod/addons</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">宿主机目录 <span class="text-red-500">*</span></label>
            <input
              v-model="editForm.hostDirectory"
              type="text"
              required
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">宿主机目录不可修改</p>
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
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">CFG 模板</label>
            <select
              v-model="editForm.cfgTemplateId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option :value="null">不使用模板</option>
              <option v-for="template in cfgTemplates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">启动项</label>
            <select
              v-model="editForm.startupOptionId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option :value="null">不使用启动项</option>
              <option v-for="option in startupOptions" :key="option.id" :value="option.id">
                {{ option.name }}
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
import { ref, onMounted, watch } from 'vue'
import { instancesAPI, usersAPI, cfgTemplatesAPI, startupOptionsAPI } from '../../api'
import { useNotificationStore } from '../../stores/notifications'

const notifications = useNotificationStore()

const instances = ref([])
const adminUsers = ref([])
const cfgTemplates = ref([])
const startupOptions = ref([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const createForm = ref({
  name: '',
  dockerImage: '',
  hostDirectory: '',
  containerDirectory: '/opt/steam/garrysmod/addons'
})
const editForm = ref({
  id: null,
  name: '',
  hostDirectory: '',
  containerDirectory: '',
  adminId: null,
  cfgTemplateId: null,
  startupOptionId: null
})

// 监听实例名称变化，自动生成宿主机目录
watch(() => createForm.value.name, (newName) => {
  if (newName) {
    createForm.value.hostDirectory = `/opt/gmodserver/${newName}/`
  } else {
    createForm.value.hostDirectory = ''
  }
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

const getStatusIndicatorClass = (status) => {
  const classes = {
    RUNNING: 'bg-green-500',
    STOPPED: 'bg-gray-400',
    RESTARTING: 'bg-yellow-500 animate-pulse',
    ERROR: 'bg-red-500'
  }
  return classes[status] || 'bg-gray-400'
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

const formatDateTime = (value) => {
  if (!value) return '未知'
  try {
    return new Date(value).toLocaleString()
  } catch (err) {
    return value
  }
}

const loadInstances = async () => {
  try {
    const response = await instancesAPI.getAll()
    instances.value = response.data
  } catch (error) {
    notifications.error('加载实例列表失败', { title: '请求失败' })
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

const loadCfgTemplates = async () => {
  try {
    const response = await cfgTemplatesAPI.getAll()
    cfgTemplates.value = response.data
  } catch (error) {
    console.error('加载CFG模板列表失败')
  }
}

const loadStartupOptions = async () => {
  try {
    const response = await startupOptionsAPI.getAll()
    startupOptions.value = response.data
  } catch (error) {
    console.error('加载启动项列表失败')
  }
}

const createInstance = async () => {
  try {
    await instancesAPI.create(createForm.value)
    showCreateModal.value = false
    createForm.value = { name: '', dockerImage: '', hostDirectory: '', containerDirectory: '' }
    await loadInstances()
    notifications.success('实例创建成功')
  } catch (error) {
    notifications.error(error.response?.data?.message || '创建失败', { title: '创建实例失败' })
  }
}

const editInstance = (instance) => {
  editForm.value = {
    id: instance.id,
    name: instance.name,
    hostDirectory: instance.hostDirectory || '',
    containerDirectory: instance.containerDirectory || '',
    adminId: instance.adminId || null,
    cfgTemplateId: instance.cfgTemplateId || null,
    startupOptionId: instance.startupOptionId || null
  }
  showEditModal.value = true
}

const updateInstance = async () => {
  try {
    const { id, ...data } = editForm.value
    await instancesAPI.update(id, data)
    showEditModal.value = false
    await loadInstances()
    notifications.success('实例更新成功')
  } catch (error) {
    notifications.error(error.response?.data?.message || '更新失败', { title: '更新实例失败' })
  }
}

const deleteInstance = async (id) => {
  if (!confirm('确定要删除这个实例吗？')) return

  try {
    await instancesAPI.delete(id)
    await loadInstances()
    notifications.success('实例删除成功')
  } catch (error) {
    notifications.error(error.response?.data?.message || '删除失败', { title: '删除实例失败' })
  }
}

onMounted(() => {
  loadInstances()
  loadAdminUsers()
  loadCfgTemplates()
  loadStartupOptions()
})
</script>
