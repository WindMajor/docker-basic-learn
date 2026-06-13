# 第8关：故障排除指南

## 故障 1：`docker stop` 要等 10 秒才结束

**现象**：
```bash
time docker stop lvl8-api
# docker stop lvl8-api  0.01s user  0.01s system  10.2s total
```

**原因**：应用没有处理 SIGTERM 信号（或用了 shell 形式 CMD）。

**验证**：
```bash
# 查看容器日志，确认是否收到了 SIGTERM
docker logs lvl8-api
# 如果看不到 "收到 SIGTERM" 日志，说明信号未被处理
```

**解决方案**：

```javascript
// 在 Node.js 中注册 SIGTERM 处理器
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM，开始优雅关闭...');
  await server.close();
  process.exit(0);
});
```

```bash
# 如果只是临时调整超时时间
docker stop --time 30 lvl8-api
# 但根本解决方案是注册信号处理器
```

## 故障 2：僵尸进程越来越多

**现象**：
```bash
docker exec lvl8-api ps aux
# 看到大量 <defunct> 状态的进程
```

**原因**：应用创建子进程后没有 wait() 回收，且 PID 1 不负责回收。

**解决方案**：

```bash
# 方案 A：使用 --init（推荐，最简单）
docker run -d --init ... lvl8-graceful

# 方案 B：Dockerfile 中使用 tini
# FROM node:20-alpine
# RUN apk add --no-cache tini
# ENTRYPOINT ["/sbin/tini", "--"]
# CMD ["node", "server.js"]

# 方案 C：应用层解决（Node.js 示例）
# 在代码中监听子进程 exit 事件
child.on('exit', (code) => { /* 自动回收 */ });
```

## 故障 3：`docker kill` vs `docker stop` 的区别

| 命令 | 发送的信号 | 说明 |
|------|-----------|------|
| `docker stop` | SIGTERM → 等 10s → SIGKILL | 优雅停止 |
| `docker kill` | SIGKILL | 立刻强杀，不可被捕获 |
| `docker kill -s SIGTERM` | SIGTERM | 发送指定信号，无超时 |

```bash
# 测试：docker kill 没有优雅关闭
docker run -d --name test-kill -p 3001:3000 lvl8-graceful
docker kill test-kill  # 直接用 SIGKILL
docker logs test-kill  # 看不到 "收到 SIGTERM" 日志
docker rm test-kill
```

## 故障 4：子进程杀不掉（孤儿进程变僵尸）

**现象**：停止容器后，子进程仍然占用端口。

**原因**：应用 spawn 了子进程，但没有在 SIGTERM 处理中 kill 掉。

**解决方案**：

```javascript
// 正确做法：维护子进程列表，关闭时全部 kill
const children = [];

process.on('SIGTERM', async () => {
  // 1. 停止创建新子进程
  // 2. 等待已有子进程完成或 kill
  for (const child of children) {
    child.kill('SIGTERM');
  }
  // 3. 关闭服务器
  await server.close();
  process.exit(0);
});
```

## 故障 5：Windows 上 SIGTERM 不工作

**现象**：Windows 上 `docker stop` 行为与 Linux/macOS 不同。

**原因**：Windows 的 Docker 在 WSL2 或 Hyper-V 虚拟机中运行，信号传递有差异。

**解决方案**：

```bash
# 1. 确认使用 WSL2 后端（推荐）
wsl --set-version <distro> 2

# 2. Windows 容器（非 Linux 容器）不支持 Unix 信号
# 在 Windows 上始终使用 Linux 容器模式

# 3. 验证信号是否抵达
docker run --rm lvl8-graceful &
sleep 2
docker stop $(docker ps -q --filter ancestor=lvl8-graceful)
```

## 故障 6：Node.js 中 `process.exit()` 不会触发 `process.on('exit')`

**陷阱**：
```javascript
// ❌ process.on('exit') 中的异步操作不会执行
process.on('exit', async () => {
  await db.close();  // 不会被 await！
  console.log('这条日志可能会出现');
});

// ✅ 在 SIGTERM 处理器中做异步清理
process.on('SIGTERM', async () => {
  await db.close();  // 正确等待
  process.exit(0);
});
```

`process.on('exit')` 回调只能做同步操作，`process.exit()` 不会等待异步操作。
始终在 `SIGTERM`/`SIGINT` 处理器中做清理工作。
