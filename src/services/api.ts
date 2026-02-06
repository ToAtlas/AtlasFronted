import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  // baseURL: '/api', // 如果你的 API 有统一前缀，可以在这里设置
  timeout: 10000, // 请求超时
  withCredentials: true, // <--- 添加此行以允许跨域请求携带 cookie
})

// --- 请求拦截器 ---
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.accessToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// --- 响应拦截器 ---

// 用于处理并发请求的锁
let isRefreshing = false
// 等待新 token 的请求队列
let failedQueue: Array<{ resolve: (value: any) => void, reject: (reason?: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    }
    else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    // 2xx 范围内的状态码都会触发该函数
    // 直接返回响应
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    // 检查是否是 401 错误，且不是由刷新 token 请求本身引起的
    if (error.response?.status === 401 && originalRequest.url !== '/v1/auth/refresh' && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新 token，将当前失败的请求加入队列
        return new Promise(((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }))
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshed = await authStore.refreshAccessToken()
        if (!refreshed) {
          // 刷新失败，可能是 refresh token 也过期了
          throw new Error('Session expired. Please log in again.')
        }

        // 刷新成功，用新 token 重试原始请求
        api.defaults.headers.common.Authorization = `Bearer ${authStore.accessToken}`
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`

        // 处理队列中的所有等待请求
        processQueue(null, authStore.accessToken)

        return api(originalRequest)
      }
      catch (refreshError: any) {
        // 刷新失败，处理队列中的所有等待请求
        processQueue(refreshError, null)
        // 登出用户
        await authStore.logout()
        // 重定向到登录页 (这将在步骤4的路由守卫中完成)
        // window.location.href = '/login'
        return Promise.reject(refreshError)
      }
      finally {
        isRefreshing = false
      }
    }

    // 对于非 401 错误，直接返回
    return Promise.reject(error)
  },
)

export default api
