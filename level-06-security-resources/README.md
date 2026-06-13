# 第6关：资源限制与安全运行

## 学习目标

- 掌握 `--memory`、`--cpus` 等**资源限制**参数
- 理解为什么要用**非 root 用户**运行容器（`USER` 指令）
- 学会 **read-only 根文件系统**和 **Capability 裁剪**
- 能够通过 `docker stats` 和 `/stress` 端点观察资源限制效果

## 前置知识

- 完成第 2 关（Dockerfile 编写）
- 了解 Linux 用户权限概念

## 操作步骤

### 1. 构建镜像

```bash
docker build -t lvl6-secure-api .
```

注意观察 Dockerfile 中的 `USER node` 和 `--chown=node:node`。

### 2. 启动容器（带资源限制）

```bash
# 完整的安全 + 资源限制启动命令
docker run -d \
  --name lvl6-api \
  --memory="256m" \
  --cpus="0.5" \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  -p 3000:3000 \
  lvl6-secure-api
```

**参数详解**：

| 参数 | 说明 |
|------|------|
| `--memory="256m"` | 限制容器最多使用 256MB 内存。超过限制会被 OOM Killer 杀掉（退出码 137） |
| `--cpus="0.5"` | 限制容器最多使用 0.5 个 CPU 核心。0.5 表示半个核，即 50% 的单核算力 |
| `--read-only` | 根文件系统设为只读。容器无法在 `/`、`/etc` 等路径写入文件 |
| `--cap-drop=ALL` | 去除所有 Linux Capability。默认容器有 14 种 Capability，全部去除最大化安全 |
| `--security-opt=no-new-privileges` | 禁止容器内的进程通过 setuid/setgid 提权 |

> **对比不安全的启动方式**：`docker run -d --name bad-api -p 3000:3000 lvl6-secure-api` —— 虽然 Dockerfile 中设了 `USER node`，但如果不在运行时加固，攻击面更大。

### 3. 验证非 root 运行

```bash
# 查看 /health 端点返回的运行用户信息
curl http://localhost:3000/health

# 预期 uid 和 gid 都是 1000（node 用户的 ID），而非 0（root）
```

```bash
# 直接查看容器内运行的进程
docker top lvl6-api
# 预期：UID 列为 node（而非 root）
```

### 4. 验证只读文件系统

```bash
# 尝试在容器内创建文件
docker exec lvl6-api touch /test.txt
# 预期报错：touch: /test.txt: Read-only file system

# 但 /tmp 默认是可写的（某些场景需要临时文件）
docker exec lvl6-api touch /tmp/test.txt
# 应该成功

# 如需完全锁定，也可将 /tmp 挂载为 tmpfs：
# docker run ... --tmpfs /tmp:rw,noexec,nosuid,size=64m
```

### 5. 验证 Capability 裁剪

```bash
# 容器默认拥有 14 种 Capability（如 NET_BIND_SERVICE、CHOWN 等）
# --cap-drop=ALL 后全部去除
# 查看当前容器的 Capability
docker exec lvl6-api cat /proc/1/status | grep Cap
# 与不加 --cap-drop 的容器对比
```

### 6. 观察资源限制效果

```bash
# 终端1：实时查看资源占用
docker stats lvl6-api

# 终端2：发起 CPU/内存压力请求
curl "http://localhost:3000/stress?size=50"
# size=50 表示申请约 50MB 数组进行密集计算

# 观察 docker stats 输出：
# - CPU % 最高被限制在 ~50%（--cpus=0.5 的效果）
# - MEM USAGE 被限制在 256MB 以内
```

### 7. 内存超限测试

```bash
# 发起一个超过 256MB 内存限制的请求
curl "http://localhost:3000/stress?size=300"

# 观察：
# 1. docker stats 中 MEM USAGE 接近 256MB 后容器会被 OOM Kill
# 2. docker ps -a 显示容器状态为 Exited (137)
#    退出码 137 = 128 + 9（SIGKILL），即被 OOM Killer 杀死
```

### 8. 对比：root 用户 vs 非 root 用户

```bash
# 进入 root 运行的容器（如第2关的 lvl2-api）
docker run -d --name test-root -p 3001:3000 lvl2-node-api
docker exec test-root whoami
# 输出：root ← 危险！

# 对比安全容器
docker exec lvl6-api whoami
# 输出：node（或 whoami: unknown uid 1000）
```

### 9. 清理

```bash
docker stop lvl6-api && docker rm lvl6-api
docker stop test-root && docker rm test-root
docker rmi lvl6-secure-api
```

## 知识点讲解

### 容器默认以 root 运行，为什么不安全？

| 风险 | 说明 |
|------|------|
| 容器逃逸 | 如果容器有 `--privileged` 或保留了 `CAP_SYS_ADMIN`，root 用户可能逃逸到宿主机 |
| 文件篡改 | root 用户可修改容器内任何文件，植入后门 |
| 横向移动 | 如果容器网络能访问其他服务，root 权限可能被用于攻击其他容器 |
| 宿主机影响 | root 在容器内可挂载宿主机文件系统（如果配置不当） |

**一个漏洞就够了**：即使你的代码没问题，基础镜像或依赖库可能有 CVE。以非 root 运行是纵深防御（Defense in Depth）的一部分。

### Linux Capability 是什么？

传统 Linux 将权限分为两类：root（全权限）和非 root（无特权操作权限）。
**Capability** 将 root 的超级权限拆分为多个独立单元：

| Capability | 说明 | 容器是否必需 |
|-----------|------|:------:|
| `CAP_NET_BIND_SERVICE` | 绑定低于 1024 的端口 | ❌（用高端口则不需要） |
| `CAP_NET_RAW` | 使用 RAW 套接字（如 ping） | ❌ |
| `CAP_SYS_ADMIN` | 各种系统管理操作 | ❌ |
| `CAP_CHOWN` | 修改文件所有者 | ❌（构建时已用 --chown） |

本关使用 `--cap-drop=ALL` 去除所有 Capability，应用运行在 3000 端口（>1024），不需要任何特殊权限。

### 资源限制对比

| 方式 | 语法 | 适用场景 |
|------|------|---------|
| `docker run --memory` | `--memory=256m` | 单容器手动启动 |
| Compose `deploy.resources` | 见 `docker-compose.yml` | Swarm 正式部署 |
| Compose V2（实验性） | `docker compose --compatibility up` | 非 Swarm 单机 |
| `docker update` | 运行时动态调整 | 临时修改限制 |

> **注意**：`docker compose up` 默认**不启用** `deploy.resources`。本关通过 `docker run` 直接演示资源限制，确保跨平台生效。

### `USER` 指令 vs 运行时 `--user`

```dockerfile
# 方式1：Dockerfile 中指定（推荐，固化到镜像中）
USER node

# 方式2：docker run 时指定（灵活，但容易忘记）
docker run --user 1000:1000 ...
```

**推荐 Dockerfile 中指定**，因为：
- 不依赖运行时记忆
- 镜像可被其他编排工具安全使用（K8s 等）
- CI/CD 中不会被遗漏

## 通关检查清单

- [ ] `docker build -t lvl6-secure-api .` 构建成功
- [ ] `curl http://localhost:3000/health` 返回 `uid` 和 `gid` 非 0
- [ ] `docker top lvl6-api` 显示进程以 `node` 用户运行
- [ ] `docker exec lvl6-api touch /test.txt` 失败（只读文件系统）
- [ ] `docker stats lvl6-api` 观察到 CPU 被限制在 ~50%
- [ ] `/stress?size=300` 导致容器 OOM Kill，退出码 137
- [ ] 理解了 `--cap-drop=ALL` 的作用
- [ ] 理解了为什么要用非 root 用户运行容器
