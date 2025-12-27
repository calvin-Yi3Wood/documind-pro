# DocuMind Pro API 参考文档

## 概述

DocuMind Pro 提供 RESTful API 接口，所有 API 通过 Next.js API Routes 实现。

**基础 URL**: `/api`

**认证**: 大部分 API 需要认证（开发模式除外）

---

## AI 相关 API

### POST /api/ai/chat

AI 对话接口，支持流式响应。

**请求体**:
```json
{
  "query": "你好，请帮我分析这段文字",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "history": [],
  "context": "",
  "stream": true
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 用户消息 |
| provider | string | 否 | AI 提供商: gemini / deepseek |
| model | string | 否 | 模型名称 |
| history | array | 否 | 历史消息 |
| context | string | 否 | 上下文信息 |
| stream | boolean | 否 | 是否流式响应 |

**响应** (流式):
```
data: {"type":"text","content":"你好"}
data: {"type":"text","content":"！"}
data: {"type":"done"}
```

---

### GET /api/ai/image

获取图片生成服务状态。

**响应**:
```json
{
  "service": "AI Image Generation",
  "status": "available",
  "supportedStyles": ["realistic", "artistic", "cartoon", "abstract"],
  "supportedSizes": ["256x256", "512x512", "1024x1024"]
}
```

### POST /api/ai/image

生成 AI 图片。

**请求体**:
```json
{
  "prompt": "一只可爱的橘猫",
  "style": "realistic",
  "size": "512x512"
}
```

**响应**:
```json
{
  "success": true,
  "imageUrl": "https://...",
  "base64": "data:image/png;base64,..."
}
```

---

## 文档 API

### GET /api/documents

获取文档列表。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| projectId | string | 按项目筛选 |
| limit | number | 每页数量 (默认 50) |
| offset | number | 偏移量 |

**响应**:
```json
{
  "success": true,
  "documents": [
    {
      "id": "doc_xxx",
      "title": "我的文档",
      "content": "...",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "version": 1,
      "syncStatus": "synced"
    }
  ],
  "total": 100
}
```

### POST /api/documents

创建新文档。

**请求体**:
```json
{
  "title": "新文档",
  "content": "文档内容...",
  "projectId": "proj_xxx",
  "tags": ["标签1", "标签2"]
}
```

### GET /api/documents/[id]

获取单个文档。

### PUT /api/documents/[id]

更新文档。

**请求体**:
```json
{
  "title": "更新后的标题",
  "content": "更新后的内容"
}
```

### DELETE /api/documents/[id]

删除文档。

---

## Skills API

### GET /api/skills

获取可用 Skills 列表。

**响应**:
```json
{
  "success": true,
  "skills": [
    {
      "name": "ai-chat",
      "description": "AI 对话助手",
      "category": "ai-chat",
      "triggers": ["聊天", "对话", "问答"]
    }
  ]
}
```

### POST /api/skills/[skillId]

执行指定 Skill。

**请求体**:
```json
{
  "query": "帮我分析这段文字",
  "context": {
    "document": "...",
    "selection": "..."
  }
}
```

---

## 用户 API

### GET /api/user/profile

获取当前用户信息。

**响应**:
```json
{
  "success": true,
  "profile": {
    "id": "user_xxx",
    "email": "user@example.com",
    "name": "用户名",
    "subscription": "pro",
    "preferences": {
      "theme": "system",
      "language": "zh-CN",
      "defaultAIProvider": "deepseek"
    }
  }
}
```

### PUT /api/user/profile

更新用户信息。

### GET /api/user/quota

获取用户配额信息。

**响应**:
```json
{
  "success": true,
  "quota": {
    "used": 150,
    "limit": 1000,
    "resetAt": "2025-02-01T00:00:00Z"
  }
}
```

---

## 搜索 API

### POST /api/search

网络搜索。

**请求体**:
```json
{
  "query": "Next.js 14 新特性",
  "provider": "duckduckgo",
  "limit": 10
}
```

**响应**:
```json
{
  "success": true,
  "results": [
    {
      "title": "Next.js 14 发布",
      "url": "https://...",
      "snippet": "..."
    }
  ]
}
```

---

## 知识库 API

### GET /api/knowledge

获取知识源列表。

### POST /api/knowledge

上传新知识源。

**请求体** (multipart/form-data):
- file: 文件
- name: 名称
- type: 类型 (pdf/docx/md/txt)

---

## 健康检查

### GET /api/health

基础健康检查。

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "service": "DocuFusion API",
  "version": "0.1.0",
  "uptime": 3600
}
```

### GET /api/health?full=true

完整健康检查（包含服务连通性）。

**响应**:
```json
{
  "status": "healthy",
  "checks": {
    "gemini": { "status": "ok", "latency": 150 },
    "deepseek": { "status": "ok", "latency": 200 },
    "database": { "status": "ok", "message": "Using IndexedDB" }
  }
}
```

---

## 错误响应

所有 API 在出错时返回统一格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

**常见错误码**:
| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 429 | RATE_LIMITED | 请求过于频繁 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 速率限制

- 免费用户: 100 次/月 AI 调用
- Pro 用户: 1000 次/月
- Enterprise: 无限制

超出限制返回 429 状态码。

---

*文档版本: 1.0.0*
*最后更新: 2025-12-27*
