# 第5关：全栈生产级部署

## 学习目标

- 掌握生产级 Docker Compose 部署（多文件覆盖）
- 理解 **反向代理**（Nginx）的架构设计
- 理解 **数据库持久化** 和环境隔离（dev vs prod）
- 学习生产环境安全配置（端口隔离、环境变量、日志限制）

## 前置知识

- 完成第 1-4 关
- 了解 PostgreSQL 基础概念

## 操作步骤

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.example .env
cp .env.example .env.prod

# 编辑 .env.prod（生产环境必须修改密码）
# 开发环境可以直接使用模板中的默认值
```

### 2. 启动开发环境

```bash
# 后台启动所有服务
docker compose up -d

# 查看状态
docker compose ps
```

你应该看到 4 个服务：`nginx`、`frontend`、`backend`、`postgres`

### 3. 验证开发环境

```bash
# 前端页面（通过 Nginx 反向代理）
curl -s http://localhost/ | head -10

# API 健康检查（通过 Nginx 反向代理）
curl http://localhost/api/health

# 直接访问后端（开发环境暴露了 3000 端口）
curl http://localhost:3000/api/health

# 获取用户列表
curl http://localhost/api/users
```

### 4. 创建新用户

```bash
# 通过 API 创建用户
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com"}'

# 查看用户列表确认
curl http://localhost/api/users
```

### 5. 启动生产环境

```bash
# 生产环境启动（两个文件叠加）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 查看端口暴露情况 —— 应该只有 80 端口暴露
docker compose ps

# 验证前端
curl http://localhost/

# 验证 API
curl http://localhost/api/health

# 直接访问后端端口应该被拒绝（生产环境不暴露）
curl http://localhost:3000/api/health
# 预期：curl: (7) Failed to connect to localhost port 3000: Connection refused
```

### 6. 验证数据库持久化

```bash
# 创建一些数据
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"持久化测试","email":"persist@test.com"}'

# 停止并删除容器（保留卷）
docker compose down

# 重新启动
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 检查数据是否存在
curl http://localhost/api/users
# 应该还包含刚才创建的用户
```

### 7. 查看日志

```bash
# 实时跟踪 Nginx 日志
docker compose logs -f nginx

# 查看后端日志
docker compose logs backend

# 查看数据库日志
docker compose logs postgres
```

### 8. 水平扩展尝试

```bash
# 扩展后端为 3 个实例（演示负载均衡）
docker compose up -d --scale backend=3

# 查看服务状态
docker compose ps
# 应该显示 3 个 backend 实例

# 多次请求观察负载均衡
for i in {1..5}; do curl -s http://localhost/api/health | grep "hostname"; done
```

> **注意**：本例中使用 Nginx upstream 配置了 `server backend:3000;`，需要 upstream 支持多 backend 实例。如果要完全做负载均衡，需配置多个 upstream server。

### 9. 清理

```bash
# 停止并删除容器
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# 停止并删除容器 + 卷（⚠️ 数据会丢失）
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

## 知识点讲解

### 为什么生产环境不暴露数据库端口？

| 暴露 | 风险 | 安全实践 |
|------|------|---------|
| 暴露 PostgreSQL 5432 | 攻击者可尝试暴力破解密码 | 只允许内部网络访问 |
| 暴露 API 3000 | 绕过 Nginx 的安全策略 | 所有流量经 Nginx 统一入口 |
| 只暴露 Nginx 80/443 | 攻击面最小 | WAF、限流、日志审计 |

### `restart` 策略

| 策略 | 行为 | 适用场景 |
|------|------|---------|
| `no` | 不自动重启 | 一次性任务 |
| `always` | 总是重启（含手动 stop） | 通用（配合其他工具管理） |
| `unless-stopped` | 除非手动 stop，否则重启 | **生产环境推荐** |
| `on-failure` | 仅在退出码非 0 时重启 | 定期清理的批处理任务 |

### 日志驱动

Docker 默认使用 `json-file` 驱动，日志文件存储在宿主机 `/var/lib/docker/containers/<container_id>/<container_id>-json.log`。

**如果不限制，会导致的问题**：
- 日志文件无限增长，最终占满磁盘
- 生产环境需要配置日志轮转（如 `max-size: 10m`、`max-file: 3`）

**替代方案**：
- `gelf`：发送到 Graylog
- `fluentd`：发送到 Fluentd
- `awslogs`：发送到 CloudWatch

### `.env` 文件安全

⚠️ **`.env` 和 `.env.prod` 绝对不要提交到 Git！**

```bash
# 在 .gitignore 中添加
.env
.env.prod
*.env
```

**CI/CD 中的环境变量注入方式**：
- GitHub Actions：使用 `Secrets` 功能
- GitLab CI/CD：使用 `CI/CD Variables`
- 腾讯云：使用环境变量配置或 Secret Manager

## 通关检查清单

- [ ] `docker compose up -d` 启动 4 个服务成功
- [ ] 浏览器访问 `http://localhost/` 看到前端页面
- [ ] `curl http://localhost/api/health` 返回正常
- [ ] 创建用户后 `docker compose down`→`up` 数据仍存在
- [ ] 生产环境启动后只有 80 端口暴露，3000/5432 不可访问
- [ ] 执行了 `docker compose logs` 查看各服务日志
- [ ] 理解了 Nginx 反向代理的原理和配置
- [ ] 理解了生产环境的安全最佳实践
