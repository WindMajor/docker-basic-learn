<script setup lang="ts">
const title = "Docker 第7关：BuildKit 构建加速"
const features = {
  "BuildKit 缓存挂载": "RUN --mount=type=cache → npm install 从秒级到毫秒级",
  "构建密钥管理": "RUN --mount=type=secret → 安全使用 .npmrc/私有源",
  "多平台构建": "docker buildx build --platform linux/amd64,linux/arm64",
  "构建耗时对比": "传统构建 45s vs BuildKit 缓存命中 3s",
}
</script>

<template>
  <div class="container">
    <div class="card">
      <div class="icon">⚡</div>
      <h1>{{ title }}</h1>
      <p class="subtitle">学习 BuildKit 高级特性，将构建速度提升 10 倍以上</p>
      <div class="info-grid">
        <div class="info-item" v-for="(val, key) in features" :key="key">
          <span class="label">{{ key }}：</span>
          <span class="value">{{ val }}</span>
        </div>
      </div>
      <div class="status">
        <span class="dot"></span>
        状态：运行中 · 当前时间：{{ new Date().toLocaleTimeString('zh-CN') }}
      </div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #4caf50 100%);
  min-height: 100vh; color: #e0e0e0;
}
.container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 24px; }
.card {
  background: rgba(255,255,255,0.05); backdrop-filter: blur(12px);
  border-radius: 24px; padding: 48px; max-width: 600px; width: 100%;
  border: 1px solid rgba(255,255,255,0.1);
}
.icon { font-size: 64px; text-align: center; margin-bottom: 16px; }
h1 { font-size: 26px; margin-bottom: 12px; text-align: center; }
.subtitle { text-align: center; opacity: 0.7; margin-bottom: 32px; font-size: 14px; }
.info-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
.info-item { display: flex; padding: 10px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; }
.label { opacity: 0.6; min-width: 130px; flex-shrink: 0; }
.value { color: #a5d6a7; font-size: 13px; }
.status { text-align: center; font-size: 13px; opacity: 0.6; display: flex; align-items: center; justify-content: center; gap: 8px; }
.dot { display: inline-block; width: 8px; height: 8px; background: #4caf50; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
