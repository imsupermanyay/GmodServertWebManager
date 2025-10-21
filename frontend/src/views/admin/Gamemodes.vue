<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">模式管理</h1>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        新增模式
      </button>
    </div>

    <!-- 模式列表 -->
    <div class="bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模式名</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Online 目录</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dev 目录</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Core 目录</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Build 目录</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="mode in gamemodes" :key="mode.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ mode.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ mode.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">
              <div class="max-w-xs truncate" :title="mode.onlineDir">{{ mode.onlineDir }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              <div class="max-w-xs truncate" :title="mode.devDir">{{ mode.devDir }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              <div class="max-w-xs truncate" :title="mode.coreDir">{{ mode.coreDir }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              <div class="max-w-xs truncate" :title="mode.buildDir">{{ mode.buildDir }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(mode.createdAt).toLocaleString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <button
                @click="viewDetails(mode)"
                class="text-blue-600 hover:text-blue-800 mr-3"
              >
                查看
              </button>
              <button
                @click="editGamemode(mode)"
                class="text-green-600 hover:text-green-800 mr-3"
              >
                编辑
              </button>
              <button
                @click="deleteGamemode(mode.id)"
                class="text-red-600 hover:text-red-800"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建/编辑模式模态框 -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">{{ showEditModal ? '编辑模式' : '新增模式' }}</h3>
        <form @submit.prevent="showEditModal ? updateGamemode() : createGamemode()">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">模式名 *</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="例如: ttt"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">将用于识别仓库名称，如: ttt_core, ttt_dev</p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Online 目录 *</label>
              <input
                v-model="form.onlineDir"
                type="text"
                required
                placeholder="/opt/allgamemodes/ttt_online"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Online 仓库地址 *</label>
              <input
                v-model="form.onlineRepoUrl"
                type="text"
                required
                placeholder="https://git.example.com/ttt_online.git"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Dev 目录 *</label>
              <input
                v-model="form.devDir"
                type="text"
                required
                placeholder="/opt/allgamemodes/ttt_dev"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Dev 仓库地址 *</label>
              <input
                v-model="form.devRepoUrl"
                type="text"
                required
                placeholder="https://git.example.com/ttt_dev.git"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Core 目录 *</label>
              <input
                v-model="form.coreDir"
                type="text"
                required
                placeholder="/opt/allgamemodes/ttt_core"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Build 目录 *</label>
              <input
                v-model="form.buildDir"
                type="text"
                required
                placeholder="/opt/allgamemodes/ttt_build"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <p class="text-sm text-blue-800">
              <strong>提示：</strong>请确保你已经在服务器上手动创建并初始化了这些目录，并绑定了对应的远程仓库。
            </p>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {{ showEditModal ? '更新' : '创建' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 详情模态框 -->
    <div v-if="showDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl">
        <h3 class="text-xl font-bold mb-4">模式详情</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">模式名</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedMode?.name }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Online 目录</label>
              <p class="mt-1 text-sm text-gray-900 break-all">{{ selectedMode?.onlineDir }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Online 仓库</label>
              <p class="mt-1 text-sm text-blue-600 break-all">{{ selectedMode?.onlineRepoUrl }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Dev 目录</label>
              <p class="mt-1 text-sm text-gray-900 break-all">{{ selectedMode?.devDir }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Dev 仓库</label>
              <p class="mt-1 text-sm text-blue-600 break-all">{{ selectedMode?.devRepoUrl }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Core 目录</label>
              <p class="mt-1 text-sm text-gray-900 break-all">{{ selectedMode?.coreDir }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Build 目录</label>
              <p class="mt-1 text-sm text-gray-900 break-all">{{ selectedMode?.buildDir }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">创建时间</label>
              <p class="mt-1 text-sm text-gray-900">{{ new Date(selectedMode?.createdAt).toLocaleString() }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">更新时间</label>
              <p class="mt-1 text-sm text-gray-900">{{ new Date(selectedMode?.updatedAt).toLocaleString() }}</p>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            @click="showDetailsModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { gamemodesAPI } from '../../api'

export default {
  name: 'Gamemodes',
  setup() {
    const gamemodes = ref([])
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const showDetailsModal = ref(false)
    const selectedMode = ref(null)
    const editingId = ref(null)

    const form = ref({
      name: '',
      onlineDir: '',
      onlineRepoUrl: '',
      devDir: '',
      devRepoUrl: '',
      coreDir: '',
      buildDir: ''
    })

    const loadGamemodes = async () => {
      try {
        const response = await gamemodesAPI.getAll()
        gamemodes.value = response.data
      } catch (error) {
        console.error('加载模式列表失败:', error)
        alert('加载模式列表失败: ' + (error.response?.data?.message || error.message))
      }
    }

    const createGamemode = async () => {
      try {
        await gamemodesAPI.create(form.value)
        alert('创建成功')
        closeModal()
        await loadGamemodes()
      } catch (error) {
        console.error('创建模式失败:', error)
        alert('创建失败: ' + (error.response?.data?.message || error.message))
      }
    }

    const editGamemode = (mode) => {
      editingId.value = mode.id
      form.value = {
        name: mode.name,
        onlineDir: mode.onlineDir,
        onlineRepoUrl: mode.onlineRepoUrl,
        devDir: mode.devDir,
        devRepoUrl: mode.devRepoUrl,
        coreDir: mode.coreDir,
        buildDir: mode.buildDir
      }
      showEditModal.value = true
    }

    const updateGamemode = async () => {
      try {
        await gamemodesAPI.update(editingId.value, form.value)
        alert('更新成功')
        closeModal()
        await loadGamemodes()
      } catch (error) {
        console.error('更新模式失败:', error)
        alert('更新失败: ' + (error.response?.data?.message || error.message))
      }
    }

    const deleteGamemode = async (id) => {
      if (!confirm('确定要删除这个模式吗？')) {
        return
      }

      try {
        await gamemodesAPI.delete(id)
        alert('删除成功')
        await loadGamemodes()
      } catch (error) {
        console.error('删除模式失败:', error)
        alert('删除失败: ' + (error.response?.data?.message || error.message))
      }
    }

    const viewDetails = (mode) => {
      selectedMode.value = mode
      showDetailsModal.value = true
    }

    const closeModal = () => {
      showCreateModal.value = false
      showEditModal.value = false
      editingId.value = null
      form.value = {
        name: '',
        onlineDir: '',
        onlineRepoUrl: '',
        devDir: '',
        devRepoUrl: '',
        coreDir: '',
        buildDir: ''
      }
    }

    onMounted(() => {
      loadGamemodes()
    })

    return {
      gamemodes,
      showCreateModal,
      showEditModal,
      showDetailsModal,
      selectedMode,
      form,
      loadGamemodes,
      createGamemode,
      editGamemode,
      updateGamemode,
      deleteGamemode,
      viewDetails,
      closeModal
    }
  }
}
</script>

<style scoped>
/* 添加一些滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
