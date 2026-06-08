import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 构建输出目录，Dockerfile 中需要复制此目录
  build: {
    outDir: 'dist'
  }
})
