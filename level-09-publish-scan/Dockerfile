# ===============================================================
# Dockerfile - 第9关：镜像发布与安全扫描
# ===============================================================
#
# 本关以一个简洁的 Node API 作为"待发布"的镜像
# 重点不在 Dockerfile 本身，而在后续的镜像管理流程

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app

# 非 root 用户（综合第6关实践）
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --chown=app:app --from=builder /app/node_modules ./node_modules
COPY --chown=app:app server.js ./

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
