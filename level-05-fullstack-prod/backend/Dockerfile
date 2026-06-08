# backend/Dockerfile - 第5关：Node.js 后端多阶段构建

# ===== 阶段1：安装依赖 =====
FROM node:20-alpine AS deps

WORKDIR /app

# 复制依赖文件
COPY package.json ./

# 安装生产依赖（不包含 devDependencies）
RUN npm install --omit=dev

# ===== 阶段2：运行阶段 =====
FROM node:20-alpine

WORKDIR /app

# 环境变量：生产模式
ENV NODE_ENV=production

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制应用代码
COPY server.js ./

# 声明端口
EXPOSE 3000

# 健康检查：每 30 秒检查一次 API 健康端点
# 注意：容器启动初期可能失败几次，配置重试次数
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# 启动命令
CMD ["node", "server.js"]
