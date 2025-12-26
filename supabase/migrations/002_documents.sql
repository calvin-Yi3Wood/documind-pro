-- =====================================================
-- 002_documents.sql - 文档表
-- =====================================================
-- 支持版本控制、协作者、权限管理
-- =====================================================

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B5A42',  -- Bronze 色系
  icon VARCHAR(50) DEFAULT 'folder',

  -- 排序
  sort_order INTEGER DEFAULT 0,

  -- 审计
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- 文档表
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

  -- 基本信息
  title VARCHAR(500) NOT NULL DEFAULT '无标题文档',
  content TEXT DEFAULT '',
  type VARCHAR(50) DEFAULT 'markdown' CHECK (type IN ('markdown', 'ppt', 'doc', 'sheet', 'canvas')),

  -- 版本控制
  version INTEGER DEFAULT 1,
  version_history JSONB DEFAULT '[]',  -- 保存最近10个版本

  -- 协作
  is_shared BOOLEAN DEFAULT false,
  share_link VARCHAR(100) UNIQUE,
  share_permission VARCHAR(20) DEFAULT 'view' CHECK (share_permission IN ('view', 'comment', 'edit')),

  -- 同步状态
  sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  local_hash VARCHAR(64),  -- 本地内容哈希，用于冲突检测

  -- 文档统计
  word_count INTEGER DEFAULT 0,
  char_count INTEGER DEFAULT 0,

  -- 标签和分类
  tags TEXT[] DEFAULT '{}',

  -- AI 相关
  ai_summary TEXT,
  ai_keywords TEXT[],

  -- 排序和置顶
  is_pinned BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- 审计
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),

  -- 软删除
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- 元数据（存储额外配置，如PPT主题等）
  metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_share_link ON documents(share_link) WHERE share_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_not_deleted ON documents(user_id) WHERE NOT is_deleted;

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents
  USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));

-- 更新时间触发器
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 文档协作者表
-- =====================================================

CREATE TABLE IF NOT EXISTS document_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 权限
  permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit', 'admin')),

  -- 邀请信息
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,

  -- 状态
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),

  UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_document ON document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON document_collaborators(user_id);

-- =====================================================
-- 文档版本历史表（完整版本）
-- =====================================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  title VARCHAR(500),

  -- 变更信息
  changed_by UUID REFERENCES users(id),
  change_summary TEXT,

  -- 内容统计
  word_count INTEGER DEFAULT 0,
  char_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON document_versions(created_at);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- 文件夹：用户只能访问自己的
CREATE POLICY folders_select_own ON folders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY folders_insert_own ON folders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY folders_update_own ON folders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY folders_delete_own ON folders
  FOR DELETE USING (user_id = auth.uid());

-- 文档：自己的 + 被邀请协作的
CREATE POLICY documents_select_own_or_shared ON documents
  FOR SELECT USING (
    user_id = auth.uid()
    OR id IN (
      SELECT document_id FROM document_collaborators
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    OR (is_shared = true AND share_link IS NOT NULL)
  );

CREATE POLICY documents_insert_own ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY documents_update_own_or_collab ON documents
  FOR UPDATE USING (
    user_id = auth.uid()
    OR id IN (
      SELECT document_id FROM document_collaborators
      WHERE user_id = auth.uid()
        AND status = 'accepted'
        AND permission IN ('edit', 'admin')
    )
  );

CREATE POLICY documents_delete_own ON documents
  FOR DELETE USING (user_id = auth.uid());

-- 协作者：文档拥有者可管理
CREATE POLICY collaborators_select ON document_collaborators
  FOR SELECT USING (
    user_id = auth.uid()
    OR document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY collaborators_insert ON document_collaborators
  FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY collaborators_update ON document_collaborators
  FOR UPDATE USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY collaborators_delete ON document_collaborators
  FOR DELETE USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

-- =====================================================
-- 辅助函数
-- =====================================================

-- 生成分享链接
CREATE OR REPLACE FUNCTION generate_share_link()
RETURNS VARCHAR(100) AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(100) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 保存文档版本
CREATE OR REPLACE FUNCTION save_document_version()
RETURNS TRIGGER AS $$
BEGIN
  -- 只在内容变化时保存版本
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO document_versions (document_id, version, content, title, changed_by, word_count, char_count)
    VALUES (NEW.id, NEW.version, OLD.content, OLD.title, auth.uid(), OLD.word_count, OLD.char_count);

    -- 增加版本号
    NEW.version := OLD.version + 1;

    -- 只保留最近 50 个版本
    DELETE FROM document_versions
    WHERE document_id = NEW.id
      AND id NOT IN (
        SELECT id FROM document_versions
        WHERE document_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 50
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER save_document_version_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION save_document_version();

-- 更新文档统计
CREATE OR REPLACE FUNCTION update_document_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 简单的字符统计（实际统计在应用层完成）
  NEW.char_count := length(NEW.content);
  NEW.word_count := array_length(regexp_split_to_array(NEW.content, '\s+'), 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_stats_trigger
  BEFORE INSERT OR UPDATE OF content ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_stats();
