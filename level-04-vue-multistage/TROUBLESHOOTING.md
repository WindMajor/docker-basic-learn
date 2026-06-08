# 第4关：故障排除指南

## 故障 1：刷新页面 404（SPA 路由回退未生效）

**现象**：访问首页正常，但直接访问 `/about` 或其他路由时返回 Nginx 404 页面。

**原因**：Nginx 没有配置 `try_files` 回退到 `index.html`。

**解决方案**：

```bash
# 1. 确认 nginx.conf 已正确复制到容器
docker exec -it lvl4-vue cat /etc/nginx/conf.d/default.conf

# 2. 检查配置中是否有 try_files 指令
# 应该包含：try_files $uri $uri/ /index.html;

# 3. 如果 nginx.conf 没有正确复制，重新构建
#    确保 Dockerfile 中有：
#    COPY nginx.conf /etc/nginx/conf.d/default.conf

# 4. 手动测试 Nginx 配置是否正确
docker exec -it lvl4-vue nginx -t

# 5. 重新构建
docker build --no-cache -t lvl4-vue-app .
docker stop lvl4-vue && docker rm lvl4-vue
docker run -d -p 8080:80 --name lvl4-vue lvl4-vue-app
```

## 故障 2：构建失败 `npm ERR!`

**错误日志**：
```
npm ERR! code ERR...  npm ERR! network ...
npm ERR! network request to https://registry.npmjs.org/... failed, reason: connect ETIMEDOUT
```

或：
```
npm ERR! Cannot find module 'vite'
```

**原因**：

1. 网络问题导致 npm 包下载失败
2. `package.json` 中缺少某个依赖
3. `.dockerignore` 排除了 `node_modules` 但构建时没有执行 `npm install`

**解决方案**：

```bash
# 1. 检查网络，可以换源
# 在 Dockerfile 中添加：
# RUN npm config set registry https://registry.npmmirror.com

# 2. 确认 package.json 依赖完整
#    - vue, vite, @vitejs/plugin-vue, typescript, vue-tsc

# 3. 检查 .dockerignore，确保没有排除 vue-project
#    正确的 .dockerignore 只排除 node_modules

# 4. 清理 Docker 构建缓存
docker builder prune

# 5. 如果本地可以构建但 Docker 内不行
#    确认构建上下文正确：在 level-04-vue-multistage/ 目录下执行 docker build
#    而不是在 vue-project/ 目录下
```

## 故障 3：镜像体积仍然很大

**现象**：`docker images` 显示镜像体积超过 200MB。

**原因**：

1. 基础镜像使用了 `node:20` 而非 `node:20-alpine`
2. 没有使用多阶段构建，直接使用了 `node:20-alpine` 作为最终镜像
3. `node_modules` 没有被正确排除

**解决方案**：

```bash
# 1. 检查使用了哪个基础镜像
docker history lvl4-vue-app | head -10
# 查看 IMAGE 列，应该是 nginx:alpine 和 node:20-alpine

# 2. 检查 Dockerfile 是否有两个 FROM
#    第一个 FROM: node:20-alpine AS builder
#    第二个 FROM: nginx:alpine
#    最终镜像应该是 nginx:alpine

# 3. 对比验证
#    运行正确的多阶段构建
docker build -t lvl4-vue-app .
docker images | grep lvl4
#    lvl4-vue-app 应该显示 ~23MB

# 4. 如果只想看体积不重新构建，用 dive 工具（第三方）
#    brew install dive
#    dive lvl4-vue-app
```
