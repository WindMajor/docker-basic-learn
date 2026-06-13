# 第9关：镜像发布与安全扫描

## 学习目标

- 掌握 **镜像标签策略**（tag 的最佳实践）
- 学会 `docker push/pull` 及 **Docker Hub** 使用
- 理解 **镜像安全扫描**（docker scout / docker scan）
- 掌握 **Compose Profiles**（按场景选择性启动服务）
- 了解 **Docker Context**（多环境切换）

## 前置知识

- 完成第 5、6、7、8 关
- 注册 [Docker Hub](https://hub.docker.com) 账号（免费）

## 操作步骤

### 第一部分：镜像标签策略

### 1. 构建并打标签

```bash
# 构建镜像
docker build -t myapp:latest .

# 一个镜像可以有多个标签（本质是同一个镜像 ID）
docker tag myapp:latest myapp:v1.0.0
docker tag myapp:latest myapp:v1.0.0-alpine
docker tag myapp:latest myapp:2024-01-15

docker images | grep myapp
# myapp   latest           abc123...
# myapp   v1.0.0           abc123...
# myapp   v1.0.0-alpine    abc123...
# myapp   2024-01-15       abc123...
# 四个标签指向同一个镜像 ID
```

**最佳实践标签策略**：

| 标签 | 含义 | 示例 |
|------|------|------|
| `latest` | 最新稳定版 | `myapp:latest` |
| `v1.2.3` | 语义化版本（Semantic Versioning） | `myapp:v1.2.3` |
| `v1.2` | 次版本（自动包含补丁更新） | `myapp:v1.2` |
| `v1` | 主版本 | `myapp:v1` |
| `git-abc123` | Git commit SHA（不可变） | `myapp:git-abc123` |

```bash
# 生产环境推荐：同时打三个标签
VERSION=1.0.0
docker build -t myapp:latest .
docker tag myapp:latest myapp:${VERSION}
docker tag myapp:latest myapp:git-$(git rev-parse --short HEAD)
```

> ❌ 不要：只用 `latest`（无法回溯到具体版本）
> ✅ 推荐：`latest` + 语义化版本 + Git SHA（三标签策略）

### 2. Docker Hub 登录

```bash
# 登录 Docker Hub（需先注册 https://hub.docker.com）
docker login

# 输入用户名和密码
# 凭证存储在 ~/.docker/config.json

# 登出
docker logout
```

### 3. 推送镜像到 Docker Hub

```bash
# 格式：<用户名>/<仓库名>:<标签>
YOUR_USERNAME=your-dockerhub-username

# 打上带用户名前缀的标签（Docker Hub 的命名规则）
docker tag myapp:latest ${YOUR_USERNAME}/myapp:latest
docker tag myapp:latest ${YOUR_USERNAME}/myapp:v1.0.0

# 推送到 Docker Hub
docker push ${YOUR_USERNAME}/myapp:latest
docker push ${YOUR_USERNAME}/myapp:v1.0.0

# 推送后可在 https://hub.docker.com/r/${YOUR_USERNAME}/myapp 看到
```

### 4. 从 Docker Hub 拉取镜像

```bash
# 在另一台机器（或删除本地镜像后）拉取
docker pull ${YOUR_USERNAME}/myapp:v1.0.0

# 也支持拉取官方镜像
docker pull nginx:alpine
docker pull node:20-alpine

# 搜索 Docker Hub 上的镜像
docker search nginx
```

### 5. 镜像历史

```bash
# 查看镜像的构建历史（层信息）
docker history myapp:latest

# 查看镜像详细信息
docker inspect myapp:latest | grep -E "Architecture|Os|Created"
```

### 第二部分：镜像安全扫描

### 6. 使用 Docker Scout 扫描漏洞

```bash
# Docker Scout（Docker Desktop 内置，或单独安装）
# 扫描镜像的已知漏洞（CVE）

docker scout quickview myapp:latest
# 输出摘要：Critical/High/Medium/Low 漏洞数量

# 详细报告
docker scout recommendations myapp:latest

# 针对特定 CVE 查看详情
docker scout cves myapp:latest

# 比较两个版本的差异
docker scout compare myapp:v1.0.0 --to myapp:v2.0.0
```

> **如果 `docker scout` 不可用**：使用 `docker scan`（Snyk 驱动）：
> ```bash
> docker scan myapp:latest
> ```

### 7. 看懂扫描结果

```
示例输出：
  CVE-2023-45871    Critical    libcrypto3
  CVE-2023-5363     High        libssl3
  CVE-2023-4807     Medium      libcrypto3

关键指标：
  - Critical：需要立即修复（存在已知利用方式）
  - High：应尽快修复
  - Medium/Low：按优先级修复
```

**如何修复漏洞？**

```bash
# 1. 更新基础镜像（最直接有效）
# Dockerfile 中换用更新的基础镜像版本
# FROM node:20-alpine → FROM node:22-alpine

# 2. 在 Dockerfile 中更新系统包
FROM node:20-alpine
RUN apk update && apk upgrade  # 更新所有 Alpine 包

# 3. 使用最小化基础镜像减少攻击面
# node:20-alpine (~120MB) 比 node:20 (~1.2GB) 的 CVE 少很多

# 4. 定期重新构建（CI/CD 中的 Dependabot/Renovate）
```

### 8. 镜像大小优化检查

```bash
# 使用 dive 工具分析镜像每一层的大小
# 安装：brew install dive（macOS）或从 GitHub release 下载
dive myapp:latest

# 关注点：
# - 哪一层最大？
# - 是否有重复文件？
# - 是否包含不必要的构建工具？
```

### 第三部分：Compose Profiles

### 9. 测试 Profiles 功能

```bash
# 正常启动（只启动 api 服务）
docker compose up -d

# 带调试工具启动（api + debug-tools）
docker compose --profile debug up -d

# 带压测工具启动（api + load-test）
docker compose --profile loadtest up -d

# 全部启动
docker compose --profile debug --profile loadtest up -d

# 进入调试容器
docker compose --profile debug exec debug-tools sh
# 在 shell 中测试内部网络：
#   ping api
#   wget -qO- http://api:3000/health

# 查看日志确认压测工具在工作
docker compose logs load-test

# 只停止 debug 相关服务
docker compose --profile debug down

# 全部清理
docker compose --profile debug --profile loadtest down
```

**Profiles 的实用场景**：

| Profile | 服务 | 用途 |
|---------|------|------|
| 默认（无 profile） | api | 生产/核心服务 |
| `debug` | debug-tools | 开发调试（网络诊断、数据库客户端） |
| `loadtest` | load-test | CI 中的自动化压测 |
| `monitoring` | prometheus, grafana | 生产环境监控堆栈 |

### 10. 多服务 profile 示例

```yaml
# 一个服务可以属于多个 profile
services:
  api:
    # 没有 profiles = 始终启动

  adminer:
    image: adminer
    profiles:
      - debug
      - tools        # 可以属于多个 profile

  prometheus:
    image: prom/prometheus
    profiles:
      - monitoring    # 只在监控 profile 时启动

  grafana:
    image: grafana/grafana
    profiles:
      - monitoring
```

### 第四部分：Docker Context

### 11. 多环境切换

```bash
# 查看当前 context（默认 default）
docker context ls

# 创建远程 context（连接远程 Docker 引擎）
# 方式 A：SSH 连接
docker context create remote-server \
  --docker "host=ssh://user@192.168.1.100"

# 方式 B：TCP 连接（需远程 Docker 暴露端口）
docker context create remote-tcp \
  --docker "host=tcp://192.168.1.100:2375"

# 切换到远程 context
docker context use remote-server

# 此时 docker ps 显示的是远程服务器的容器！
docker ps

# 切回本地
docker context use default

# 在特定 context 中执行命令（不切换全局）
docker --context remote-server ps
docker --context remote-server compose up -d
```

**Context 的实用场景**：

```
本地开发机 ──→ Docker Context ──→ 开发服务器（dev）
              ├────────────────→ 测试服务器（staging）
              └────────────────→ 生产服务器（prod）
```

> 通过 `--context` 切换，一套命令管理多台服务器，不需要 SSH 登录每台机器。

### 12. 清理

```bash
docker compose --profile debug --profile loadtest down
docker rmi myapp:latest

# 删除 Docker Hub 上的镜像（在 Hub 网页操作，或通过 API）
```

## 知识点讲解

### 镜像标签的「可变性陷阱」

```
docker build -t myapp:latest .   → abc123  ← 今天构建的
... 修改代码 ...
docker build -t myapp:latest .   → def456  ← 同一标签，不同镜像！

问题：昨天部署的 "latest" 和今天部署的 "latest" 可能完全不同
     回滚？你找不到昨天那个 "latest" 是什么
```

**不可变标签**：
- `v1.2.3`：永远不会指向不同的构建
- `git-abc123`：与代码一一对应
- 日期时间戳：`2024-01-15T14:30` 或 `build-42`

### Docker Scout vs Docker Scan

| 工具 | 引擎 | 状态 | 特点 |
|------|------|------|------|
| `docker scan` | Snyk | 已废弃（Docker Desktop 4.26+） | 基础 CVE 扫描 |
| `docker scout` | Docker 自研 | 当前推荐 | CVE + SBOM + 建议 + 比较 |
| `trivy` | Aqua | 第三方 | 开源、功能完整 |
| `grype` | Anchore | 第三方 | 开源、快速 |

### CI/CD 中的镜像发布流程

```
Git Push
  │
  ▼
CI Pipeline:
  1. docker build -t app:${VERSION} -t app:git-${SHA} .
  2. docker scout quickview app:${VERSION}  ← 阻断 Critical 漏洞
  3. docker push app:${VERSION}
  4. docker push app:git-${SHA}
  5. docker push app:latest  （仅 main 分支）
  │
  ▼
CD Pipeline:
  1. docker --context prod compose pull
  2. docker --context prod compose up -d
  3. 健康检查 → 回滚（如果失败）
```

## 通关检查清单

- [ ] 理解了三标签策略（latest + 语义化版本 + Git SHA）
- [ ] `docker login` 登录了 Docker Hub
- [ ] `docker tag` + `docker push` 推送了镜像
- [ ] `docker pull` 拉取了镜像
- [ ] `docker scout quickview` 或 `docker scan` 扫描了漏洞
- [ ] 使用 `--profile` 选择性启动了服务
- [ ] 理解了 Compose Profiles 的适用场景
- [ ] `docker context ls` 查看了当前 Context
- [ ] 理解了 Docker Context 的多环境管理能力
