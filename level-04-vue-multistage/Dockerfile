# ===============================================================
# Dockerfile - 第4关：Vue 3 多阶段构建（Multi-stage Build）
# ===============================================================
#
# 多阶段构建的核心思想：一个 Dockerfile 中可以有多个 FROM 语句，
# 每个 FROM 都是一个独立的构建阶段。最终镜像只保留最后一个阶段的内容。
#
# 优势：最终镜像仅包含运行所需的文件，不包含构建工具链。
# 本例中最终镜像约 15MB（Nginx + 静态文件），
# 而如果使用单阶段构建（node:20-alpine + npm run build + node serve），
# 镜像体积约 300MB+（包含 Node.js 运行时和构建依赖）。

# ========== 阶段 1：构建阶段（Builder） ==========
# AS builder：为这个阶段命名，后续阶段可以通过 --from=builder 引用
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 【缓存优化】先复制 package.json 和 lock 文件
# 这样做是因为 package.json 比源代码变更频率低得多
# 只要 package.json 不变，这一层就能命中缓存，跳过 npm install
COPY vue-project/package.json vue-project/tsconfig.json ./

# RUN：执行构建命令
# 安装所有依赖（包括 devDependencies，因为构建需要 vite、vue-tsc 等）
RUN npm install

# COPY：复制 Vue 项目源码
# 注意：这里复制了整个 vue-project 目录
# .dockerignore 已排除 node_modules，避免覆盖
COPY vue-project/ .

# RUN：执行生产构建，输出到 dist/ 目录
# vite 的构建输出目录由 vite.config.ts 中的 build.outDir 控制
RUN npm run build

# ========== 阶段 2：生产运行阶段 ==========
# 使用 nginx:alpine 作为基础镜像（仅约 23MB）
FROM nginx:alpine

# 从 builder 阶段复制构建产物
# --from=builder：引用上一个阶段的名称
# 将 builder 阶段 /app/dist/ 目录下的所有文件复制到 Nginx 的 HTML 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置（覆盖默认配置）
# 默认配置在 /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE：声明端口（文档作用）
EXPOSE 80

# CMD：使用 Nginx 前台运行（daemon off; 确保容器不退出）
# Nginx 默认以 daemon 方式运行，但容器需要前台进程
# 不加 daemon off; 的话容器启动后会立刻退出
CMD ["nginx", "-g", "daemon off;"]

# ===============================================================
# 【镜像体积对比】
#
# 多阶段构建（本 Dockerfile）：
#   nginx:alpine  (~23MB) + dist 文件 (~0.5MB) = ~23.5MB
#
# 单阶段构建（不推荐）：
#   node:20-alpine (~120MB) + node_modules (~100MB) + dist = ~220MB
#
# 如果使用 node:20（非 alpine）：
#   node:20 (~1.2GB) + ... = > 1.3GB
#
# 结论：多阶段构建将镜像体积减少 90% 以上！
# ===============================================================

# 【为什么生产环境不需要 Vite/DevServer？】
# Vite DevServer 是开发环境工具，提供 HMR（热模块替换）
# 生产环境应该提前构建好静态文件，由 Nginx 这样的高性能 Web 服务器托管
# Vite DevServer 不适合生产环境（内存占用大、无并发优化、安全风险）

# 【为什么 COPY package.json 要在 COPY . 之前？】
# Docker 构建缓存是按层（Layer）逐层判断的
# 如果先 COPY 整个项目（包括 package.json），则任何源码变更都会使该层缓存失效
# 进而导致后续 npm install 也要重新执行（即使依赖没有变化）
# 将 COPY package.json 和 RUN npm install 放在前面
# 可以确保依赖层缓存独立于源码变更
