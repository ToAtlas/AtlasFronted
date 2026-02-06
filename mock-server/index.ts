import express, { Request, Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()
const PORT = 4000

// --- Hardcoded data ---
const MOCK_REFRESH_TOKEN = 'mock-refresh-token-is-very-secret'
const MOCK_ACCESS_TOKEN = 'mock-access-token-for-tests'
const EXISTING_USER = {
  email: 'admin@atlas.com',
  password: 'admin123',
}
const VERIFICATION_CODE = '114514'
const TEST_VERIFICATION_TOKEN = 'test-token-123456'
const TEST_EMAIL_TOKEN = 'email-link-token-789'
const TEST_PASSWORD_RESET_TOKEN = 'reset-token-654321'

// --- Middleware Setup ---
app.use(express.json()) // for parsing application/json
app.use(cookieParser()) // for parsing cookies

// CORS setup to allow credentials from the Vite dev server
app.use(cors({
  origin: 'http://localhost:5173', // Adjust this if your Vite port is different
  credentials: true,
}))

// --- Helper Functions ---
const sendRefreshToken = (res: Response) => {
  res.cookie('refreshToken', MOCK_REFRESH_TOKEN, {
    httpOnly: true,
    secure: false, // In a real app, this should be true for HTTPS
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

const clearRefreshToken = (res: Response) => {
  res.clearCookie('refreshToken', { path: '/' })
}

// --- API Endpoints ---

// 1. Login with Email and Password
app.post('/v1/auth/login/email-password', (req: Request, res: Response) => {
  const { email, password } = req.body
  console.log(`[Mock Server] Received login request for email: ${email}`)

  if (email === EXISTING_USER.email && password === EXISTING_USER.password) {
    console.log('[Mock Server] Login success. Setting httpOnly cookie and sending accessToken.')
    sendRefreshToken(res)
    return res.status(200).json({
      code: 200,
      message: '登录成功',
      data: {
        accessToken: MOCK_ACCESS_TOKEN,
        expiresIn: '7200s',
      },
    })
  } else {
    console.log('[Mock Server] Login failed. Invalid credentials.')
    return res.status(401).json({
      code: 401,
      message: '邮箱或密码错误',
      data: null,
    })
  }
})

// 2. Verify Code (for signup and password reset)
app.post('/v1/auth/verify-code', (req: Request, res: Response) => {
  const { code, type } = req.body
  console.log(`[Mock Server] Received verification request for type: ${type} with code: ${code}`)

  if (code !== VERIFICATION_CODE) {
    console.log('[Mock Server] Verification failed. Invalid code.')
    return res.status(400).json({ code: 400, message: '验证码错误', data: null })
  }

  // If verification is for signup, treat it as a login
  if (type === 'signup') {
    console.log('[Mock Server] Signup verification success. Setting httpOnly cookie and sending accessToken.')
    sendRefreshToken(res)
    return res.status(200).json({
      code: 200,
      message: '验证成功',
      data: {
        accessToken: MOCK_ACCESS_TOKEN,
        expiresIn: '7200s',
      },
    })
  }

  // If verification is for forgot-password, return the password reset token
  if (type === 'forgot-password') {
    console.log('[Mock Server] Forgot-password verification success. Sending passwordResetToken.')
    return res.status(200).json({
      code: 200,
      message: '验证成功',
      data: {
        passwordResetToken: TEST_PASSWORD_RESET_TOKEN,
      },
    })
  }

  // Fallback for any other unhandled types
  return res.status(400).json({
    code: 400,
    message: `未知的验证类型: ${type}`,
    data: null,
  })
})


// 3. Refresh Access Token
app.post('/v1/auth/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.cookies
  console.log('[Mock Server] Received refresh token request.')
  console.log(`[Mock Server] Cookie received: refreshToken=${refreshToken}`)

  if (refreshToken === MOCK_REFRESH_TOKEN) {
    console.log('[Mock Server] Refresh token is valid. Sending new accessToken.')
    return res.status(200).json({
      code: 200,
      message: 'Token 刷新成功',
      data: {
        accessToken: `new-access-token-${Date.now()}`,
        expiresIn: '7200s',
      },
    })
  } else {
    console.log('[Mock Server] Refresh token is invalid or missing.')
    return res.status(401).json({
      code: 401,
      message: '刷新令牌无效或已过期',
      data: null,
    })
  }
})

// 4. Logout
app.post('/v1/auth/logout', (req: Request, res: Response) => {
  console.log('[Mock Server] Received logout request. Clearing cookie.')
  clearRefreshToken(res)
  return res.status(200).json({
    code: 200,
    message: '注销成功',
    data: null,
  })
})

// 5. Get Auth Config
app.get('/v1/config/auth', (req: Request, res: Response) => {
  return res.status(200).json({
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
  })
})

// 6. Signup with Email
app.post('/v1/auth/signup/using-email', (req: Request, res: Response) => {
  const { email, password, passwordConfirm } = req.body
  if (email === EXISTING_USER.email) {
    return res.status(400).json({
      code: 400,
      message: '该邮箱已被注册',
      data: null,
    })
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({
      code: 400,
      message: '两次输入的密码不一致',
      data: null,
    })
  }
  return res.status(200).json({
    code: 200,
    message: '验证码已发送',
    data: {
      verificationToken: TEST_VERIFICATION_TOKEN,
    },
  })
})

// 7. Verify Email Token
app.post('/v1/auth/verify-token', (req: Request, res: Response) => {
  const { token, type } = req.body

  if (!token || token !== TEST_EMAIL_TOKEN) {
    return res.status(400).json({ code: 400, message: 'Token 无效或已过期', data: null })
  }

  if (type === 'forgot-password') {
    return res.status(200).json({
      code: 200,
      message: '验证成功',
      data: {
        passwordResetToken: TEST_PASSWORD_RESET_TOKEN,
      },
    })
  }

  // Signup success
  sendRefreshToken(res)
  return res.status(200).json({
    code: 200,
    message: '验证成功',
    data: {
      accessToken: `mock-access-token-${Date.now()}`,
      expiresIn: '7200s',
    },
  })
})

// 8. Send Verification Code (for password reset)
app.post('/v1/auth/send-verification-code', (req: Request, res: Response) => {
  const { email } = req.body
  if (email !== EXISTING_USER.email) {
    return res.status(400).json({
      code: 400,
      message: '该邮箱未注册',
      data: null,
    })
  }
  return res.status(200).json({
    code: 200,
    message: '验证码已发送',
    data: {
      verificationToken: TEST_VERIFICATION_TOKEN,
    },
  })
})

// 9. Resend Verification Code
app.post('/v1/auth/resend-verification-code', (req: Request, res: Response) => {
  if (Math.random() < 0.2) { // 20% chance to fail
    return res.status(429).json({
      code: 429,
      message: '请求过于频繁，请1分钟后再试',
    })
  }

  const { email, oldVerificationToken } = req.body
  if (email && oldVerificationToken) {
    return res.status(200).json({
      code: 200,
      message: '新的验证码已发送',
      data: {
        verificationToken: `new-mock-token-${Date.now()}`,
      },
    })
  }
  else {
    return res.status(400).json({
      code: 400,
      message: '请求参数错误',
    })
  }
})

// 10. Reset Password
app.post('/v1/auth/reset-password', (req: Request, res: Response) => {
  const { email, passwordResetToken, password, passwordConfirm } = req.body

  if (email !== EXISTING_USER.email) {
    return res.status(400).json({ code: 400, message: '该邮箱未注册' })
  }
  if (passwordResetToken !== TEST_PASSWORD_RESET_TOKEN) {
    return res.status(400).json({ code: 400, message: '重置令牌无效或已过期' })
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ code: 400, message: '两次输入的密码不一致' })
  }

  return res.status(200).json({ code: 200, message: '重置成功', data: null })
})

// 11. Auth Config (different endpoint)
app.get('/v1/auth/config', (req: Request, res: Response) => {
  return res.status(200).json({
    code: 200,
    message: '获取配置成功',
    data: {
      loginMode: 0,
      sso: {
        enabled: true,
        buttonText: 'SSO登录',
        endpoint: '/v1/auth/sso/login',
      },
      emailPassword: {
        enabled: true,
        allowRegister: true,
      },
    },
  })
})

// 12. Global Config
app.get('/v1/config', (req: Request, res: Response) => {
  return res.status(200).json({
    code: 200,
    message: '获取配置成功',
    data: {
      brand: {
        name: 'Atlas',
        logo: '/src/assets/logo.svg',
      },
      cache: {
        duration: 12 * 60 * 60 * 1000,
      },
    },
  })
})

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Mock server is running at http://localhost:${PORT}`)
  console.log('Listening for auth requests...')
})
