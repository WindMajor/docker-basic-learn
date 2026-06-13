// server.js - 第8关：演示信号处理的 API 服务
//
// 本文件演示正确的优雅关闭流程
// docker stop → SIGTERM → 停止接受新请求 → 等待现有请求完成 → 关闭连接 → 退出
//
// 对比 zombie-test.js（演示僵尸进程问题）

const fastify = require('fastify')({
  logger: true,
  // 设置合理的连接超时
  pluginTimeout: 10000,
});

const PORT = process.env.PORT || 3000;

// ===== 模拟正在处理的请求（用于演示优雅关闭等待） =====
let activeRequests = 0;
let isShuttingDown = false;

// 请求计数器中间件
fastify.addHook('onRequest', async () => {
  if (isShuttingDown) {
    throw new Error('Server is shutting down');
  }
  activeRequests++;
});

fastify.addHook('onResponse', async () => {
  activeRequests--;
});

// GET /health - 健康检查
fastify.get('/health', async () => ({
  status: isShuttingDown ? 'shutting_down' : 'ok',
  activeRequests,
  timestamp: new Date().toISOString(),
  message: '第8关：信号处理',
}));

// GET /slow - 模拟慢请求（耗时 5 秒），用于观察优雅关闭行为
fastify.get('/slow', async () => {
  if (isShuttingDown) {
    return { error: 'Server is shutting down, request rejected' };
  }
  console.log('慢请求开始处理...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('慢请求处理完成');
  return { message: '慢请求完成', elapsed: '5s' };
});

// GET /spawn - 演示子进程（用于和 zombie-test.js 对比）
fastify.get('/spawn', async () => {
  const { execSync } = require('child_process');
  const result = execSync('echo "子进程正常结束"').toString().trim();
  return { message: result };
});

// GET / - 根路径
fastify.get('/', async () => ({
  message: 'Docker 第8关运行成功！',
  endpoints: {
    health: '/health',
    slow: '/slow',
    spawn: '/spawn',
  },
}));

// ===== 优雅关闭（Graceful Shutdown） =====
//
// 这是本关的核心知识点
// 当收到 docker stop 时，容器内的 PID 1 收到 SIGTERM
// Node.js 的 process.on('SIGTERM') 可以捕获并执行清理

async function gracefulShutdown(signal) {
  console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
  isShuttingDown = true;

  // 步骤 1：停止接受新请求（isShuttingDown 标志已生效）

  // 步骤 2：等待现有请求完成（最多等 25 秒）
  console.log(`等待 ${activeRequests} 个活跃请求完成...`);
  const deadline = Date.now() + 25000;
  while (activeRequests > 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (activeRequests > 0) {
    console.log(`超时，强制关闭（剩余 ${activeRequests} 个请求）`);
  } else {
    console.log('所有请求已完成');
  }

  // 步骤 3：关闭 HTTP 服务器
  try {
    await fastify.close();
    console.log('Fastify 服务器已关闭');
  } catch (err) {
    console.error('关闭服务器时出错:', err.message);
  }

  // 步骤 4：清理其他资源（数据库连接、消息队列等）
  // pool.end()、redis.quit()、mq.close() ...

  console.log('优雅关闭完成，退出进程');
  process.exit(0);
}

// 注册信号处理器
// SIGTERM：docker stop 发出的信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SIGINT：Ctrl+C 发出的信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 如果没有正确实现优雅关闭：
//   docker stop → SIGTERM → 进程不处理 → 等 10 秒 → SIGKILL 强杀
//   → 正在处理的请求丢失 → 数据库连接未关闭 → 可能导致数据不一致

// 启动服务
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
    console.log(`PID: ${process.pid}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
