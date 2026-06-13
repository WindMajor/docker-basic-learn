# 第6关：故障排除指南

## 故障 1：容器无法启动，报 permission denied

**错误日志**：
```
docker logs lvl6-api
```
输出：
```
Error: listen EACCES: permission denied 0.0.0.0:80
```

**原因**：应用试图监听 80 端口（<1024），但去除了所有 Capability。

**解决方案**：

```bash
# 方案 A：使用高端口（3000+），不修改 Dockerfile
# server.js 中默认使用 3000，确认 docker run 时端口映射正确

# 方案 B：保留 NET_BIND_SERVICE Capability
docker run -d --cap-drop=ALL --cap-add=NET_BIND_SERVICE ...

# 方案 C：不在 Dockerfile 中换用高端口
# server.js 中 const PORT = process.env.PORT || 3000;
# 确认 PORT 环境变量值 > 1024
```

## 故障 2：`docker stats` 显示 CPU 超过限制

**现象**：`--cpus=0.5`，但 `docker stats` 偶尔显示 CPU 80%+

**原因**：`--cpus=0.5` 是平均限制，短时突发可以超过限制，由 CFS（Completely Fair Scheduler）周期控制。

**解释**：
- Docker 使用 Linux CFS 带宽控制实现 CPU 限制
- 默认周期（`--cpu-period`）为 100ms
- `--cpus=0.5` 意味着每 100ms 周期内可用 50ms CPU 时间
- 短时间窗口（如 1s 采样）可能看到瞬时超过 50%

**验证**：
```bash
# 长时间观察平均值
docker stats --no-stream lvl6-api
# 多次运行观察趋势，平均值应在 50% 左右
```

## 故障 3：`--read-only` 导致应用写入失败

**现象**：应用启动报错，日志中有 `Read-only file system` 或 `EROFS`。

**原因**：应用尝试写入目录（如日志目录、临时文件、缓存），但根文件系统只读。

**解决方案**：

```bash
# 方案 A：挂载 tmpfs 给需要写入的目录
docker run -d --read-only \
  --tmpfs /home/node/app/logs:rw,noexec,nosuid,size=32m \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  ...

# 方案 B：挂载命名卷给写入目录
docker run -d --read-only \
  -v app-logs:/home/node/app/logs \
  ...

# 方案 C：如果临时不需要此功能（学习和调试期间）
# 去掉 --read-only 参数即可
docker run -d --memory="256m" --cpus="0.5" --cap-drop=ALL ...
```

## 故障 4：容器被 OOM Kill，退出码 137

**现象**：容器突然停止，`docker ps -a` 显示 `Exited (137)`。

**日志**：
```
docker inspect lvl6-api | grep -A 5 "State"
```
输出：
```
"OOMKilled": true,
```

**原因**：容器内存使用超过了 `--memory` 限制，被 Linux OOM Killer 杀掉。退出码 137 = 128 + 9（SIGKILL）。

**解决方案**：

```bash
# 1. 检查应用是否有内存泄漏
docker logs lvl6-api
docker stats --no-stream lvl6-api

# 2. 适当提高内存限制
docker run -d --memory="512m" ...

# 3. 如果是 Node.js 应用，检查 V8 堆大小
# Node.js 默认堆大小约为可用内存的 50%
# 可通过 --max-old-space-size 限制堆大小
# 在 Dockerfile 中：
# CMD ["node", "--max-old-space-size=128", "server.js"]
# 这样即使 --memory 为 256m，堆也只有 128m，留出空间给其他开销

# 4. 查看 OOM 事件
dmesg | grep -i oom
# macOS 不支持 dmesg，在 Linux 上运行
```

## 故障 5：`whoami` 在容器内返回 `unknown uid 1000`

**现象**：
```bash
docker exec lvl6-api whoami
# 输出：whoami: unknown uid 1000
```

**原因**：Alpine Linux 极简镜像中的 `whoami` 需要 `/etc/passwd` 中有对应用户条目。如果 Dockerfile 中只用了 `USER <uid>` 数字形式而未创建用户，`whoami` 无法解析。

**解决方案**：

```bash
# 方式1：确认用户确实存在
docker exec lvl6-api id
# 输出：uid=1000(node) gid=1000(node)

# 方式2：查看 /etc/passwd 确认
docker exec lvl6-api cat /etc/passwd | grep node

# 本关的 node:20-alpine 基础镜像已包含 node 用户
# 如果是自定义用户，确保 Dockerfile 中正确创建：
# RUN addgroup -S app && adduser -S app -G app
```

## 故障 6：Compose `deploy.resources` 不生效

**现象**：使用 `docker compose up` 启动，`docker stats` 显示资源未被限制。

**原因**：`deploy.resources` 是 Swarm 模式配置。`docker compose up`（非 Swarm）默认忽略它。

**解决方案**：

```bash
# 方案 A：使用 --compatibility 标志（实验性）
docker compose --compatibility up -d

# 方案 B：在 docker-compose.yml 的 service 级别使用旧版配置
# mem_limit: 256m
# cpus: 0.5
# （注意：这些旧版字段已被 deprecated，仅用于兼容性学习）

# 方案 C：直接使用 docker run 命令（本关推荐方式）
docker run -d --memory="256m" --cpus="0.5" ... lvl6-secure-api

# 方案 D：使用 docker stack deploy（Swarm 模式）
docker swarm init
docker stack deploy -c docker-compose.yml lvl6
```
