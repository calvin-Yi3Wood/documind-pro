-- =====================================================
-- 003_usage.sql - 使用量记录表
-- =====================================================
-- 记录 AI 调用、存储使用等，用于配额计算和计费
-- =====================================================

-- AI 使用记录表
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 请求信息
  skill_name VARCHAR(100),  -- 使用的 Skill
  model VARCHAR(100),       -- AI 模型 (gemini-2.0-flash, deepseek-chat 等)
  provider VARCHAR(50),     -- 提供商 (google, deepseek 等)

  -- 请求类型
  request_type VARCHAR(50) CHECK (request_type IN (
    'chat', 'completion', 'image_generation', 'image_edit',
    'summarize', 'translate', 'analyze', 'search', 'other'
  )),

  -- Token 使用（用于精确计费）
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- 图片生成特有
  image_count INTEGER DEFAULT 0,
  image_resolution VARCHAR(20),

  -- 计费单位（1次调用 = 1单位，图片可能多单位）
  usage_units INTEGER DEFAULT 1,

  -- 响应信息
  response_status VARCHAR(20) DEFAULT 'success' CHECK (response_status IN ('success', 'error', 'timeout', 'rate_limited')),
  response_time_ms INTEGER,  -- 响应时间毫秒
  error_message TEXT,

  -- 请求元数据
  request_metadata JSONB DEFAULT '{}',

  -- 时间
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_skill ON ai_usage_logs(skill_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_usage_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly ON ai_usage_logs(user_id, date_trunc('month', created_at));

-- 存储使用记录表
CREATE TABLE IF NOT EXISTS storage_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 操作类型
  operation VARCHAR(20) CHECK (operation IN ('upload', 'delete', 'update')),

  -- 文件信息
  file_name VARCHAR(500),
  file_type VARCHAR(100),
  file_size_bytes BIGINT,

  -- 关联
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- 存储路径
  storage_path TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_usage_user ON storage_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_date ON storage_usage_logs(created_at);

-- =====================================================
-- 配额使用汇总视图（月度）
-- =====================================================

CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT
  user_id,
  date_trunc('month', created_at) AS month,
  COUNT(*) AS total_requests,
  SUM(usage_units) AS total_units,
  SUM(CASE WHEN request_type = 'chat' THEN usage_units ELSE 0 END) AS chat_units,
  SUM(CASE WHEN request_type = 'image_generation' THEN usage_units ELSE 0 END) AS image_units,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  AVG(response_time_ms) AS avg_response_time,
  SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate
FROM ai_usage_logs
GROUP BY user_id, date_trunc('month', created_at);

-- =====================================================
-- 每日使用汇总视图
-- =====================================================

CREATE OR REPLACE VIEW daily_usage_summary AS
SELECT
  user_id,
  date_trunc('day', created_at) AS day,
  COUNT(*) AS total_requests,
  SUM(usage_units) AS total_units,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens
FROM ai_usage_logs
GROUP BY user_id, date_trunc('day', created_at);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的使用记录
CREATE POLICY ai_usage_select_own ON ai_usage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY storage_usage_select_own ON storage_usage_logs
  FOR SELECT USING (user_id = auth.uid());

-- 插入由服务端执行（使用 Service Role Key）
-- 不创建用户端插入策略，防止伪造

-- =====================================================
-- 辅助函数
-- =====================================================

-- 记录 AI 使用
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_skill_name VARCHAR,
  p_model VARCHAR,
  p_provider VARCHAR,
  p_request_type VARCHAR,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_usage_units INTEGER DEFAULT 1,
  p_response_status VARCHAR DEFAULT 'success',
  p_response_time_ms INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO ai_usage_logs (
    user_id, skill_name, model, provider, request_type,
    input_tokens, output_tokens, usage_units,
    response_status, response_time_ms, error_message, request_metadata
  )
  VALUES (
    p_user_id, p_skill_name, p_model, p_provider, p_request_type,
    p_input_tokens, p_output_tokens, p_usage_units,
    p_response_status, p_response_time_ms, p_error_message, p_metadata
  )
  RETURNING id INTO log_id;

  -- 更新用户的月度使用量
  IF p_response_status = 'success' THEN
    UPDATE users
    SET monthly_ai_used = monthly_ai_used + p_usage_units
    WHERE id = p_user_id;
  END IF;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户本月使用统计
CREATE OR REPLACE FUNCTION get_user_monthly_stats(p_user_id UUID)
RETURNS TABLE (
  total_requests BIGINT,
  total_units BIGINT,
  chat_requests BIGINT,
  image_requests BIGINT,
  total_tokens BIGINT,
  avg_response_time NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(usage_units), 0)::BIGINT,
    SUM(CASE WHEN request_type = 'chat' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN request_type = 'image_generation' THEN 1 ELSE 0 END)::BIGINT,
    COALESCE(SUM(input_tokens + output_tokens), 0)::BIGINT,
    COALESCE(AVG(response_time_ms), 0)::NUMERIC,
    CASE
      WHEN COUNT(*) > 0 THEN
        (SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC)
      ELSE 1.0
    END
  FROM ai_usage_logs
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查并重置配额（每月自动）
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    monthly_ai_used = 0,
    quota_reset_at = date_trunc('month', now()) + interval '1 month'
  WHERE quota_reset_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
