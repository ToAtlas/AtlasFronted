import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 认证状态管理
 * 使用 setup store 风格, 更贴近 Vue 3 Composition API 的习惯
 * @see https://pinia.vuejs.org/core-concepts/defining-a-store.html#setup-stores
 */
export const useAuthStore = defineStore('auth', () => {
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
  function logout() {
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  return {
    accessToken,
    refreshToken,
    isAuthenticated,
    login,
    logout,
  };
});
