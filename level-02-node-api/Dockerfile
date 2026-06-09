# ===============================================================
# Dockerfile - 第2关：Node.js API 多阶段构建
# ===============================================================

# ---------- 阶段1：安装依赖（builder） ----------
# FROM：指定基础镜像。node:20-alpine 比 node:20 体积小 10 倍以上
# Alpine 版本约 120MB，完整 Debian 版本约 1.2GB
FROM node:20-alpine AS builder

# WORKDIR：设置容器内的工作目录，后续指令都基于此路径
# 如果目录不存在会自动创建。建议始终使用绝对路径
WORKDIR /app

# COPY：从宿主机复制文件到容器
# COPY <源路径(宿主机)> <目标路径(容器)>
# 先复制 package.json，利用 Docker 分层缓存机制
COPY package.json ./

# RUN：在容器内执行命令（构建时执行）
# 执行 npm install 安装生产依赖（不安装 devDependencies）
# --omit=dev 表示只安装生产依赖，减小镜像体积
RUN npm install --omit=dev

# ---------- 阶段2：运行阶段 ----------
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量：生产环境
# ENV：设置环境变量，在容器运行时生效
ENV NODE_ENV=production

# 从 builder 阶段复制 node_modules（已有所有依赖）
# --from=builder 表示从名为 builder 的阶段复制
# 这样最终镜像只包含运行所需文件，不包含构建工具链
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY server.js ./

# EXPOSE：声明容器运行时监听的端口（仅文档作用）
# 实际端口映射仍需 docker run -p 或 docker-compose ports 配置
EXPOSE 3000

# CMD：容器启动时执行的命令
# 与 ENTRYPOINT 的区别：
#   - CMD 可以被 docker run 后面的参数覆盖（docker run ... echo hello 会替代 CMD）
#   - ENTRYPOINT 不可以被覆盖（除非使用 --entrypoint 参数）
#   - 组合使用：ENTRYPOINT ["node"] + CMD ["server.js"]  ⇒  docker run 时只需传参
# JSON 数组格式（exec 形式）是推荐写法，直接执行进程，PID 为 1
ENTRYPOINT ["node"]
CMD ["server.js"]

# 替代写法对比：
#   CMD node server.js           # shell 形式，会启动 sh 再执行 node（PID 不是 1）
#   CMD ["node", "server.js"]    # exec 形式，node 直接作为 PID 1（推荐）
#   ENTRYPOINT ["node"]          # 固定入口，CMD 作为默认参数
