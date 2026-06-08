# 第2关：故障排除指南

## 故障 1：构建缓存导致代码更新未生效

**现象**：修改了 `server.js` 后重新构建，运行后仍然是旧代码的响应。

**原因**：Docker 构建缓存可能没有正确失效。如果 `COPY . .` 这一步没有检测到文件变化（极少情况下），或者忘记重建。

**解决方案**：

```bash
# 强制禁用构建缓存
docker build --no-cache -t lvl2-node-api .

# 或先停止、删除旧镜像再构建
docker stop lvl2-api && docker rm lvl2-api
docker rmi lvl2-node-api
docker build -t lvl2-node-api .
```

**预防措施**：
- 确保 `.dockerignore` 不排除 `server.js`
- 观察构建输出中 `server.js` 所在层是否显示 `CACHED`——如果是，则说明前面某层缓存未被命中导致整个后续流程被跳过

## 故障 2：端口未正确暴露

**现象**：`curl http://localhost:3000/health` 返回 `curl: (7) Failed to connect to localhost port 3000 after 0 ms: Connection refused`

**原因**：

1. `docker run` 时忘记添加 `-p 3000:3000`
2. Dockerfile 中 `EXPOSE` 只是文档，不影响运行时端口映射
3. 服务器监听地址绑定了 `127.0.0.1` 而非 `0.0.0.0`

**解决方案**：

```bash
# 1. 检查容器是否在运行
docker ps

# 2. 检查端口映射配置
docker port lvl2-api
# 应该输出：3000/tcp -> 0.0.0.0:3000

# 3. 如果端口映射为空，说明启动时忘了 -p
#    需要停止容器，重新使用正确的参数启动
docker stop lvl2-api && docker rm lvl2-api
docker run -d -p 3000:3000 --name lvl2-api lvl2-node-api

# 4. 确认 server.js 中监听的是 0.0.0.0 而非 localhost
#    容器内 localhost 指向容器自身，如果监听 localhost:3000，宿主机无法访问
```

## 故障 3：容器启动后立刻退出

**现象**：`docker ps` 看不到容器，`docker ps -a` 显示容器状态为 `Exited`。

**原因**：应用启动失败（端口被占、代码错误、依赖缺失等）。

**解决方案**：

```bash
# 1. 查看容器退出日志
docker logs lvl2-api
# 常见错误：
#   - Error: listen EADDRINUSE: 端口被占用
#   - Error: Cannot find module 'fastify': 依赖未安装
#   - ReferenceError: process is not defined: 代码语法错误

# 2. 如果是端口被占，换个端口映射
docker run -d -p 3001:3000 --name lvl2-api lvl2-node-api
# 然后访问 http://localhost:3001

# 3. 如果是依赖问题，确认 Dockerfile 中正确安装了 npm 包
docker build --no-cache -t lvl2-node-api .

# 4. 临时运行容器，进入检查（覆盖 CMD 为 sh）
docker run -it --rm --entrypoint sh lvl2-node-api
# 在容器内手动执行 node server.js 看报错
```
