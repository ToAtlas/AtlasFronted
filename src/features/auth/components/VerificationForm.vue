<script setup lang="ts">
import { onMounted, reactive, computed, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';

// 定义 props
const props = defineProps<{
  email: string;
  mode: 'signup' | 'forgot-password';
  emailLinkToken?: string;
}>();

// 定义 emits
const emit = defineEmits(['show-login', 'verification-success']);

const authStore = useAuthStore();
const configStore = useConfigStore();

const formModel = reactive({
  code: '',
});

const isEmailLinkMode = ref(false);

// 根据 mode 计算不同的文案
const viewConfig = computed(() => {
  if (props.mode === 'signup') {
    return {
      title: '验证您的邮箱',
      buttonText: '完成注册',
    };
  }
  return {
    title: '重置密码',
    buttonText: '验证并重置密码',
  };
});

// 组件加载时的防御性校验和自动验证
onMounted(async () => {
  document.title = `${configStore.brandName} 输入验证码`;
  
  // 防御性校验
  if (!props.mode || !['signup', 'forgot-password'].includes(props.mode)) {
    console.error('VerificationForm: Invalid or missing mode prop. Redirecting to login.');
    emit('show-login');
    return;
  }
  
  // 检测是否为邮件链接模式，并自动验证
  if (props.emailLinkToken) {
    isEmailLinkMode.value = true;
    
    const result = await authStore.unifiedVerify({
      token: props.emailLinkToken,
      type: props.mode,
    });

    if (result) {
      Message.success('验证成功！');
      emit('verification-success', result);
    } else {
      // 失败时，authStore.error 会被设置
      Message.error(authStore.error || '验证失败，请重试');
      // 关键：自动验证失败后，返回登录页
      emit('show-login');
    }
  }
});

// 手动验证码提交处理
const handleSubmit = async ({ values, errors }: { values: any, errors: any }) => {
  if (errors) return;

  // 从 store 获取 verificationToken
  const tempToken = authStore.verificationState.verificationToken;
  
  if (!tempToken) {
    authStore.error = '验证会话已过期，请重新获取验证码';
    authStore.clearVerificationState();
    return;
  }
  
  const result = await authStore.unifiedVerify({
    token: tempToken,
    code: values.code,
    type: props.mode,
  });

  if (result) {
    Message.success('验证成功！');
    emit('verification-success', result);
  }
  // 失败时，authStore.error 会被设置，模板会自动显示错误信息
};

// 手动返回登录（清空所有验证状态）
const handleBackToLogin = () => {
  authStore.clearVerificationState();
  emit('show-login');
};
</script>

<template>
  <div class="verification-form-wrapper">
    <!-- 邮件链接验证模式 -->
    <div v-if="isEmailLinkMode" class="email-link-verification">
      <a-typography-title :heading="3" :style="{ marginBottom: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }">
        {{ viewConfig.title }}
      </a-typography-title>

      <p class="instruction-text">
        正在验证您的邮箱 <span class="email-highlight">{{ props.email }}</span>，请稍候...
      </p>

      <!-- 错误消息现在从 store 获取 -->
      <a-alert type="error" v-if="authStore.error && !authStore.loading" :style="{ marginBottom: '20px' }">
        {{ authStore.error }}
      </a-alert>

      <!-- 加载状态现在从 store 获取 -->
      <div v-if="authStore.loading" class="loading-container">
        <a-spin size="large" />
      </div>

      <div class="back-to-login">
        <a-link @click="handleBackToLogin">返回登录</a-link>
      </div>
    </div>

    <!-- 手动验证码模式 -->
    <a-form v-else class="verification-form" :model="formModel" @submit="handleSubmit" :layout="'vertical'">
      <a-typography-title :heading="3" :style="{ marginBottom: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }">
        {{ viewConfig.title }}
      </a-typography-title>

      <p class="instruction-text">
        我们向 <span class="email-highlight">{{ props.email }}</span> 发送了一个6位数验证码，请输入。
      </p>

      <!-- 错误消息现在从 store 获取 -->
      <a-alert type="error" v-if="authStore.error" :style="{ marginBottom: '20px' }">
        {{ authStore.error }}
      </a-alert>

      <a-form-item field="code" hide-label :rules="[{ required: true, message: '验证码不能为空' }, { length: 6, message: '请输入6位验证码' }]" class="input-item">
        <a-verification-code v-model="formModel.code" :length="6" :disabled="authStore.loading"/>
      </a-form-item>

      <a-form-item class="button-item">
        <!-- 加载状态现在从 store 获取 -->
        <a-button type="primary" html-type="submit" long size="large" :loading="authStore.loading">{{ viewConfig.buttonText }}</a-button>
      </a-form-item>

      <div class="back-to-login">
        <a-link @click="handleBackToLogin" :disabled="authStore.loading">返回登录</a-link>
      </div>
    </a-form>
  </div>
</template>

<style scoped>
/* ... 样式部分保持不变 ... */
.verification-form-wrapper {
  width: 100%;
}

.email-link-verification {
  width: 100%;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.verification-form :deep(.arco-form-item) {
  margin-bottom: 0;
}

.instruction-text {
  color: var(--color-text-3);
  font-size: 14px;
  margin-bottom: 24px;
  text-align: left;
}

.email-highlight {
  color: var(--color-text-2);
  font-weight: 500;
}

.verification-form .input-item {
  margin-bottom: 24px;
}

.verification-form :deep(.arco-verification-code) {
  justify-content: space-between;
}

.verification-form .button-item {
  margin-bottom: 16px;
}

.back-to-login {
  margin-top: 32px;
  width: 100%;
  text-align: left;
}

.back-to-login :deep(.arco-link) {
  color: var(--color-text-3);
  font-size: 14px;
}

.back-to-login :deep(.arco-link:hover) {
  color: var(--color-text-2);
}
</style>