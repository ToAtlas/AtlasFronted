import type { MockMethod } from 'vite-plugin-mock';
import Mock from 'mockjs';

// 模拟一个已存在的用户数据库
const existingUser = {
  email: 'admin@atlas.com',
};

// 固定的测试 token（方便测试）
const TEST_VERIFICATION_TOKEN = 'test-token-123456';
const TEST_EMAIL_TOKEN = 'email-link-token-789';

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
      };
    },
  },
  // 登录接口
  {
    url: '/v1/auth/login/email-password',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { email, password } = body;
      if (email === existingUser.email && password === 'admin123') {
        return {
          code: 200,
          message: '登录成功',
          data: {
            accessToken: Mock.Random.guid(),
            refreshToken: Mock.Random.guid(),
            expiresIn: '7200s',
          },
        };
      } else {
        return {
          code: 401,
          message: '邮箱或密码错误',
          data: null,
        };
      }
    },
  },
  // 注销接口
  {
    url: '/v1/auth/logout',
    method: 'post',
    response: () => ({ success: true }),
  },
  // 注册接口
  {
    url: '/v1/auth/signup/using-email',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { name, email, password, passwordConfirm } = body;
      if (email === existingUser.email) {
        return {
          code: 400,
          message: '该邮箱已被注册',
          data: null,
        };
      }
      if (password !== passwordConfirm) {
        return {
          code: 400,
          message: '两次输入的密码不一致',
          data: null,
        };
      }
      return {
        code: 200,
        message: '验证码已发送',
        data: {
          verificationToken: TEST_VERIFICATION_TOKEN,  // 使用固定 token
        },
      };
    },
  },
  // 验证码校验接口（使用 token）
  {
    url: '/v1/auth/verify-code',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { verificationToken, code } = body;
      
      // 验证 token 是否存在
      if (!verificationToken) {
        return { success: false, message: '验证令牌无效' };
      }
      
      // 验证 token 是否正确（测试 token 或任意 GUID）
      if (verificationToken !== TEST_VERIFICATION_TOKEN && !verificationToken.includes('-')) {
        return { success: false, message: 'Token 无效或已过期' };
      }
      
      // 验证码校验
      if (code !== '114514') {
        return { success: false, message: '验证码错误' };
      }

      // 验证成功，返回访问令牌
      return {
        success: true,
        message: '验证成功',
        data: {
          accessToken: Mock.Random.guid(),
          refreshToken: Mock.Random.guid(),
          expiresIn: '7200s',
        },
      };
    },
  },
  // 邮件链接验证接口
  {
    url: '/v1/auth/verify-token',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { token } = body;
      
      // 验证 token
      if (!token) {
        return { success: false, message: 'Token 无效' };
      }
      
      // 只接受测试邮件 token
      if (token !== TEST_EMAIL_TOKEN) {
        return { success: false, message: 'Token 无效或已过期' };
      }
      
      // 验证成功，返回访问令牌
      return {
        success: true,
        message: '验证成功',
        data: {
          accessToken: Mock.Random.guid(),
          refreshToken: Mock.Random.guid(),
          expiresIn: '7200s',
        },
      };
    },
  },
  // 发送验证码接口（用于找回密码）
  {
    url: '/v1/auth/send-verification-code',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { email } = body;
      if (email !== existingUser.email) {
        return {
          success: false,
          message: '该邮箱未注册',
        };
      }
      return {
        success: true,
        data: {
          verificationToken: TEST_VERIFICATION_TOKEN,  // 使用固定 token
        },
      };
    },
  },
  {
    // 重置密码接口
    url: '/v1/auth/reset-password',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { password, passwordConfirm } = body;
      if (password !== passwordConfirm) {
        return {
          success: false,
          message: '两次输入的密码不一致',
        };
      }
      // 简单模拟成功
      return {
        success: true,
      };
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
          endpoint: '/v1/auth/sso/login'
        },

        // 邮箱密码配置
        emailPassword: {
          enabled: true,
          allowRegister: true
        }
      }
    })
  }
];

export default authMock;
