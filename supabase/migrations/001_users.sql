-- =====================================================
-- 001_users.sql - 用户表扩展
-- =====================================================
-- 基于 NextAuth.js 的用户表，扩展商业化字段
-- =====================================================

-- 用户表（扩展 NextAuth 默认结构）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基础信息（NextAuth 兼容）
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,

  -- 认证信息
  password_hash TEXT,  -- 邮箱密码登录用
  provider VARCHAR(50) DEFAULT 'credentials',  -- 'credentials' | 'github' | 'google'
  provider_account_id VARCHAR(255),  -- OAuth 账号 ID

  -- 商业化字段
  subscription VARCHAR(20) DEFAULT 'free' CHECK (subscription IN ('free', 'pro', 'enterprise')),
  subscription_expires_at TIMESTAMPTZ,

  -- 配额信息
  monthly_ai_quota INTEGER DEFAULT 100,  -- 每月 AI 调用配额
  monthly_ai_used INTEGER DEFAULT 0,     -- 本月已使用
  quota_reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month'),

  -- 存储配额 (MB)
  storage_quota INTEGER DEFAULT 100,     -- 存储配额 MB
  storage_used INTEGER DEFAULT 0,        -- 已使用 MB

  -- 用户设置
  settings JSONB DEFAULT '{}',

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NextAuth.js 兼容表
-- =====================================================

-- 账户表（OAuth 账户关联）
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- 验证令牌表（邮箱验证、密码重置等）
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (identifier, token)
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- 账户关联：用户只能访问自己的
CREATE POLICY accounts_select_own ON accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY accounts_insert_own ON accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY accounts_delete_own ON accounts
  FOR DELETE USING (user_id = auth.uid());

-- 会话：用户只能访问自己的
CREATE POLICY sessions_select_own ON sessions
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 辅助函数
-- =====================================================

-- 检查用户配额
CREATE OR REPLACE FUNCTION check_user_quota(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT monthly_ai_quota, monthly_ai_used, quota_reset_at
  INTO user_record
  FROM users
  WHERE id = user_id;

  -- 检查是否需要重置配额
  IF user_record.quota_reset_at <= now() THEN
    UPDATE users
    SET monthly_ai_used = 0,
        quota_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_id;
    RETURN TRUE;
  END IF;

  RETURN user_record.monthly_ai_used < user_record.monthly_ai_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加 AI 使用次数
CREATE OR REPLACE FUNCTION increment_ai_usage(user_id UUID, amount INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET monthly_ai_used = monthly_ai_used + amount
  WHERE id = user_id
    AND monthly_ai_used + amount <= monthly_ai_quota;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取订阅配额限制
CREATE OR REPLACE FUNCTION get_subscription_limits(sub_type VARCHAR)
RETURNS TABLE (
  ai_quota INTEGER,
  storage_quota INTEGER,
  max_documents INTEGER,
  max_collaborators INTEGER
) AS $$
BEGIN
  CASE sub_type
    WHEN 'free' THEN
      RETURN QUERY SELECT 100, 100, 50, 0;
    WHEN 'pro' THEN
      RETURN QUERY SELECT 1000, 1000, 500, 5;
    WHEN 'enterprise' THEN
      RETURN QUERY SELECT 999999, 10000, 99999, 100;
    ELSE
      RETURN QUERY SELECT 100, 100, 50, 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;
