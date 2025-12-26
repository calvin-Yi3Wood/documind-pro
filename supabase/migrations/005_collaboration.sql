-- =============================================
-- DocuMind Pro - 协同编辑数据库迁移
--
-- 包含：
-- 1. collaboration_sessions - 协作会话表
-- 2. document_versions - 文档版本表
--
-- 创建时间: 2025-12-26
-- =============================================

-- ==================== 协作会话表 ====================

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 会话状态
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'disconnected')),

  -- 光标和选区（JSON）
  cursor_position JSONB,
  selection_range JSONB,

  -- 用户显示颜色
  user_color TEXT NOT NULL DEFAULT '#F97316',

  -- 时间戳
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  -- 确保每个用户在每个文档只有一个活跃会话
  UNIQUE(document_id, user_id)
);

-- 索引
CREATE INDEX idx_collaboration_sessions_document_id ON collaboration_sessions(document_id);
CREATE INDEX idx_collaboration_sessions_user_id ON collaboration_sessions(user_id);
CREATE INDEX idx_collaboration_sessions_status ON collaboration_sessions(status);
CREATE INDEX idx_collaboration_sessions_last_active ON collaboration_sessions(last_active_at DESC);

-- 启用 RLS
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能看到自己参与的文档的会话
CREATE POLICY "Users can view sessions for accessible documents"
  ON collaboration_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = collaboration_sessions.document_id
      AND (
        d.owner_id = auth.uid()
        OR d.is_public = true
        OR EXISTS (
          SELECT 1 FROM document_collaborators dc
          WHERE dc.document_id = d.id
          AND dc.user_id = auth.uid()
        )
      )
    )
  );

-- RLS 策略：用户只能管理自己的会话
CREATE POLICY "Users can manage own sessions"
  ON collaboration_sessions
  FOR ALL
  USING (user_id = auth.uid());


-- ==================== 文档版本表 ====================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- 版本信息
  version INTEGER NOT NULL,

  -- Yjs 文档快照（二进制）
  snapshot BYTEA NOT NULL,

  -- 增量更新（可选，用于优化）
  updates BYTEA,

  -- 元数据
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,

  -- 是否为自动保存
  is_auto_save BOOLEAN NOT NULL DEFAULT false,

  -- 数据大小（字节）
  size_bytes INTEGER NOT NULL DEFAULT 0,

  -- 确保每个文档的版本号唯一
  UNIQUE(document_id, version)
);

-- 索引
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);
CREATE INDEX idx_document_versions_version ON document_versions(document_id, version DESC);

-- 启用 RLS
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己有权访问的文档的版本
CREATE POLICY "Users can view versions for accessible documents"
  ON document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
      AND (
        d.owner_id = auth.uid()
        OR d.is_public = true
        OR EXISTS (
          SELECT 1 FROM document_collaborators dc
          WHERE dc.document_id = d.id
          AND dc.user_id = auth.uid()
        )
      )
    )
  );

-- RLS 策略：只有文档所有者和编辑者可以创建版本
CREATE POLICY "Editors can create versions"
  ON document_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
      AND (
        d.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM document_collaborators dc
          WHERE dc.document_id = d.id
          AND dc.user_id = auth.uid()
          AND dc.role IN ('owner', 'editor')
        )
      )
    )
  );


-- ==================== 辅助函数 ====================

-- 函数：清理过期会话（超过24小时未活跃的会话）
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM collaboration_sessions
    WHERE status = 'disconnected'
      AND disconnected_at < NOW() - INTERVAL '24 hours'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- 将长时间未活跃的会话标记为断开
  UPDATE collaboration_sessions
  SET status = 'disconnected',
      disconnected_at = NOW()
  WHERE status IN ('active', 'idle')
    AND last_active_at < NOW() - INTERVAL '1 hour';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：获取文档的下一个版本号
CREATE OR REPLACE FUNCTION get_next_version_number(doc_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM document_versions
  WHERE document_id = doc_id;

  RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================== 注释 ====================

COMMENT ON TABLE collaboration_sessions IS '协同编辑会话表，记录用户在文档中的实时协作状态';
COMMENT ON TABLE document_versions IS '文档版本历史表，存储 Yjs 快照用于版本控制';
COMMENT ON FUNCTION cleanup_stale_sessions IS '清理过期的协作会话，返回删除的记录数';
COMMENT ON FUNCTION get_next_version_number IS '获取指定文档的下一个版本号';
