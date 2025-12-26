/**
 * AI Node Explanation API Route
 *
 * 为思维导图节点生成 AI 解释
 * - 分析节点在上下文中的含义
 * - 提供相关背景知识
 * - 支持追问功能
 *
 * 支持参数:
 * - nodeName: 节点名称
 * - context: 节点上下文 (相关段落)
 * - documentContent: 文档全文 (可选)
 * - followUpQuestion: 追问问题 (可选)
 * - previousExplanation: 上一次解释 (追问时需要)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIProviderManager } from '@/services/ai/provider';
import { createGeminiProvider } from '@/services/ai/gemini';
import { createDeepSeekProvider } from '@/services/ai/deepseek';
import type { AIStreamChunk } from '@/services/ai/provider';

/**
 * 全局 AI 提供商管理器
 */
let providerManager: AIProviderManager | null = null;

/**
 * 初始化 AI 提供商管理器
 */
function getProviderManager(): AIProviderManager {
  if (!providerManager) {
    const providers = [];

    // 优先使用 DeepSeek (更擅长中文解释)
    try {
      const deepseek = createDeepSeekProvider();
      providers.push(deepseek);
      console.log('✅ DeepSeek provider initialized for explain-node');
    } catch (e) {
      console.warn('⚠️  DeepSeek provider not available:', e);
    }

    // 备用 Gemini
    try {
      const gemini = createGeminiProvider();
      providers.push(gemini);
      console.log('✅ Gemini provider initialized for explain-node');
    } catch (e) {
      console.warn('⚠️  Gemini provider not available:', e);
    }

    if (providers.length === 0) {
      throw new Error('No AI providers available. Please set GEMINI_API_KEY or DEEPSEEK_API_KEY');
    }

    providerManager = new AIProviderManager(providers);
  }

  return providerManager;
}

/**
 * 请求体接口
 */
interface ExplainNodeRequest {
  nodeName: string;
  context: string;
  documentContent?: string;
  followUpQuestion?: string;
  previousExplanation?: string;
}

/**
 * 构建解释提示词
 */
function buildExplanationPrompt(data: ExplainNodeRequest): string {
  const { nodeName, context, documentContent, followUpQuestion, previousExplanation } = data;

  // 追问模式
  if (followUpQuestion && previousExplanation) {
    return `你是一个专业的知识解释助手。用户正在阅读一篇文档，并对思维导图中的某个节点进行了追问。

## 节点名称
${nodeName}

## 之前的解释
${previousExplanation}

## 用户追问
${followUpQuestion}

## 相关上下文
${context}

${documentContent ? `## 文档全文参考\n${documentContent.slice(0, 3000)}...` : ''}

请针对用户的追问，提供更深入、更具体的解释。回答要：
1. 直接回应追问的问题
2. 结合上下文提供具体例子
3. 保持简洁清晰，使用 Markdown 格式
4. 如果涉及专业概念，用通俗语言解释`;
  }

  // 首次解释模式
  return `你是一个专业的知识解释助手。用户正在阅读一篇文档，并点击了思维导图中的一个节点，希望了解更多信息。

## 节点名称
${nodeName}

## 相关上下文（来自文档）
${context}

${documentContent ? `## 文档全文参考（部分）\n${documentContent.slice(0, 2000)}...` : ''}

请为这个概念/主题提供详细解释，包括：

1. **概念定义**：简要说明这个概念/主题是什么
2. **核心要点**：列出 2-3 个关键要点
3. **在文档中的作用**：解释这个节点在整体内容中的位置和重要性
4. **拓展知识**：提供相关的背景知识或实际应用

要求：
- 使用 Markdown 格式组织内容
- 保持专业但易懂的语言风格
- 解释要有深度但不冗长（300-500字为宜）
- 使用中文回答`;
}

/**
 * POST 处理器
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json() as ExplainNodeRequest;

    // 2. 验证必要字段
    if (!body.nodeName) {
      return NextResponse.json(
        { error: 'nodeName is required' },
        { status: 400 }
      );
    }

    if (!body.context) {
      return NextResponse.json(
        { error: 'context is required' },
        { status: 400 }
      );
    }

    // 3. 构建提示词
    const prompt = buildExplanationPrompt(body);

    // 4. 获取 AI 提供商
    const manager = getProviderManager();

    // 5. 调用 AI 服务 (非流式，获取完整响应)
    const response = await manager.chat({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      temperature: 0.7,
      maxTokens: 1500,
    });

    // 6. 处理响应
    if (Symbol.asyncIterator in response) {
      // 如果返回流式响应，收集所有内容
      let fullContent = '';
      for await (const chunk of response as AsyncIterable<AIStreamChunk>) {
        fullContent += chunk.content;
        if (chunk.done) break;
      }
      return NextResponse.json({
        explanation: fullContent,
        nodeName: body.nodeName,
        isFollowUp: !!body.followUpQuestion,
      });
    } else {
      // 完整响应
      return NextResponse.json({
        explanation: response.content,
        nodeName: body.nodeName,
        isFollowUp: !!body.followUpQuestion,
        usage: response.usage,
        model: response.model,
      });
    }
  } catch (err) {
    console.error('Explain node error:', err);
    return NextResponse.json(
      {
        error: 'Failed to generate explanation',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS 处理器 (CORS 预检)
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
