import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../features/auth/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../features/home/views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/workspace',
      name: 'workspace',
      // 路由级代码分割
      // 这会为此路由生成一个单独的 chunk (WorkspaceView.[hash].js)
      // 当路由被访问时才会懒加载
      component: () => import('../features/workspace/views/WorkspaceView.vue')
    },

  ]
})

export default router
