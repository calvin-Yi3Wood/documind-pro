/**
 * AI Chat Skill Executor
 *
 * 实现智能对话功能
 */

import type { SkillContext, SkillResult } from '@/types';

/**
 * AI 聊天执行器
 *
 * @param context - Skill 执行上下文
 * @returns 执行结果
 */
export async function execute(context: SkillContext): Promise<SkillResult<string>> {
  try {
    const { query, document, history } = context;

    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(document);

    // 构建对话历史
    const messages = buildMessages(history, query, systemPrompt);

    // 调用 AI API (这里使用占位符，实际应该调用 Gemini API)
    const response = await callAIService(messages);

    return {
      success: true,
      data: response,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        tokensUsed: estimateTokens(query + response),
      },
    };
  } catch (error) {
    console.error('AI Chat execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(document?: SkillContext['document']): string {
  let prompt = '你是 DocuFusion 的智能助手，擅长文档处理、数据分析和知识问答。';

  if (document) {
    prompt += `\n\n当前文档信息：\n`;
    prompt += `- 标题: ${document.title}\n`;
    prompt += `- 类型: ${document.type}\n`;
    if (document.metadata?.tags?.length) {
      prompt += `- 标签: ${document.metadata.tags.join(', ')}\n`;
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
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

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
 * 调用 AI 服务（占位符实现）
 *
 * 实际项目中应该调用 /api/ai/chat 端点
 */
async function callAIService(messages: Array<{ role: string; content: string }>): Promise<string> {
  // TODO: 实际实现应该调用后端 API
  // const response = await fetch('/api/ai/chat', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ messages }),
  // });
  // return await response.json();

  // 占位符响应
  const lastMessage = messages[messages.length - 1];
  const userQuery = lastMessage?.content || '未知问题';
  return `这是 AI 助手的回复（占位符）。收到您的问题："${userQuery}"`;
}

/**
 * 估算 token 数量（简单估算）
 */
function estimateTokens(text: string): number {
  // 简单估算：中文约 1.5 字符/token，英文约 4 字符/token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishChars = text.length - chineseChars;

  return Math.ceil(chineseChars / 1.5 + englishChars / 4);
}

export default execute;
