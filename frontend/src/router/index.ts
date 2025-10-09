import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/Users.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'instances',
        name: 'AdminInstances',
        component: () => import('@/views/admin/Instances.vue'),
        meta: { title: '实例管理' }
      },
      {
        path: 'repos',
        name: 'AdminRepos',
        component: () => import('@/views/admin/Repos.vue'),
        meta: { title: '仓库管理' }
      },
      {
        path: 'bindings',
        name: 'AdminBindings',
        component: () => import('@/views/admin/Bindings.vue'),
        meta: { title: '绑定管理' }
      },
      {
        path: 'audits',
        name: 'AdminAudits',
        component: () => import('@/views/admin/Audits.vue'),
        meta: { title: '审计日志' }
      }
    ]
  },
  {
    path: '/user',
    component: () => import('@/layouts/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/user/instances'
      },
      {
        path: 'instances',
        name: 'MyInstances',
        component: () => import('@/views/user/MyInstances.vue'),
        meta: { title: '我的实例' }
      },
      {
        path: 'instances/:id',
        name: 'InstanceDetail',
        component: () => import('@/views/user/InstanceDetail.vue'),
        meta: { title: '实例详情' }
      }
    ]
  },
  {
    path: '/',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果路由需要认证
  if (to.meta.requiresAuth) {
    // 如果未登录，尝试获取用户信息
    if (!authStore.isLoggedIn) {
      try {
        await authStore.fetchUser()
      } catch (error) {
        // 获取失败，跳转到登录页
        return next({ path: '/login', query: { redirect: to.fullPath } })
      }
    }

    // 检查是否需要超级管理员权限
    if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
      // 权限不足，跳转到普通用户页面
      return next('/user/instances')
    }

    next()
  } else {
    // 如果已登录，访问登录页时重定向到对应的首页
    if (to.path === '/login' && authStore.isLoggedIn) {
      if (authStore.isSuperAdmin) {
        return next('/admin/dashboard')
      } else {
        return next('/user/instances')
      }
    }
    next()
  }
})

export default router
