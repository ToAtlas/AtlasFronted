<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthenticationCard from '@/features/auth/components/AuthenticationCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const configStore = useConfigStore()
const line1 = ref('')
const line2 = ref('')
const fullLine1 = '像扛着'
const fullLine2 = '整个文档世界'
const typingSpeed = 200
const typingCompleted = ref(false)

const isTypingLine1 = computed(() => line1.value.length < fullLine1.length)

// 邮件验证参数
const emailVerificationParams = ref<{
  verify: boolean
  token: string
  type: 'signup' | 'forgot-password'
  email?: string
} | null>(null)

async function typeEffect() {
  // Type first line
  for (const char of fullLine1) {
    line1.value += char
    await new Promise(resolve => setTimeout(resolve, typingSpeed))
  }

  // Pause briefly before starting the second line
  await new Promise(resolve => setTimeout(resolve, 100))

  // Type second line
  for (const char of fullLine2) {
    line2.value += char
    await new Promise(resolve => setTimeout(resolve, typingSpeed))
  }

  typingCompleted.value = true
}

onMounted(async () => {
  // 1. 获取认证配置（带缓存，判断是否需要重新获取）
  const performance = window.performance
  const navigationEntry = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | PerformanceEntry | undefined
  const isPageRefresh = (navigationEntry as PerformanceNavigationTiming | undefined)?.type === 'reload'
  await configStore.fetchAuthConfig(isPageRefresh)

  // 2. 检测邮件验证链接参数
  if (route.query.verify === 'true' && route.query.token && route.query.type) {
    const type = route.query.type as string
    if (type === 'signup' || type === 'forgot-password') {
      emailVerificationParams.value = {
        verify: true,
        token: route.query.token as string,
        type: type as 'signup' | 'forgot-password',
        email: route.query.email as string | undefined,
      }
    }
  }

  // 3. 播放动画
  typeEffect()
})
</script>

<template>
  <div class="login-view-wrapper">
    <div class="logo-section">
      <div class="logo-container">
        <img alt="Atlas logo" class="logo" src="/src/assets/logo.svg">
        <div class="logo-text">
          <span>{{ line1 }}<span v-if="isTypingLine1" class="cursor" /></span>
          <span>{{ line2
          }}<span
            v-if="!isTypingLine1 && !typingCompleted"
            class="cursor"
          /></span>
        </div>
      </div>
    </div>
    <div class="form-section">
      <AuthenticationCard :email-verification-params="emailVerificationParams" />
    </div>
  </div>
</template>

<style scoped>
.login-view-wrapper {
  display: grid;
  grid-template-columns: auto auto; /* Let columns shrink to content size */
  justify-content: center; /* Center the whole grid in the viewport */
  align-items: center;
  column-gap: 60px; /* A fixed, more compact gap */
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-color);
  padding: 0 2rem;
  box-sizing: border-box;
}

.logo-section {
  width: 100%;
  display: flex;
  justify-content: center; /* Center the container within the grid cell */
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  width: 140px; /* Adjusted for balance */
  height: 140px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 3rem;
  font-weight: 600; /* semibold */
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Left-align text */
  line-height: 1.3;
  /* Prevent layout shift by setting a min-width based on the longest text line + cursor width */
  min-width: 18.75rem; /* Approx 6 chars * 3rem + 12px for cursor */
  /* Ensure consistent height to prevent vertical layout shift */
  min-height: calc(3rem * 1.3 * 2);
}

.logo-text span {
  /* Ensure spans can grow but don't shrink, maintaining height */
  min-height: calc(3rem * 1.3);
  display: flex;
  align-items: center;
}

.cursor {
  display: inline-block;
  width: 4px;
  height: 3rem;
  background-color: var(--text-color);
  margin-left: 8px;
  animation: blink 1s infinite;
  vertical-align: middle;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.form-section {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

/* --- Responsive Design --- */

/* For tablets and smaller desktops */
@media (max-width: 1024px) {
  .logo-container {
    flex-direction: column;
    text-align: center;
  }
  .logo-text {
    align-items: center;
  }
}

/* For mobile devices */
@media (max-width: 820px) {
  .login-view-wrapper {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  .logo-section {
    display: none; /* Hide the entire logo section */
  }
}
</style>
