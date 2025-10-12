<template>
  <div class="fixed top-4 right-4 z-[1000] flex flex-col space-y-3 w-80 max-w-[90vw]" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="rounded-lg shadow-lg border-l-4 overflow-hidden bg-white"
        :class="typeClasses[item.type] || typeClasses.info"
      >
        <div class="flex items-start px-4 py-3 space-x-3">
          <div class="flex-shrink-0 pt-1">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold"
              :class="iconClasses[item.type] || iconClasses.info"
            >
              {{ icons[item.type] || icons.info }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p v-if="item.title" class="text-sm font-semibold text-gray-900 mb-1">
              {{ item.title }}
            </p>
            <p class="text-sm text-gray-700 break-words">
              {{ item.message }}
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-gray-600 transition"
            aria-label="关闭通知"
            @click="remove(item.id)"
          >
            ×
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useNotificationStore } from '../stores/notifications'

const notificationStore = useNotificationStore()
const { items } = storeToRefs(notificationStore)

const remove = (id) => notificationStore.remove(id)

const typeClasses = computed(() => ({
  success: 'border-green-500',
  error: 'border-red-500',
  warning: 'border-yellow-500',
  info: 'border-blue-500'
}))

const iconClasses = computed(() => ({
  success: 'bg-green-100 text-green-600',
  error: 'bg-red-100 text-red-600',
  warning: 'bg-yellow-100 text-yellow-600',
  info: 'bg-blue-100 text-blue-600'
}))

const icons = computed(() => ({
  success: '✓',
  error: '!',
  warning: '⚠',
  info: 'i'
}))
</script>

<style scoped>
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
</style>

