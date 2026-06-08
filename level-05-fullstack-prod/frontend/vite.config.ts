import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist'
  },
  // 生产环境中，前端请求 /api 路径会由 Nginx 反向代理到后端
  // 所以不需要 proxy 配置
  server: {
    port: 5173
  }
})
