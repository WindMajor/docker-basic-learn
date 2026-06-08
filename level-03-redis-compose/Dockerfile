# Dockerfile - 第3关：Redis API 服务镜像

FROM node:20-alpine

WORKDIR /app

# 先复制依赖文件安装依赖（利用缓存）
COPY package.json ./
RUN npm install --omit=dev

# 复制应用代码
COPY server.js ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
