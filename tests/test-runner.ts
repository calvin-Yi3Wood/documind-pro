/**
 * DocuFusion 自动化测试脚本
 *
 * 测试范围：
 * 1. 项目构建和启动
 * 2. API 端点健康检查
 * 3. AI 服务集成
 * 4. Skills 系统
 * 5. 知识库 CRUD
 * 6. 前端组件渲染
 */

interface TestResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message?: string;
  details?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
}

const _testResults: TestSuite[] = []; // 保留供未来测试套件聚合使用
void _testResults;

// 测试工具函数
async function runTest(
  name: string,
  category: string,
  testFn: () => Promise<{ success: boolean; message?: string; details?: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    const testResult: TestResult = {
      name,
      category,
      status: result.success ? 'PASS' : 'FAIL',
      duration: Date.now() - start,
    };
    if (result.message) testResult.message = result.message;
    if (result.details) testResult.details = result.details;
    return testResult;
  } catch (error) {
    return {
      name,
      category,
      status: 'FAIL',
      duration: Date.now() - start,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// API 测试函数
async function testAPI(
  endpoint: string,
  method: string = 'GET',
  body?: object
): Promise<{ success: boolean; message: string; details?: string }> {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));

    return {
      success: response.ok,
      message: `${response.status} ${response.statusText}`,
      details: JSON.stringify(data, null, 2).slice(0, 500),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// 导出测试定义（供外部脚本使用）
export const testDefinitions = {
  // 1. 健康检查测试
  health: [
    { name: 'Health API 响应', endpoint: '/api/health', method: 'GET' },
  ],

  // 2. AI 服务测试
  ai: [
    {
      name: 'AI Chat API 格式验证',
      endpoint: '/api/ai/chat',
      method: 'POST',
      body: { message: 'Hello', provider: 'gemini' }
    },
  ],

  // 3. Skills 系统测试
  skills: [
    { name: 'Skills 列表获取', endpoint: '/api/skills', method: 'GET' },
    {
      name: 'Skill 执行测试 (polish)',
      endpoint: '/api/skills/polish',
      method: 'POST',
      body: { content: '这是测试文本', options: {} }
    },
    {
      name: 'Skill 执行测试 (translate)',
      endpoint: '/api/skills/translate',
      method: 'POST',
      body: { content: 'Hello World', options: { targetLang: 'zh' } }
    },
  ],

  // 4. 知识库测试
  knowledge: [
    { name: '知识库列表获取', endpoint: '/api/knowledge', method: 'GET' },
    {
      name: '添加知识源',
      endpoint: '/api/knowledge',
      method: 'POST',
      body: { name: '测试文档', type: 'text', content: '这是测试内容' }
    },
  ],

  // 5. 用户相关测试
  user: [
    { name: '用户配额查询', endpoint: '/api/user/quota', method: 'GET' },
  ],

  // 6. 搜索测试
  search: [
    {
      name: '搜索 API',
      endpoint: '/api/search',
      method: 'POST',
      body: { query: 'test', filters: {} }
    },
  ],
};

// 生成测试报告
export function generateReport(results: TestSuite[]): string {
  let report = `
╔══════════════════════════════════════════════════════════════════════════╗
║                      DocuFusion 自动化测试报告                            ║
║                    ${new Date().toLocaleString('zh-CN')}                  ║
╚══════════════════════════════════════════════════════════════════════════╝

`;

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const suite of results) {
    report += `\n┌─────────────────────────────────────────────────────────────────────────┐\n`;
    report += `│ ${suite.name.padEnd(71)} │\n`;
    report += `├─────────────────────────────────────────────────────────────────────────┤\n`;

    for (const test of suite.tests) {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️';
      const status = test.status.padEnd(4);
      const duration = `${test.duration}ms`.padStart(8);
      report += `│ ${icon} ${status} │ ${test.name.padEnd(45)} │ ${duration} │\n`;

      if (test.message && test.status === 'FAIL') {
        report += `│        └─ ${test.message.slice(0, 60).padEnd(60)} │\n`;
      }
    }

    report += `├─────────────────────────────────────────────────────────────────────────┤\n`;
    report += `│ 通过: ${suite.passed}  失败: ${suite.failed}  跳过: ${suite.skipped}`.padEnd(72) + `│\n`;
    report += `└─────────────────────────────────────────────────────────────────────────┘\n`;

    totalPassed += suite.passed;
    totalFailed += suite.failed;
    totalSkipped += suite.skipped;
  }

  const totalTests = totalPassed + totalFailed + totalSkipped;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';

  report += `
╔══════════════════════════════════════════════════════════════════════════╗
║                              测试汇总                                     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  总测试数: ${String(totalTests).padEnd(5)} │ 通过: ${String(totalPassed).padEnd(5)} │ 失败: ${String(totalFailed).padEnd(5)} │ 跳过: ${String(totalSkipped).padEnd(5)} ║
║  通过率: ${passRate}%`.padEnd(75) + `║
╚══════════════════════════════════════════════════════════════════════════╝
`;

  return report;
}

export { runTest, testAPI };
export type { TestResult, TestSuite };
