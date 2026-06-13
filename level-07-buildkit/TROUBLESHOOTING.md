# 第7关：故障排除指南

## 故障 1：`--mount=type=cache` 语法错误

**错误日志**：
```
Error: dockerfile parse error on line XX: Unknown flag: --mount
```

**原因**：Dockerfile 缺少 `# syntax=docker/dockerfile:1` 声明，或 Docker 版本太旧。

**解决方案**：

```bash
# 1. 确认 Dockerfile 第一行是：
# syntax=docker/dockerfile:1

# 2. 确认 Docker 版本 ≥ 18.09
docker version --format '{{.Server.Version}}'

# 3. 旧版本需要手动启用 BuildKit
DOCKER_BUILDKIT=1 docker build -t lvl7-vue-app .

# 4. 如果版本 < 18.09，升级 Docker
```

## 故障 2：`docker buildx` 命令不存在

**错误日志**：
```
docker: 'buildx' is not a docker command.
```

**原因**：Docker 版本 < 19.03，或 buildx 插件未安装。

**解决方案**：

```bash
# 1. 检查 Docker 版本
docker version

# 2. macOS/Windows 上 Docker Desktop 自带 buildx

# 3. Linux 上单独安装
# 下载 buildx 二进制
BUILDX_VERSION=v0.12.0
wget https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-amd64
mkdir -p ~/.docker/cli-plugins
mv buildx-${BUILDX_VERSION}.linux-amd64 ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx

# 4. 如果不想装 buildx，使用传统方式启用 BuildKit 也一样
# DOCKER_BUILDKIT=1 docker build ...
# 但不能做多平台构建
```

## 故障 3：多平台构建报 QEMU 相关错误

**错误日志**：
```
error: failed to solve: process "/bin/sh -c npm install" did not complete successfully: 
exec: "qemu-x86_64": executable file not found in $PATH
```

**原因**：缺少 QEMU（跨架构模拟）。

**解决方案**：

```bash
# 安装 QEMU 模拟器（一次性的）
docker run --privileged --rm tonistiigi/binfmt --install all

# 验证
docker buildx inspect --bootstrap
#  Platforms 行应该看到：linux/amd64, linux/arm64, ...

# 如果不想装 QEMU，只构建当前架构
docker buildx build --platform linux/arm64 -t lvl7-arm64 --load .
# 注意：--load 只能加载单平台镜像
```

## 故障 4：BuildKit 缓存不生效（始终全量安装）

**现象**：每次 `npm install` 都是完整执行，没有加速。

**原因**：

1. `package.json` 每次构建前都被修改了
2. RUN 指令之前的某层缓存失效导致全链路重建
3. 未正确指定 cache target 路径

**解决方案**：

```bash
# 1. 确认 Dockerfile 中 cache mount 配置正确
grep "mount=type=cache" Dockerfile
# 应输出类似：RUN --mount=type=cache,target=/root/.npm npm install

# 2. 确认 package.json 确实没变
git diff package.json

# 3. 检查 COPY 指令顺序
# 必须 COPY package.json 在 COPY src/ 之前

# 4. 使用 --no-cache 做一次全量构建，清除可能的问题状态
docker build --no-cache -t lvl7-vue-app .

# 5. 查看 BuildKit 缓存占用
docker buildx du
# 如果 npm 缓存确实被使用，应该看到 /root/.npm 的缓存增长

# 6. 对比测试：不用 cache mount 的构建时间
# 可以临时注释掉 --mount=type=cache 那行，重新构建对比时间
```

## 故障 5：Vite 构建产物路径不对

**现象**：Nginx 报 404，或者 `COPY --from=builder /app/dist` 找不到文件。

**原因**：Vite 构建输出目录不是 `/app/dist`。

**解决方案**：

```bash
# 1. 确认 vite.config.ts 中的 outDir
# build: { outDir: 'dist' }   ← 相对路径，输出到 /app/dist ✅

# 2. 确认 Dockerfile 中 WORKDIR 是 /app
# COPY --from=builder /app/dist /usr/share/nginx/html

# 3. 临时构建一个调试镜像确认
docker build --target builder -t lvl7-debug .
docker run --rm lvl7-debug ls -la /app/dist
```
