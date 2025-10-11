<template>
  <div class="my-instances-page">
    <div class="page-header">
      <h2>我的实例</h2>
      <el-button type="primary" @click="loadInstances">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div v-loading="loading" class="instances-grid">
      <el-empty
        v-if="instances.length === 0 && !loading"
        description="暂无实例"
      />
      <InstanceCard
        v-for="instance in instances"
        :key="instance.id"
        :instance="instance"
        @refresh="loadInstances"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import InstanceCard from '@/components/InstanceCard.vue'
import { getMyInstances, type Instance } from '@/api/instances'

const loading = ref(false)
const instances = ref<Instance[]>([])

const loadInstances = async () => {
  loading.value = true
  try {
    instances.value = await getMyInstances()
  } catch (error) {
    console.log("加载我的实例失败",error)
    ElMessage.error('加载实例列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadInstances()
  // 每30秒自动刷新一次
  const interval = setInterval(loadInstances, 30000)
  // 组件卸载时清除定时器
  onUnmounted(() => clearInterval(interval))
})

// 添加 onUnmounted 导入
import { onUnmounted } from 'vue'
</script>

<style scoped>
.my-instances-page {
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

.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  min-height: 200px;
}

@media (max-width: 768px) {
  .instances-grid {
    grid-template-columns: 1fr;
  }
}
</style>
