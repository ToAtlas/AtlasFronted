import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteMockServe } from 'vite-plugin-mock'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    vueDevTools(),
    viteMockServe({
      // 指定mock文件夹的路径
      mockPath: 'src/mock',
      // 根据 command 动态启用 mock，代替已废弃的 localEnabled 和 prodEnabled
      enable: command === 'serve',
      // 忽略以_开头的文件
      ignore: /^_/,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@arco-design/web-vue'))
              return 'arco'

            if (id.includes('vue-router') || id.includes('vue'))
              return 'vue'

            if (id.includes('pinia'))
              return 'pinia'

            return 'vendor'
          }
        },
      },
    },
  },
}))
