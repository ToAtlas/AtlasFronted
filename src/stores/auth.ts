import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useConfigStore } from './config'

/**
 * 验证状态接口
 * 用于管理注册/找回密码等流程的临时验证状态
 */
interface VerificationState {
  type: 'signup' | 'forgot-password' | null
  email: string | null
  verificationToken: string | null // 验证码流程的临时 token
  passwordResetToken: string | null // 重置密码专用 token
  timestamp: number | null // 状态创建时间戳，用于检测过期
}

/**
 * 认证状态管理
 * 使用 setup store 风格, 更贴近 Vue 3 Composition API 的习惯
 * @see https://pinia.vuejs.org/core-concepts/defining-a-store.html#setup-stores
 */
export const useAuthStore = defineStore('auth', () => {
  // ==================== 动态状态 ====================
  // 加载和错误状态
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ==================== 认证状态 ====================
  // State: 从 localStorage 初始化 state，以保持页面刷新后的登录状态
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  // Getter: 一个计算属性，用于判断用户是否已认证
  const isAuthenticated = computed(() => !!accessToken.value)

  // Action: 登录操作
  function login(tokens: { accessToken: string, refreshToken: string }) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
  }

  // Action: 注销操作
  function logout(clearAuthConfigCache = true) {
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    // 可选：清理认证配置缓存，下次登录时重新拉取
    // 这样可以确保用户下次登录时看到最新的认证配置
    if (clearAuthConfigCache) {
      const configStore = useConfigStore()
      configStore.clearAllConfigCache()
    }
  }

  // ==================== 验证状态管理 ====================
  // 验证状态的过期时间（15分钟）
  const VERIFICATION_TIMEOUT = 15 * 60 * 1000

  // 当前时间的响应式引用，用于驱动倒计时和过期检测
  const now = ref(Date.now())
  // 每秒更新一次当前时间，使依赖于时间的计算属性自动刷新
  setInterval(() => {
    now.value = Date.now()
  }, 1000)

  // State: 重发冷却结束时间戳
  const resendCooldownEndTimestamp = ref<number | null>(null)

  // Getter: 是否处于重发冷却中
  const isResendCoolingDown = computed(() => {
    return !!(resendCooldownEndTimestamp.value && now.value < resendCooldownEndTimestamp.value)
  })

  // Getter: 冷却剩余秒数
  const resendCooldownSeconds = computed(() => {
    if (!isResendCoolingDown.value || !resendCooldownEndTimestamp.value) {
      return 0
    }
    return Math.floor((resendCooldownEndTimestamp.value - now.value) / 1000)
  })

  // State: 验证状态（从 sessionStorage 恢复）
  const verificationState = ref<VerificationState>(loadVerificationState())

  // 验证流程剩余时间（毫秒），用于在 UI 中实现倒计时展示
  const verificationRemainingMs = computed<number>(() => {
    if (!verificationState.value.timestamp) {
      return 0
    }
    const expiresAt = verificationState.value.timestamp + VERIFICATION_TIMEOUT
    const remaining = expiresAt - now.value
    return remaining > 0 ? remaining : 0
  })

  // Getter: 检查是否有活跃的验证流程
  const hasActiveVerification = computed(() => {
    if (!verificationState.value.type || !verificationState.value.timestamp) {
      return false
    }
    // 检查是否过期
    const isExpired = now.value - verificationState.value.timestamp > VERIFICATION_TIMEOUT
    if (isExpired) {
      clearVerificationState() // 自动清理过期状态
      return false
    }
    return true
  })

  /**
   * 从 sessionStorage 加载验证状态
   */
  function loadVerificationState(): VerificationState {
    try {
      const saved = sessionStorage.getItem('verification_state')
      if (saved) {
        const state = JSON.parse(saved) as VerificationState
        // 检查是否过期
        if (state.timestamp && Date.now() - state.timestamp > VERIFICATION_TIMEOUT) {
          sessionStorage.removeItem('verification_state')
          return createEmptyVerificationState()
        }
        return state
      }
    }
    catch (error) {
      console.error('Failed to load verification state:', error)
    }
    return createEmptyVerificationState()
  }

  /**
   * 创建空的验证状态
   */
  function createEmptyVerificationState(): VerificationState {
    return {
      type: null,
      email: null,
      verificationToken: null,
      passwordResetToken: null,
      timestamp: null,
    }
  }

  /**
   * 保存验证状态到 sessionStorage
   */
  function saveVerificationState() {
    try {
      sessionStorage.setItem('verification_state', JSON.stringify(verificationState.value))
    }
    catch (error) {
      console.error('Failed to save verification state:', error)
    }
  }

  /**
   * 设置验证状态（进入验证码流程时调用）
   */
  function setVerificationState(params: {
    type: 'signup' | 'forgot-password'
    email: string
    verificationToken: string
  }) {
    verificationState.value = {
      type: params.type,
      email: params.email,
      verificationToken: params.verificationToken,
      passwordResetToken: null,
      timestamp: Date.now(),
    }
    saveVerificationState()
  }

  /**
   * 设置重置密码 token（验证成功后调用）
   */
  function setPasswordResetToken(token: string) {
    verificationState.value.passwordResetToken = token
    saveVerificationState()
  }

  /**
   * 清空验证状态（返回登录、验证成功、或出错时调用）
   */
  function clearVerificationState() {
    verificationState.value = createEmptyVerificationState()
    resendCooldownEndTimestamp.value = null // 清除重发冷却
    sessionStorage.removeItem('verification_state')
  }

  /**
   * 验证成功后的清理（保留必要信息）
   * @param keepPasswordResetToken 是否保留重置密码 token（找回密码流程需要）
   */
  function cleanupAfterVerification(keepPasswordResetToken = false) {
    if (keepPasswordResetToken && verificationState.value.passwordResetToken) {
      // 找回密码流程：只保留 passwordResetToken 和 email
      const email = verificationState.value.email
      const token = verificationState.value.passwordResetToken
      verificationState.value = {
        type: 'forgot-password', // 保持类型以便识别流程
        email,
        verificationToken: null,
        passwordResetToken: token,
        timestamp: Date.now(), // 更新时间戳
      }
    }
    else {
      // 注册流程：完全清空
      clearVerificationState()
    }
    saveVerificationState()
  }

  // ==================== 统一验证与重发 Actions ====================

  /**
   * 重发验证码
   * @returns 成功返回 true，失败返回 false
   */
  async function resendVerificationCode(): Promise<boolean> {
    // 前置检查：必须有激活的验证流程且不在冷却中
    if (!hasActiveVerification.value) {
      error.value = '验证会话已失效，请返回重新开始。'
      return false
    }
    if (isResendCoolingDown.value) {
      error.value = '操作过于频繁，请稍后再试。'
      return false
    }

    // 类型守卫，确保后续操作的类型安全
    const { email, type, verificationToken } = verificationState.value
    if (!email || !type || !verificationToken) {
      error.value = '验证状态不完整，无法重发。'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/v1/auth/resend-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type,
          oldVerificationToken: verificationToken,
        }),
      })

      const result = await response.json()

      if (result.code === 200) {
        // 更新 token 和时间戳
        setVerificationState({
          type,
          email,
          verificationToken: result.data.verificationToken,
        })
        // 开启60秒冷却
        resendCooldownEndTimestamp.value = Date.now() + 60 * 1000
        return true
      }
      // 处理请求频繁的特殊错误
      if (result.code === 429 && result.message.includes('频繁')) {
        resendCooldownEndTimestamp.value = Date.now() + 60 * 1000 // 与后端同步，也开启冷却
        throw new Error('操作过于频繁，请稍后再试。')
      }

      throw new Error(result.message || '发送失败，请稍后重试')
    }
    catch (e: any) {
      error.value = e?.message || '发送失败，请稍后重试'
      return false
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 统一处理验证码或邮件 Token 验证
   * @param payload 包含验证所需信息
   * @param payload.token 可能是 emailLinkToken 或 verificationToken
   * @param payload.code 手动模式下的验证码
   * @param payload.type 验证类型
   * @returns 成功则返回 API 结果，失败则返回 null
   */
  async function unifiedVerify(payload: {
    token: string // 可能是 emailLinkToken 或 verificationToken
    code?: string // 手动模式下的验证码
    type: 'signup' | 'forgot-password'
  }): Promise<any | null> {
    loading.value = true
    error.value = null

    try {
      const isManual = !!payload.code
      const url = isManual ? '/v1/auth/verify-code' : '/v1/auth/verify-token'
      const body = isManual
        ? { verificationToken: payload.token, code: payload.code, type: payload.type }
        : { token: payload.token, type: payload.type }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.code === 200) {
        // 验证成功
        if (payload.type === 'forgot-password') {
          if (!result.data?.passwordResetToken) {
            throw new Error('重置令牌缺失，请重新验证')
          }
          // 在内部直接设置 passwordResetToken
          setPasswordResetToken(result.data.passwordResetToken)
        }
        return result // 将成功结果返回给组件
      }
      else {
        // 验证失败，抛出错误由 catch 处理
        const contextLabel
          = payload.type === 'signup'
            ? '注册'
            : payload.type === 'forgot-password'
              ? '找回密码'
              : '验证'
        const methodLabel = isManual ? '手动输入验证码' : '链接验证'
        const backendMessage = (typeof result.message === 'string' && result.message.trim().length > 0)
          ? result.message.trim()
          : ''
        const detailedMessage = backendMessage
          ? `${contextLabel}失败（方式：${methodLabel}）：${backendMessage}`
          : `${contextLabel}失败（方式：${methodLabel}），请重试`
        throw new Error(detailedMessage)
      }
    }
    catch (e: any) {
      // 记录错误信息
      const message = e?.message || '验证失败，请重试'
      error.value = message

      // 仅在不可恢复的错误（如 token 过期/无效）时清理验证状态
      const lowerMsg = String(message).toLowerCase()
      const isCriticalError
        = lowerMsg.includes('expired')
          || lowerMsg.includes('过期')
          || (lowerMsg.includes('token') && (lowerMsg.includes('invalid') || lowerMsg.includes('missing')))
          || lowerMsg.includes('重置令牌缺失')

      if (isCriticalError) {
        clearVerificationState()
      }
      return null // 返回 null 表示失败
    }
    finally {
      loading.value = false
    }
  }

  return {
    // 加载和错误状态
    loading,
    error,

    // 认证相关
    accessToken,
    refreshToken,
    isAuthenticated,
    login,
    logout,

    // 验证状态相关
    verificationStateValue: computed(() => verificationState.value),
    hasActiveVerification,
    verificationRemainingMs,
    // 新增：重发冷却相关
    isResendCoolingDown,
    resendCooldownSeconds,

    setVerificationState,
    setPasswordResetToken,
    clearVerificationState,
    cleanupAfterVerification,

    // Actions
    unifiedVerify,
    resendVerificationCode,
  }
})
