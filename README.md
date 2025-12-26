# DocuFusion

DocuFusion 是一个 AI 驱动的文档智能处理平台，从 "嵩说AI文档智能体" 商业化迁移而来。

## ✅ 迁移状态

| 阶段 | 模块 | 状态 |
|------|------|------|
| 1.1 | 存储层降级（跳过 Supabase） | ✅ 完成 |
| 1.2 | DeepSeek 双模型完整支持 | ✅ 完成 |
| 2.1 | Editor 富文本编辑器 | ✅ 完成 |
| 2.2 | FloatingAgent AI 助手 | ✅ 完成 |
| 2.3 | Skills 系统对接 | ✅ 完成 |
| 3.1 | VisualPanel 可视化 | ✅ 完成 |
| 3.2 | KnowledgeBase 知识库 | ✅ 完成 |
| 4.1 | Dashboard 三栏布局 | ✅ 完成 |
| 5.1 | 最终配置和 README | ✅ 完成 |

## 🚀 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **认证**: NextAuth.js（可选）
- **数据库**: IndexedDB（本地）/ Supabase（云端可选）
- **AI 服务**: Google Gemini / DeepSeek（双模型支持）
- **可视化**: ECharts
- **代码质量**: ESLint + Prettier

## 📁 项目结构

```
documind-pro/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes（后端）
│   │   ├── ai/           # AI 服务接口
│   │   ├── knowledge/    # 知识库接口
│   │   └── skills/       # Skills 执行接口
│   ├── (auth)/            # 认证相关页面
│   └── (dashboard)/       # 主应用页面
├── components/            # UI 组件
│   ├── ui/               # 基础 UI 组件（Button, Input 等）
│   └── features/         # 功能组件
│       ├── editor/       # 富文本编辑器
│       ├── ai-assistant/ # AI 助手面板
│       ├── visual/       # 可视化面板
│       └── knowledge/    # 知识库面板
├── skills/               # Skills 系统
│   ├── registry.ts       # Skill 注册表
│   └── definitions/      # Skill 定义
├── services/             # 业务服务层
│   ├── ai/              # AI 服务封装
│   └── knowledge/       # 知识库服务
├── lib/                  # 工具函数
├── types/                # TypeScript 类型
├── hooks/                # React Hooks
└── config/               # 配置文件
```

## 🛠️ 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写配置：

```bash
cp .env.example .env.local
```

**最小配置（开发模式）**：
```env
NEXT_PUBLIC_DEV_MODE=true
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 📜 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |

## 🔑 核心功能

### 📝 文档编辑
- 富文本编辑器（基于 TipTap）
- 多格式导入（PDF, Word, PPT, Excel, Markdown）
- 多格式导出（Word, PDF, Markdown）
- 本地文档自动保存

### 🤖 AI 助手
- **对话式交互**：自然语言与 AI 对话
- **Skills 系统**：模块化 AI 能力
  - 文本润色、翻译、摘要
  - 代码解释、格式转换
  - 自定义扩展能力
- **双模型支持**：
  - Google Gemini（推荐）
  - DeepSeek V3/R1

### 📊 可视化
- ECharts 图表生成
- 思维导图
- 流程图
- 支持 PNG/SVG 导出

### 📚 知识库
- 本地文件上传
- 文本内容添加
- IndexedDB 持久化存储
- AI 上下文增强

### 🔐 认证（可选）
- NextAuth.js 集成
- OAuth 登录（GitHub, Google）
- 开发模式跳过认证

## 🌐 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/ai/chat` | POST | AI 对话 |
| `/api/skills` | GET | 获取 Skills 列表 |
| `/api/skills/[id]` | POST | 执行指定 Skill |
| `/api/knowledge` | GET/POST/DELETE/PATCH | 知识库 CRUD |
| `/api/health` | GET | 健康检查 |

## 🚢 部署

### Vercel（推荐）

```bash
npm run build
vercel deploy
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

## 🔧 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_DEV_MODE` | 是 | 开发模式（跳过认证） |
| `GEMINI_API_KEY` | 推荐 | Google Gemini API Key |
| `DEEPSEEK_API_KEY` | 可选 | DeepSeek API Key |
| `DEFAULT_AI_PROVIDER` | 可选 | 默认 AI 服务（gemini/deepseek） |
| `NEXTAUTH_SECRET` | 生产必需 | NextAuth 密钥 |

## 📝 开发规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用函数式组件和 Hooks
- API 使用 Next.js API Routes

## 📄 许可证

Private - All Rights Reserved

---

Built with ❤️ by DocuFusion Team | 迁移完成于 2025-12-26
