<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold text-gray-800">模式链接管理</h1>
      <p class="text-sm text-gray-500">
        将实例宿主目录软链接到指定的游戏模式目录，以便不同实例共享同一套模式资源。
      </p>
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="refreshing || loading"
          @click="loadData(true)"
        >
          刷新数据
        </button>
        <span v-if="refreshing" class="text-xs text-gray-500">正在刷新...</span>
      </div>
    </header>

    <section
      v-if="loading && !refreshing"
      class="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-12 text-gray-500"
    >
      正在处理请求，请稍候...
    </section>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800">实例目录</h2>
          <span class="text-xs text-gray-500">根目录：{{ hostRoot }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-2 pr-4">实例名称</th>
                <th class="py-2 pr-4">绑定状态</th>
                <th class="py-2 pr-4">目标模式</th>
                <th class="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="instance in instanceLinks"
                :key="instance.name"
                class="border-t border-gray-100"
              >
                <td class="py-2 pr-4 font-medium text-gray-800">
                  {{ instance.name }}
                </td>
                <td class="py-2 pr-4">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="instance.isSymlink ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'"
                  >
                    {{ instance.isSymlink ? '已绑定' : '未绑定' }}
                  </span>
                </td>
                <td class="py-2 pr-4 text-gray-700">
                  {{ instance.linkedModeName || '——' }}
                </td>
                <td class="py-2 flex flex-wrap gap-2">
                  <button
                    class="px-2 py-1 text-xs rounded border border-blue-400 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="loading"
                    @click="selectInstance(instance.name, instance.linkedModeName)"
                  >
                    选择
                  </button>
                  <button
                    class="px-2 py-1 text-xs rounded border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="loading || !instance.isSymlink"
                    @click="unbindLink(instance.name)"
                  >
                    解除绑定
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="instanceLinks.length === 0" class="py-6 text-center text-sm text-gray-500">
            未发现任何实例目录。
          </p>
        </div>
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800">可用游戏模式</h2>
          <span class="text-xs text-gray-500">根目录：{{ modeRoot }}</span>
        </div>
        <div class="rounded border border-gray-100">
          <ul class="max-h-72 overflow-auto divide-y divide-gray-100 text-sm">
            <li
              v-for="mode in gamemodes"
              :key="mode.name"
              class="flex items-center justify-between px-4 py-2"
            >
              <span class="font-medium text-gray-700">{{ mode.name }}</span>
              <button
                class="px-2 py-1 text-xs rounded border border-blue-400 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loading"
                @click="selectMode(mode.name)"
              >
                选择
              </button>
            </li>
          </ul>
          <p v-if="gamemodes.length === 0" class="py-4 text-center text-sm text-gray-500">
            未发现任何模式目录。
          </p>
        </div>
      </section>
    </div>

    <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h2 class="text-lg font-semibold text-gray-800">绑定操作</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">实例名称</label>
          <select
            v-model="selectedInstance"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            :disabled="loading"
          >
            <option value="" disabled>请选择实例</option>
            <option
              v-for="instance in instanceLinks"
              :key="`select-${instance.name}`"
              :value="instance.name"
            >
              {{ instance.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">模式名称</label>
          <select
            v-model="selectedMode"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            :disabled="loading"
          >
            <option value="" disabled>请选择模式</option>
            <option
              v-for="mode in gamemodes"
              :key="`mode-${mode.name}`"
              :value="mode.name"
            >
              {{ mode.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="px-4 py-2 rounded-md bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || !selectedInstance || !selectedMode"
          @click="bindLink"
        >
          绑定模式
        </button>
        <span class="text-xs text-gray-500">
          当前选择：{{ selectedInstance || '—' }} → {{ selectedMode || '—' }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { instancesAPI } from '../../api'
import { useNotificationStore } from '../../stores/notifications'

const notifications = useNotificationStore()

const instanceLinks = ref([])
const gamemodes = ref([])
const selectedInstance = ref('')
const selectedMode = ref('')
const loading = ref(false)
const refreshing = ref(false)

const hostRoot = '/opt/gmodserver'
const modeRoot = '/opt/gmodgamemodes'

const loadData = async (showSpinner = false) => {
  if (showSpinner) {
    refreshing.value = true
  }
  try {
    const [instancesRes, modesRes] = await Promise.all([
      instancesAPI.getModeLinkInstances(),
      instancesAPI.getModeLinkGamemodes()
    ])
    instanceLinks.value = instancesRes.data || []
    gamemodes.value = modesRes.data || []
  } catch (error) {
    notifications.error(error.response?.data?.message || '加载模式链接数据失败')
  } finally {
    refreshing.value = false
  }
}

const bindLink = async () => {
  if (!selectedInstance.value || !selectedMode.value) {
    notifications.error('请选择实例和模式后再执行绑定操作')
    return
  }
  loading.value = true
  try {
    await instancesAPI.bindModeLink({
      instanceName: selectedInstance.value,
      modeName: selectedMode.value
    })
    notifications.success('绑定成功')
    await loadData(false)
  } catch (error) {
    notifications.error(error.response?.data?.message || '绑定失败')
  } finally {
    loading.value = false
  }
}

const unbindLink = async (instanceName) => {
  if (!instanceName) return
  loading.value = true
  try {
    await instancesAPI.unbindModeLink({ instanceName })
    notifications.success('链接已解除')
    await loadData(false)
    if (selectedInstance.value === instanceName) {
      selectedInstance.value = ''
    }
  } catch (error) {
    notifications.error(error.response?.data?.message || '解除链接失败')
  } finally {
    loading.value = false
  }
}

const selectInstance = (name, linkedMode) => {
  selectedInstance.value = name
  if (linkedMode) {
    selectedMode.value = linkedMode
  }
}

const selectMode = (modeName) => {
  selectedMode.value = modeName
}

onMounted(() => {
  loadData(true)
})
</script>
