import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteMockServe } from 'vite-plugin-mock'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    viteMockServe({
      // 指定mock文件夹的路径
      mockPath: 'src/mock',
      // 在开发环境中启用 mock
      localEnabled: true,
      // 在生产环境中禁用 mock
      prodEnabled: false,
      // 忽略以_开头的文件
      ignore: /^_/,
      // 注入代码以在生产中禁用
      injectCode: `
        import { setupProdMockServer } from './mock/_createProductionServer';
        setupProdMockServer();
      `,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
