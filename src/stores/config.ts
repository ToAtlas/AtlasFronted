import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 缓存配置常量
 */
const DEFAULT_CACHE_DURATION = 12 * 60 * 60 * 1000 // 默认12小时（毫秒）
const GLOBAL_CONFIG_CACHE_KEY = 'atlas_global_config'
const GLOBAL_CONFIG_TIMESTAMP_KEY = 'atlas_global_config_timestamp'
const GLOBAL_CONFIG_DURATION_KEY = 'atlas_global_config_duration'
const AUTH_CONFIG_CACHE_KEY = 'atlas_auth_config'
const AUTH_CONFIG_TIMESTAMP_KEY = 'atlas_auth_config_timestamp'

/**
 * 全局配置接口
 */
export interface GlobalConfig {
  brand: {
    name: string
    logo?: string
  }
  cache?: {
    duration?: number // 缓存时长（毫秒），不设置则使用默认12小时
  }
}

/**
 * 认证配置接口
 */
export interface AuthConfig {
  loginMode: 0 | 1 | 2 // 0=共存, 1=仅SSO, 2=仅密码
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
   * 检查缓存是否有效
   * @param timestampKey 时间戳的 localStorage key
   * @param cacheDuration 缓存时长（毫秒）
   */
  function isCacheValid(timestampKey: string, cacheDuration: number): boolean {
    const timestamp = localStorage.getItem(timestampKey)
    if (!timestamp)
      return false

    const cacheTime = Number.parseInt(timestamp, 10)
    const now = Date.now()
    return (now - cacheTime) < cacheDuration
  }

  /**
   * 从 localStorage 加载缓存的配置
   * @param cacheKey 配置数据的 key
   * @param timestampKey 时间戳的 key
   * @param cacheDuration 缓存时长（毫秒）
   * @returns 返回缓存的配置数据或 null
   */
  function loadCachedConfig<T>(cacheKey: string, timestampKey: string, cacheDuration: number): T | null {
    if (!isCacheValid(timestampKey, cacheDuration)) {
      return null
    }

    try {
      const cached = localStorage.getItem(cacheKey)
      if (!cached)
        return null
      return JSON.parse(cached) as T
    }
    catch (error) {
      console.error('Failed to parse cached config:', error)
      return null
    }
  }

  /**
   * 保存配置到 localStorage
   * @param cacheKey 配置数据的 key
   * @param timestampKey 时间戳的 key
   * @param data 配置数据
   * @param options 额外的选项
   * @param options.duration 缓存时长（毫秒），不传则使用默认值
   * @param options.durationKey 缓存时长的 key
   */
  function saveCachedConfig<T>(
    cacheKey: string,
    timestampKey: string,
    data: T,
    options?: { duration?: number, durationKey?: string },
  ): void {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(timestampKey, Date.now().toString())
      // Only save duration if a key is provided
      if (options?.durationKey) {
        localStorage.setItem(
          options.durationKey,
          (options.duration || DEFAULT_CACHE_DURATION).toString(),
        )
      }
    }
    catch (error) {
      console.error('Failed to save config to cache:', error)
    }
  }

  /**
   * 清除指定配置缓存
   */
  function clearConfigCache(cacheKey: string, timestampKey: string, durationKey?: string): void {
    localStorage.removeItem(cacheKey)
    localStorage.removeItem(timestampKey)
    if (durationKey) {
      localStorage.removeItem(durationKey)
    }
  }

  /**
   * 清除所有配置缓存
   */
  function clearAllConfigCache(): void {
    clearConfigCache(GLOBAL_CONFIG_CACHE_KEY, GLOBAL_CONFIG_TIMESTAMP_KEY, GLOBAL_CONFIG_DURATION_KEY)
    clearConfigCache(AUTH_CONFIG_CACHE_KEY, AUTH_CONFIG_TIMESTAMP_KEY)
  }

  /**
   * 获取全局配置的缓存时长
   */
  function getGlobalCacheDuration(): number {
    const durationStr = localStorage.getItem(GLOBAL_CONFIG_DURATION_KEY)
    return durationStr ? Number.parseInt(durationStr, 10) : DEFAULT_CACHE_DURATION
  }

  /**
   * 获取默认全局配置
   */
  function getDefaultGlobalConfig(): GlobalConfig {
    return {
      brand: {
        name: 'Atlas',
        logo: '/src/assets/logo.svg',
      },
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
        endpoint: '/v1/auth/sso/login',
      },
      emailPassword: {
        enabled: true,
        allowRegister: true,
      },
    }
  }

  /**
   * 从后端获取全局配置
   * 在 App.vue 中调用，优先使用缓存
   * @param forceRefresh 是否强制刷新（跳过缓存）
   */
  async function fetchGlobalConfig(forceRefresh = false) {
    // 1. 尝试从缓存加载（如果不是强制刷新）
    if (!forceRefresh) {
      // 手动获取缓存时长，因为 loadCachedConfig 现在需要一个数字
      const durationStr = localStorage.getItem(GLOBAL_CONFIG_DURATION_KEY)
      const cacheDuration = durationStr ? Number.parseInt(durationStr, 10) : DEFAULT_CACHE_DURATION

      const cached = loadCachedConfig<GlobalConfig>(
        GLOBAL_CONFIG_CACHE_KEY,
        GLOBAL_CONFIG_TIMESTAMP_KEY,
        cacheDuration,
      )
      if (cached) {
        globalConfig.value = cached
        return
      }
    }

    // 2. 缓存未命中或强制刷新，从后端获取
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
        // 保存到缓存，使用后端配置的缓存时长
        const cacheDuration = result.data.cache?.duration
        saveCachedConfig(
          GLOBAL_CONFIG_CACHE_KEY,
          GLOBAL_CONFIG_TIMESTAMP_KEY,
          result.data,
          { duration: cacheDuration, durationKey: GLOBAL_CONFIG_DURATION_KEY },
        )
      }
      else {
        console.error('Failed to fetch global config:', result.message)
        globalConfig.value = getDefaultGlobalConfig()
      }
    }
    catch (error) {
      console.error('Failed to fetch global config:', error)
      // 使用默认配置作为降级方案
      globalConfig.value = getDefaultGlobalConfig()
    }
    finally {
      globalLoading.value = false
    }
  }

  /**
   * 从后端获取认证配置
   * 在登录页按需调用，优先使用缓存
   * 使用全局配置的缓存时长
   * @param forceRefresh 是否强制刷新（跳过缓存）
   */
  async function fetchAuthConfig(forceRefresh = false) {
    // 1. 尝试从缓存加载（如果不是强制刷新）
    // 使用全局配置的缓存时长
    if (!forceRefresh) {
      const globalCacheDuration = getGlobalCacheDuration()

      const cached = loadCachedConfig<AuthConfig>(
        AUTH_CONFIG_CACHE_KEY,
        AUTH_CONFIG_TIMESTAMP_KEY,
        globalCacheDuration, // 直接传递缓存时长
      )
      if (cached) {
        // 清理可能存在的旧的临时 key
        localStorage.removeItem(`${AUTH_CONFIG_TIMESTAMP_KEY}_duration`)
        authConfig.value = cached
        return
      }
    }

    // 2. 缓存未命中或强制刷新，从后端获取
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
        // 保存认证配置时，不再保存时长信息，因为它依赖全局配置
        saveCachedConfig(
          AUTH_CONFIG_CACHE_KEY,
          AUTH_CONFIG_TIMESTAMP_KEY,
          result.data,
        )
      }
      else {
        console.error('Failed to fetch auth config:', result.message)
        authConfig.value = getDefaultAuthConfig()
      }
    }
    catch (error) {
      console.error('Failed to fetch auth config:', error)
      // 使用默认配置作为降级方案
      authConfig.value = getDefaultAuthConfig()
    }
    finally {
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
    clearAllConfigCache,

    // 全局配置 Getters
    brandName,
    brandLogo,

    // 认证配置 Getters
    loginMode,
    isSsoEnabled,
    isPasswordEnabled,
    allowRegister,
    ssoButtonText,
    ssoEndpoint,
  }
})
