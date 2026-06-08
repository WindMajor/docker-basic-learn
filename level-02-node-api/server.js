// server.js - 第2关：简单的 Fastify API 服务
// 提供 /health 和 /env 两个端点

const fastify = require('fastify')({ logger: true });

// 服务端口：优先使用环境变量 PORT，否则默认 3000
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// GET /health - 健康检查端点
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// GET /env - 返回 NODE_ENV 环境变量值
fastify.get('/env', async (request, reply) => {
  return {
    NODE_ENV: NODE_ENV,
    PORT: PORT,
    hostname: require('os').hostname()
  };
});

// GET / - 根路径
fastify.get('/', async (request, reply) => {
  return {
    message: 'Docker 第2关运行成功！',
    endpoints: {
      health: '/health',
      env: '/env'
    }
  };
});

// 启动服务
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
