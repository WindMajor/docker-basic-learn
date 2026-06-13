# 第8关：信号处理与优雅关闭

## 学习目标

- 理解 **`docker stop` 的信号流程**（SIGTERM → 10s 超时 → SIGKILL）
- 掌握 **CMD shell 形式 vs exec 形式**对信号传递的影响
- 学会实现**优雅关闭**（Graceful Shutdown）
- 理解**僵尸进程**及 `--init` / `tini` 的作用

## 前置知识

- 完成第 2 关（Dockerfile 的 CMD/ENTRYPOINT）
- 了解 Linux 信号（SIGTERM、SIGKILL、SIGINT）基本概念

## 核心概念

### 为什么要关心「信号」？

当你执行 `docker stop` 时：
```
1. Docker 向容器 PID 1 发送 SIGTERM 信号
2. 容器有 10 秒时间优雅关闭（保存状态、完成请求、关闭连接）
3. 如果 10 秒后还没退出 → 发送 SIGKILL 强制杀死
```

如果你的应用**不处理 SIGTERM**：
- 正在处理的 HTTP 请求会中断 → **数据不一致**
- 数据库连接未正确关闭 → **连接泄漏**
- 消费者未 commit 消息 → **消息丢失**

## 操作步骤

### 1. 构建镜像

```bash
docker build -t lvl8-graceful .
```

### 2. 观察正常关闭流程

```bash
# 终端 1：启动并前台运行（观察日志）
docker run --rm --name lvl8-api -p 3000:3000 lvl8-graceful

# 终端 2：发起一个慢请求（5 秒）
curl http://localhost:3000/slow &

# 立即停止容器
docker stop lvl8-api
```

**终端 1 输出观察**：
```
收到 SIGTERM 信号，开始优雅关闭...
等待 1 个活跃请求完成...
慢请求处理完成
所有请求已完成
Fastify 服务器已关闭
优雅关闭完成，退出进程
```

> 如果服务端没有 `process.on('SIGTERM')`，慢请求会在中途被 SIGKILL 强制中断。

### 3. 对比：shell 形式 CMD 的陷阱

```bash
# 构建一个使用 shell 形式 CMD 的镜像（模拟常见错误）
cat > Dockerfile.shell << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY server.js ./
CMD node server.js
EOF

docker build -f Dockerfile.shell -t lvl8-shell .
docker run -d --name lvl8-shell-test -p 3001:3000 lvl8-shell

# 观察 PID 1 是什么
docker exec lvl8-shell-test ps aux
# 输出大概是这样：
# PID  USER     COMMAND
#   1  root     /bin/sh -c node server.js   ← PID 1 是 sh！
#   7  root     node server.js               ← PID 7 才是 Node.js

# 停止容器
docker stop lvl8-shell-test
```

**发生了什么？**

```
docker stop → 向 PID 1 发送 SIGTERM
           → PID 1 是 sh，不是 node
           → sh 收到 SIGTERM，但不转发给子进程 node
           → node 收不到信号，无法优雅关闭
           → 10 秒后 Docker 发送 SIGKILL → node 被强制杀死 ⚠️
```

> **这就是为什么本关和第2关都强调使用 exec 形式：`CMD ["node", "server.js"]`**

### 4. 演示优雅关闭的完整性

```bash
# 启动容器
docker run -d --name lvl8-api -p 3000:3000 lvl8-graceful

# 发起 3 个请求
curl http://localhost:3000/health
curl http://localhost:3000/health
curl http://localhost:3000/health

# 正常停止（exec 形式 + SIGTERM 处理器）
time docker stop lvl8-api
# docker stop lvl8-api  0.01s user  0.01s system  ...  ← 几乎瞬间，因为优雅关闭很快完成
```

### 5. 观察僵尸进程（Zombie Process）

```bash
# 使用 zombie-test.js 创建容器（不使用 --init）
docker run -d --name lvl8-zombie lvl8-graceful node zombie-test.js

# 等待几秒让子进程积累
sleep 15

# 查看僵尸进程
docker exec lvl8-zombie ps aux
# 如果看到 [echo] <defunct>，说明存在僵尸进程
# defunct = zombie（僵尸进程）

# 停止测试容器
docker rm -f lvl8-zombie
```

### 6. 使用 `--init` 解决僵尸进程

```bash
# 加上 --init 参数（Docker 内置 tini）
docker run -d --init --name lvl8-zombie-fixed lvl8-graceful node zombie-test.js

# 等待同样的时间
sleep 15

# 查看进程——不会再有僵尸进程！
docker exec lvl8-zombie-fixed ps aux
# tini 作为 PID 1，会自动回收子进程（reap zombies）

docker rm -f lvl8-zombie-fixed
```

### 7. 对比：有信号处理 vs 无信号处理

```bash
# 创建一个不处理 SIGTERM 的服务（用于对比）
cat > server-no-handler.js << 'EOF'
const fastify = require('fastify')({ logger: false });
fastify.get('/health', async () => ({ status: 'ok' }));
fastify.listen({ port: 3000, host: '0.0.0.0' });
EOF

# 构建对比镜像
cat > Dockerfile.no-handler << 'EOF'
FROM node:20-alpine
WORKDIR /app
RUN npm install fastify
COPY server-no-handler.js ./
CMD ["node", "server-no-handler.js"]
EOF

docker build -f Dockerfile.no-handler -t lvl8-no-handler .

# 启动对比容器
docker run -d --name lvl8-no-h --stop-timeout 5 -p 3002:3000 lvl8-no-handler

# 发起慢请求（这个服务没有 /slow 端点，用 /health 代替）
# 然后停止——观察 docker stop 是否等待满 5 秒才强制 kill
time docker stop lvl8-no-h
# 输出：大约 5 秒（--stop-timeout 5 的超时时间）
# 说明 SIGTERM 没有被处理，一直等到超时被 SIGKILL

docker rm -f lvl8-no-h
rm Dockerfile.no-handler server-no-handler.js Dockerfile.shell
```

### 8. 清理

```bash
docker stop lvl8-api && docker rm lvl8-api 2>/dev/null
docker rmi lvl8-graceful
```

## 知识点讲解

### `docker stop` 的完整流程

```
docker stop <容器>
       │
       ▼
   向容器 PID 1 发送 SIGTERM
       │
       ├─── PID 1 是应用本身（exec 形式 CMD）
       │    └── 应用收到 SIGTERM → 执行优雅关闭 → process.exit(0)
       │
       ├─── PID 1 是 shell（shell 形式 CMD）
       │    └── sh 收到 SIGTERM，但不转发给子进程
       │        └── 等待 10 秒 → SIGKILL 杀死整个容器 ⚠️
       │
       └─── PID 1 是 tini（--init 或 ENTRYPOINT tini）
            └── tini 收到 SIGTERM → 转发给子进程 → 子进程优雅关闭
```

### 优雅关闭的正确步骤

```
1. 收到 SIGTERM → 设置 "shutting_down=true"
2. 停止接收新请求（健康检查返回 unhealthy）
3. 等待现有请求完成（最多 N 秒）
4. 关闭 HTTP 服务器（close()）
5. 关闭数据库连接池（pool.end()）
6. 关闭消息队列消费者
7. process.exit(0)
```

### 僵尸进程的产生原因

```
父进程（PID 1）
  │
  ├── fork() → 子进程（PID 42）
  │                  │
  │                  └── exit() → 进入 ZOMBIE 状态
  │
  └── 没调用 wait() 回收 ← 僵尸进程产生！

解决：
  - PID 1 调用 wait() 回收（但应用代码通常不处理这个）
  - 使用 tini 作为 PID 1（自动回收所有子进程）
  - docker run --init（推荐）
```

### `CMD` 三种写法的信号对比

| 写法 | PID 1 是谁 | 能收到 SIGTERM | 推荐 |
|------|-----------|:---:|:---:|
| `CMD node server.js` | `/bin/sh -c node server.js` | ❌ sh 不转发 | ❌ |
| `CMD ["node", "server.js"]` | `node server.js` | ✅ | ✅ |
| `CMD ["node", "server.js"]` + `--init` | `tini` → `node server.js` | ✅ + 僵尸回收 | ✅✅ |

## 通关检查清单

- [ ] 构建并启动容器，发起慢请求后 `docker stop`，观察到优雅关闭日志
- [ ] 理解了 exec 形式和 shell 形式 CMD 对信号传递的差异
- [ ] 用 zombie-test.js 观察到僵尸进程（`<defunct>`）
- [ ] 用 `--init` 参数再次测试，确认僵尸进程消失
- [ ] 理解了 `docker stop` 的 10 秒超时机制
- [ ] 理解了优雅关闭对数据一致性的重要性
