-- postgres/init.sql - 第5关：PostgreSQL 初始化脚本
-- 该脚本在 PostgreSQL 容器首次启动时执行
-- 用于创建表结构和初始数据

-- 如果表已存在则删除（便于重复测试）
DROP TABLE IF EXISTS users;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,          -- 自增主键
    name        VARCHAR(100) NOT NULL,       -- 用户名
    email       VARCHAR(255) UNIQUE NOT NULL, -- 邮箱（唯一）
    created_at  TIMESTAMP DEFAULT NOW()      -- 创建时间
);

-- 插入测试数据
INSERT INTO users (name, email) VALUES
    ('管理员', 'admin@example.com'),
    ('测试用户', 'test@example.com');

-- 创建索引（可选，用于加速查询）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
