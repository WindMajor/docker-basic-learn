# ===============================================================
# Dockerfile - 第6关：安全加固与资源限制
# ===============================================================
#
# 本关学习三个关键安全实践：
#   1. 非 root 用户运行（USER 指令）
#   2. 最小权限（去除不必要的 Linux Capability）
#   3. 只读根文件系统（防止运行时文件篡改）
#
# 默认的 Docker 容器以 root 运行！
# 如果应用有漏洞被攻破，攻击者将获得容器内的 root 权限
# 可能进一步逃逸到宿主机

# ---------- 阶段1：安装依赖 ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

# ---------- 阶段2：安全运行阶段 ----------
FROM node:20-alpine

# ===== 1. 创建非 root 用户 =====
# Alpine 已有 node 用户（uid 1000），直接使用
# 如果没有预置用户，手动创建：
#   RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# 为什么不用 root？
#   - 最小权限原则（Principle of Least Privilege）
#   - 如果容器被攻破，攻击者只获得 node 用户权限
#   - root 用户可以修改系统文件、安装软件、修改 iptables 等
USER node

# 设置工作目录并确保权限正确
WORKDIR /home/node/app

# 从 builder 复制 node_modules 并确保 node 用户拥有文件所有权
# --chown=node:node 将文件所有权赋予 node 用户
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node server.js ./

ENV NODE_ENV=production

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]

# ===============================================================
# 【知识点：COPY --chown 的作用】
#
# 没有 --chown 时，COPY 的文件所有者是 root:root
# 如果容器以 node 用户运行：
#   - node 用户可以读取 root 拥有的文件 ✅
#   - node 用户不能写入需要写权限的目录 ❌
#   - 如果 node_modules 需要写操作（罕见），会失败
#
# 使用 --chown=node:node 是更严谨的做法
# ===============================================================
