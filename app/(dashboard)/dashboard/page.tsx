/**
 * Dashboard 主页面
 *
 * 临时页面 - 用于开发测试
 * Stage 10 会完善为完整的三栏布局
 */

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-bronze-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-bronze-800">DocuMind Pro</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-bronze-500">开发模式</span>
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
              D
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* 欢迎卡片 */}
          <div className="bg-white rounded-xl border border-bronze-200 p-8 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-bronze-800 mb-2">
              欢迎使用 DocuMind Pro
            </h2>
            <p className="text-bronze-600 mb-4">
              AI 驱动的文档智能处理平台 - 商业化版本开发中
            </p>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                ✓ 开发模式已启用
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                Pro 订阅
              </span>
            </div>
          </div>

          {/* 开发进度 */}
          <div className="bg-white rounded-xl border border-bronze-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-bronze-800 mb-4">开发进度</h3>

            <div className="space-y-3">
              {[
                { stage: '阶段 1-2', name: '项目初始化 & 类型系统', done: true },
                { stage: '阶段 3', name: '后端 API 层', done: true },
                { stage: '阶段 4', name: '核心服务层', done: true },
                { stage: '阶段 5', name: 'UI 组件迁移', done: true },
                { stage: '阶段 6', name: '安全性增强', done: true },
                { stage: '阶段 7', name: '存储层 & 用户系统', done: true },
                { stage: '阶段 8', name: '协同编辑基础', done: true },
                { stage: '阶段 9', name: 'Skills 实现', done: true },
                { stage: '阶段 10', name: '集成测试 & 文档', done: false, current: true },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    item.current
                      ? 'bg-orange-50 border border-orange-200'
                      : item.done
                      ? 'bg-green-50'
                      : 'bg-bronze-50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.done
                        ? 'bg-green-500 text-white'
                        : item.current
                        ? 'bg-orange-500 text-white'
                        : 'bg-bronze-300 text-white'
                    }`}
                  >
                    {item.done ? '✓' : idx + 1}
                  </span>
                  <span className="text-sm text-bronze-500 w-20">{item.stage}</span>
                  <span
                    className={`flex-1 ${
                      item.current ? 'text-orange-700 font-medium' : 'text-bronze-700'
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.current && (
                    <span className="text-xs text-orange-500 animate-pulse">进行中...</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 快速链接 */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <a
              href="/editor"
              className="bg-white rounded-xl border border-bronze-200 p-4 hover:border-orange-400 transition-colors group"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium text-bronze-700 group-hover:text-orange-600">
                编辑器
              </div>
              <div className="text-xs text-bronze-400">创建文档</div>
            </a>
            <a
              href="/documents"
              className="bg-white rounded-xl border border-bronze-200 p-4 hover:border-orange-400 transition-colors group"
            >
              <div className="text-2xl mb-2">📁</div>
              <div className="font-medium text-bronze-700 group-hover:text-orange-600">
                文档列表
              </div>
              <div className="text-xs text-bronze-400">管理文件</div>
            </a>
            <a
              href="/settings"
              className="bg-white rounded-xl border border-bronze-200 p-4 hover:border-orange-400 transition-colors group"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="font-medium text-bronze-700 group-hover:text-orange-600">
                设置
              </div>
              <div className="text-xs text-bronze-400">配置选项</div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
