# 第7关：BuildKit 构建加速

## 学习目标

- 理解 **BuildKit** 与旧版 Docker Builder 的区别
- 掌握 `RUN --mount=type=cache` 的 cache mount 用法
- 掌握 `RUN --mount=type=secret` 安全传递构建密钥
- 了解 `docker buildx` 多平台构建
- 体验构建速度的显著提升

## 前置知识

- 完成第 4 关（多阶段构建）
- Docker 版本 ≥ 23.0（BuildKit 默认启用）

## 概念：BuildKit 是什么？

Docker 的传统构建引擎是一步步执行 Dockerfile 指令，每次构建后中间产物就丢弃了。BuildKit 是新一代构建引擎：

| 特性 | 传统构建 | BuildKit |
|------|---------|----------|
| 缓存粒度 | 整层缓存 | 目录级缓存（cache mount） |
| npm install 缓存 | package.json 变了就全量重装 | 只重新下载变化的包 |
| 构建密钥 | 写在镜像层里（危险） | `--mount=type=secret` 构建后不留痕 |
| 并行构建 | 串行 | 无依赖的阶段可并行 |
| 多平台输出 | 需要多次构建 | 一次构建输出多平台镜像 |

> **确认 BuildKit 已启用**：Docker Desktop 默认启用；Linux 上检查 `docker buildx ls`。

## 操作步骤

### 1. 对比：传统构建 vs BuildKit 构建

```bash
# === 首次构建（两者相同，都需要下载全部依赖） ===
echo "首次构建（冷缓存）..."
time docker build -t lvl7-vue-app .

# 输出类似：
# ...
# RUN npm install                         耗时 25.3s
# docker build  0.08s user  0.12s system  46s total
```

### 2. 第二次构建——观察缓存效果

```bash
# 不做任何修改，再次构建
echo "第二次构建（缓存命中）..."
time docker build -t lvl7-vue-app .

# 输出：
# ...
# => CACHED [builder 3/6] COPY package.json tsconfig.json ...
# => CACHED [builder 4/6] RUN --mount=type=cache,target=/root/.npm npm install   ← 0.0s！
# ...
# docker build  0.02s user  0.02s system  2s total
```

**关键点**：`npm install` 步耗时从 **25s → 0s**（因为依赖文件没变，整层缓存命中）。

### 3. 修改源码后构建——cache mount 的威力

```bash
# 修改 App.vue 中的文字
echo "修改源码后..."
time docker build -t lvl7-vue-app .

# 观察输出：
# => CACHED [builder 3/6] COPY package.json ...    ← 依赖文件没变，缓存命中
# => CACHED [builder 4/6] RUN ... npm install        ← npm install 缓存命中！
# => [builder 5/6] COPY src/ ./src/                  ← 源码变了，重建
# => [builder 6/6] RUN npm run build                 ← 重新构建（只此一步需要时间）
```

**即使没有 BuildKit 的 cache mount**，这里 `npm install` 也会命中传统层缓存——因为 `package.json` 没变。那 cache mount 厉害在哪？

### 4. 修改 package.json 后的对比——cache mount 的真正价值

```bash
# 场景：在 package.json 中添加一个新依赖
# 比如 "dayjs": "^1.11.10"
```

**传统方式**（假设不用 BuildKit cache mount）：
- `package.json` 变了 → `COPY package.json` 层缓存失效
- `RUN npm install` 层缓存也失效 → **重新下载所有 100+ 个包**
- 即使你只加了一个 `dayjs`，也要重新下载 `vue`、`vite`、`typescript`...

**BuildKit cache mount**（本关 Dockerfile）：
- `package.json` 变了 → `COPY package.json` 层缓存失效 ✅
- `RUN --mount=type=cache ... npm install` → npm 检查缓存目录 `/root/.npm`
- 之前下载过的包（如 `vue`、`vite`）直接在缓存中找到 → 跳过 ✅
- 只下载新增的 `dayjs` → **只花 2s 而不是 25s！**

### 5. 手动验证 BuildKit 缓存目录

```bash
# BuildKit 缓存在 Docker 内部存储，不直接暴露
# 查看 Docker 磁盘使用
docker system df

# 查看 BuildKit 缓存
docker buildx du
```

### 6. 安全使用构建密钥（Secret Mount）

```
# 场景：你的项目使用私有 npm registry，需要 .npmrc 中的认证 token

# 创建模拟的 .npmrc
echo "//private-registry.example.com/:_authToken=my-secret-token" > .npmrc
echo "registry=https://private-registry.example.com" >> .npmrc
```

```bash
# 使用 secret mount 安全传入（token 不会留在镜像中！）
docker build \
  --secret id=npmrc,src=.npmrc \
  -t lvl7-vue-secret \
  .
```

**为什么不用 `COPY .npmrc .`？**

```dockerfile
# ❌ 危险做法：token 会永远留在镜像层中！
COPY .npmrc ./
RUN npm install
RUN rm .npmrc    # ← rm 只是删除了文件，之前的层仍然包含 token！
```

```dockerfile
# ✅ BuildKit 安全做法：token 只在构建时临时可用，不写入任何镜像层
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install
```

> 任何人通过 `docker history` 或 `docker save` 都能提取旧做法中泄露的 token！

### 7. 多平台构建

```bash
# 创建一个跨平台的 builder 实例（仅首次）
docker buildx create --name multiarch --use

# 构建同时支持 x86 和 ARM 的镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t lvl7-vue-app:multi \
  --push \
  .

# 不加 --push 时，使用 --load 加载到本地（仅限单平台）
docker buildx build --platform linux/arm64 -t lvl7-vue-arm64 --load .

# 查看镜像的架构信息
docker inspect lvl7-vue-arm64 | grep Architecture
# 输出："Architecture": "arm64"
```

> **为什么需要多平台？**
> - Mac M1/M2 是 ARM 架构，服务器通常是 x86
> - 在 Mac 上构建的镜像默认是 ARM，推送到 x86 服务器会无法运行
> - 多平台构建一次产出两种架构的镜像，Docker 自动拉取匹配的版本

### 8. 清理

```bash
docker stop lvl7-vue && docker rm lvl7-vue
docker rmi lvl7-vue-app

# 清理 BuildKit 缓存
docker buildx prune
```

## 知识点讲解

### Cache Mount 原理

```
传统构建缓存模型：
  COPY package.json → Layer A  ─┐
  RUN npm install   → Layer B   ├── package.json 不变时全部缓存
  COPY src/         → Layer C  ─┘

  问题：package.json 加了新包 → Layer A 缓存失效 → Layer B 也失效 → 全部重装

BuildKit cache mount 模型：
  COPY package.json → Layer A     ← 失效时重建
  RUN --mount=cache → 复用 /root/.npm 缓存
       └── npm 检查全局缓存 → 只下载新增的包 → npm install 快 10 倍
  COPY src/         → Layer C     ← 正常
```

### 常见的 Cache Mount 用法

| 语言/工具 | 缓存的目录 | Dockerfile 写法 |
|-----------|-----------|----------------|
| npm | `~/.npm` | `--mount=type=cache,target=/root/.npm` |
| yarn | `/usr/local/share/.cache/yarn` | `--mount=type=cache,target=/usr/local/share/.cache/yarn` |
| pip | `~/.cache/pip` | `--mount=type=cache,target=/root/.cache/pip` |
| apt | `/var/cache/apt` | `--mount=type=cache,target=/var/cache/apt` |
| Go modules | `/go/pkg/mod` | `--mount=type=cache,target=/go/pkg/mod` |
| cargo | `/usr/local/cargo/registry` | `--mount=type=cache,target=/usr/local/cargo/registry` |

### Secret Mount 原理

```
构建过程：
  宿主机 .npmrc ──[secret mount]──→ 构建容器 /root/.npmrc（临时，仅构建时存在）
                                           ↓
                                    npm install 使用 token 认证
                                           ↓
                                    构建结束 → 临时挂载消失 → 镜像中不包含 token
```

### 传统 Builder vs BuildKit vs Buildx

|  | docker build | DOCKER_BUILDKIT=1 docker build | docker buildx build |
|--|-------------|-------------------------------|-------------------|
| 引擎 | 传统 Builder | BuildKit | BuildKit |
| 后端 | dockerd 内置 | dockerd 内置 | BuildKit 守护进程 |
| 缓存导出 | ❌ | ✅ | ✅ |
| 多平台 | ❌ | 有限 | ✅ 完整支持 |
| Secret mount | ❌ | ✅ | ✅ |
| `--push` | ❌ | ❌ | ✅ |

> **Docker Desktop** 和 **Docker 23.0+** 已默认启用 BuildKit，`docker build` 直接使用 BuildKit 引擎。

## 通关检查清单

- [ ] 执行了首次构建 `docker build -t lvl7-vue-app .`
- [ ] 第二次构建所有步骤显示 `CACHED`，耗时 < 5s
- [ ] 理解了 cache mount 如何跨 `package.json` 变更复用缓存
- [ ] `docker buildx du` 查看了 BuildKit 磁盘使用
- [ ] （可选）测试了 secret mount 安全传入 `.npmrc`
- [ ] （可选）执行了多平台构建 `--platform linux/arm64`
- [ ] 理解了为什么 `COPY .npmrc` + `RUN rm` 不安全
