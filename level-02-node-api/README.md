# 第2关：自定义 Node.js API 镜像

## 学习目标

- 掌握 Dockerfile 编写（`FROM`、`WORKDIR`、`COPY`、`RUN`、`ENV`、`EXPOSE`、`CMD`）
- 理解镜像构建（`docker build`）流程
- 理解镜像分层（Layer）与缓存机制
- 学会传递环境变量和查看容器元数据

## 前置知识

- 完成第 1 关
- 了解 Node.js 基础

## 操作步骤

### 1. 构建镜像

```bash
docker build . -t lvl2-node-api
```

> **`.`** 指定当前目录为构建上下文路径。
>
> **`-t`**：为镜像指定名称（Name）和标签（Tag），格式为 `名称:标签`，省略标签默认为 `latest`。
>
> **构建流程**：Docker 会在当前目录下寻找Dockerfile，并逐行执行 Dockerfile 中的指令，每条指令生成一个**只读层（Layer）**。如果某层未变化，Docker 会直接使用缓存。

### 2. 查看构建好的镜像

```bash
docker images | grep lvl2
```

注意体积：约 120MB（Node.js Alpine 基础镜像 + Fastify 依赖 + 代码）。

### 3. 启动容器

```bash
docker run -d -p 3000:3000 --name lvl2-api -e NODE_ENV=production lvl2-node-api
```

> **`-e NODE_ENV=production`**：设置环境变量，可以在容器内通过 `process.env.NODE_ENV` 读取。可以多次使用 `-e` 设置多个变量。

### 4. 验证 API 正常响应

```bash
# 健康检查端点
curl http://localhost:3000/health

# 环境变量查看
curl http://localhost:3000/env

# 根路径
curl http://localhost:3000/
```

预期返回 JSON 格式的响应。

### 5. 实时查看日志

```bash
docker logs -f lvl2-api
```

按 `Ctrl+C` 退出日志追踪。

### 6. 查看容器元数据

```bash
docker inspect lvl2-api

# 提取关键信息
docker inspect lvl2-api | grep -A 5 "IPAddress"
docker inspect lvl2-api | grep -A 10 "Config"
```

`docker inspect` 返回容器完整元数据，包括网络配置（IP 地址）、挂载点、环境变量、资源限制等。

### 7. 修改代码后重新部署

```bash
# 1. 修改 server.js（比如在 /health 响应中加一个字段）

# 2. 停止并删除旧容器
docker stop lvl2-api && docker rm lvl2-api

# 3. 重新构建（--no-cache 可选，用于强制不缓存）
docker build -t lvl2-node-api .

# 4. 重新启动
docker run -d -p 3000:3000 --name lvl2-api -e NODE_ENV=production lvl2-node-api
```

> 注意构建输出中的 `CACHED` 字样：依赖层未变，直接从缓存复用；只有代码变更的层需要重建。

### 8. 清理

```bash
docker stop lvl2-api && docker rm lvl2-api
docker rmi lvl2-node-api
```

## 知识点讲解

### 镜像分层（Layer）与缓存机制

```
Dockerfile 指令 → Layer
COPY package.json ./ → Layer 1（缓存命中 ✓）
RUN npm install    → Layer 2（基于 Layer 1 缓存 ✓）
COPY . .           → Layer 3（代码变了，重建）
```

**缓存失效规则**：

- 如果某条指令的文件或上下文发生变化，该层缓存失效
- 该层之后的所有层缓存也全部失效
- **优化技巧**：先复制不常变的文件（`package.json`），再复制频繁变动的文件（源码），尽可能复用缓存

### 为什么 `node_modules` 要放在 `.dockerignore` 中？

1. **构建上下文体积**：`node_modules` 动辄几百 MB，如果发送到 Docker daemon，构建会非常慢
2. **安装不一致**：本地 `node_modules` 可能是 macOS 编译的二进制包，而容器运行在 Linux 上，可能不兼容
3. **最佳实践**：在 Dockerfile 中使用 `RUN npm install` 在容器内安装依赖，确保与容器环境一致

### `CMD` 与 `ENTRYPOINT` 的区别

| 指令                        | 可被覆盖                                                                              | 典型用途                                    |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `CMD ["node", "server.js"]` | ✅ `docker run <镜像> echo hello` ，这么执行会把 `node server.js` 覆盖为 `echo hello` | 提供默认启动命令                            |
| `ENTRYPOINT ["node"]`       | ❌ 除非 `--entrypoint`                                                                | 固定执行入口                                |
| 组合使用                    | CMD 作为默认参数                                                                      | `ENTRYPOINT ["node"]` + `CMD ["server.js"]` |

**组合使用示例**：

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run lvl2-node-api          → node server.js
# docker run lvl2-node-api app.js   → node app.js（CMD 被覆盖，ENTRYPOINT 保留）
```

## 通关检查清单

- [ ] `docker build -t lvl2-node-api .` 构建成功，无错误
- [ ] `curl http://localhost:3000/health` 返回 JSON 响应
- [ ] `curl http://localhost:3000/env` 中 `NODE_ENV` 值为 `production`
- [ ] 修改 `server.js` 后重新构建，观察到分层缓存效果
- [ ] 执行了 `docker inspect` 查看了容器元数据
- [ ] 理解了 `CMD` 与 `ENTRYPOINT` 的区别
- [ ] 理解了镜像分层缓存机制
