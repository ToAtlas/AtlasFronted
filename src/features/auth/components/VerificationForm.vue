<script setup lang="ts">
import { onMounted, reactive, computed, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';

// 定义 props
const props = defineProps<{
  email: string;
  mode: 'signup' | 'forgot-password';
  tempToken?: string;
  emailLinkToken?: string;
}>();

// 定义 emits
const emit = defineEmits(['show-login', 'show-reset-password', 'verification-success']);

const router = useRouter();
const authStore = useAuthStore();
const configStore = useConfigStore();

const formModel = reactive({
  code: '',
});

const loading = ref(false);
const errorMessage = ref('');
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

// 邮件链接自动验证
const verifyEmailToken = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('/v1/auth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: props.emailLinkToken,
        type: props.mode
      }),
    });
    const result = await response.json();

    if (result.code === 200) {
      Message.success('验证成功！');

      // 如果是找回密码流程，保存重置密码 token
      if (props.mode === 'forgot-password') {
        if (result.data?.passwordResetToken) {
          authStore.setPasswordResetToken(result.data.passwordResetToken);
        } else {
          errorMessage.value = '重置令牌缺失，请重新验证';
          isEmailLinkMode.value = false;
          return;
        }
      }

      emit('verification-success', result);
    } else if (result.code === 401) {
      errorMessage.value = result.message || '账号验证失败';
      // 验证失败，清空状态
      authStore.clearVerificationState();
      isEmailLinkMode.value = false;
    } else if (result.code === 429) {
      errorMessage.value = result.message || '操作过于频繁，请稍后再试';
      // 操作频繁，清空状态让用户重新开始
      authStore.clearVerificationState();
      isEmailLinkMode.value = false;
    } else {
      errorMessage.value = result.message || '验证链接无效或已过期';
      authStore.clearVerificationState();
      isEmailLinkMode.value = false;
    }
  } catch (error) {
    errorMessage.value = '网络请求失败';
    authStore.clearVerificationState();
    isEmailLinkMode.value = false;
  } finally {
    loading.value = false;
  }
};

// 组件加载时的防御性校验和自动验证
onMounted(() => {
  document.title = `${configStore.brandName} 输入验证码`;
  if (!props.mode || !['signup', 'forgot-password'].includes(props.mode)) {
    console.error('VerificationForm: Invalid or missing mode prop. Redirecting to login.');
    emit('show-login');
    return;
  }
  
  // 检测是否为邮件链接模式
  if (props.emailLinkToken) {
    isEmailLinkMode.value = true;
    // 自动调用邮件验证
    verifyEmailToken();
  }
});

// 手动验证码提交处理
const handleSubmit = async ({ values, errors }: { values: any, errors: any }) => {
  if (errors) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    // 从 store 获取 verificationToken
    const tempToken = authStore.verificationState.verificationToken || props.tempToken;
    
    if (!tempToken) {
      errorMessage.value = '验证会话已过期，请重新获取验证码';
      authStore.clearVerificationState();
      loading.value = false;
      return;
    }
    
    // 使用 verificationToken 进行验证
    const response = await fetch('/v1/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        verificationToken: tempToken,
        code: values.code,
        type: props.mode
      }),
    });
    const result = await response.json();

    if (result.code === 200) {
      Message.success('验证成功！');

      // 如果是找回密码流程，保存重置密码 token
      if (props.mode === 'forgot-password') {
        if (result.data?.passwordResetToken) {
          authStore.setPasswordResetToken(result.data.passwordResetToken);
        } else {
          errorMessage.value = '重置令牌缺失，请重新验证';
          authStore.clearVerificationState();
          loading.value = false;
          return;
        }
      }

      emit('verification-success', result);
    } else if (result.code === 401) {
      errorMessage.value = result.message || '账号验证失败';
      // 验证失败，清空状态
      authStore.clearVerificationState();
    } else if (result.code === 429) {
      errorMessage.value = result.message || '操作过于频繁，请稍后再试';
      // 操作频繁，清空状态让用户重新开始
      authStore.clearVerificationState();
    } else {
      errorMessage.value = result.message || '验证码错误或已过期';
    }
  } catch (error) {
    errorMessage.value = '网络请求失败';
    authStore.clearVerificationState();
  } finally {
    loading.value = false;
  }
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

      <a-alert type="error" v-if="errorMessage" :style="{ marginBottom: '20px' }">
        {{ errorMessage }}
      </a-alert>

      <div v-if="loading" class="loading-container">
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

      <a-alert type="error" v-if="errorMessage" :style="{ marginBottom: '20px' }">
        {{ errorMessage }}
      </a-alert>

      <a-form-item field="code" hide-label :rules="[{ required: true, message: '验证码不能为空' }, { length: 6, message: '请输入6位验证码' }]" class="input-item">
        <a-verification-code v-model="formModel.code" :length="6" :disabled="loading"/>
      </a-form-item>

      <a-form-item class="button-item">
        <a-button type="primary" html-type="submit" long size="large" :loading="loading">{{ viewConfig.buttonText }}</a-button>
      </a-form-item>

      <div class="back-to-login">
        <a-link @click="handleBackToLogin" :disabled="loading">返回登录</a-link>
      </div>
    </a-form>
  </div>
</template>

<style scoped>
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