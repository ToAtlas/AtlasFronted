import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 全局配置接口
 */
export interface GlobalConfig {
  brand: {
    name: string
    logo?: string
  }
}

/**
 * 认证配置接口
 */
export interface AuthConfig {
  loginMode: 0 | 1 | 2  // 0=共存, 1=仅SSO, 2=仅密码
  sso: {
    enabled: boolean
    buttonText: string
    endpoint: string
  }
  emailPassword: {
    enabled: boolean
    allowRegister: boolean
  }
}

/**
 * 配置管理 Store
 * - 全局配置：在首页、登录页等入口拉取，供全局使用
 * - 认证配置：在登录页按需拉取，仅认证模块使用
 */
export const useConfigStore = defineStore('config', () => {
  // State
  const globalConfig = ref<GlobalConfig | null>(null)
  const authConfig = ref<AuthConfig | null>(null)
  const globalLoading = ref(false)
  const authLoading = ref(false)

  /**
   * 获取默认全局配置
   */
  function getDefaultGlobalConfig(): GlobalConfig {
    return {
      brand: {
        name: 'Atlas',
        logo: '/src/assets/logo.svg'
      }
    }
  }

  /**
   * 获取默认认证配置
   */
  function getDefaultAuthConfig(): AuthConfig {
    return {
      loginMode: 0,
      sso: {
        enabled: true,
        buttonText: 'SSO登录',
        endpoint: '/v1/auth/sso/login'
      },
      emailPassword: {
        enabled: true,
        allowRegister: true
      }
    }
  }

  /**
   * 从后端获取全局配置
   * 在首页、登录页等入口调用
   */
  async function fetchGlobalConfig() {
    globalLoading.value = true
    try {
      const response = await fetch('/v1/config')

      // 检查 HTTP 状态码
      if (!response.ok) {
        console.error('Failed to fetch global config: HTTP', response.status)
        globalConfig.value = getDefaultGlobalConfig()
        return
      }

      const result = await response.json()

      if (result.code === 200 && result.data) {
        globalConfig.value = result.data
      } else {
        console.error('Failed to fetch global config:', result.message)
        globalConfig.value = getDefaultGlobalConfig()
      }
    } catch (error) {
      console.error('Failed to fetch global config:', error)
      // 使用默认配置作为降级方案
      globalConfig.value = getDefaultGlobalConfig()
    } finally {
      globalLoading.value = false
    }
  }

  /**
   * 从后端获取认证配置
   * 在登录页按需调用
   */
  async function fetchAuthConfig() {
    authLoading.value = true
    try {
      const response = await fetch('/v1/auth/config')

      // 检查 HTTP 状态码
      if (!response.ok) {
        console.error('Failed to fetch auth config: HTTP', response.status)
        authConfig.value = getDefaultAuthConfig()
        return
      }

      const result = await response.json()

      if (result.code === 200 && result.data) {
        authConfig.value = result.data
      } else {
        console.error('Failed to fetch auth config:', result.message)
        authConfig.value = getDefaultAuthConfig()
      }
    } catch (error) {
      console.error('Failed to fetch auth config:', error)
      // 使用默认配置作为降级方案
      authConfig.value = getDefaultAuthConfig()
    } finally {
      authLoading.value = false
    }
  }

  // ==================== 全局配置 Getters ====================

  /** 品牌名称 - 全局使用 */
  const brandName = computed(() => globalConfig.value?.brand.name ?? 'Atlas')

  /** 品牌 Logo - 全局使用 */
  const brandLogo = computed(() => globalConfig.value?.brand.logo ?? '/src/assets/logo.svg')

  // ==================== 认证配置 Getters ====================

  /** 登录模式 */
  const loginMode = computed(() => authConfig.value?.loginMode ?? 0)

  /** 是否启用 SSO（非仅密码模式） */
  const isSsoEnabled = computed(() => loginMode.value !== 2)

  /** 是否启用邮箱密码登录（非仅SSO模式） */
  const isPasswordEnabled = computed(() => loginMode.value !== 1)

  /** 是否允许注册 */
  const allowRegister = computed(() => authConfig.value?.emailPassword.allowRegister ?? true)

  /** SSO 按钮文案 */
  const ssoButtonText = computed(() => authConfig.value?.sso.buttonText ?? 'SSO登录')

  /** SSO 登录端点 */
  const ssoEndpoint = computed(() => authConfig.value?.sso.endpoint ?? '/v1/auth/sso/login')

  return {
    // State
    globalConfig,
    authConfig,
    globalLoading,
    authLoading,

    // Actions
    fetchGlobalConfig,
    fetchAuthConfig,

    // 全局配置 Getters
    brandName,
    brandLogo,

    // 认证配置 Getters
    loginMode,
    isSsoEnabled,
    isPasswordEnabled,
    allowRegister,
    ssoButtonText,
    ssoEndpoint
  }
})