<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// onMounted 钩子会在组件加载后执行
onMounted(() => {
  // 检查用户是否已认证，如果未认证，则重定向到登录页
  if (!authStore.isAuthenticated) {
    Message.error('请先登录');
    router.push({ name: 'login' });
  }
});

const handleLogout = async () => {
  // 从 store 中获取 refreshToken
  const token = authStore.refreshToken;
  if (!token) {
    Message.error('无法注销，未找到 Refresh Token');
    return;
  }

  try {
    const response = await fetch('/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: token }),
    });

    const result = await response.json();

    // 根据新的响应结构检查 `success` 字段
    if (result.success) {
      authStore.logout(); // 使用 auth store 清除 token
      Message.success('注销成功');
      router.push({ name: 'login' });
    } else {
      Message.error('注销失败');
    }
  } catch (error) {
    Message.error('请求失败，请稍后再试');
  }
};
</script>

<template>
  <div class="workspace-container">
    <a-page-header title="Workspace" subtitle="This is a placeholder workspace page." :style="{ background: 'var(--color-bg-2)' }">
      <template #extra>
        <a-button type="primary" @click="handleLogout">Logout</a-button>
      </template>
    </a-page-header>
    <div class="content">
      <a-result status="success" title="Login Successful">
        <template #subtitle>You are now logged in and have reached the workspace.</template>
      </a-result>
    </div>
  </div>
</template>

<style scoped>
.workspace-container {
  height: 100vh;
  background-color: var(--color-fill-1);
}
.content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 100px;
}
</style>
