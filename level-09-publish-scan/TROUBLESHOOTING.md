# 第9关：故障排除指南

## 故障 1：`docker push` 报 access denied

**错误日志**：
```
denied: requested access to the resource is denied
```

**原因**：未登录，或仓库名与用户名不匹配。

**解决方案**：

```bash
# 1. 登录 Docker Hub
docker login

# 2. 确认镜像标签中的用户名和仓库名正确
docker images | grep myapp
# 标签格式必须是：<你的用户名>/<仓库名>:<标签>
# 示例：zhangsan/myapp:latest（不能用别人的用户名）

# 3. 如果仓库不存在，先在 Docker Hub 网页创建仓库
# https://hub.docker.com → Create Repository → 输入名称 "myapp"

# 4. 有些注册中心有命名空间限制
# Docker Hub：<username>/<repo>
# GCR：gcr.io/<project>/<repo>
# ECR：<account>.dkr.ecr.<region>.amazonaws.com/<repo>
```

## 故障 2：`docker scout` 命令不存在

**错误日志**：
```
docker: 'scout' is not a docker command.
```

**原因**：Docker 版本较旧，或未安装 scout 插件。

**解决方案**：

```bash
# 1. 检查 Docker 版本
docker version --format '{{.Server.Version}}'
# Docker Scout 需要 Docker 23.0+

# 2. Docker Desktop（macOS/Windows）
# 设置 → Extensions → 启用 Docker Scout

# 3. Linux 上单独安装
curl -sSfL https://raw.githubusercontent.com/docker/scout-cli/main/install.sh \
  | sh -s --

# 4. 替代方案：使用 docker scan（Snyk）
docker scan myapp:latest

# 5. 替代方案：使用开源 trivy
# 安装：brew install trivy
trivy image myapp:latest
```

## 故障 3：镜像推送/拉取速度慢

**现象**：`docker push/pull` 速度很慢，特别是大镜像。

**解决方案**：

```bash
# 1. 使用镜像加速器（中国大陆用户）
# 编辑 ~/.docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerhub.timeweb.cloud"
  ]
}
# 重启 Docker Desktop

# 2. 使用 Alpine 基础镜像减小体积
# node:20-alpine (~120MB) vs node:20 (~1.2GB)

# 3. 仅推送变更的层（Docker 默认行为，利用缓存）

# 4. 压缩镜像（不推荐，会增加拉取后的解压时间）
docker save myapp:latest | gzip > myapp.tar.gz
```

## 故障 4：Docker Context SSH 连接失败

**错误日志**：
```
error during connect: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/json":
dial unix /var/run/docker.sock: connect: no such file or directory
```

**原因**：

1. 远程 Docker 未安装或未运行
2. SSH 权限不足（当前用户不在 docker 组）
3. 远程 Docker 未监听 Unix socket

**解决方案**：

```bash
# 1. 确认远程 Docker 正常运行
ssh user@host "docker ps"

# 2. 确认用户在 docker 组
ssh user@host "groups | grep docker"
# 如果不在 docker 组：
# ssh user@host "sudo usermod -aG docker \$USER"
# 然后重新登录

# 3. 如果使用 TCP 方式，确认 Docker 配置
# 编辑远程 /etc/docker/daemon.json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
# ⚠️ 仅测试环境使用！生产环境必须配 TLS

# 4. 验证 context 是否正确
docker context inspect remote-server
docker --context remote-server info
```

## 故障 5：Compose Profile 服务未启动

**现象**：使用了 `docker compose up`，但设置了 `profiles` 的服务没启动。

**原因**：未指定 `--profile` 标志。

**解决方案**：

```bash
# profiles 服务默认不启动，必须显式指定
docker compose --profile debug up -d

# 查看当前启动了哪些服务和它们所属的 profile
docker compose ps
docker compose config --profiles

# 如果希望某些服务默认启动，不要给它设置 profiles
# 或者使用 COMPOSE_PROFILES 环境变量
export COMPOSE_PROFILES=debug
docker compose up -d  # 自动启动 debug profile 服务
```

## 故障 6：`docker scan` 和 `docker scout` 的区别/选择

**Docker 4.26+ 推荐使用 `docker scout`**：

```bash
# 旧方式（已废弃）
docker scan myapp:latest

# 新方式
docker scout quickview myapp:latest
docker scout recommendations myapp:latest
```

如果 `docker scout` 不可用，两个替代方案都很好：

```bash
# trivy（推荐，开源、功能完整）
brew install trivy
trivy image myapp:latest

# grype
brew install anchore/grype/grype
grype myapp:latest
```
