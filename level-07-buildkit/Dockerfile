# syntax=docker/dockerfile:1
# ===============================================================
# Dockerfile - 第7关：BuildKit 构建加速
# ===============================================================
#
# syntax=docker/dockerfile:1 声明使用 Dockerfile 前端 v1（启用 BuildKit 语法）
# 这是使用 --mount 等高级特性的前提
#
# 本关学习：
#   1. RUN --mount=type=cache：持久化构建缓存（大幅加速 npm install）
#   2. RUN --mount=type=secret：安全使用构建时密钥（如 .npmrc）
#   3. docker buildx：多平台构建

# ========== 阶段 1：BuildKit 缓存加速构建 ==========
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json tsconfig.json vite.config.ts index.html ./

# ===== BuildKit cache mount =====
# --mount=type=cache,target=/root/.npm
# 将 npm 缓存目录挂载为持久化缓存卷
# 首次构建：npm 下载所有包到缓存 → 安装到 node_modules
# 后续构建：npm 直接从缓存读取 → 跳过下载，大幅加速！
#
# 对比传统方式（RUN npm install）：
#   - 传统：每次 package.json 变化都要重新下载全部依赖
#   - BuildKit：缓存跨构建持久化，只在包版本变化时重新下载
RUN --mount=type=cache,target=/root/.npm \
    npm install

# 复制源码
COPY src/ ./src/

# 生产构建
RUN npm run build

# ========== 阶段 2：Nginx 托管 ==========
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
