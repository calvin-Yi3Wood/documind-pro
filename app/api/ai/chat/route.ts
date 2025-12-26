/**
 * AI Chat API Route
 *
 * 处理AI聊天请求的完整实现
 * - 接收前端请求
 * - 验证用户身份
 * - 检查使用配额
 * - 调用AI服务
 * - 返回流式响应
 *
 * 支持参数:
 * - provider: 'gemini' | 'deepseek' (可选，默认自动选择)
 * - model: 模型名称 (可选，如 'deepseek-reasoner')
 */

import { NextRequest } from 'next/server';
import { success, streamResponse, aiServiceError } from '@/lib/api/response';
import { validateBody, commonSchemas } from '@/lib/api/validation';
import { withErrorHandler, withRateLimit, compose } from '@/lib/api/middleware';
import { AIProviderManager } from '@/services/ai/provider';
import type { AIProviderType } from '@/services/ai/provider';
import { createGeminiProvider } from '@/services/ai/gemini';
import { createDeepSeekProvider, DeepSeekProvider, type DeepSeekModel } from '@/services/ai/deepseek';
import { buildSystemMessage } from '@/config/prompts';
import type { AIStreamChunk } from '@/services/ai/provider';

/**
 * 全局AI提供商管理器
 * 支持Gemini和DeepSeek自动降级
 */
let providerManager: AIProviderManager | null = null;

/**
 * 初始化AI提供商管理器
 */
function getProviderManager(): AIProviderManager {
  if (!providerManager) {
    const providers = [];

    // 优先使用Gemini
    try {
      const gemini = createGeminiProvider();
      providers.push(gemini);
      console.log('✅ Gemini provider initialized');
    } catch (e) {
      console.warn('⚠️  Gemini provider not available:', e);
    }

    // 备用DeepSeek
    try {
      const deepseek = createDeepSeekProvider();
      providers.push(deepseek);
      console.log('✅ DeepSeek provider initialized');
    } catch (e) {
      console.warn('⚠️  DeepSeek provider not available:', e);
    }

    if (providers.length === 0) {
      throw new Error('No AI providers available. Please set GEMINI_API_KEY or DEEPSEEK_API_KEY');
    }

    providerManager = new AIProviderManager(providers);
  }

  return providerManager;
}

/**
 * 处理聊天请求(POST)
 *
 * 请求体示例:
 * {
 *   "query": "你好",
 *   "provider": "deepseek",        // 可选: gemini | deepseek
 *   "model": "deepseek-reasoner",  // 可选: deepseek-chat | deepseek-reasoner
 *   "history": [],
 *   "stream": true
 * }
 */
async function handleChatRequest(request: NextRequest) {
  // 1. 验证请求体
  const validation = await validateBody(request, commonSchemas.chatRequest);

  if (!validation.success) {
    return validation.response;
  }

  const { query, documentId, history, stream } = validation.data;

  // 获取可选的 provider 和 model 参数
  let requestData: { provider?: string; model?: string } = {};
  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    requestData = {
      provider: body.provider,
      model: body.model,
    };
  } catch {
    // 忽略解析错误，使用默认值
  }

  const preferredProvider = requestData.provider as AIProviderType | undefined;
  const preferredModel = requestData.model;

  try {
    // 2. 构建消息历史
    // 根据提供商和模型选择提示词类型
    let promptType: 'DEFAULT' | 'DEEPSEEK' | 'DEEPSEEK_REASONER' = 'DEFAULT';
    if (preferredProvider === 'deepseek') {
      promptType = preferredModel === 'deepseek-reasoner' ? 'DEEPSEEK_REASONER' : 'DEEPSEEK';
    }
    const messages = [
      // 系统提示词（根据提供商选择）
      {
        role: 'system' as const,
        content: buildSystemMessage(promptType),
      },
      // 用户历史消息
      ...(history || []),
      // 当前查询
      {
        role: 'user' as const,
        content: query,
      },
    ];

    // 3. 获取AI提供商
    const manager = getProviderManager();

    // 如果指定了 DeepSeek 模型，设置模型
    if (preferredProvider === 'deepseek' && preferredModel) {
      const deepseekProvider = manager.getProviderByName('deepseek');
      if (deepseekProvider && 'setModel' in deepseekProvider) {
        (deepseekProvider as DeepSeekProvider).setModel(preferredModel as DeepSeekModel);
      }
    }

    // 4. 调用AI服务
    const response = await manager.chat(
      {
        messages,
        stream: stream ?? true,
        temperature: 0.7,
        maxTokens: preferredModel === 'deepseek-reasoner' ? 8192 : 2048,
        ...(preferredModel ? { model: preferredModel } : {}),
      },
      preferredProvider
    );

    // 5. 返回响应
    if (Symbol.asyncIterator in response) {
      // 流式响应
      return streamResponse(createStreamResponse(response));
    } else {
      // 完整响应
      return success({
        content: response.content,
        usage: response.usage,
        model: response.model,
        provider: preferredProvider || manager.getCurrentProviderName() || 'unknown',
      });
    }
  } catch (err) {
    console.error('AI chat error:', err);
    return aiServiceError(
      err instanceof Error ? err.message : 'AI service failed',
      { documentId, provider: preferredProvider, model: preferredModel }
    );
  }
}

/**
 * 创建流式响应
 *
 * @param chunks - AI响应块迭代器
 * @returns ReadableStream
 */
function createStreamResponse(chunks: AsyncIterable<AIStreamChunk>): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          // 发送SSE格式的数据
          const data = JSON.stringify({
            content: chunk.content,
            done: chunk.done,
            usage: chunk.usage,
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // 如果完成,关闭流
          if (chunk.done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
        controller.error(err);
      }
    },
  });
}

/**
 * POST处理器(带中间件)
 *
 * 中间件执行顺序:
 * 1. withErrorHandler - 捕获所有错误
 * 2. withRateLimit - 速率限制(每分钟10次请求)
 */
export const POST = compose([
  withErrorHandler,
  withRateLimit({
    windowMs: 60000, // 1分钟
    max: 10, // 最多10次请求
  }),
])(handleChatRequest);

/**
 * OPTIONS处理器(CORS预检)
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
