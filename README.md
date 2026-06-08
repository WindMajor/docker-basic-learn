# Docker 渐进式实战学习项目

> 从零到一，掌握 Docker 容器化技术。适合有 TypeScript/Vue 基础、但对 Docker 陌生的全栈开发者。

## 前置要求

- ✅ 已安装 **Docker Desktop** / **OrbStack** / **Rancher Desktop**
- ✅ 已安装 `docker compose` 插件（V2 版本）
- ✅ 熟悉基础 Linux 命令（`cd`、`ls`、`curl`）
- ✅ 一台可联网的电脑（需要拉取镜像）

## 学习路线图

| 关卡 | 目录 | 核心技能 | 预计时间 | 验证方式 |
|------|------|---------|---------|---------|
| 1 | `level-01-nginx-static/` | 镜像、容器、端口映射、卷挂载 | 30 分钟 | 浏览器看到静态页面 |
| 2 | `level-02-node-api/` | Dockerfile 编写、镜像构建、日志 | 45 分钟 | `curl` 看到 API 响应 |
| 3 | `level-03-redis-compose/` | Docker Compose、容器网络、数据卷 | 60 分钟 | Redis 数据写入后重启不丢失 |
| 4 | `level-04-vue-multistage/` | 多阶段构建、Nginx 部署、Vue 3 | 90 分钟 | 镜像体积 < 50MB，刷新不 404 |
| 5 | `level-05-fullstack-prod/` | 全栈部署、反向代理、生产配置 | 120 分钟 | 只暴露 80 端口，数据库持久化 |

## 学习建议

1. **亲手执行每一个命令**：不要复制粘贴后不看结果，输入命令的过程就是学习的过程
2. **遇到错误先自查**：执行 `docker logs <容器名>` 查看日志，再对照各关卡的 `TROUBLESHOOTING.md`
3. **理解而非记忆**：每个知识点重在理解背后的原理，而非背命令
4. **修改后重建**：每关完成后尝试修改代码/配置，重新构建，观察变化
5. **循序渐进**：请不要跳过前面的关卡，每关的知识点在后续关卡中会叠加使用

## 与腾讯云部署的衔接

完成第 5 关后，可将项目部署到腾讯云服务器：

### 方式一：推送到镜像仓库

```bash
# 1. 登录腾讯云镜像仓库
docker login ccr.ccs.tencentyun.com

# 2. 给镜像打标签
docker tag lvl5-fullstack:latest ccr.ccs.tencentyun.com/<命名空间>/lvl5-fullstack:latest

# 3. 推送
docker push ccr.ccs.tencentyun.com/<命名空间>/lvl5-fullstack:latest

# 4. 在云服务器上拉取并启动
docker compose -f docker-compose.prod.yml up -d
```

### 方式二：导出镜像传输

```bash
# 导出
docker save lvl5-fullstack:latest | gzip > lvl5-fullstack.tar.gz

# 传输到云服务器
scp lvl5-fullstack.tar.gz root@<云服务器IP>:/opt/

# 在云服务器上导入
docker load < lvl5-fullstack.tar.gz
```

## 快速导航

| 文件 | 说明 |
|------|------|
| `cheatsheet.md` | Docker 命令速查表，按场景分类 |
| `level-01-nginx-static/` | 第 1 关：单容器 Nginx 静态页 |
| `level-02-node-api/` | 第 2 关：自定义 Node API 镜像 |
| `level-03-redis-compose/` | 第 3 关：Docker Compose 多容器编排 |
| `level-04-vue-multistage/` | 第 4 关：Vue 多阶段构建 |
| `level-05-fullstack-prod/` | 第 5 关：全栈生产级部署 |
