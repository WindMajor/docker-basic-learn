// server.js - 第3关：Express + Redis 缓存 API
// 演示 Docker Compose 环境下的服务间通信

const express = require('express');
const Redis = require('ioredis');

const app = express();
const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// 创建 Redis 客户端，连接地址使用服务名 redis
// 在 Docker Compose 网络中，服务名即主机名
const redis = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  retryStrategy: (times) => {
    // 重试策略：首次等待 1 秒，后续每次加倍，最多 30 秒
    const delay = Math.min(times * 1000, 30000);
    console.log(`Redis 连接重试 #${times}，等待 ${delay}ms...`);
    return delay;
  }
});

// 监听 Redis 连接事件
redis.on('connect', () => console.log(`已连接到 Redis: ${REDIS_HOST}:${REDIS_PORT}`));
redis.on('error', (err) => console.error('Redis 连接错误:', err.message));

// GET /health - 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    redis_host: REDIS_HOST,
    redis_connected: redis.status === 'ready',
    timestamp: new Date().toISOString()
  });
});

// GET /set/:key/:value - 写入 Redis
app.get('/set/:key/:value', async (req, res) => {
  try {
    await redis.set(req.params.key, req.params.value);
    res.json({ success: true, key: req.params.key, value: req.params.value });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /get/:key - 读取 Redis
app.get('/get/:key', async (req, res) => {
  try {
    const value = await redis.get(req.params.key);
    if (value === null) {
      res.json({ success: true, key: req.params.key, value: null, message: '键不存在' });
    } else {
      res.json({ success: true, key: req.params.key, value });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /cache - 使用 Redis 做缓存演示：每次返回不同的计数
app.get('/cache', async (req, res) => {
  try {
    const count = await redis.incr('page_views');
    res.json({
      message: 'Docker 第3关运行成功！',
      page_views: count,
      cached_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API 服务已启动，端口: ${PORT}`);
  console.log(`Redis 地址: ${REDIS_HOST}:${REDIS_PORT}`);
});
