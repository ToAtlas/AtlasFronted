import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 分别代理 /v1/config 和 /v1/auth 到 mock-server
      '/v1/config': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/v1/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
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
