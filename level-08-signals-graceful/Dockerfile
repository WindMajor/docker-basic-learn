# ===============================================================
# Dockerfile - 第8关：信号处理与优雅关闭
# ===============================================================
#
# 本关学习三个关键知识点：
#   1. PID 1 的信号处理（docker stop → SIGTERM → 10s超时 → SIGKILL）
#   2. CMD shell 形式 vs exec 形式对信号传递的影响
#   3. --init / tini 解决僵尸进程问题

FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ========== 阶段 2：运行 ==========
FROM node:20-alpine

# 安装 tini（轻量级 init 进程，约 50KB）
# tini 的作用：
#   1. 作为 PID 1 运行，正确转发信号（SIGTERM、SIGINT）
#   2. 收割僵尸进程（reap zombie processes）
#   3. 解决 shell 形式 CMD 无法收到信号的问题
#
# 也可以用 docker run --init 达到同样效果（推荐）
# Docker 1.13+ 内置 tini 支持，--init 选项即可
RUN apk add --no-cache tini

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 3000

# ===== 使用 tini 作为 PID 1 =====
# ENTRYPOINT ["/sbin/tini", "--"]
# 然后用 CMD 传参给 Node.js
# 这样 tini 作为 PID 1，Node.js 进程是 tini 的子进程
# docker stop 发送 SIGTERM → tini 收到 → tini 转发给 Node.js → 优雅关闭

# 本关保留传统 exec 形式启动，便于对比理解
# 实际操作中会用 docker run --init 或 tini
CMD ["node", "server.js"]

# ===============================================================
# 【信号基础】
#
# docker stop 流程：
#   1. docker 向容器 PID 1 发送 SIGTERM（优雅关闭信号）
#   2. 等待 10 秒（可通过 --stop-timeout 调整）
#   3. 如果进程仍未退出，发送 SIGKILL（强制杀进程，无法被捕获）
#
# PID 1 的特殊性：
#   - PID 1 默认忽略 SIGTERM（除非显式注册处理器）
#   - Node.js 的 process.on('SIGTERM', ...) 可以处理，因为它不是传统 PID 1
#   - 但 shell 形式 CMD（如 CMD node server.js）启动的进程的 PID 不是 1
#     而是 sh 的子进程，信号发给 sh，sh 不会转发给 node！
#
# docker kill（不发 SIGTERM，直接 SIGKILL）
# docker stop（先 SIGTERM，超时后 SIGKILL）
# ===============================================================
