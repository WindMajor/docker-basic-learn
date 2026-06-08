# 第4关：Vue 3 多阶段构建（生产部署）

## 学习目标

- 掌握 **多阶段构建（Multi-stage Build）** 的技术和原理
- 理解镜像体积优化的方法
- 学会 Nginx 配置 SPA 路由回退
- 理解生产环境只需要静态文件

## 前置知识

- 完成第 2、3 关
- 了解 Vue 3 + TypeScript 基本知识

## 操作步骤

### 1. 构建镜像

```bash
docker build -t lvl4-vue-app .
```

注意观察构建输出中的阶段变化：
```
Step 1/10 : FROM node:20-alpine AS builder          → 阶段1开始
...
Step 7/10 : FROM nginx:alpine                        → 阶段2开始
Step 8/10 : COPY --from=builder /app/dist /usr/share/nginx/html
...
```

### 2. 查看镜像体积

```bash
docker images | grep lvl4
```

你应该看到 `lvl4-vue-app` 镜像体积约 **15-25MB**（取决于 Nginx 基础镜像版本）。

对比单阶段构建（可以尝试注释掉多阶段，只用 node:20-alpine + `npm run preview` 构建），体积会达到 300MB+。

### 3. 启动容器

```bash
docker run -d -p 8080:80 --name lvl4-vue lvl4-vue-app
```

### 4. 验证

浏览器访问 [http://localhost:8080](http://localhost:8080)

你应该看到"Docker 第4关：Vue 多阶段构建成功"的页面。

### 5. 确认最终镜像不包含 Node.js

```bash
# 进入容器
docker exec -it lvl4-vue sh

# 尝试找 node —— 应该找不到
which node
# 输出：which: no node in (...)

# 查看 Nginx 版本
nginx -v

# 退出
exit
```

### 6. 验证 SPA 路由回退

```bash
# 访问一个不存在的路由，应该返回 index.html 而不是 404
curl -s http://localhost:8080/some-random-path | head -5
# 应该返回 index.html 内容
```

### 7. 修改源码后重新构建

```bash
# 修改 App.vue 中的文字
# 然后重新构建 —— 观察缓存效果
docker build -t lvl4-vue-app .

# 你会看到：
# Step 1/10 : FROM node:20-alpine AS builder → CACHED（基础镜像不变）
# Step 2/10 : WORKDIR /app                 → CACHED
# Step 3/10 : COPY package.json ...        → CACHED（依赖文件没变）
# Step 4/10 : RUN npm install              → CACHED（依赖层不变）
# Step 5/10 : COPY vue-project/ .          → NOT CACHED（源码变了）
# Step 6/10 : RUN npm run build            → NOT CACHED（需要重新构建）
# ...
```

### 8. 清理

```bash
docker stop lvl4-vue && docker rm lvl4-vue
docker rmi lvl4-vue-app
```

## 知识点讲解

### 多阶段构建的原理

```
Dockerfile 中有多个 FROM 语句
         ↓
阶段1 (builder): node:20-alpine + 源码 → 构建出 dist/
         ↓
阶段2 (production): nginx:alpine + dist/ → 最终镜像
         ↓
最终镜像 = 阶段2 = nginx:alpine + dist/（不含 node、npm、源码）
```

**关键语法**：
- `AS builder`：为阶段命名，后续引用
- `COPY --from=builder /app/dist ...`：从指定阶段复制文件

### 镜像分层缓存优化

```dockerfile
# 不推荐的写法（缓存命中率低）
COPY . .
RUN npm install    ← 源码变更会导致这层缓存失效，npm install 每次都执行

# 推荐的写法（缓存命中率高）
COPY package.json ./
RUN npm install    ← package.json 不变时缓存命中
COPY . .          ← 只有源码变更时才会重建
```

### 生产环境的正确部署方式

| 阶段 | 工具 | 说明 |
|------|------|------|
| 开发 | Vite DevServer | HMR、TS 编译、热更新 |
| 构建 | `vite build` | 输出静态文件到 dist/ |
| 生产 | Nginx | 高性能静态文件服务器 |

**生产环境不需要**：
- ❌ Node.js 运行时
- ❌ Vite DevServer
- ❌ TypeScript 编译
- ❌ 源码文件

生产环境只需要：**构建好的静态文件 + Nginx（或其他 Web 服务器）**

## 通关检查清单

- [ ] `docker build -t lvl4-vue-app .` 构建成功
- [ ] 查看 `docker images | grep lvl4`，镜像体积 < 50MB
- [ ] 浏览器访问 http://localhost:8080 看到页面
- [ ] `docker exec -it lvl4-vue sh` 进入容器，`which node` 找不到 Node.js
- [ ] 直接访问 http://localhost:8080/some-random-path 不会 404
- [ ] 修改 App.vue 后重新构建，观察到分层缓存效果
- [ ] 理解了多阶段构建为什么能减小镜像体积
- [ ] 理解了 SPA 路由回退的原理
