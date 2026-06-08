# frontend/Dockerfile - 第5关：前端多阶段构建
# 与第4关类似，将 Vue 项目构建为静态文件，由 Nginx 托管

# ===== 阶段1：构建 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件（利用缓存）
COPY package.json tsconfig.json ./
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# ===== 阶段2：Nginx 托管 =====
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置（不含反向代理，反向代理在 nginx 服务层）
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
