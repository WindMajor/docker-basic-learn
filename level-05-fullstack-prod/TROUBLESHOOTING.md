# 第5关：故障排除指南

## 故障 1：数据库连接失败

**错误日志**：
```
docker compose logs backend
```
输出：
```
Backend API 启动成功，端口: 3000
数据库连接: postgres://****:****@postgres:5432/app_db
Error: connect ECONNREFUSED 172.x.x.x:5432
```

**原因**：`postgres` 服务未就绪时，`backend` 已启动并尝试连接。

**解决方案**：

```bash
# 方案 A：等待数据库就绪后重启 backend
docker compose restart backend

# 方案 B：检查 postgres 是否正常运行
docker compose logs postgres
# 正常情况应看到：
#   database system is ready to accept connections

# 方案 C：检查 postgres 的健康检查状态
docker compose ps
# 确认 postgres 的 STATUS 列显示 "healthy"

# 方案 D：在 docker-compose.yml 中配置等待
# backend 的 depends_on 已配置：
#   condition: service_healthy
# 但如果 postgres 健康检查失败，backend 会一直等待
# 可以增加 postgres 的 start_period 时间

# 方案 E：进入 postgres 容器手动检查
docker compose exec postgres psql -U app_user -d app_db
# 如果能连接成功，说明数据库正常
```

## 故障 2：Nginx 502 Bad Gateway

**现象**：访问 `http://localhost/` 或 `http://localhost/api/health` 返回 502 错误。

**错误日志**：
```
docker compose logs nginx
```
输出：
```
[error] ... upstream timed out (110: Connection timed out) while connecting to upstream
```
或：
```
[error] ... connect() failed (111: Connection refused) while connecting to upstream
```

**原因**：

1. `backend` 或 `frontend` 服务未启动
2. Nginx `proxy_pass` 地址配置错误（如使用了 `localhost` 而非服务名）
3. 服务端口配置不一致

**解决方案**：

```bash
# 1. 确认所有服务都在运行
docker compose ps

# 2. 查看 Nginx 日志定位错误
docker compose logs nginx

# 3. 检查后端是否正常
curl -s http://backend:3000/api/health
# 或者在容器内测试
docker compose exec nginx sh
# 在 Nginx 容器内：
apk add curl
curl http://backend:3000/api/health
curl http://frontend:80/

# 4. 检查 proxy_pass 地址
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep proxy_pass
# 必须使用服务名：proxy_pass http://backend:3000/;
# 不能使用 localhost！

# 5. 重启 Nginx
docker compose restart nginx
```

## 故障 3：前端 API 请求 404

**现象**：前端页面正常加载，但调用 API 时（如获取用户列表）返回 404。

**浏览器控制台错误**：
```
GET http://localhost/api/users 404 (Not Found)
```

**原因**：

1. Nginx 反向代理路径配置不正确（location `/api/` 和 `proxy_pass` 末尾的 `/` 匹配问题）
2. 前端请求的 baseURL 不正确

**解决方案**：

```bash
# 1. 直接测试 API 是否正常
curl http://localhost/api/users
# 如果也返回 404，说明 Nginx 反向代理配置有问题

# 2. 检查 Nginx 配置中的 proxy_pass
# nginx.conf 中：
# location /api/ {
#     proxy_pass http://backend:3000/;
# }
# 注意：proxy_pass 末尾的 / 会去除 /api/ 前缀
# /api/health → http://backend:3000/health

# 3. 如果 proxy_pass 末尾没有 /
# location /api/ {
#     proxy_pass http://backend:3000;
# }
# /api/health → http://backend:3000/api/health
# 两种都可以，但必须保持前端请求路径和 Nginx 配置一致

# 4. 前端请求 baseURL
# 本项目的 Vue 前端直接使用 /api/ 路径（fetch('/api/users')）
# 不需要设置 baseURL，因为 Nginx 会处理路径转发

# 5. 测试后端容器内部（绕过 Nginx）
docker compose exec backend wget -qO- http://localhost:3000/api/users
# 如果这个正常，说明问题在 Nginx 配置
```

## 故障 4：环境变量未生效

**现象**：服务启动后读取不到环境变量（如数据库连接失败但并不是因为服务未就绪）。

**原因**：

1. `.env` 文件不在正确位置或未被 `env_file` 引入
2. Dockerfile 中硬编码了环境变量，覆盖了 Compose 中的值
3. 环境变量名拼写错误

**解决方案**：

```bash
# 1. 检查环境变量是否传入容器
docker compose exec backend env | grep -E "NODE_ENV|DATABASE_URL|PORT"

# 2. 检查 docker-compose.yml 中 env_file 配置
# backend:
#   env_file:
#     - .env.prod

# 3. 检查 .env.prod 文件是否存在且格式正确
# 格式：KEY=VALUE （等号两边不要有空格）
# 如果值包含特殊字符，用引号包裹：KEY="value with spaces"

# 4. 检查 Dockerfile 是否覆盖了环境变量
# Dockerfile 中的 ENV 指令优先级高于 Compose 的 environment
# 如果 Dockerfile 中有：
#   ENV NODE_ENV=production
# 那么 Compose 的 environment: NODE_ENV=development 不会生效！
# 解决方案：不要在 Dockerfile 中设置会被覆盖的变量
# Dockerfile 只设置默认值，Compose 覆盖

# 5. 直接进入容器查看
docker compose exec backend sh
echo $DATABASE_URL
echo $NODE_ENV
exit
```
