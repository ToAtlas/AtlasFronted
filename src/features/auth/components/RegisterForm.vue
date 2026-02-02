<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useConfigStore } from '@/stores/config';

const emit = defineEmits(['show-login', 'show-verification']);
const configStore = useConfigStore();

onMounted(() => {
  document.title = `${configStore.brandName} 注册`;
});

const registerTitle = computed(() => `立即注册${configStore.brandName}`);

const formModel = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  agree: false,
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
  if (errors) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('/v1/auth/signup/using-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    const result = await response.json();

    if (result.code === 200) {
      Message.success('验证码已发送！');

      // 存储到 sessionStorage
      sessionStorage.setItem('verification_token', result.data.verificationToken);
      sessionStorage.setItem('verification_email', values.email);
      sessionStorage.setItem('verification_type', 'signup');

      // emit 事件让 AuthenticationCard 切换表单
      emit('show-verification', {
        email: values.email,
        mode: 'signup'
      });
    } else {
      errorMessage.value = result.message || '注册失败，请稍后再试。';
    }
  } catch (error) {
    console.error('Signup request failed', error);
    errorMessage.value = '网络请求失败，请检查您的网络连接。';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <a-form class="register-form" :model="formModel" @submit="handleSubmit" :layout="'vertical'">
    <a-typography-title :heading="3" :style="{ marginBottom: '32px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)', marginLeft: '0.5rem'}">
      {{ registerTitle }}
    </a-typography-title>

    <a-alert type="error" v-if="errorMessage" :style="{ marginBottom: '20px' }">
      {{ errorMessage }}
    </a-alert>

    <a-form-item field="name" hide-label :rules="[{ required: true, message: '用户名不能为空' }]" class="input-item">
      <a-input v-model="formModel.name" placeholder="请输入您的用户名" size="large" :disabled="loading" />
    </a-form-item>

    <a-form-item field="email" hide-label :rules="[{ required: true, message: '邮箱不能为空' }, { type: 'email', message: '请输入正确的邮箱格式' }]" class="input-item">
      <a-input v-model="formModel.email" placeholder="请输入您的邮箱" size="large" :disabled="loading" />
    </a-form-item>

    <a-form-item field="password" hide-label :rules="[{ required: true, message: '密码不能为空' }, { validator: passwordValidator }]" class="input-item">
      <a-input-password v-model="formModel.password" placeholder="请输入您的密码" size="large" :disabled="loading" />
    </a-form-item>

    <a-form-item field="passwordConfirm" hide-label :rules="[{ required: true, message: '请再次输入密码' }, { validator: (value, cb) => value !== formModel.password ? cb('两次输入的密码不一致') : cb() }]" class="input-item">
      <a-input-password v-model="formModel.passwordConfirm" placeholder="请再次输入您的密码" size="large" :disabled="loading" />
    </a-form-item>

    <a-form-item field="agree" hide-label :rules="[{ type: 'boolean', true: true, message: '请先同意服务协议'}]" class="agreement-item">
      <a-checkbox v-model="formModel.agree" :disabled="loading">
        我已阅读并同意 <a-link>{{ configStore.brandName }}服务协议</a-link>
      </a-checkbox>
    </a-form-item>

    <a-form-item class="button-item">
      <a-button type="primary" html-type="submit" long size="large" :loading="loading">注册并获取验证码</a-button>
    </a-form-item>

    <div class="login-link">
      已有账号？<a-link @click="emit('show-login')" :disabled="loading">返回登录</a-link>
    </div>
  </a-form>
</template>

<style scoped>
/* We remove default margin from all form items to have full control */
.register-form :deep(.arco-form-item) {
  margin-bottom: 0;
}

/* Spacing for regular inputs */
.register-form .input-item {
  margin-bottom: 20px;
}

.register-form .agreement-item {
  margin-bottom: 24px;
}

/* Spacing for buttons */
.register-form .button-item {
  margin-bottom: 16px;
}

.login-link {
  margin-top: 32px;
  width: 100%;
  text-align: center;
  color: var(--color-text-3);
  font-size: 14px;
}
</style>
