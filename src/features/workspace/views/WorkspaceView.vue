<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  Message.success('注销成功')
  // 注销后手动跳转到登录页
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="workspace-container">
    <a-page-header title="Workspace" subtitle="This is a placeholder workspace page." :style="{ background: 'var(--color-bg-2)' }">
      <template #extra>
        <a-button type="primary" @click="handleLogout">
          Logout
        </a-button>
      </template>
    </a-page-header>
    <div class="content">
      <a-result status="success" title="Login Successful">
        <template #subtitle>
          You are now logged in and have reached the workspace.
        </template>
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
