<script setup lang="ts">
import { ref, shallowRef, onMounted, watch, type Component } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';
import VerificationForm from './VerificationForm.vue';
import ForgotPasswordForm from './ForgotPasswordForm.vue';
import ResetPasswordForm from './ResetPasswordForm.vue';

// 定义组件联合类型
type AuthFormComponent = typeof LoginForm | typeof RegisterForm | typeof VerificationForm | typeof ForgotPasswordForm | typeof ResetPasswordForm;

const props = defineProps<{
  emailVerificationParams?: {
    verify: boolean;
    token: string;
    type: 'signup' | 'forgot-password';
    email?: string;
  } | null;
}>();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Using shallowRef is recommended for switching components to optimize performance.
const currentView = shallowRef<AuthFormComponent>(LoginForm);
const emailForFlow = ref('');
const verificationMode = ref<'signup' | 'forgot-password'>('signup');
const emailVerificationToken = ref('');

const showRegister = () => {
  currentView.value = RegisterForm;
};

const showLogin = () => {
  currentView.value = LoginForm;
};

const showVerification = (payload: { email: string; mode: 'signup' | 'forgot-password'; verificationToken: string }) => {
  emailForFlow.value = payload.email;
  verificationMode.value = payload.mode;
  
  // 将验证状态保存到 store
  authStore.setVerificationState({
    type: payload.mode,
    email: payload.email,
    verificationToken: payload.verificationToken,
  });
  
  currentView.value = VerificationForm;
};

const showForgotPassword = () => {
  currentView.value = ForgotPasswordForm;
};

const showResetPassword = (email: string) => {
  emailForFlow.value = email;
  currentView.value = ResetPasswordForm;
};

const handleVerificationSuccess = (result: any) => {
  // 使用组件内正确的 mode 状态，而不是 store 的状态
  const verificationType = verificationMode.value;

  if (verificationType === 'signup') {
    // 注册流程的验证成功后，保存 token 并跳转到工作台
    if (result.data?.accessToken && result.data?.refreshToken) {
      authStore.login({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      });
    }
    
    // 清理验证状态
    authStore.clearVerificationState();
    
    // 清除 URL 参数并跳转
    router.push({ name: 'workspace' });
  } else if (verificationType === 'forgot-password') {
    // 找回密码流程的验证成功后，显示重置密码表单
    const email = authStore.verificationState.email || emailForFlow.value;
    
    // 清理验证码流程的临时信息（但保留 passwordResetToken）
    authStore.cleanupAfterVerification(true);
    
    // 清除 URL 参数
    router.replace({ name: 'login' });
    
    showResetPassword(email);
  }
};

// 页面加载时恢复验证状态
onMounted(() => {
  // 优先检查邮件验证链接参数
  if (props.emailVerificationParams?.verify) {
    return; // 邮件验证链接会在 watch 中处理
  }
  
  // 检查是否有活跃的验证流程（页面刷新后恢复）
  if (authStore.hasActiveVerification) {
    const state = authStore.verificationState;
    
    // 如果有 passwordResetToken，说明已经验证成功，应该显示重置密码页面
    if (state.type === 'forgot-password' && state.passwordResetToken && state.email) {
      emailForFlow.value = state.email;
      currentView.value = ResetPasswordForm;
    } 
    // 否则显示验证码页面
    else if (state.verificationToken && state.email && state.type) {
      emailForFlow.value = state.email;
      verificationMode.value = state.type;
      currentView.value = VerificationForm;
    }
  }
});

// 监听邮件验证参数变化
watch(
  () => props.emailVerificationParams,
  (params) => {
    if (params?.verify) {
      emailForFlow.value = params.email || '';
      verificationMode.value = params.type;
      emailVerificationToken.value = params.token;
      currentView.value = VerificationForm;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="auth-card">
    <transition name="fade" mode="out-in">
      <component
        :is="currentView"
        @show-register="showRegister"
        @show-login="showLogin"
        @show-verification="showVerification"
        @show-forgot-password="showForgotPassword"
        @show-reset-password="showResetPassword"
        @verification-success="handleVerificationSuccess"
        :email="emailForFlow"
        :mode="verificationMode"
        :email-link-token="emailVerificationToken"
      />
    </transition>
  </div>
</template>

<style scoped>
.auth-card {
  width: 380px;
  background: var(--card-bg);
  /* A softer, more diffused shadow */
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  padding: 40px;
  box-sizing: border-box;
  min-height: 400px;
  transition: background-color 0.3s, box-shadow 0.3s;
  /* Remove fixed height to allow content to define the card's height */
  margin: 1rem;
  padding-bottom: max(40px, env(safe-area-inset-bottom));
  position: relative;
}

/* 移动端响应式宽度 */
@media (max-width: 820px) {
  .auth-card {
    width: calc(100vw - 2rem);
    max-width: 380px;
    padding: 20px;
  }
}

html[data-theme="dark"] .auth-card {
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>