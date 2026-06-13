// server.js - 第6关：用于演示资源限制与安全运行的 API
// 提供 /health、/stress 端点

const fastify = require('fastify')({ logger: true });

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// GET /health - 健康检查
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    // 展示当前进程的用户 ID（应非 root）
    uid: process.getuid(),
    gid: process.getgid(),
    message: '第6关：安全容器运行成功',
  };
});

// GET /stress?size=10 - 模拟 CPU 密集任务（用于观察资源限制效果）
// size 参数控制计算量（单位 MB），默认 10MB
fastify.get('/stress', async (request, reply) => {
  const size = parseInt(request.query.size) || 10;
  // 创建大数组模拟内存和 CPU 消耗
  const arr = new Array(size * 1024).fill(0);
  // 做一些 CPU 密集计算
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += Math.sqrt(i);
  }
  return {
    message: '计算完成',
    elements: arr.length,
    sum: sum.toFixed(2),
    timestamp: new Date().toISOString(),
  };
});

// GET / - 根路径
fastify.get('/', async (request, reply) => {
  return {
    message: 'Docker 第6关运行成功！',
    security: {
      nonRoot: '✅ 非 root 用户运行',
      minimalCap: '✅ 最小 Capability',
      readOnly: '⚠️  运行时通过参数启用',
    },
    endpoints: {
      health: '/health',
      stress: '/stress?size=10',
    },
  };
});

// 启动服务
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`Running as uid=${process.getuid()}, gid=${process.getgid()}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
