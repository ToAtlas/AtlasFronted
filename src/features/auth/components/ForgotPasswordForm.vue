<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';

onMounted(() => {
  document.title = 'Atlas 找回密码';
});

const emit = defineEmits(['show-login', 'show-verification']);

const formModel = reactive({
  email: '',
});

const loading = ref(false);
const errorMessage = ref('');

const handleSubmit = async ({ values, errors }: { values: any, errors: any }) => {
  if (errors) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    // 模拟调用发送验证码的接口
    const response = await fetch('/v1/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: values.email }),
    });

    const result = await response.json();

    if (result.success) {
      Message.success('验证码已发送，请注意查收');

      // 存储到 sessionStorage
      sessionStorage.setItem('verification_token', result.data.verificationToken);
      sessionStorage.setItem('verification_email', values.email);
      sessionStorage.setItem('verification_type', 'forgot-password');

      // emit 事件让 AuthenticationCard 切换表单
      emit('show-verification', {
        email: values.email,
        mode: 'forgot-password'
      });
    } else {
      errorMessage.value = result.message || '发送验证码失败';
    }
  } catch (error) {
    errorMessage.value = '网络请求失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <a-form class="forgot-password-form" :model="formModel" @submit="handleSubmit" :layout="'vertical'">
    <a-typography-title :heading="3" :style="{ marginBottom: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)'}">
      找回密码
    </a-typography-title>

    <p class="instruction-text">
      输入需要找回的邮箱，我们将向其发送验证码。
    </p>

    <a-alert type="error" v-if="errorMessage" :style="{ marginBottom: '20px' }">
      {{ errorMessage }}
    </a-alert>

    <a-form-item field="email" hide-label :rules="[{ required: true, message: '邮箱不能为空' }, { type: 'email', message: '请输入正确的邮箱格式' }]" class="input-item">
      <a-input v-model="formModel.email" placeholder="Email" size="large" :disabled="loading" />
    </a-form-item>

    <a-form-item class="button-item">
      <a-button type="primary" html-type="submit" long size="large" :loading="loading">发送验证码</a-button>
    </a-form-item>

    <div class="login-link">
      <a-link @click="emit('show-login')" :disabled="loading">返回登录</a-link>
    </div>
  </a-form>
</template>

<style scoped>
.forgot-password-form :deep(.arco-form-item) {
  margin-bottom: 0;
}

.instruction-text {
  color: var(--color-text-3);
  font-size: 14px;
  margin-bottom: 24px;
  text-align: left;
}

.forgot-password-form .input-item {
  margin-bottom: 24px;
}

.forgot-password-form .button-item {
  margin-bottom: 16px;
}

.login-link {
  margin-top: 32px;
  width: 100%;
  text-align: left;
}
</style>
