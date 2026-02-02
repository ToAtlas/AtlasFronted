<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { onMounted } from 'vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.applyTheme()
})
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局 CSS 变量 - 浅色模式 */
:root,
html[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #1d2129;
  --border-color: #e5e6eb;
  --card-bg: #ffffff;
  --hover-bg: #f7f8fa;
}

/* 深色模式 */
html[data-theme="dark"] {
  --bg-color: #17171a;
  --text-color: #e5e6eb;
  --border-color: #2e2e30;
  --card-bg: #232324;
  --hover-bg: #2e2e30;
}

/* 全局样式应用变量 */
body {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}
</style>