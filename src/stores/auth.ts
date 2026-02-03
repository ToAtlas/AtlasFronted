import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useConfigStore } from './config';

/**
 * 验证状态接口
 * 用于管理注册/找回密码等流程的临时验证状态
 */
interface VerificationState {
  type: 'signup' | 'forgot-password' | null;
  email: string | null;
  verificationToken: string | null; // 验证码流程的临时 token
  passwordResetToken: string | null; // 重置密码专用 token
  timestamp: number | null; // 状态创建时间戳，用于检测过期
}

/**
 * 认证状态管理
 * 使用 setup store 风格, 更贴近 Vue 3 Composition API 的习惯
 * @see https://pinia.vuejs.org/core-concepts/defining-a-store.html#setup-stores
 */
export const useAuthStore = defineStore('auth', () => {
  // ==================== 认证状态 ====================
  // State: 从 localStorage 初始化 state，以保持页面刷新后的登录状态
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));

  // Getter: 一个计算属性，用于判断用户是否已认证
  const isAuthenticated = computed(() => !!accessToken.value);

  // Action: 登录操作
  function login(tokens: { accessToken: string; refreshToken: string }) {
    accessToken.value = tokens.accessToken;
    refreshToken.value = tokens.refreshToken;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  // Action: 注销操作
  function logout(clearAuthConfigCache = true) {
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // 可选：清理认证配置缓存，下次登录时重新拉取
    // 这样可以确保用户下次登录时看到最新的认证配置
    if (clearAuthConfigCache) {
      const configStore = useConfigStore();
      configStore.clearAllConfigCache();
    }
  }

  // ==================== 验证状态管理 ====================
  // 验证状态的过期时间（15分钟）
  const VERIFICATION_TIMEOUT = 15 * 60 * 1000;

  // State: 验证状态（从 sessionStorage 恢复）
  const verificationState = ref<VerificationState>(loadVerificationState());

  // Getter: 检查是否有活跃的验证流程
  const hasActiveVerification = computed(() => {
    if (!verificationState.value.type || !verificationState.value.timestamp) {
      return false;
    }
    // 检查是否过期
    const isExpired = Date.now() - verificationState.value.timestamp > VERIFICATION_TIMEOUT;
    if (isExpired) {
      clearVerificationState(); // 自动清理过期状态
      return false;
    }
    return true;
  });

  /**
   * 从 sessionStorage 加载验证状态
   */
  function loadVerificationState(): VerificationState {
    try {
      const saved = sessionStorage.getItem('verification_state');
      if (saved) {
        const state = JSON.parse(saved) as VerificationState;
        // 检查是否过期
        if (state.timestamp && Date.now() - state.timestamp > VERIFICATION_TIMEOUT) {
          sessionStorage.removeItem('verification_state');
          return createEmptyVerificationState();
        }
        return state;
      }
    } catch (error) {
      console.error('Failed to load verification state:', error);
    }
    return createEmptyVerificationState();
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
    };
  }

  /**
   * 保存验证状态到 sessionStorage
   */
  function saveVerificationState() {
    try {
      sessionStorage.setItem('verification_state', JSON.stringify(verificationState.value));
    } catch (error) {
      console.error('Failed to save verification state:', error);
    }
  }

  /**
   * 设置验证状态（进入验证码流程时调用）
   */
  function setVerificationState(params: {
    type: 'signup' | 'forgot-password';
    email: string;
    verificationToken: string;
  }) {
    verificationState.value = {
      type: params.type,
      email: params.email,
      verificationToken: params.verificationToken,
      passwordResetToken: null,
      timestamp: Date.now(),
    };
    saveVerificationState();
  }

  /**
   * 设置重置密码 token（验证成功后调用）
   */
  function setPasswordResetToken(token: string) {
    verificationState.value.passwordResetToken = token;
    saveVerificationState();
  }

  /**
   * 清空验证状态（返回登录、验证成功、或出错时调用）
   */
  function clearVerificationState() {
    verificationState.value = createEmptyVerificationState();
    sessionStorage.removeItem('verification_state');
  }

  /**
   * 验证成功后的清理（保留必要信息）
   * @param keepPasswordResetToken 是否保留重置密码 token（找回密码流程需要）
   */
  function cleanupAfterVerification(keepPasswordResetToken = false) {
    if (keepPasswordResetToken && verificationState.value.passwordResetToken) {
      // 找回密码流程：只保留 passwordResetToken 和 email
      const email = verificationState.value.email;
      const token = verificationState.value.passwordResetToken;
      verificationState.value = {
        type: 'forgot-password', // 保持类型以便识别流程
        email,
        verificationToken: null,
        passwordResetToken: token,
        timestamp: Date.now(), // 更新时间戳
      };
    } else {
      // 注册流程：完全清空
      verificationState.value = createEmptyVerificationState();
    }
    saveVerificationState();
  }

  return {
    // 认证相关
    accessToken,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    
    // 验证状态相关
    verificationState,
    hasActiveVerification,
    setVerificationState,
    setPasswordResetToken,
    clearVerificationState,
    cleanupAfterVerification,
  };
});
