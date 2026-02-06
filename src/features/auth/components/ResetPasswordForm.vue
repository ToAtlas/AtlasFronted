<script setup lang="ts">
import api from '@/services/api'
import { Message } from '@arco-design/web-vue'
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{
  email: string
}>()

const emit = defineEmits(['showLogin'])

onMounted(() => {
  const configStore = useConfigStore()
  document.title = `${configStore.brandName} 重置密码`
})

const authStore = useAuthStore()

const formModel = reactive({
  password: '',
  passwordConfirm: '',
})

const loading = ref(false)
const errorMessage = ref('')

function passwordValidator(value: string, callback: (error?: string) => void) {
  // 密码必须至少为8位，且包含字母和数字
  const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/i
  if (value && !regex.test(value)) {
    callback('密码必须至少为8位，且包含字母和数字')
  }
  else {
    callback()
  }
}

async function handleSubmit({ values, errors }: { values: any, errors: any }) {
  if (errors)
    return

  loading.value = true
  errorMessage.value = ''

  try {
    // 从 store 获取邮箱和重置令牌
    const email = props.email || authStore.verificationStateValue.email || ''
    if (!email) {
      errorMessage.value = '邮箱缺失，请重新验证'
      authStore.clearVerificationState()
      loading.value = false
      return
    }

    const passwordResetToken = authStore.verificationStateValue.passwordResetToken
    if (!passwordResetToken) {
      errorMessage.value = '重置令牌缺失，请重新验证'
      authStore.clearVerificationState()
      loading.value = false
      return
    }

    const response = await api.post('/v1/auth/reset-password', {
      email,
      passwordResetToken,
      ...values,
    })
    const result = response.data

    if (result.code === 200) {
      Message.success('密码重置成功，请重新登录')

      // 清理所有验证状态
      authStore.clearVerificationState()

      emit('showLogin')
    }
    else {
      errorMessage.value = result.message || '重置密码失败'
      // 根据错误类型决定是否清除状态
      if (result.code === 401 || result.code === 429) {
        authStore.clearVerificationState()
      }
    }
  }
  catch (error: any) {
    errorMessage.value = error.response?.data?.message || '网络请求失败'
    authStore.clearVerificationState()
  }
  finally {
    loading.value = false
  }
}

// 手动返回登录（清空所有验证状态）
function handleBackToLogin() {
  authStore.clearVerificationState()
  emit('showLogin')
}
</script>

<template>
  <div class="reset-password-form-wrapper">
    <a-form class="reset-password-form" :model="formModel" layout="vertical" @submit="handleSubmit">
      <a-typography-title :heading="3" :style="{ marginBottom: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-color)' }">
        重置密码
      </a-typography-title>

      <p class="instruction-text">
        为账号 <span class="email-highlight">{{ props.email }}</span> 设置新密码
      </p>

      <a-alert v-if="errorMessage" type="error" :style="{ marginBottom: '20px' }">
        {{ errorMessage }}
      </a-alert>

      <a-form-item field="password" hide-label :rules="[{ required: true, message: '新密码不能为空' }, { validator: passwordValidator }]" class="input-item">
        <a-input-password v-model="formModel.password" placeholder="请输入新密码" size="large" :disabled="loading" />
      </a-form-item>

      <a-form-item field="passwordConfirm" hide-label :rules="[{ required: true, message: '请再次输入密码' }, { validator: (value: string, cb: (error?: string) => void) => value !== formModel.password ? cb('两次输入的密码不一致') : cb() }]" class="input-item last-input-item">
        <a-input-password v-model="formModel.passwordConfirm" placeholder="请重复新密码" size="large" :disabled="loading" />
      </a-form-item>

      <a-form-item class="button-item">
        <a-button type="primary" html-type="submit" long size="large" :loading="loading">
          完成
        </a-button>
      </a-form-item>

      <div class="back-to-login">
        <a-link :disabled="loading" @click="handleBackToLogin">
          返回登录
        </a-link>
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
