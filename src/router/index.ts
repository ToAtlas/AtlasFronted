import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../features/auth/views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../features/home/views/HomeView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: '/workspace',
      name: 'workspace',
      // 路由级代码分割
      // 这会为此路由生成一个单独的 chunk (WorkspaceView.[hash].js)
      // 当路由被访问时才会懒加载
      component: () => import('../features/workspace/views/WorkspaceView.vue'),
      meta: { requiresAuth: true },
    },

  ],
})

// =================================================================
// 全局路由守卫 (Global Navigation Guard)
// =================================================================
let isAuthInitialized = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 确保认证状态在应用首次加载时被初始化
  // 仅在第一次路由导航时执行一次
  if (!isAuthInitialized) {
    await authStore.initializeAuth()
    isAuthInitialized = true
  }

  const isAuthenticated = authStore.isAuthenticated
  const requiresAuth = to.meta.requiresAuth

  // 1. 如果路由需要认证
  if (requiresAuth) {
    if (isAuthenticated) {
      // 用户已登录，放行
      return next()
    }
    else {
      // 用户未登录，重定向到登录页
      // 将用户尝试访问的路径作为查询参数，以便登录后可以重定向回来
      return next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  }

  // 2. 如果路由是公开的 (例如登录页)
  // 如果用户已登录，并且尝试访问登录页，则重定向到工作区
  if (to.name === 'login' && isAuthenticated) {
    return next({ name: 'workspace' })
  }

  // 3. 其他所有情况，正常放行
  return next()
})

export default router
