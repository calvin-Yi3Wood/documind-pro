/**
 * AI Chat Skill Executor
 *
 * 完整实现智能对话功能
 * - 调用 /api/ai/chat 接口
 * - 支持流式响应
 * - 支持多种 AI 提供商
 */

import type { SkillContext, SkillResult } from '@/types';

/**
 * AI 聊天响应结果
 */
export interface AIChatResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  reasoningContent?: string;
}

/**
 * 流式响应回调
 */
export type StreamCallback = (chunk: {
  content: string;
  done: boolean;
  reasoning?: string;
}) => void;

/**
 * AI 聊天执行器选项
 */
export interface AIChatOptions {
  /** 指定 AI 提供商 */
  provider?: 'gemini' | 'deepseek';
  /** 指定模型 */
  model?: string;
  /** 是否使用流式响应 */
  stream?: boolean;
  /** 流式响应回调 */
  onStream?: StreamCallback;
  /** 温度参数 (0-1) */
  temperature?: number;
}

/**
 * AI 聊天执行器
 *
 * @param context - Skill 执行上下文
 * @returns 执行结果
 */
export async function execute(
  context: SkillContext
): Promise<SkillResult<AIChatResult>> {
  const startTime = Date.now();

  try {
    const { query, document, history, params } = context;

    // 解析选项
    const options: AIChatOptions = {
      provider: params?.provider,
      model: params?.model,
      stream: params?.stream ?? false,
      onStream: params?.onStream,
      temperature: params?.temperature ?? 0.7,
    };

    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(document);

    // 构建对话历史
    const messages = buildMessages(history, query, systemPrompt);

    // 调用 AI 服务
    const result = await callAIService(messages, options);

    const duration = Date.now() - startTime;

    return {
      success: true,
      data: result,
      duration,
      metadata: {
        model: result.model,
        provider: result.provider,
        tokensUsed: result.tokensUsed,
        stream: options.stream,
      },
    };
  } catch (error) {
    console.error('AI Chat execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI Chat failed',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(document?: SkillContext['document']): string {
  let prompt =
    '你是 DocuFusion 的智能助手，擅长文档处理、数据分析和知识问答。\n' +
    '请用简洁清晰的语言回答用户问题，必要时使用 Markdown 格式。';

  if (document) {
    prompt += `\n\n【当前文档上下文】\n`;
    prompt += `- 标题: ${document.title}\n`;
    prompt += `- 类型: ${document.type}\n`;

    if (document.metadata?.tags?.length) {
      prompt += `- 标签: ${document.metadata.tags.join(', ')}\n`;
    }

    // 添加文档内容摘要（限制长度）
    if (document.content) {
      const contentPreview = document.content.slice(0, 2000);
      prompt += `\n文档内容预览:\n${contentPreview}`;
      if (document.content.length > 2000) {
        prompt += '\n...(内容过长，已截断)';
      }
    }
  }

  return prompt;
}

/**
 * 构建对话消息列表
 */
function buildMessages(
  history: SkillContext['history'],
  currentQuery: string,
  systemPrompt: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [{ role: 'system', content: systemPrompt }];

  // 添加历史对话（最多保留最近10轮）
  if (history && history.length > 0) {
    const recentHistory = history.slice(-20); // 最多10轮对话（每轮2条消息）
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
  }

  // 添加当前查询
  messages.push({ role: 'user', content: currentQuery });

  return messages;
}

/**
 * 调用 AI 服务
 */
async function callAIService(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: AIChatOptions
): Promise<AIChatResult> {
  const baseUrl =
    typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_BASE_URL || '';

  const requestBody = {
    query: messages[messages.length - 1]?.content || '',
    history: messages.slice(1, -1), // 排除系统消息和当前查询
    stream: options.stream,
    provider: options.provider,
    model: options.model,
  };

  const response = await fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `AI service returned ${response.status}`
    );
  }

  // 处理流式响应
  if (options.stream && response.body) {
    return handleStreamResponse(response, options);
  }

  // 处理完整响应
  const data = await response.json();
  return {
    content: data.data?.content || data.content || '',
    provider: data.data?.provider || options.provider || 'unknown',
    model: data.data?.model || options.model || 'unknown',
    tokensUsed: data.data?.usage?.totalTokens,
  };
}

/**
 * 处理流式响应
 */
async function handleStreamResponse(
  response: Response,
  options: AIChatOptions
): Promise<AIChatResult> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let reasoningContent = '';
  let provider = options.provider || 'unknown';
  let model = options.model || 'unknown';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.content) {
              fullContent += parsed.content;

              // 调用流式回调
              if (options.onStream) {
                options.onStream({
                  content: parsed.content,
                  done: parsed.done || false,
                  reasoning: parsed.reasoning,
                });
              }
            }

            if (parsed.reasoning) {
              reasoningContent += parsed.reasoning;
            }

            if (parsed.provider) provider = parsed.provider;
            if (parsed.model) model = parsed.model;
          } catch {
            // 忽略解析错误的行
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const result: AIChatResult = {
    content: fullContent,
    provider,
    model,
  };

  if (reasoningContent) {
    result.reasoningContent = reasoningContent;
  }

  return result;
}

/**
 * 支持流式响应的便捷方法
 */
export async function executeStream(
  context: SkillContext,
  onChunk: StreamCallback
): Promise<SkillResult<AIChatResult>> {
  return execute({
    ...context,
    params: {
      ...context.params,
      stream: true,
      onStream: onChunk,
    },
  });
}

export default execute;
