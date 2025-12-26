# DocuMind Pro 协同编辑架构设计

## 1. 概述

本文档描述 DocuMind Pro 协同编辑功能的技术选型和架构设计。

### 1.1 核心需求

- **实时协作**：多用户同时编辑同一文档
- **冲突解决**：自动处理并发编辑冲突
- **离线支持**：断网时可继续编辑，恢复后自动同步
- **光标感知**：显示其他用户的光标位置
- **版本历史**：保存编辑历史，支持回滚

### 1.2 非功能需求

- 延迟 < 100ms（同区域用户）
- 支持 50+ 并发用户/文档
- 数据一致性保证
- 可扩展架构

---

## 2. 技术选型分析

### 2.1 候选方案对比

| 特性 | Yjs | Automerge | 自研 OT |
|------|-----|-----------|---------|
| **算法** | CRDT | CRDT | OT |
| **成熟度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **性能** | 极优 | 良好 | 取决于实现 |
| **包大小** | ~60KB | ~150KB | 自定义 |
| **离线支持** | ✅ 原生 | ✅ 原生 | 需实现 |
| **生态系统** | 丰富 | 中等 | 无 |
| **学习曲线** | 中等 | 较低 | 高 |
| **维护成本** | 低 | 低 | 高 |

### 2.2 Yjs 详细分析

**优点：**
- 经过大规模生产验证（Notion、Figma 等使用类似技术）
- 极致的性能优化（增量更新、压缩算法）
- 丰富的编辑器绑定（Tiptap、ProseMirror、Quill 等）
- 灵活的网络传输层（WebSocket、WebRTC、IndexedDB）
- 活跃的社区和维护

**缺点：**
- 概念较多，初期学习成本
- 调试相对困难
- 大文档内存占用需关注

### 2.3 Automerge 详细分析

**优点：**
- API 设计简洁直观
- 自动冲突解决
- 良好的 TypeScript 支持
- 文档友好

**缺点：**
- 性能略逊于 Yjs
- 包体积较大
- 编辑器绑定较少

### 2.4 自研 OT 分析

**优点：**
- 完全可控
- 可针对特定场景优化

**缺点：**
- 开发成本极高（Google Docs 团队数百人年）
- 边界情况复杂
- 维护负担重
- 不推荐

---

## 3. 推荐方案

### 3.1 技术选型：**Yjs**

**理由：**
1. **成熟稳定**：生产环境广泛使用
2. **性能卓越**：CRDT 算法优化极致
3. **生态丰富**：与主流编辑器无缝集成
4. **离线优先**：天然支持离线编辑和同步
5. **可扩展**：支持自定义数据类型

### 3.2 网络层选型：**y-websocket + Supabase Realtime**

```
┌─────────────┐     WebSocket      ┌─────────────────┐
│   Client    │ ◄──────────────► │  y-websocket    │
│   (Yjs)     │                    │    Server       │
└─────────────┘                    └────────┬────────┘
                                           │
                                           ▼
                                   ┌─────────────────┐
                                   │    Supabase     │
                                   │   (持久化)       │
                                   └─────────────────┘
```

**初期方案**：使用 y-websocket 官方服务器
**进阶方案**：集成 Supabase Realtime 实现持久化

---

## 4. 系统架构

### 4.1 整体架构图

```
┌────────────────────────────────────────────────────────────┐
│                      客户端层                               │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Editor  │  │ Presence │  │  Cursor  │  │  Undo/   │   │
│  │ Binding  │  │ Awareness│  │ Display  │  │  Redo    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘         │
│                         │                                  │
│                    ┌────┴────┐                            │
│                    │   Yjs   │                            │
│                    │   Doc   │                            │
│                    └────┬────┘                            │
└─────────────────────────┼──────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
       ┌──────┴──────┐ ┌──┴──┐ ┌──────┴──────┐
       │  WebSocket  │ │ IDB │ │   WebRTC    │
       │  Provider   │ │     │ │  Provider   │
       └──────┬──────┘ └──┬──┘ └──────┬──────┘
              │           │           │
┌─────────────┼───────────┼───────────┼──────────────────────┐
│             │    持久化层 │           │                      │
│             ▼           ▼           ▼                      │
│      ┌────────────┐ ┌────────┐ ┌────────────┐             │
│      │ y-websocket│ │IndexedDB│ │  P2P Sync  │             │
│      │   Server   │ │ (本地)  │ │  (可选)    │             │
│      └─────┬──────┘ └────────┘ └────────────┘             │
│            │                                               │
│            ▼                                               │
│      ┌────────────┐                                        │
│      │  Supabase  │                                        │
│      │  Database  │                                        │
│      └────────────┘                                        │
└────────────────────────────────────────────────────────────┘
```

### 4.2 数据流

1. **用户编辑** → 更新本地 Yjs Doc
2. **Yjs Doc** → 生成增量更新（Update）
3. **Update** → 通过 WebSocket 广播给其他客户端
4. **其他客户端** → 应用 Update，更新 UI
5. **定期** → 持久化到 Supabase

### 4.3 离线处理流程

```
在线编辑
    │
    ▼
断开连接 ────► 继续本地编辑（IndexedDB 持久化）
    │
    ▼
恢复连接 ────► 自动同步（Yjs CRDT 自动合并）
    │
    ▼
冲突解决 ────► CRDT 保证最终一致性
```

---

## 5. 核心组件设计

### 5.1 CollaborationProvider

```typescript
interface CollaborationProvider {
  // 连接管理
  connect(documentId: string): Promise<void>;
  disconnect(): void;

  // 状态
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';

  // 文档操作
  getDocument(): Y.Doc;
  getAwareness(): Awareness;

  // 事件
  on(event: 'sync' | 'update' | 'awareness', callback: Function): void;
  off(event: string, callback: Function): void;
}
```

### 5.2 Awareness（用户感知）

```typescript
interface UserAwareness {
  // 用户信息
  userId: string;
  userName: string;
  userColor: string;

  // 光标位置
  cursor: {
    anchor: number;
    head: number;
  } | null;

  // 选区
  selection: {
    start: number;
    end: number;
  } | null;

  // 状态
  status: 'active' | 'idle' | 'offline';
  lastActive: number;
}
```

### 5.3 版本控制

```typescript
interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  snapshot: Uint8Array;  // Yjs 编码的快照
  createdAt: Date;
  createdBy: string;
  description?: string;
}
```

---

## 6. 数据库设计

### 6.1 协作会话表

```sql
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- 会话状态
  status TEXT DEFAULT 'active', -- active, idle, disconnected

  -- 光标和选区（JSON）
  cursor_position JSONB,
  selection_range JSONB,

  -- 用户显示信息
  user_color TEXT,

  -- 时间戳
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  UNIQUE(document_id, user_id)
);
```

### 6.2 文档版本表

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  -- 版本信息
  version INTEGER NOT NULL,

  -- Yjs 文档快照（二进制）
  snapshot BYTEA NOT NULL,

  -- 增量更新（可选，用于优化）
  updates BYTEA,

  -- 元数据
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,

  -- 统计
  size_bytes INTEGER,

  UNIQUE(document_id, version)
);

-- 索引
CREATE INDEX idx_document_versions_doc_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);
```

---

## 7. 实现路线图

### Phase 1：基础架构（当前阶段）
- [x] 技术选型分析
- [x] 类型定义
- [x] 接口设计
- [x] 数据库表设计

### Phase 2：核心功能（后续迭代）
- [ ] 集成 Yjs
- [ ] 实现 WebSocket Provider
- [ ] 编辑器绑定（Tiptap/ProseMirror）
- [ ] 本地持久化（IndexedDB）

### Phase 3：用户体验（后续迭代）
- [ ] 光标显示
- [ ] 在线用户列表
- [ ] 实时状态指示

### Phase 4：高级功能（后续迭代）
- [ ] 版本历史
- [ ] 回滚功能
- [ ] 评论和批注
- [ ] 权限控制

---

## 8. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| WebSocket 连接不稳定 | 用户体验差 | 自动重连 + 离线队列 |
| 大文档性能问题 | 卡顿 | 分块加载 + 虚拟滚动 |
| 数据同步冲突 | 数据丢失 | CRDT 保证 + 定期快照 |
| 服务器成本 | 费用增加 | 按需扩容 + P2P 辅助 |

---

## 9. 参考资料

- [Yjs 官方文档](https://docs.yjs.dev/)
- [CRDT 论文](https://hal.inria.fr/inria-00555588)
- [Tiptap 协同编辑](https://tiptap.dev/docs/guides/collaborative-editing)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

*文档版本: 1.0*
*创建日期: 2025-12-26*
*作者: DocuMind Pro 开发团队*
