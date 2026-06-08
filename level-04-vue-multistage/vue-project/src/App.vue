<script setup lang="ts">
// Vue 3 Composition API + TypeScript
const title = "Docker 第4关：Vue 多阶段构建成功"
const subtitle = "本页面通过多阶段构建生产部署，最终镜像仅包含 Nginx + 静态文件"
const metadata = {
  buildTool: "Vite 5",
  framework: "Vue 3 + TypeScript",
  imageSize: "< 20 MB（对比单阶段构建约 1.2 GB）",
  nginxConfig: "含 SPA 路由回退、gzip 压缩"
}
</script>

<template>
  <div class="container">
    <div class="card">
      <div class="icon">🐳</div>
      <h1>{{ title }}</h1>
      <p class="subtitle">{{ subtitle }}</p>
      <div class="info-grid">
        <div class="info-item" v-for="(val, key) in metadata" :key="key">
          <span class="label">{{ key }}：</span>
          <span class="value">{{ val }}</span>
        </div>
      </div>
      <div class="status">
        <span class="dot"></span>
        容器状态：运行中 · 当前时间：{{ new Date().toLocaleTimeString('zh-CN') }}
      </div>
    </div>
    <div class="footer">
      提示：查看镜像体积对比 — <code>docker images | grep lvl4</code>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
  color: #e0e0e0;
}
.container {
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  min-height: 100vh; padding: 24px;
}
.card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 48px;
  max-width: 600px;
  width: 100%;
  border: 1px solid rgba(255,255,255,0.1);
}
.icon { font-size: 64px; text-align: center; margin-bottom: 16px; }
h1 { font-size: 26px; margin-bottom: 12px; text-align: center; }
.subtitle { text-align: center; opacity: 0.7; margin-bottom: 32px; font-size: 14px; }
.info-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
.info-item { display: flex; padding: 10px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; }
.label { opacity: 0.6; min-width: 110px; }
.value { color: #64b5f6; }
.status {
  text-align: center; font-size: 13px; opacity: 0.6;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.dot {
  display: inline-block; width: 8px; height: 8px;
  background: #4caf50; border-radius: 50%; animation: pulse 2s infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.footer {
  margin-top: 24px; font-size: 12px; opacity: 0.5; text-align: center;
}
code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; }
</style>
