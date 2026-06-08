# 第3关：Redis + API 多容器编排

## 学习目标

- 掌握 **Docker Compose** 编写与使用
- 理解 **容器网络**（Network）与服务名 DNS 解析
- 理解 **数据卷**（Volume）持久化
- 掌握 `docker compose` 常用命令

## 前置知识

- 完成第 2 关
- 了解 Redis 基本概念

## 操作步骤

### 1. 启动所有服务

```bash
docker compose up -d
```

> `-d`：后台启动。`docker compose up` 不加 `-d` 会前台运行并显示所有服务的日志。

### 2. 查看服务状态

```bash
docker compose ps
```

你应该看到两个服务都在运行：
- `lvl3-api`：端口映射 `0.0.0.0:3000->3000/tcp`
- `lvl3-redis`：端口未映射到宿主机（仅在 Compose 网络内部可用）

### 3. 查看 API 日志

```bash
docker compose logs -f api
```

按 `Ctrl+C` 退出日志追踪。

### 4. 写入 Redis 数据

```bash
# 写入缓存
curl http://localhost:3000/set/name/docker

# 写入更多数据
curl http://localhost:3000/set/language/TypeScript
curl http://localhost:3000/set/level/03
```

### 5. 读取 Redis 数据

```bash
# 按 Key 读取
curl http://localhost:3000/get/name
# 预期：{"success":true,"key":"name","value":"docker"}

# 访问页面计数器（每次访问 +1）
curl http://localhost:3000/cache
```

### 6. 进入 Redis 容器直接操作

```bash
# 进入 Redis 容器
docker compose exec redis redis-cli

# 在 redis-cli 中执行
KEYS *
GET name
GET language
QUIT
```

### 7. 验证数据持久化

```bash
# 停止并删除容器（保留卷）
docker compose down

# 重新启动
docker compose up -d

# 读取之前写入的数据——数据应该还在！
curl http://localhost:3000/get/name
```

### 8. 停止并清理

```bash
# 停止并删除容器
docker compose down

# 停止并删除容器 + 卷（数据全部清空）
docker compose down -v

# 查看卷是否被删除
docker volume ls | grep redis
```

## 知识点讲解

### 容器 DNS 与服务名

在 Docker Compose 创建的网络中，每个服务名自动成为 DNS 主机名：

```
api  → 容器 IP (172.x.x.2)
redis → 容器 IP (172.x.x.3)
```

这就是为什么在 `server.js` 中可以使用 `redis` 作为 Redis 主机地址。

```bash
# 验证 DNS 解析（进入 api 容器）
docker compose exec api ping redis
```

### `depends_on` 的局限性

```yaml
depends_on:
  - redis
```

`depends_on` 只保证 **redis 容器启动**，**不保证 Redis 服务就绪**。

Redis 容器启动后可能需要几秒才能接受连接。所以 `server.js` 中加入了重试逻辑：

```javascript
retryStrategy: (times) => {
  const delay = Math.min(times * 1000, 30000);
  return delay;
}
```

**生产环境**建议使用 `healthcheck` + `depends_on` 条件：

```yaml
depends_on:
  redis:
    condition: service_healthy
```

### 命名卷（Named Volume）vs 绑定挂载（Bind Mount）

| 特性 | 命名卷 | Bind Mount |
|------|-------|-----------|
| 管理方式 | Docker 管理 | 用户管理 |
| 宿主机路径 | `/var/lib/docker/volumes/...` | 任意路径 |
| 跨平台兼容 | ✅ 完全兼容 | ⚠️ 路径格式不同 |
| 备份/迁移 | `docker volume` 命令 | 直接复制文件 |
| 推荐场景 | 生产环境持久化数据 | 开发环境热更新 |

### 环境变量在 Compose 中的传递优先级

```
docker run -e 传参（最高优先级）
     ↓
docker-compose.yml 中 environment:（中间优先级）
     ↓
.env 文件（最低优先级）
```

## 通关检查清单

- [ ] `docker compose up -d` 启动了两个服务
- [ ] `curl http://localhost:3000/set/name/docker` 写入成功
- [ ] `curl http://localhost:3000/get/name` 读取到写入的值
- [ ] `docker compose down` 后重新 `up`，数据仍然存在
- [ ] `docker compose down -v` 后数据被清空
- [ ] 进入了 Redis 容器使用 `redis-cli` 直接操作
- [ ] 理解了服务名即 DNS 主机名的原理
- [ ] 理解了命名卷和 bind mount 的区别
