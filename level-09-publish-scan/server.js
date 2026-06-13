// server.js - 第9关：用于演示镜像发布流程的简洁 API

const fastify = require('fastify')({ logger: true });

const PORT = process.env.PORT || 3000;

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  message: '第9关：镜像发布',
}));

fastify.get('/', async () => ({
  message: '第9关运行成功！',
}));

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
