<script setup lang="ts">
import { ref, onMounted } from 'vue'

const apiBase = '/api'
const health = ref({ status: 'loading...', database: '' })
const users = ref<Array<{id: number; name: string; email: string}>>([])
const newName = ref('')
const newEmail = ref('')
const message = ref('')

// 获取健康检查信息
async function checkHealth() {
  try {
    const res = await fetch(`${apiBase}/health`)
    health.value = await res.json()
  } catch {
    health.value = { status: 'error', database: '无法连接' }
  }
}

// 获取用户列表
async function fetchUsers() {
  try {
    const res = await fetch(`${apiBase}/users`)
    const data = await res.json()
    if (data.success) users.value = data.data
  } catch {
    message.value = '获取用户列表失败'
  }
}

// 创建用户
async function createUser() {
  if (!newName.value || !newEmail.value) {
    message.value = '请填写姓名和邮箱'
    return
  }
  try {
    const res = await fetch(`${apiBase}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.value, email: newEmail.value })
    })
    const data = await res.json()
    if (data.success) {
      message.value = `用户 ${data.data.name} 创建成功！`
      newName.value = ''
      newEmail.value = ''
      await fetchUsers()
    } else {
      message.value = `创建失败: ${data.error}`
    }
  } catch {
    message.value = '网络错误，请检查后端服务'
  }
}

onMounted(() => {
  checkHealth()
  fetchUsers()
})
</script>

<template>
  <div class="container">
    <div class="card">
      <h1>🐳 Docker 第5关：全栈生产级部署</h1>
      <p class="subtitle">Vue 3 + Node.js + PostgreSQL + Nginx 反向代理</p>

      <!-- 系统状态 -->
      <div class="section">
        <h2>系统状态</h2>
        <div class="status-grid">
          <div class="status-item">
            <span>API 服务：</span>
            <span :class="health.status === 'ok' ? 'green' : 'red'">
              {{ health.status === 'ok' ? '✅ 正常' : '❌ 异常' }}
            </span>
          </div>
          <div class="status-item">
            <span>数据库：</span>
            <span :class="health.database === 'connected' ? 'green' : 'red'">
              {{ health.database === 'connected' ? '✅ 已连接' : '❌ 未连接' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 用户管理 -->
      <div class="section">
        <h2>用户管理</h2>
        <div class="form-row">
          <input v-model="newName" placeholder="姓名" class="input" />
          <input v-model="newEmail" placeholder="邮箱" class="input" />
          <button @click="createUser" class="btn">创建用户</button>
        </div>
        <p v-if="message" class="message">{{ message }}</p>
        <table v-if="users.length > 0" class="table">
          <thead>
            <tr><th>ID</th><th>姓名</th><th>邮箱</th></tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无用户数据，请创建一个用户</p>
      </div>

      <div class="footer">
        架构：Nginx (:80) → Frontend (Vue) / Backend (Node:3000) → PostgreSQL (:5432)<br/>
        Nginx 反向代理 /api/ 请求到 backend，/ 请求到前端静态文件
      </div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  min-height: 100vh;
  color: #e0e0e0;
}
.container { display: flex; justify-content: center; padding: 48px 24px; }
.card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 40px;
  max-width: 700px;
  width: 100%;
  border: 1px solid rgba(255,255,255,0.1);
}
h1 { font-size: 24px; margin-bottom: 8px; }
.subtitle { opacity: 0.6; margin-bottom: 32px; font-size: 14px; }
.section { margin-bottom: 32px; }
.section h2 { font-size: 18px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
.status-grid { display: flex; gap: 24px; }
.status-item { padding: 8px 0; }
.green { color: #4caf50; }
.red { color: #f44336; }
.form-row { display: flex; gap: 12px; flex-wrap: wrap; }
.input {
  flex: 1; min-width: 150px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}
.input::placeholder { color: rgba(255,255,255,0.4); }
.btn {
  padding: 10px 20px;
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.btn:hover { background: #388e3c; }
.message { margin-top: 12px; font-size: 14px; opacity: 0.8; }
.table { width: 100%; margin-top: 16px; border-collapse: collapse; }
.table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
.table th { font-size: 12px; text-transform: uppercase; opacity: 0.6; }
.empty { margin-top: 12px; font-size: 14px; opacity: 0.5; }
.footer { margin-top: 24px; font-size: 12px; opacity: 0.5; line-height: 1.8; }
</style>
