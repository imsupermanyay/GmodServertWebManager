<template>
  <el-tag :type="statusType" :effect="effect" size="small">
    <el-icon v-if="showIcon" class="status-icon">
      <component :is="statusIcon" />
    </el-icon>
    {{ statusText }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'

interface Props {
  status: 'running' | 'stopped'
  showIcon?: boolean
  effect?: 'dark' | 'light' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  effect: 'dark'
})

const statusType = computed(() => {
  return props.status === 'running' ? 'success' : 'info'
})

const statusText = computed(() => {
  return props.status === 'running' ? '运行中' : '已停止'
})

const statusIcon = computed(() => {
  return props.status === 'running' ? VideoPlay : VideoPause
})
</script>

<style scoped>
.status-icon {
  margin-right: 4px;
}

.el-tag {
  font-weight: 500;
}
</style>
