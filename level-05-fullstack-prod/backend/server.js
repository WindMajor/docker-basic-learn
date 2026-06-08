// backend/server.js - 第5关：Node.js API 服务，连接 Postgres 数据库

const fastify = require('fastify')({ logger: true });

// 从环境变量读取配置（通过 docker-compose 注入）
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://app_user:app_pass@postgres:5432/app_db';

// 动态导入 pg（CJS 兼容）
const { Pool } = require('pg');

// 创建数据库连接池
const pool = new Pool({
  connectionString: DATABASE_URL,
  // 连接池配置
  max: 10,                // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时（毫秒）
  connectionTimeoutMillis: 5000, // 连接超时
});

// 测试数据库连接
pool.on('error', (err) => {
  fastify.log.error('数据库连接池错误:', err.message);
});

// ========== API 路由 ==========

// GET /api/health - 健康检查
fastify.get('/api/health', async (request, reply) => {
  let dbConnected = false;
  try {
    const client = await pool.connect();
    dbConnected = true;
    client.release();
  } catch (e) {
    // 数据库可能还没准备好
  }
  return {
    status: 'ok',
    service: 'backend',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// GET /api/users - 获取用户列表
fastify.get('/api/users', async (request, reply) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    return { success: true, data: result.rows };
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ success: false, error: '数据库查询失败', detail: err.message });
  }
});

// POST /api/users - 创建用户
fastify.post('/api/users', async (request, reply) => {
  const { name, email } = request.body || {};
  if (!name || !email) {
    return reply.code(400).send({ success: false, error: 'name 和 email 必填' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return reply.code(201).send({ success: true, data: result.rows[0] });
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ success: false, error: '创建用户失败', detail: err.message });
  }
});

// GET /api/version - 应用版本信息
fastify.get('/api/version', async () => ({
  version: '1.0.0',
  node: process.version,
  environment: process.env.NODE_ENV
}));

// 启动服务
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Backend API 启动成功，端口: ${PORT}`);
    console.log(`数据库连接: ${DATABASE_URL.replace(/\/\/.*@/, '//****:****@')}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
