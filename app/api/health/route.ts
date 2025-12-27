import { NextResponse } from 'next/server';

/**
 * 服务健康状态
 */
interface ServiceHealth {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
  latency?: number;
}

/**
 * 完整健康检查响应
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    gemini: ServiceHealth;
    deepseek: ServiceHealth;
    database: ServiceHealth;
  };
  environment: {
    nodeEnv: string;
    devMode: boolean;
  };
}

/**
 * 检查 Gemini API 可用性
 */
async function checkGeminiAPI(): Promise<ServiceHealth> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return { status: 'error', message: 'API key not configured' };
  }

  try {
    const start = Date.now();
    // 简单的 API 连通性检查 (使用 models 列表端点)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { method: 'GET', signal: AbortSignal.timeout(5000) }
    );

    const latency = Date.now() - start;

    if (response.ok) {
      return { status: 'ok', latency };
    } else if (response.status === 401 || response.status === 403) {
      return { status: 'error', message: 'Invalid API key', latency };
    } else {
      return { status: 'degraded', message: `HTTP ${response.status}`, latency };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { status: 'error', message };
  }
}

/**
 * 检查 DeepSeek API 可用性
 */
async function checkDeepSeekAPI(): Promise<ServiceHealth> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    return { status: 'error', message: 'API key not configured' };
  }

  try {
    const start = Date.now();
    // DeepSeek API 健康检查
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - start;

    if (response.ok) {
      return { status: 'ok', latency };
    } else if (response.status === 401 || response.status === 403) {
      return { status: 'error', message: 'Invalid API key', latency };
    } else {
      return { status: 'degraded', message: `HTTP ${response.status}`, latency };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { status: 'error', message };
  }
}

/**
 * 检查数据库/存储可用性
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  if (devMode) {
    // 开发模式使用 IndexedDB，无需检查
    return { status: 'ok', message: 'Using IndexedDB (dev mode)' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { status: 'degraded', message: 'Supabase not configured, using local storage' };
  }

  try {
    const start = Date.now();
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - start;

    if (response.ok || response.status === 200) {
      return { status: 'ok', latency };
    } else {
      return { status: 'degraded', message: `HTTP ${response.status}`, latency };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { status: 'error', message };
  }
}

// 服务启动时间
const startTime = Date.now();

/**
 * 健康检查 API
 *
 * GET /api/health
 * GET /api/health?full=true (详细检查，包含 API 连通性)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fullCheck = searchParams.get('full') === 'true';

  // 基础响应
  const baseResponse = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    service: 'DocuFusion API',
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      devMode: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
    },
  };

  // 简单检查 - 快速返回
  if (!fullCheck) {
    return NextResponse.json({
      ...baseResponse,
      checks: {
        gemini: { status: process.env.GEMINI_API_KEY ? 'ok' : 'error' },
        deepseek: { status: process.env.DEEPSEEK_API_KEY ? 'ok' : 'error' },
        database: { status: 'ok' },
      },
    });
  }

  // 完整检查 - 并行检测所有服务
  const [gemini, deepseek, database] = await Promise.all([
    checkGeminiAPI(),
    checkDeepSeekAPI(),
    checkDatabase(),
  ]);

  const checks = { gemini, deepseek, database };

  // 计算整体状态
  const statuses = Object.values(checks).map((c) => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (statuses.every((s) => s === 'error')) {
    overallStatus = 'unhealthy';
  } else if (statuses.some((s) => s === 'error' || s === 'degraded')) {
    overallStatus = 'degraded';
  }

  const response: HealthCheckResponse = {
    ...baseResponse,
    status: overallStatus,
    checks,
  };

  // 根据状态返回不同的 HTTP 状态码
  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}
