# 第3关：故障排除指南

## 故障 1：API 启动报错连接不上 Redis

**错误日志**：
```
docker compose logs api
```
输出：
```
Redis 连接错误: connect ECONNREFUSED 172.x.x.x:6379
Redis 连接重试 #1，等待 1000ms...
```

**原因**：
`depends_on` 只保证 Redis 容器启动，但 Redis 服务尚未就绪。API 在 Redis 就绪前就开始尝试连接。

**解决方案**：

```bash
# 方案 A：等一会再试。Redis 通常 2-3 秒就绪
# 查看 Redis 是否就绪
docker compose logs redis

# 方案 B：重启 API 服务
docker compose restart api

# 方案 C：使用健康检查 + condition（修改 docker-compose.yml）
# 添加 healthcheck 到 redis 服务，然后 api 的 depends_on 改为：
# depends_on:
#   redis:
#     condition: service_healthy
```

**server.js 中的重试机制**：
如果连接失败，ioredis 会自动按照重试策略重连，不会导致 API 崩溃。等待几秒后 API 应能自动恢复连接。

## 故障 2：数据重启后丢失

**现象**：`docker compose down` 后重新 `docker compose up -d`，之前写入 Redis 的数据不存在了。

**原因**：

1. 卷定义错误：`docker-compose.yml` 中没有正确配置命名卷
2. 使用了 `docker compose down -v`（带了 `-v` 会删除卷）
3. 卷挂载路径错误：Redis 的数据目录是 `/data`，如果挂载到其他路径则无法持久化

**解决方案**：

```bash
# 1. 确认卷存在
docker volume ls | grep redis

# 2. 检查容器挂载
docker inspect lvl3-redis | grep -A 10 Mounts

# 3. 检查 docker-compose.yml 中 volumes 配置
#    - 服务级别：volumes: - redis-data:/data  ✅
#    - 顶层级别：volumes: redis-data:         ✅

# 4. 恢复步骤
#    如果数据已经丢失且需要恢复，无解。确保配置正确后重新写入数据
curl http://localhost:3000/set/name/docker
```

## 故障 3：端口冲突

**错误日志**：
```
docker compose up -d
```
输出：
```
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:3000 -> 0.0.0.0:0: listen tcp 0.0.0.0:3000: bind: address already in use
```

**原因**：宿主机 3000 端口已被其他进程或容器占用。

**解决方案**：

```bash
# 1. 查找占用端口的进程
lsof -i :3000

# 2. 如果是之前的容器占用了端口
docker ps | grep lvl
# 停止之前的容器
docker stop lvl2-api lvl3-api

# 3. 修改 docker-compose.yml 中的端口映射（临时方案）
# api:
#   ports:
#     - "3001:3000"  # 改为 3001

# 4. 清理全部容器后重试
docker compose down
docker compose up -d
```
