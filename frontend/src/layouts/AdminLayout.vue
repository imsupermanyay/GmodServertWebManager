<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <h2>GMOD 管理平台</h2>
        <el-tag type="danger" size="small">超级管理员</el-tag>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#1f1f1f"
        text-color="#ffffff"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/instances">
          <el-icon><Monitor /></el-icon>
          <span>实例管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/repos">
          <el-icon><FolderOpened /></el-icon>
          <span>仓库管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/bindings">
          <el-icon><Connection /></el-icon>
          <span>绑定管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/audits">
          <el-icon><Document /></el-icon>
          <span>审计日志</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h3>{{ pageTitle }}</h3>
        </div>
        <div class="header-right">
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
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import {
  DataLine,
  User,
  Monitor,
  FolderOpened,
  Connection,
  Document,
  SwitchButton
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta.title as string || '')

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
.admin-layout {
  height: 100vh;
  background-color: #0a0a0a;
}

.sidebar {
  background-color: #1f1f1f;
  border-right: 1px solid #2d2d2d;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #2d2d2d;
}

.logo h2 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #ffffff;
}

.sidebar-menu {
  border-right: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1f1f1f;
  border-bottom: 1px solid #2d2d2d;
  padding: 0 20px;
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  color: #ffffff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
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
