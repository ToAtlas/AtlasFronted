<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';

onMounted(() => {
  const configStore = useConfigStore();
  document.title = `${configStore.brandName} 重置密码`;
});

const props = defineProps<{
  email: string;
}>();

const emit = defineEmits(['show-login']);

const authStore = useAuthStore();

const formModel = reactive({
  password: '',
  passwordConfirm: '',
});

const loading = ref(false);
const errorMessage = ref('');

const passwordValidator = (value: string, callback: (error?: string) => void) => {
  // 密码必须至少为8位，且包含字母和数字
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (value && !regex.test(value)) {
    callback('密码必须至少为8位，且包含字母和数字');
  } else {
    callback();
  }
};

const handleSubmit = async ({ values, errors }: { values: any, errors: any }) => {
  if (errors) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    // 从 store 获取邮箱和重置令牌
    const email = props.email || authStore.verificationState.email || '';
    if (!email) {
      errorMessage.value = '邮箱缺失，请重新验证';
      authStore.clearVerificationState();
      loading.value = false;
      return;
    }

    const passwordResetToken = authStore.verificationState.passwordResetToken;
    if (!passwordResetToken) {
      errorMessage.value = '重置令牌缺失，请重新验证';
      authStore.clearVerificationState();
      loading.value = false;
      return;
    }

    const response = await fetch('/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        passwordResetToken,
        ...values,
      }),
    });
    const result = await response.json();

    if (result.code === 200) {
      Message.success('密码重置成功，请重新登录');
      
      // 清理所有验证状态
      authStore.clearVerificationState();
      
      emit('show-login');
    } else if (result.code === 429) {
      errorMessage.value = result.message || '操作过于频繁，请稍后再试';
      // 操作频繁，清空状态让用户重新开始
      authStore.clearVerificationState();
    } else if (result.code === 401) {
      errorMessage.value = result.message || '账号验证失败';
      // 验证失败，清空状态
      authStore.clearVerificationState();
    } else {
      errorMessage.value = result.message || '重置密码失败';
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
  <div class="reset-password-form-wrapper">
    <a-form class="reset-password-form" :model="formModel" @submit="handleSubmit" :layout="'vertical'">
      <a-typography-title :heading="3" :style="{ marginBottom: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }">
        重置密码
      </a-typography-title>

      <p class="instruction-text">
        为账号 <span class="email-highlight">{{ props.email }}</span> 设置新密码
      </p>

      <a-alert type="error" v-if="errorMessage" :style="{ marginBottom: '20px' }">
        {{ errorMessage }}
      </a-alert>

      <a-form-item field="password" hide-label :rules="[{ required: true, message: '新密码不能为空' }, { validator: passwordValidator }]" class="input-item">
        <a-input-password v-model="formModel.password" placeholder="请输入新密码" size="large" :disabled="loading" />
      </a-form-item>

      <a-form-item field="passwordConfirm" hide-label :rules="[{ required: true, message: '请再次输入密码' }, { validator: (value: string, cb: (error?: string) => void) => value !== formModel.password ? cb('两次输入的密码不一致') : cb() }]" class="input-item last-input-item">
        <a-input-password v-model="formModel.passwordConfirm" placeholder="请重复新密码" size="large" :disabled="loading" />
      </a-form-item>

      <a-form-item class="button-item">
        <a-button type="primary" html-type="submit" long size="large" :loading="loading">完成</a-button>
      </a-form-item>

      <div class="back-to-login">
        <a-link @click="handleBackToLogin" :disabled="loading">返回登录</a-link>
      </div>
    </a-form>
  </div>
</template>

<style scoped>
.reset-password-form-wrapper {
  width: 100%;
}

.reset-password-form :deep(.arco-form-item) {
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

.reset-password-form .input-item {
  margin-bottom: 20px;
}

.reset-password-form .last-input-item {
  margin-bottom: 24px;
}

.reset-password-form .button-item {
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