# 第1关：故障排除指南

## 故障 1：端口被占用

**错误日志**：

```
docker: Error response from daemon: driver failed programming external connectivity on endpoint lvl1-nginx: Bind for 0.0.0.0:8080 failed: port is already allocated.
```

或：

```
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:8080 -> 0.0.0.0:0: listen tcp 0.0.0.0:8080: bind: address already in use
```

**原因**：宿主机 8080 端口已被其他进程占用。

**解决方案**：

```bash
# 1. 查找占用 8080 端口的进程
lsof -i :8080

# 2. 如果占用进程是另一个 Docker 容器
docker stop <占用端口的容器名>
docker rm <占用端口的容器名>

# 3. 或者换一个端口运行
docker run -d -p 8081:80 --name lvl1-nginx nginx:alpine
# 然后访问 http://localhost:8081

# 4. 如果是系统进程（如 macOS 的 AirPlay 接收器）
#    macOS 系统设置 → 通用 → AirDrop 与 Handoff → 关闭 "AirPlay 接收器"
```

## 故障 2：卷挂载权限问题（Linux）

**错误日志**：

```
nginx: [emerg] open() "/usr/share/nginx/html/index.html" failed (13: Permission denied)
```

**原因**：SELinux（Security-Enhanced Linux）阻止了容器访问宿主机挂载的文件。

**解决方案**：

```bash
# 方案 A：添加 :Z 后缀（SELinux 重新标记）
docker run -d -p 8080:80 --name lvl1-nginx -v $PWD/index.html:/usr/share/nginx/html/index.html:Z nginx:alpine

# 方案 B：以特权模式运行（不推荐，降低安全性）
docker run -d -p 8080:80 --name lvl1-nginx --privileged nginx:alpine

# 方案 C：临时关闭 SELinux（仅调试使用）
setenforce 0
```

> **注意**：macOS 和 Windows 上不会遇到此问题，仅 Linux（特别是 CentOS/RHEL/Fedora）需要处理。

## 故障 3：卷挂载后页面未更新

**现象**：修改了本地的 `index.html`，但浏览器刷新后页面内容没有变化。

**原因**：

1. **浏览器缓存**：浏览器缓存了旧的 HTML 页面
2. **卷挂载路径不对**：宿主机绝对路径解析错误

**解决方案**：

```bash
# 1. 强制刷新浏览器（跳过缓存）
#   Windows/Linux: Ctrl + F5
#   macOS: Cmd + Shift + R

# 2. 确认挂载正确
# 进入容器检查文件内容
docker exec -it lvl1-nginx cat /usr/share/nginx/html/index.html
# 如果内容和本地不一致，说明挂载路径有问题

# 3. Windows 特殊问题：路径中的反斜杠
#   Windows 上使用绝对路径
docker run -d -p 8080:80 --name lvl1-nginx -v C:\Users\xxx\index.html:/usr/share/nginx/html/index.html nginx:alpine

# 4. 重建容器（终极方案）
docker stop lvl1-nginx && docker rm lvl1-nginx
docker run -d -p 8080:80 --name lvl1-nginx -v $PWD/index.html:/usr/share/nginx/html/index.html nginx:alpine
```
