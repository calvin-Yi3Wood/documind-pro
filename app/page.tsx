export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-bronze-800 mb-4">
          DocuFusion
        </h1>
        <p className="text-lg text-bronze-600 mb-8">
          AI驱动的文档智能处理平台
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-btn font-bold hover:from-orange-600 hover:to-amber-600 transition-all"
          >
            进入工作台
          </a>
          <a
            href="/api/auth/signin"
            className="px-6 py-3 bg-cream-50 text-bronze-700 border-2 border-bronze-200 rounded-btn font-bold hover:bg-cream-100 hover:border-bronze-300 transition-all"
          >
            登录
          </a>
        </div>
      </div>
    </main>
  );
}
