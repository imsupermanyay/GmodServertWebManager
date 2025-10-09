<template>
  <el-container class="user-layout">
    <el-header class="header">
      <div class="header-left">
        <h2>GMOD 服务器管理</h2>
        <el-tag type="success" size="small">管理员</el-tag>
      </div>
      <div class="header-right">
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          background-color="#1f1f1f"
          text-color="#ffffff"
          active-text-color="#409eff"
          router
        >
          <el-menu-item index="/user/instances">
            <el-icon><Monitor /></el-icon>
            <span>我的实例</span>
          </el-menu-item>
        </el-menu>

        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ authStore.user?.username }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { Monitor, User, SwitchButton } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => {
  if (route.path.startsWith('/user/instances')) {
    return '/user/instances'
  }
  return route.path
})

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await authStore.logout()
      ElMessage.success('退出成功')
      router.push('/login')
    } catch (error) {
      ElMessage.error('退出失败')
    }
  }
}
</script>

<style scoped>
.user-layout {
  height: 100vh;
  background-color: #0a0a0a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1f1f1f;
  border-bottom: 1px solid #2d2d2d;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #ffffff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-right .el-menu {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #2d2d2d;
}

.main-content {
  background-color: #0a0a0a;
  padding: 20px;
  overflow-y: auto;
}
</style>
