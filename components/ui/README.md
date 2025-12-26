# UI 组件库使用指南

## 📦 安装和导入

```typescript
// 导入单个组件
import { Button, Input, Modal } from '@/components/ui';

// 导入类型
import type { ButtonProps, InputProps } from '@/components/ui';
```

---

## 🔘 Button - 按钮

### 基础用法

```tsx
import { Button } from '@/components/ui';

// 主按钮 (AI 功能)
<Button variant="primary">AI 生成内容</Button>

// 次要按钮
<Button variant="secondary">取消</Button>

// 危险按钮
<Button variant="danger">删除</Button>

// 幽灵按钮
<Button variant="ghost">编辑</Button>

// 链接按钮
<Button variant="link">查看更多</Button>
```

### 尺寸和图标

```tsx
// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="md">中按钮</Button>
<Button size="lg">大按钮</Button>

// 带图标
<Button leftIcon={<i className="fa-solid fa-save" />}>
  保存
</Button>

<Button rightIcon={<i className="fa-solid fa-arrow-right" />}>
  下一步
</Button>

// 加载状态
<Button loading>处理中...</Button>

// 全宽按钮
<Button fullWidth>全宽按钮</Button>
```

---

## 📝 Input - 输入框

### 基础用法

```tsx
import { Input } from '@/components/ui';

// 基础输入
<Input placeholder="请输入内容" />

// 带标签
<Input
  label="用户名"
  placeholder="请输入用户名"
/>

// 错误状态
<Input
  label="邮箱"
  error="请输入有效的邮箱地址"
  value={email}
/>

// 帮助文本
<Input
  label="密码"
  type="password"
  helperText="密码长度至少 8 位"
/>
```

### 图标和全宽

```tsx
// 左侧图标
<Input
  leftIcon={<i className="fa-solid fa-search" />}
  placeholder="搜索..."
/>

// 右侧图标
<Input
  rightIcon={<i className="fa-solid fa-eye" />}
  type="password"
/>

// 全宽
<Input fullWidth placeholder="全宽输入框" />
```

---

## 🪟 Modal - 模态框

### 基础用法

```tsx
import { Modal } from '@/components/ui';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="提示"
>
  <p>这是模态框内容</p>
</Modal>
```

### 尺寸和选项

```tsx
// 不同尺寸
<Modal size="sm" {...props}>小模态框</Modal>
<Modal size="md" {...props}>中模态框</Modal>
<Modal size="lg" {...props}>大模态框</Modal>
<Modal size="xl" {...props}>超大模态框</Modal>
<Modal size="full" {...props}>全屏模态框</Modal>

// 配置选项
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="设置"
  showCloseButton={false}      // 隐藏关闭按钮
  closeOnOverlayClick={false}   // 禁止点击遮罩关闭
  closeOnEsc={false}            // 禁止 ESC 关闭
>
  内容
</Modal>
```

---

## 📋 Dropdown - 下拉菜单

### 基础用法

```tsx
import { Dropdown } from '@/components/ui';
import type { DropdownItem } from '@/components/ui';

const items: DropdownItem[] = [
  { label: '编辑', value: 'edit', icon: <i className="fa-solid fa-edit" /> },
  { label: '复制', value: 'copy', icon: <i className="fa-solid fa-copy" /> },
  { divider: true },
  { label: '删除', value: 'delete', danger: true, icon: <i className="fa-solid fa-trash" /> }
];

<Dropdown
  trigger={<Button>操作</Button>}
  items={items}
  onSelect={(value) => console.log(value)}
/>
```

### 位置和禁用

```tsx
// 不同位置
<Dropdown placement="bottom-start" {...props} />
<Dropdown placement="bottom-end" {...props} />
<Dropdown placement="top-start" {...props} />
<Dropdown placement="top-end" {...props} />

// 禁用项
const items = [
  { label: '可用项', value: 'enabled' },
  { label: '禁用项', value: 'disabled', disabled: true }
];
```

---

## 💡 Tooltip - 工具提示

### 基础用法

```tsx
import { Tooltip } from '@/components/ui';

<Tooltip content="这是提示内容">
  <button>悬停查看提示</button>
</Tooltip>
```

### 位置和延迟

```tsx
// 不同位置
<Tooltip content="顶部" placement="top">
  <button>Top</button>
</Tooltip>

<Tooltip content="底部" placement="bottom">
  <button>Bottom</button>
</Tooltip>

<Tooltip content="左侧" placement="left">
  <button>Left</button>
</Tooltip>

<Tooltip content="右侧" placement="right">
  <button>Right</button>
</Tooltip>

// 延迟显示
<Tooltip content="延迟 500ms" delay={500}>
  <button>延迟提示</button>
</Tooltip>

// 禁用
<Tooltip content="禁用" disabled>
  <button>无提示</button>
</Tooltip>
```

---

## ⏳ Spinner - 加载动画

### 基础用法

```tsx
import { Spinner, OverlaySpinner } from '@/components/ui';

// 基础加载
<Spinner />

// 带标签
<Spinner label="加载中..." />

// 不同尺寸
<Spinner size="xs" />
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner size="xl" />

// 不同变体
<Spinner variant="primary" />   // 橙色
<Spinner variant="secondary" />  // 铜色
<Spinner variant="white" />      // 白色
```

### 全屏和覆盖

```tsx
// 全屏加载
<Spinner fullScreen label="正在处理，请稍候..." />

// 覆盖加载
<OverlaySpinner loading={isLoading} label="加载中...">
  <div>被覆盖的内容</div>
</OverlaySpinner>
```

---

## 🎴 Card - 卡片容器

### 基础用法

```tsx
import { Card } from '@/components/ui';

// 简单卡片
<Card>
  <p>卡片内容</p>
</Card>

// 不同变体
<Card variant="default">默认卡片</Card>
<Card variant="bordered">边框卡片</Card>
<Card variant="elevated">阴影卡片</Card>

// 可悬停
<Card hoverable>
  悬停查看效果
</Card>

// 可点击
<Card clickable onClick={() => alert('点击了卡片')}>
  点击我
</Card>
```

### 组合用法

```tsx
// 完整卡片结构
<Card>
  <Card.Header
    title="文档标题"
    subtitle="最后编辑: 2025-12-25"
    action={<Button size="sm">编辑</Button>}
  />

  <Card.Body>
    <p>这是卡片主要内容区域</p>
  </Card.Body>

  <Card.Footer>
    <div className="flex justify-end gap-2">
      <Button variant="secondary">取消</Button>
      <Button variant="primary">保存</Button>
    </div>
  </Card.Footer>
</Card>
```

---

## 📑 Tabs - 标签页

### 基础用法

```tsx
import { Tabs } from '@/components/ui';
import type { Tab } from '@/components/ui';

const tabs: Tab[] = [
  { key: 'tab1', label: '标签 1' },
  { key: 'tab2', label: '标签 2' },
  { key: 'tab3', label: '标签 3' }
];

<Tabs tabs={tabs} defaultActiveKey="tab1">
  <Tabs.Pane tabKey="tab1">
    <p>标签 1 内容</p>
  </Tabs.Pane>
  <Tabs.Pane tabKey="tab2">
    <p>标签 2 内容</p>
  </Tabs.Pane>
  <Tabs.Pane tabKey="tab3">
    <p>标签 3 内容</p>
  </Tabs.Pane>
</Tabs>
```

### 图标、徽章和控制

```tsx
// 带图标和徽章
const tabs: Tab[] = [
  {
    key: 'files',
    label: '文件',
    icon: <i className="fa-solid fa-file" />,
    badge: 5
  },
  {
    key: 'settings',
    label: '设置',
    icon: <i className="fa-solid fa-cog" />
  },
  {
    key: 'disabled',
    label: '禁用',
    disabled: true
  }
];

// 不同变体和尺寸
<Tabs variant="line" size="md" tabs={tabs}>
  {/* ... */}
</Tabs>

<Tabs variant="card" size="lg" tabs={tabs}>
  {/* ... */}
</Tabs>

// 全宽标签
<Tabs fullWidth tabs={tabs}>
  {/* ... */}
</Tabs>

// 受控模式
const [activeKey, setActiveKey] = useState('tab1');

<Tabs
  tabs={tabs}
  activeKey={activeKey}
  onChange={setActiveKey}
>
  {/* ... */}
</Tabs>
```

---

## 🎨 设计规范

### 颜色系统

所有组件使用统一的暖铜色系：

```css
/* 主色调 - 暖铜色 */
bronze-50 到 bronze-900

/* 辅助色 - 米色 */
cream-50 到 cream-400

/* 强调色 - 橙色 (AI 功能) */
orange-400 到 orange-600
```

### 可访问性

所有组件都包含：
- ✅ ARIA 属性 (role, aria-label, aria-describedby 等)
- ✅ 键盘导航支持
- ✅ 焦点管理
- ✅ 屏幕阅读器友好

### TypeScript

所有组件都有完整的类型定义：

```typescript
import type {
  ButtonProps,
  InputProps,
  ModalProps,
  DropdownProps,
  TooltipProps,
  SpinnerProps,
  CardProps,
  TabsProps
} from '@/components/ui';
```

---

**最后更新**: 2025-12-25
