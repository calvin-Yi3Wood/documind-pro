# DocuMind Pro

DocuMind Pro 是一个商业化的AI驱动的文档智能处理平台。

## 🚀 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **认证**: NextAuth.js
- **数据库**: Supabase
- **AI服务**: Google Gemini, DeepSeek
- **代码质量**: ESLint + Prettier

## 📁 项目结构

```
documind-pro/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes（后端）
│   ├── (auth)/            # 认证相关页面
│   └── (dashboard)/       # 主应用页面
├── components/            # UI 组件
│   ├── ui/               # 基础 UI 组件
│   └── features/         # 功能组件
├── skills/               # Skills 系统
│   ├── registry.ts       # Skill 注册表
│   └── [skill-name]/     # 各个 Skill
├── services/             # 业务服务层
├── lib/                  # 工具函数
├── types/                # TypeScript 类型
├── hooks/                # React Hooks
└── config/               # 配置文件
```

## 🛠️ 开始开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写配置：

```bash
cp .env.example .env.local
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 📜 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查

## 🔑 核心功能

- 📄 多格式文档处理（PDF, Word, PPT, Excel）
- 🤖 AI驱动的文档分析和编辑
- 🎨 智能排版和美化
- 📊 数据可视化
- 🔍 智能搜索和查找
- 🔐 用户认证和授权
- 💾 云端存储和同步

## 📝 开发规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用函数式组件和 Hooks
- API 使用 Next.js API Routes

## 🚢 部署

项目可部署到 Vercel、Netlify 等平台。

```bash
npm run build
```

## 📄 许可证

Private - All Rights Reserved

---

Built with ❤️ by DocuMind Team
