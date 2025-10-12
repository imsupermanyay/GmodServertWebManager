<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">启动项管理</h1>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        创建启动项
      </button>
    </div>

    <!-- 启动项列表 -->
    <div class="bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="option in options" :key="option.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ option.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ option.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(option.createdAt).toLocaleString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <button
                @click="viewOption(option)"
                class="text-green-600 hover:text-green-800 mr-3"
              >
                查看
              </button>
              <button
                @click="editOption(option)"
                class="text-blue-600 hover:text-blue-800 mr-3"
              >
                编辑
              </button>
              <button
                @click="deleteOption(option.id)"
                class="text-red-600 hover:text-red-800"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建启动项模态框 -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">创建启动项</h3>
        <form @submit.prevent="createOption">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">启动项名称</label>
            <input
              v-model="createForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 默认启动参数"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">启动参数</label>
            <textarea
              v-model="createForm.content"
              required
              rows="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="在此输入启动参数，例如: +gamemode sandbox +map gm_flatgrass"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">示例：+maxplayers 16 +gamemode sandbox +map gm_flatgrass</p>
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

    <!-- 编辑启动项模态框 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">编辑启动项</h3>
        <form @submit.prevent="updateOption">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">启动项名称</label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">启动参数</label>
            <textarea
              v-model="editForm.content"
              required
              rows="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            ></textarea>
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

    <!-- 查看启动项模态框 -->
    <div v-if="showViewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">查看启动项: {{ viewForm.name }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">启动参数</label>
          <pre class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm whitespace-pre-wrap">{{ viewForm.content }}</pre>
        </div>
        <div class="flex justify-end">
          <button
            @click="showViewModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { startupOptionsAPI } from '../../api'

const options = ref([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showViewModal = ref(false)
const createForm = ref({ name: '', content: '' })
const editForm = ref({ id: null, name: '', content: '' })
const viewForm = ref({ name: '', content: '' })

const loadOptions = async () => {
  try {
    const response = await startupOptionsAPI.getAll()
    options.value = response.data
  } catch (error) {
    alert('加载启动项列表失败')
  }
}

const createOption = async () => {
  try {
    await startupOptionsAPI.create(createForm.value)
    showCreateModal.value = false
    createForm.value = { name: '', content: '' }
    await loadOptions()
    alert('创建成功')
  } catch (error) {
    alert(error.response?.data?.message || '创建失败')
  }
}

const viewOption = (option) => {
  viewForm.value = { ...option }
  showViewModal.value = true
}

const editOption = (option) => {
  editForm.value = { ...option }
  showEditModal.value = true
}

const updateOption = async () => {
  try {
    await startupOptionsAPI.update(editForm.value.id, {
      name: editForm.value.name,
      content: editForm.value.content
    })
    showEditModal.value = false
    await loadOptions()
    alert('更新成功')
  } catch (error) {
    alert(error.response?.data?.message || '更新失败')
  }
}

const deleteOption = async (id) => {
  if (!confirm('确定要删除这个启动项吗？')) return

  try {
    await startupOptionsAPI.delete(id)
    await loadOptions()
    alert('删除成功')
  } catch (error) {
    alert(error.response?.data?.message || '删除失败')
  }
}

onMounted(() => {
  loadOptions()
})
</script>
