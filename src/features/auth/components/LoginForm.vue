<script setup lang="ts">
import api from '@/services/api'
import { Message } from '@arco-design/web-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

const emit = defineEmits(['showRegister', 'showForgotPassword'])
const router = useRouter()
const authStore = useAuthStore()
const configStore = useConfigStore()

// 动态页面标题和欢迎语
onMounted(() => {
  document.title = `${configStore.brandName} 登录`
})

const welcomeText = computed(() => `欢迎来到${configStore.brandName}`)

const formModel = reactive({
  email: '',
  password: '',
})

const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit({ values, errors }: { values: any, errors: any }) {
  if (errors) {
    // 如果表单验证失败，则不继续
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await api.post('/v1/auth/login/email-password', values)
    const result = response.data

    // 检查业务代码
    if (result.code === 200) {
      // 登录成功
      authStore.login({ accessToken: result.data.accessToken, expiresIn: result.data.expiresIn }) // 使用 auth store 保存 token
      Message.success('登录成功！')

      // 检查是否有重定向目标
      const redirectPath = router.currentRoute.value.query.redirect
      if (typeof redirectPath === 'string' && redirectPath) {
        router.push(redirectPath)
      }
      else {
        // 默认跳转到工作台页面
        router.push({ name: 'workspace' })
      }
    }
    else {
      // 对于业务错误(result.code !== 200)
      // 都优先使用后端返回的message字段
      errorMessage.value = result.message || '未知错误，请稍后再试。'
    }
  }
  catch (error: any) {
    // 这个 catch 现在主要捕获网络级别的错误和非2xx的HTTP状态码
    console.error('Login request failed', error)
    errorMessage.value = error.response?.data?.message || '网络请求失败，请检查您的网络连接。'
  }
  finally {
    loading.value = false
  }
}

function handleSsoLogin() {
  // 目前只是占位，显示提示
  Message.warning('暂不支持SSO登录')

  // 未来真实实现：
  // window.location.href = configStore.ssoEndpoint;
}
</script>

<template>
  <a-form class="login-form" :model="formModel" layout="vertical" @submit="handleSubmit">
    <a-typography-title :heading="3" :style="{ marginBottom: '32px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)', marginLeft: '0.5rem' }">
      {{ welcomeText }}
    </a-typography-title>

    <a-alert v-if="errorMessage" type="error" :style="{ marginBottom: '20px' }">
      {{ errorMessage }}
    </a-alert>

    <!-- 邮箱密码登录表单 - 根据配置显示/隐藏 -->
    <template v-if="configStore.isPasswordEnabled">
      <a-form-item field="email" hide-label :rules="[{ required: true, message: '邮箱不能为空' }, { type: 'email', message: '请输入正确的邮箱格式' }]" class="input-item">
        <a-input v-model="formModel.email" placeholder="请输入您的邮箱" aria-label="邮箱" size="large" :disabled="loading" />
      </a-form-item>

      <a-form-item field="password" hide-label :rules="[{ required: true, message: '密码不能为空' }]" class="input-item last-input-item">
        <a-input-password v-model="formModel.password" placeholder="请输入您的密码" aria-label="密码" size="large" :disabled="loading" />
      </a-form-item>

      <div class="forgot-password-link">
        <a-link :disabled="loading" @click="emit('showForgotPassword')">
          忘记密码
        </a-link>
      </div>

      <a-form-item class="button-item">
        <a-button type="primary" html-type="submit" long size="large" :loading="loading">
          登录
        </a-button>
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
      没有账号？<a-link :disabled="loading" @click="emit('showRegister')">
        立即注册
      </a-link>
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
