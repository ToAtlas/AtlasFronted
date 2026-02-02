<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';

const emit = defineEmits(['show-register', 'show-forgot-password']);
const router = useRouter();
const authStore = useAuthStore();
const configStore = useConfigStore();

// 动态页面标题和欢迎语
onMounted(() => {
  document.title = `${configStore.brandName} 登录`;
});

const welcomeText = computed(() => `欢迎来到${configStore.brandName}`);

const formModel = reactive({
  email: '',
  password: '',
});

const loading = ref(false);
const errorMessage = ref('');

const handleSubmit = async ({ values, errors }: { values: any, errors: any }) => {
  if (errors) {
    // 如果表单验证失败，则不继续
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('/v1/auth/login/email-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    const result = await response.json();

    if (result.code === 200) {
      // 登录成功
      authStore.login(result.data); // 使用 auth store 保存 token
      Message.success('登录成功！');
      // 跳转到工作台页面
      router.push({ name: 'workspace' });
    } else {
      // 登录失败，显示后端返回的错误信息
      errorMessage.value = result.message || '登录失败，请稍后再试。';
    }
  } catch (error) {
    console.error('Login request failed', error);
    errorMessage.value = '网络请求失败，请检查您的网络连接。';
  } finally {
    loading.value = false;
  }
};

const handleSsoLogin = () => {
  // 目前只是占位，显示提示
  Message.warning('暂不支持SSO登录');

  // 未来真实实现：
  // window.location.href = configStore.ssoEndpoint;
};
</script>

<template>
  <a-form class="login-form" :model="formModel" @submit="handleSubmit" :layout="'vertical'">
    <a-typography-title :heading="3" :style="{ marginBottom: '32px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)', marginLeft: '0.5rem' }">
      {{ welcomeText }}
    </a-typography-title>

    <a-alert type="error" v-if="errorMessage" :style="{ marginBottom: '20px' }">
      {{ errorMessage }}
    </a-alert>

    <!-- 邮箱密码登录表单 - 根据配置显示/隐藏 -->
    <template v-if="configStore.isPasswordEnabled">
      <a-form-item field="email" hide-label :rules="[{ required: true, message: '邮箱不能为空' }, { type: 'email', message: '请输入正确的邮箱格式' }]" class="input-item">
        <a-input v-model="formModel.email" placeholder="请输入您的邮箱" size="large" :disabled="loading" />
      </a-form-item>

      <a-form-item field="password" hide-label :rules="[{ required: true, message: '密码不能为空' }]" class="input-item last-input-item">
        <a-input-password v-model="formModel.password" placeholder="请输入您的密码" size="large" :disabled="loading" />
      </a-form-item>

      <div class="forgot-password-link">
        <a-link @click="emit('show-forgot-password')" :disabled="loading">忘记密码</a-link>
      </div>

      <a-form-item class="button-item">
        <a-button type="primary" html-type="submit" long size="large" :loading="loading">登录</a-button>
      </a-form-item>
    </template>

    <!-- SSO 登录按钮 - 根据配置显示/隐藏 -->
    <a-form-item v-if="configStore.isSsoEnabled" class="button-item">
      <a-button type="outline" long size="large" :disabled="loading" @click="handleSsoLogin">
        {{ configStore.ssoButtonText }}
      </a-button>
    </a-form-item>

    <!-- 注册链接 - 根据配置显示/隐藏 -->
    <div v-if="configStore.allowRegister && configStore.isPasswordEnabled" class="register-link">
      没有账号？<a-link @click="emit('show-register')" :disabled="loading">立即注册</a-link>
    </div>
  </a-form>
</template>

<style scoped>
.login-form :deep(.arco-form-item) {
  margin-bottom: 0;
}

.login-form .input-item {
  margin-bottom: 20px;
}

.login-form .last-input-item {
  margin-bottom: 8px;
}

.forgot-password-link {
  width: 100%;
  text-align: right;
  margin-bottom: 16px;
  font-size: 14px;
}

.login-form .button-item {
  margin-bottom: 12px;
}

.register-link {
  margin-top: 32px;
  width: 100%;
  text-align: center;
  color: var(--color-text-3);
  font-size: 14px;
}
</style>
