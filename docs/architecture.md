# DocuMind Pro 架构设计文档

## 概述

DocuMind Pro 是一个企业级 AI 驱动的文档智能处理系统，采用 Next.js 14+ App Router 架构，支持云端部署和本地开发模式。

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Next.js 14+ (App Router) | SSR、路由、API Routes |
| UI框架 | React 18 + TypeScript | 组件化开发 |
| 样式 | Tailwind CSS | 原子化样式 |
| 状态管理 | Zustand | 轻量级状态管理 |
| AI服务 | Gemini / DeepSeek | 双模型支持 |
| 数据库 | Supabase (可选) | 云端存储 |
| 本地存储 | IndexedDB | 离线支持 |
| 认证 | NextAuth.js | 用户认证 |

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (React + Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 知识库面板   │  │  编辑器     │  │      AI 助手            │  │
│  │ KnowledgeBase│  │  Editor    │  │   FloatingAgent         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Skills 系统 (技能模块)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ AI Chat  │ │ 图片生成 │ │ 可视化   │ │ 文档分析 │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                      API 层 (Next.js API Routes)                │
│  /api/ai/*    /api/documents/*    /api/skills/*    /api/user/* │
├─────────────────────────────────────────────────────────────────┤
│                      服务层 (Services)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ AI 服务  │ │ 存储服务 │ │ 搜索服务 │ │ 配额服务 │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                      数据层                                     │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │    Supabase       │  │    IndexedDB      │                  │
│  │   (生产环境)       │  │   (开发/离线)     │                  │
│  └───────────────────┘  └───────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
documind-pro/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes (后端)
│   │   ├── ai/             # AI 相关 API
│   │   ├── auth/           # 认证 API
│   │   ├── documents/      # 文档 CRUD API
│   │   ├── skills/         # Skills 执行 API
│   │   └── user/           # 用户相关 API
│   ├── (auth)/             # 认证页面组
│   └── (dashboard)/        # 主应用页面组
│
├── components/              # React 组件
│   ├── ui/                 # 基础 UI 组件
│   ├── features/           # 功能组件
│   │   ├── editor/        # 编辑器组件
│   │   ├── ai-assistant/  # AI 助手组件
│   │   ├── knowledge/     # 知识库组件
│   │   ├── visual/        # 可视化组件
│   │   └── ...
│   └── auth/               # 认证组件
│
├── skills/                  # Skills 系统
│   ├── registry.ts         # Skill 注册表
│   ├── loader.ts           # 懒加载器
│   ├── ai-chat/           # AI 对话 Skill
│   ├── image-generation/  # 图片生成 Skill
│   └── ...
│
├── services/               # 业务服务层
│   ├── ai/                # AI 服务封装
│   ├── storage/           # 存储服务
│   ├── search/            # 搜索服务
│   └── quota/             # 配额服务
│
├── lib/                    # 工具库
│   ├── api/               # API 工具
│   ├── auth/              # 认证工具
│   ├── security/          # 安全工具
│   └── supabase/          # Supabase 客户端
│
├── hooks/                  # React Hooks
├── types/                  # TypeScript 类型
├── config/                 # 配置文件
└── docs/                   # 文档
```

## 核心模块设计

### 1. Skills 系统

Skills 系统是 DocuMind Pro 的核心扩展机制，类似于 Claude Code 的 Skills 设计理念：

- **懒加载**: 启动时只加载元数据，执行时才加载完整实现
- **自主调用**: AI 根据用户意图自动选择最佳 Skill
- **模块化**: 每个 Skill 独立开发、独立部署

```typescript
// Skill 定义接口
interface SkillDefinition {
  name: string;
  description: string;  // AI 用于匹配的描述
  category: SkillCategory;
  triggers: string[];   // 触发关键词
  execute: (context: SkillContext) => Promise<SkillResult>;
}
```

### 2. AI 服务抽象层

支持多 AI 提供商的统一接口：

```typescript
// AI 提供商接口
interface AIProvider {
  chat(messages: Message[], options?: AIOptions): AsyncGenerator<string>;
  generateImage(prompt: string): Promise<ImageResult>;
}

// 支持的提供商
- Gemini (gemini-2.0-flash-exp)
- DeepSeek (deepseek-chat, deepseek-reasoner)
```

### 3. 存储抽象层

支持多种存储后端的无缝切换：

```typescript
interface StorageProvider {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<T[]>;
}

// 实现
- SupabaseStorageProvider (生产环境)
- LocalStorageProvider (开发/离线)
```

## 安全设计

### API Key 保护

- 所有 AI API Key 只在服务端使用
- 前端通过 `/api/*` 代理调用 AI 服务
- 系统提示词等核心资产只存在于服务端

### XSS 防护

- 使用 DOMPurify 清理所有用户输入
- 配置严格的 CSP 策略
- 所有 `dangerouslySetInnerHTML` 必须经过 sanitize

### 认证与授权

- NextAuth.js 处理用户认证
- Row Level Security (RLS) 保护数据库
- 开发模式支持跳过认证

## 开发模式

设置 `NEXT_PUBLIC_DEV_MODE=true` 可启用开发模式：

- 跳过用户认证
- 使用 IndexedDB 本地存储
- 无限 AI 调用配额
- 详细日志输出

## 部署架构

### Vercel 部署 (推荐)

```
Vercel Edge Network
       │
       ▼
Next.js App (Serverless Functions)
       │
       ├── Supabase (数据库 + 存储)
       ├── Gemini API
       └── DeepSeek API
```

### 自托管部署

```
Nginx / Caddy (反向代理)
       │
       ▼
   Docker Container
       │
       ├── PostgreSQL
       ├── Redis (可选，缓存)
       └── S3-compatible (文件存储)
```

## 性能优化

1. **代码分割**: 按路由自动分割，Skills 懒加载
2. **边缘缓存**: 静态资源 CDN 缓存
3. **流式响应**: AI 回复采用 SSE 流式传输
4. **乐观更新**: 减少用户等待时间
5. **预加载**: 关键资源预加载

## 扩展性

### 添加新 Skill

1. 在 `skills/` 下创建新目录
2. 实现 `manifest.json` 和 `executor.ts`
3. 在 `registry.ts` 中注册

### 添加新 AI 提供商

1. 在 `services/ai/` 下创建新文件
2. 实现 `AIProvider` 接口
3. 在 `provider.ts` 中注册

---

*文档版本: 1.0.0*
*最后更新: 2025-12-27*
