-- =====================================================
-- 004_knowledge_sources.sql - 知识库资料表
-- =====================================================
-- 用户上传的资料库，支持 PDF、URL、文本等
-- =====================================================

-- 知识库表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 基本信息
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- 设置
  is_default BOOLEAN DEFAULT false,  -- 是否为默认知识库

  -- 统计
  source_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,

  -- 审计
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_kb_user_id ON knowledge_bases(user_id);

-- 知识源表
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(500) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('pdf', 'url', 'text', 'file', 'youtube', 'notion', 'github')),

  -- 来源信息
  source_url TEXT,           -- URL 类型的原始链接
  file_path TEXT,            -- 文件存储路径（Supabase Storage）
  file_name VARCHAR(500),    -- 原始文件名
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),

  -- 内容
  content TEXT,              -- 提取的文本内容（用于搜索）
  summary TEXT,              -- AI 生成的摘要

  -- 处理状态
  process_status VARCHAR(20) DEFAULT 'pending' CHECK (process_status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  process_error TEXT,
  processed_at TIMESTAMPTZ,

  -- 向量嵌入（用于语义搜索）
  -- 注意：实际的向量存储可能使用 Supabase Vector 或外部服务
  embedding_status VARCHAR(20) DEFAULT 'pending' CHECK (embedding_status IN (
    'pending', 'processing', 'completed', 'failed', 'skipped'
  )),
  chunk_count INTEGER DEFAULT 0,  -- 分块数量

  -- 引用统计
  reference_count INTEGER DEFAULT 0,  -- 被引用次数
  last_referenced_at TIMESTAMPTZ,

  -- 标签
  tags TEXT[] DEFAULT '{}',

  -- 审计
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 软删除
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ks_user_id ON knowledge_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_ks_kb_id ON knowledge_sources(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_ks_type ON knowledge_sources(type);
CREATE INDEX IF NOT EXISTS idx_ks_status ON knowledge_sources(process_status);
CREATE INDEX IF NOT EXISTS idx_ks_tags ON knowledge_sources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ks_not_deleted ON knowledge_sources(user_id) WHERE NOT is_deleted;

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_ks_fts ON knowledge_sources
  USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));

-- 更新时间触发器
CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 知识块表（用于向量搜索）
-- =====================================================

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 块内容
  chunk_index INTEGER NOT NULL,      -- 块序号
  content TEXT NOT NULL,             -- 块内容

  -- 位置信息
  start_char INTEGER,                -- 在原文中的起始位置
  end_char INTEGER,                  -- 在原文中的结束位置

  -- 向量嵌入（如果使用 pgvector）
  -- embedding vector(1536),         -- OpenAI ada-002 维度
  -- embedding vector(768),          -- 其他模型维度

  -- 元数据
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user ON knowledge_chunks(user_id);

-- =====================================================
-- 引用记录表
-- =====================================================

CREATE TABLE IF NOT EXISTS source_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 引用上下文
  context_type VARCHAR(50) CHECK (context_type IN ('chat', 'document', 'search')),
  context_text TEXT,           -- 引用时的相关文本

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refs_source ON source_references(source_id);
CREATE INDEX IF NOT EXISTS idx_refs_document ON source_references(document_id);

-- 更新引用计数触发器
CREATE OR REPLACE FUNCTION update_reference_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE knowledge_sources
    SET reference_count = reference_count + 1,
        last_referenced_at = now()
    WHERE id = NEW.source_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE knowledge_sources
    SET reference_count = GREATEST(reference_count - 1, 0)
    WHERE id = OLD.source_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_source_reference_count
  AFTER INSERT OR DELETE ON source_references
  FOR EACH ROW
  EXECUTE FUNCTION update_reference_count();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_references ENABLE ROW LEVEL SECURITY;

-- 知识库：用户只能访问自己的
CREATE POLICY kb_select_own ON knowledge_bases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY kb_insert_own ON knowledge_bases
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY kb_update_own ON knowledge_bases
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY kb_delete_own ON knowledge_bases
  FOR DELETE USING (user_id = auth.uid());

-- 知识源：用户只能访问自己的
CREATE POLICY ks_select_own ON knowledge_sources
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ks_insert_own ON knowledge_sources
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY ks_update_own ON knowledge_sources
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY ks_delete_own ON knowledge_sources
  FOR DELETE USING (user_id = auth.uid());

-- 知识块：用户只能访问自己的
CREATE POLICY chunks_select_own ON knowledge_chunks
  FOR SELECT USING (user_id = auth.uid());

-- 引用记录：用户只能访问自己的
CREATE POLICY refs_select_own ON source_references
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY refs_insert_own ON source_references
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 辅助函数
-- =====================================================

-- 更新知识库统计
CREATE OR REPLACE FUNCTION update_knowledge_base_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE knowledge_bases
    SET source_count = source_count + 1,
        total_size_bytes = total_size_bytes + COALESCE(NEW.file_size_bytes, 0)
    WHERE id = NEW.knowledge_base_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE knowledge_bases
    SET source_count = GREATEST(source_count - 1, 0),
        total_size_bytes = GREATEST(total_size_bytes - COALESCE(OLD.file_size_bytes, 0), 0)
    WHERE id = OLD.knowledge_base_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.knowledge_base_id IS DISTINCT FROM NEW.knowledge_base_id THEN
    -- 移动到不同知识库
    UPDATE knowledge_bases
    SET source_count = GREATEST(source_count - 1, 0),
        total_size_bytes = GREATEST(total_size_bytes - COALESCE(OLD.file_size_bytes, 0), 0)
    WHERE id = OLD.knowledge_base_id;

    UPDATE knowledge_bases
    SET source_count = source_count + 1,
        total_size_bytes = total_size_bytes + COALESCE(NEW.file_size_bytes, 0)
    WHERE id = NEW.knowledge_base_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_stats();

-- 搜索知识源
CREATE OR REPLACE FUNCTION search_knowledge_sources(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  type VARCHAR,
  summary TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ks.id,
    ks.title,
    ks.type,
    ks.summary,
    ts_rank(
      to_tsvector('simple', coalesce(ks.title, '') || ' ' || coalesce(ks.content, '')),
      plainto_tsquery('simple', p_query)
    ) AS relevance
  FROM knowledge_sources ks
  WHERE ks.user_id = p_user_id
    AND NOT ks.is_deleted
    AND ks.process_status = 'completed'
    AND (
      to_tsvector('simple', coalesce(ks.title, '') || ' ' || coalesce(ks.content, ''))
      @@ plainto_tsquery('simple', p_query)
    )
  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
