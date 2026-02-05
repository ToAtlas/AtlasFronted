import { defineStore } from 'pinia';
import { ref, watch, onUnmounted } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';

export const useThemeStore = defineStore('theme', () => {
  // 从 localStorage 读取，默认为 auto
  const mode = ref<ThemeMode>((localStorage.getItem('theme-mode') as ThemeMode) || 'auto');

  // 获取实际应用的主题（解析 auto 模式）
  const getActualTheme = (): 'light' | 'dark' => {
    if (mode.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode.value;
  };

  // 应用主题到 DOM
  const applyTheme = () => {
    const actualTheme = getActualTheme();
    const html = document.documentElement;
    const body = document.body;

    // 设置 data-theme 属性用于自定义样式
    html.setAttribute('data-theme', actualTheme);

    // 设置 Arco Design 的深色模式属性
    if (actualTheme === 'dark') {
      body.setAttribute('arco-theme', 'dark');
    } else {
      body.removeAttribute('arco-theme');
    }
  };

  // 切换主题模式
  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode;
    localStorage.setItem('theme-mode', newMode);
    applyTheme();
  };

  // 监听系统主题变化（仅在 auto 模式下生效）
  const handleThemeChange = () => {
    if (mode.value === 'auto') {
      applyTheme();
    }
  };
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', handleThemeChange);

  // Pinia setup store 在宿主组件卸载时，会自动清理 onUnmounted 钩子
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleThemeChange);
  });

  // 监听模式变化
  watch(mode, () => {
    applyTheme();
  });

  // 初始化时应用主题
  applyTheme();

  return {
    mode,
    setMode,
    applyTheme,
    getActualTheme,
  };
});