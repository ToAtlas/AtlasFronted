<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';

onMounted(() => {
  document.title = 'Atlas 重置密码';
});

const props = defineProps<{
  email: string;
}>();

const emit = defineEmits(['show-login']);

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
    const response = await fetch('/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: props.email, // 后端可能需要email来确认重置哪个账户
        ...values,
      }),
    });
    const result = await response.json();

    if (result.success) {
      Message.success('密码重置成功，请重新登录');
      
      // 清理验证相关的临时数据
      sessionStorage.removeItem('verification_token');
      sessionStorage.removeItem('verification_email');
      sessionStorage.removeItem('verification_type');
      
      emit('show-login');
    } else {
      errorMessage.value = result.message || '重置密码失败';
    }
  } catch (error) {
    errorMessage.value = '网络请求失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
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

    <a-form-item field="passwordConfirm" hide-label :rules="[{ required: true, message: '请再次输入密码' }, { validator: (value, cb) => value !== formModel.password ? cb('两次输入的密码不一致') : cb() }]" class="input-item last-input-item">
      <a-input-password v-model="formModel.passwordConfirm" placeholder="请重复新密码" size="large" :disabled="loading" />
    </a-form-item>

    <a-form-item class="button-item">
      <a-button type="primary" html-type="submit" long size="large" :loading="loading">完成</a-button>
    </a-form-item>
  </a-form>
</template>

<style scoped>
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
</style>
