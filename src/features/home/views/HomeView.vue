<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';
import { useThemeStore } from '@/stores/theme';
import { IconSun, IconMoon, IconComputer } from '@arco-design/web-vue/es/icon';

const router = useRouter();
const authStore = useAuthStore();
const configStore = useConfigStore();
const themeStore = useThemeStore();

const handleThemeChange = () => {
  themeStore.applyTheme();
};

// 检测登录状态
onMounted(() => {
  // 检测登录状态，如果已登录则跳转到工作台
  if (authStore.isAuthenticated) {
    router.push({ name: 'workspace' });
  }
});
</script>

<template>
  <div class="home-container">
    <div class="theme-switcher">
      <a-radio-group v-model="themeStore.mode" type="button" @change="handleThemeChange">
        <a-radio value="light">
          <icon-sun />
          浅色
        </a-radio>
        <a-radio value="dark">
          <icon-moon />
          深色
        </a-radio>
        <a-radio value="auto">
          <icon-computer />
          跟随系统
        </a-radio>
      </a-radio-group>
    </div>

    <h1>Homepage</h1>
    <p>This is the placeholder for the future homepage.</p>
    <router-link to="/login">Go to Login</router-link>
  </div>
</template>

<style scoped>
.home-container {
  text-align: center;
  margin-top: 50px;
}

.theme-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
}

h1 {
  color: var(--text-color);
}

p {
  color: var(--text-color);
}

a {
  color: rgb(var(--primary-6));
}
</style>
