# Docker 命令速查表

> 按场景分类，只记命令，不展开教程。

## 镜像操作

| 命令 | 说明 |
|------|------|
| `docker pull <镜像名>:<标签>` | 拉取镜像 |
| `docker build -t <镜像名>:<标签> .` | 构建镜像（`-t` 指定名称标签） |
| `docker build --no-cache -t <镜像名>:<标签> .` | 禁用缓存构建 |
| `docker images` | 查看本地镜像列表 |
| `docker rmi <镜像ID或名称>` | 删除镜像 |
| `docker rmi $(docker images -q)` | 删除所有镜像 |

## 容器操作

| 命令 | 说明 |
|------|------|
| `docker run -d -p <宿主机端口>:<容器端口> --name <容器名> <镜像>` | 后台运行容器 |
| `docker run --rm -it <镜像> sh` | 运行并进入交互式 Shell |
| `docker ps` | 查看运行中的容器 |
| `docker ps -a` | 查看所有容器（含已停止的） |
| `docker stop <容器名或ID>` | 停止容器 |
| `docker start <容器名或ID>` | 启动已停止的容器 |
| `docker restart <容器名或ID>` | 重启容器 |
| `docker rm <容器名或ID>` | 删除容器 |
| `docker rm -f <容器名或ID>` | 强制删除运行中的容器 |
| `docker rm $(docker ps -aq)` | 删除所有容器 |
| `docker logs <容器名或ID>` | 查看容器日志 |
| `docker logs -f <容器名或ID>` | 实时跟踪日志 |
| `docker logs --tail 100 <容器名或ID>` | 查看最近 100 行日志 |
| `docker exec -it <容器名或ID> <命令>` | 在运行中的容器执行命令 |
| `docker exec -it <容器名> sh` | 进入容器 Shell |
| `docker cp <容器名>:<路径> <本地路径>` | 从容器的路径复制文件到本地 |
| `docker cp <本地路径> <容器名>:<路径>` | 从本地复制文件到容器 |

## 网络与卷

| 命令 | 说明 |
|------|------|
| `docker network ls` | 查看网络列表 |
| `docker network create <网络名>` | 创建网络 |
| `docker network inspect <网络名>` | 查看网络详情 |
| `docker volume ls` | 查看卷列表 |
| `docker volume create <卷名>` | 创建卷 |
| `docker volume inspect <卷名>` | 查看卷详情 |
| `docker volume rm <卷名>` | 删除卷 |
| `docker inspect <容器名或ID>` | 查看容器元数据（IP、网络、挂载等） |

## Compose 操作

| 命令 | 说明 |
|------|------|
| `docker compose up -d` | 后台启动所有服务 |
| `docker compose up -d --build` | 启动前重新构建镜像 |
| `docker compose down` | 停止并删除容器、网络 |
| `docker compose down -v` | 停止并删除容器、网络、卷 |
| `docker compose ps` | 查看服务状态 |
| `docker compose logs -f <服务名>` | 实时跟踪某服务日志 |
| `docker compose exec <服务名> <命令>` | 在运行中的服务执行命令 |
| `docker compose restart <服务名>` | 重启某服务 |
| `docker compose config` | 验证 Compose 文件语法 |
| `docker compose up -d --scale <服务名>=3` | 服务水平扩展 |

## 清理

| 命令 | 说明 |
|------|------|
| `docker system prune` | 清理未使用的容器、网络、镜像 |
| `docker system prune -a` | 清理全部未使用的 Docker 资源 |
| `docker volume prune` | 清理未使用的卷 |
| `docker builder prune` | 清理构建缓存 |
| `docker image prune` | 清理未使用的镜像 |

## 调试

| 命令 | 说明 |
|------|------|
| `docker stats` | 实时查看容器资源占用（CPU、内存） |
| `docker top <容器名>` | 查看容器内运行的进程 |
| `docker events` | 实时查看 Docker 事件流 |
| `docker inspect <容器名> \| grep -i ip` | 快速查看容器 IP |
