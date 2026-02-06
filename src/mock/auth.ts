import type { MockMethod } from 'vite-plugin-mock'
import Mock from 'mockjs'

// 模拟一个已存在的用户数据库
const existingUser = {
  email: 'admin@atlas.com',
}

// 固定的测试 token（方便测试）
const TEST_VERIFICATION_TOKEN = 'test-token-123456'
const TEST_EMAIL_TOKEN = 'email-link-token-789'
const TEST_PASSWORD_RESET_TOKEN = 'reset-token-654321'

const authMock: MockMethod[] = [
  // 获取认证配置接口
  {
    url: '/v1/config/auth',
    method: 'get',
    response: () => {
      return {
        code: 200,
        data: {
          loginMode: 2, // 0: 仅SSO, 1: 共存, 2: 仅账号密码（默认）
          ssoProviders: [
            {
              id: 'google',
              name: 'Google',
              enabled: true,
            },
            {
              id: 'github',
              name: 'GitHub',
              enabled: true,
            },
          ],
        },
      }
    },
  },
  // 登录接口
  {
    url: '/v1/auth/login/email-password',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { email, password } = body
      if (email === existingUser.email && password === 'admin123') {
        return {
          code: 200,
          message: '登录成功',
          data: {
            accessToken: Mock.Random.guid(),
            refreshToken: Mock.Random.guid(),
            expiresIn: '7200s',
          },
        }
      }
      else {
        return {
          code: 401,
          message: '邮箱或密码错误',
          data: null,
        }
      }
    },
  },
  // 注销接口
  {
    url: '/v1/auth/logout',
    method: 'post',
    response: () => ({
      code: 200,
      message: '注销成功',
      data: null,
    }),
  },
  // 注册接口
  {
    url: '/v1/auth/signup/using-email',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { email, password, passwordConfirm } = body
      if (email === existingUser.email) {
        return {
          code: 400,
          message: '该邮箱已被注册',
          data: null,
        }
      }
      if (password !== passwordConfirm) {
        return {
          code: 400,
          message: '两次输入的密码不一致',
          data: null,
        }
      }
      return {
        code: 200,
        message: '验证码已发送',
        data: {
          verificationToken: TEST_VERIFICATION_TOKEN, // 使用固定 token
        },
      }
    },
  },
  // 验证码校验接口（使用 token）
  {
    url: '/v1/auth/verify-code',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { verificationToken, code, type } = body

      // 验证 token 是否存在
      if (!verificationToken) {
        return { code: 400, message: '验证令牌无效', data: null }
      }

      // 验证 token 是否正确（测试 token 或任意 GUID）
      if (verificationToken !== TEST_VERIFICATION_TOKEN && !verificationToken.includes('-')) {
        return { code: 400, message: 'Token 无效或已过期', data: null }
      }

      // 验证码校验
      if (code !== '114514') {
        return { code: 400, message: '验证码错误', data: null }
      }

      // 验证成功
      if (type === 'forgot-password') {
        return {
          code: 200,
          message: '验证成功',
          data: {
            passwordResetToken: TEST_PASSWORD_RESET_TOKEN,
          },
        }
      }

      return {
        code: 200,
        message: '验证成功',
        data: {
          accessToken: Mock.Random.guid(),
          refreshToken: Mock.Random.guid(),
          expiresIn: '7200s',
        },
      }
    },
  },
  // 邮件链接验证接口
  {
    url: '/v1/auth/verify-token',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { token, type } = body

      // 验证 token
      if (!token) {
        return { code: 400, message: 'Token 无效', data: null }
      }

      // 只接受测试邮件 token
      if (token !== TEST_EMAIL_TOKEN) {
        return { code: 400, message: 'Token 无效或已过期', data: null }
      }

      // 验证成功
      if (type === 'forgot-password') {
        return {
          code: 200,
          message: '验证成功',
          data: {
            passwordResetToken: TEST_PASSWORD_RESET_TOKEN,
          },
        }
      }

      return {
        code: 200,
        message: '验证成功',
        data: {
          accessToken: Mock.Random.guid(),
          refreshToken: Mock.Random.guid(),
          expiresIn: '7200s',
        },
      }
    },
  },
  // 发送验证码接口（用于找回密码）
  {
    url: '/v1/auth/send-verification-code',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { email } = body
      if (email !== existingUser.email) {
        return {
          code: 400,
          message: '该邮箱未注册',
          data: null,
        }
      }
      return {
        code: 200,
        message: '验证码已发送',
        data: {
          verificationToken: TEST_VERIFICATION_TOKEN, // 使用固定 token
        },
      }
    },
  },
  // 重发验证码接口
  {
    url: '/v1/auth/resend-verification-code',
    method: 'post',
    response: ({ body }: { body: any }) => {
      // 模拟速率限制
      if (Math.random() < 0.2) { // 20% 几率触发
        return {
          code: 429,
          message: '请求过于频繁，请1分钟后再试',
        }
      }

      // 成功响应
      const { email, oldVerificationToken } = body
      if (email && oldVerificationToken) {
        return {
          code: 200,
          message: '新的验证码已发送',
          data: {
            verificationToken: `new-mock-token-${Date.now()}`,
          },
        }
      }
      else {
        return {
          code: 400,
          message: '请求参数错误',
        }
      }
    },
  },
  {
    // 重置密码接口
    url: '/v1/auth/reset-password',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { email, passwordResetToken, password, passwordConfirm } = body

      if (!email) {
        return {
          code: 400,
          message: '邮箱不能为空',
          data: null,
        }
      }

      if (email !== existingUser.email) {
        return {
          code: 400,
          message: '该邮箱未注册',
          data: null,
        }
      }

      if (!passwordResetToken) {
        return {
          code: 400,
          message: '重置令牌无效',
          data: null,
        }
      }

      if (passwordResetToken !== TEST_PASSWORD_RESET_TOKEN && !passwordResetToken.includes('-')) {
        return {
          code: 400,
          message: '重置令牌无效或已过期',
          data: null,
        }
      }

      if (password !== passwordConfirm) {
        return {
          code: 400,
          message: '两次输入的密码不一致',
          data: null,
        }
      }

      // 简单模拟成功
      return {
        code: 200,
        message: '重置成功',
        data: null,
      }
    },
  },
  // 认证配置接口 - 返回认证相关配置
  {
    url: '/v1/auth/config',
    method: 'get',
    response: () => ({
      code: 200,
      message: '获取配置成功',
      data: {
        // 登录模式：0=共存, 1=仅SSO, 2=仅密码
        loginMode: 0,

        // SSO 配置
        sso: {
          enabled: true,
          buttonText: 'SSO登录',
          endpoint: '/v1/auth/sso/login',
        },

        // 邮箱密码配置
        emailPassword: {
          enabled: true,
          allowRegister: true,
        },
      },
    }),
  },
]

export default authMock
