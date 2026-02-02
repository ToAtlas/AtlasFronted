<script setup lang="ts">
import { ref, shallowRef, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';
import VerificationForm from './VerificationForm.vue';
import ForgotPasswordForm from './ForgotPasswordForm.vue';
import ResetPasswordForm from './ResetPasswordForm.vue';

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
const currentView = shallowRef(LoginForm);
const emailForFlow = ref('');
const verificationMode = ref<'signup' | 'forgot-password'>('signup');
const emailVerificationToken = ref('');

const showRegister = () => {
  currentView.value = RegisterForm;
};

const showLogin = () => {
  currentView.value = LoginForm;
};

const showVerification = (payload: { email: string; mode: 'signup' | 'forgot-password' }) => {
  emailForFlow.value = payload.email;
  verificationMode.value = payload.mode;
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
  const verificationType = sessionStorage.getItem('verification_type');

  if (verificationType === 'signup') {
    // 注册流程的验证成功后，保存 token 并跳转到工作台
    if (result.data?.accessToken && result.data?.refreshToken) {
      authStore.login({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      });
    }
    // 清理 sessionStorage
    sessionStorage.removeItem('verification_token');
    sessionStorage.removeItem('verification_email');
    sessionStorage.removeItem('verification_type');
    // 清除 URL 参数
    router.push({ name: 'workspace' });
  } else if (verificationType === 'forgot-password') {
    // 找回密码流程的验证成功后，显示重置密码表单
    // 注意：不在这里清理 token，让 ResetPasswordForm 在密码重置成功后清理
    const email = sessionStorage.getItem('verification_email') || emailForFlow.value;
    // 清除 URL 参数
    router.replace({ name: 'login' });
    showResetPassword(email);
  }
};

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
  }
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
