import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    name: 'AdminLayout',
    component: () => import('../views/admin/Layout.vue'),
    meta: { requiresAuth: true, requiresRole: 'SUPER_ADMIN' },
    children: [
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.vue')
      },
      {
        path: 'instances',
        name: 'AdminInstances',
        component: () => import('../views/admin/Instances.vue')
      }
    ]
  },
  {
    path: '/user',
    name: 'UserLayout',
    component: () => import('../views/user/Layout.vue'),
    meta: { requiresAuth: true, requiresRole: 'ADMIN' },
    children: [
      {
        path: 'instances',
        name: 'MyInstances',
        component: () => import('../views/user/MyInstances.vue')
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

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresRole && authStore.user?.role !== to.meta.requiresRole) {
    // 根据角色重定向
    if (authStore.user?.role === 'SUPER_ADMIN') {
      next('/admin/users')
    } else {
      next('/user/instances')
    }
  } else {
    next()
  }
})

export default router
