# 第1关：单容器 Nginx 静态页面

## 学习目标

- 理解 **镜像（Image）** 与 **容器（Container）** 的关系
- 掌握 `docker pull`、`docker run`、`docker ps` 基本命令
- 理解 **端口映射（-p）** 和 **卷挂载（-v）** 的概念
- 学会查看容器日志和进入容器内部

## 前置知识

- 已安装 Docker Desktop 并确认运行中
- 了解什么是 Web 服务器（Nginx）

## 操作步骤

### 1. 拉取 Nginx 镜像

```bash
docker pull nginx:alpine
```

> **关于 `alpine` 标签**：Alpine Linux 是一个极简的 Linux 发行版，体积仅 5MB 左右。`nginx:alpine` 镜像体积约 23MB，而 `nginx:latest`（基于 Debian）约 187MB。——Alpine 版本体积小 8 倍，意味着拉取更快、磁盘占用更少、攻击面更小。
>
> **标签（Tag）建议**：生产中应始终指定具体版本标签（如 `nginx:1.25-alpine`），而非 `latest`，避免意外升级导致不兼容。

### 2. 查看已拉取的镜像

```bash
docker images
```

你应该能看到 `nginx` 镜像，大小为 23MB 左右。

### 3. 启动容器

```bash
docker run -d -p 8080:80 --name lvl1-nginx -v $PWD/index.html:/usr/share/nginx/html/index.html nginx:alpine
```

**参数详解（逐条理解！）**：

| 参数                | 说明                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `-d`                | **后台运行**（detached）。不加该参数会前台运行，终端被阻塞，Ctrl+C 会停止容器                    |
| `-p 8080:80`        | **端口映射**。宿主机 8080 端口 → 容器 80 端口。访问 `http://localhost:8080` 即访问容器的 80 端口 |
| `--name lvl1-nginx` | **容器名称**。后续操作（stop/rm/logs）通过名称引用，而非随机 ID                                  |
| `-v ...:...`        | **卷挂载**（bind mount）。宿主机文件 → 容器内路径。修改宿主机文件，容器内即时生效                |
| `nginx:alpine`      | **镜像名称**:标签。指定使用哪个镜像创建容器                                                      |

### 4. 验证运行

```bash
# 查看运行中的容器
docker ps

# 浏览器访问
open http://localhost:8080
# 或手动打开浏览器访问 http://localhost:8080
# 应该看到 "Docker 第1关运行成功" 的页面
```

### 5. 查看日志

```bash
docker logs lvl1-nginx

# 实时跟踪日志（Ctrl+C 退出）
docker logs -f lvl1-nginx
```

### 6. 进入容器内部

```bash
docker exec -it lvl1-nginx sh
```

> **`exec` 与 `attach` 的区别**：
>
> - `docker exec`：在运行中的容器**新起一个进程**执行命令。安全、无副作用。
> - `docker attach`：**附着到容器的主进程**（PID 1）。如果 attach 后按 Ctrl+C，会发信号给主进程，很有可能**停止整个容器**！
>
> **日常调试使用 `exec`，永远不要用 `attach`**。

在容器内部探索：

```bash
# 查看 Nginx 配置文件
cat /etc/nginx/conf.d/default.conf

# 查看我们挂载的页面
cat /usr/share/nginx/html/index.html

# 查看容器操作系统
cat /etc/os-release

# 退出容器
exit
```

### 7. 修改页面观察即时生效

不停止容器，直接修改本地的 `index.html`，刷新浏览器即可看到变化。

### 8. 停止并删除容器

```bash
# 停止容器（发送 SIGTERM 信号，优雅关闭）
docker stop lvl1-nginx

# 查看容器状态（STATUS 列显示 Exited）
docker ps -a

# 删除容器
docker rm lvl1-nginx

# 也可以一步到位：使用 --rm 参数自动清理
# docker run -d -p 8080:80 --name lvl1-nginx --rm nginx:alpine
```

> **`--rm` 参数**：容器停止后自动删除。适合临时测试，不适合需要查看日志的长期容器。

## 知识点讲解

### 容器退出状态码

| 状态码 | 含义            | 常见原因                         |
| ------ | --------------- | -------------------------------- |
| 0      | 正常退出        | 进程主动退出                     |
| 137    | 被 SIGKILL 杀死 | `docker kill` 或 OOM（内存不足） |
| 143    | 被 SIGTERM 停止 | `docker stop`（优雅关闭）        |

### 镜像（Image）vs 容器（Container）

| 概念              | 类比                       | 说明                                               |
| ----------------- | -------------------------- | -------------------------------------------------- |
| 镜像（Image）     | **类（Class）/ 模板**      | 只读的、打包好的文件系统，包含运行环境和配置       |
| 容器（Container） | **实例（Instance）/ 进程** | 镜像运行起来后的实体，可读可写，可被启动/停止/删除 |

一个镜像可以启动多个容器，每个容器相互隔离。

## 通关检查清单

- [ ] 执行了 `docker pull nginx:alpine` 并看到进度条
- [ ] 执行了 `docker run` 命令并返回了容器 ID
- [ ] 浏览器访问 `http://localhost:8080` 看到 "Docker 第1关运行成功"
- [ ] 执行了 `docker exec -it lvl1-nginx sh` 进入了容器
- [ ] 修改 `index.html` 后刷新浏览器看到了变化
- [ ] 执行 `docker stop` 和 `docker rm` 清理了容器
- [ ] **理解了 `-d`、`-p`、`-v`、`--name` 四个参数的作用**
