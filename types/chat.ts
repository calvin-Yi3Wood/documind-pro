/**
 * DocuMind Pro - 聊天消息类型定义
 * 
 * 支持 AI 对话和协作聊天
 */

import type { UserProfile } from './user';
import type { SkillResult } from './skill';

/**
 * 消息发送者类型
 */
export type MessageSender = 
  | 'user'          // 用户
  | 'assistant'     // AI 助手
  | 'system';       // 系统消息

/**
 * 消息类型
 */
export type MessageType = 
  | 'text'          // 文本消息
  | 'image'         // 图片消息
  | 'code'          // 代码块
  | 'skill-result'  // Skill 执行结果
  | 'error';        // 错误消息

/**
 * 消息状态
 */
export type MessageStatus = 
  | 'sending'       // 发送中
  | 'sent'          // 已发送
  | 'streaming'     // 流式接收中
  | 'completed'     // 完成
  | 'failed'        // 失败
  | 'cancelled';    // 已取消

/**
 * 消息附件
 */
export interface MessageAttachment {
  /** 附件类型 */
  type: 'image' | 'file';
  /** 文件名 */
  filename: string;
  /** URL */
  url: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  /** 消息 ID */
  id: string;
  /** 发送者类型 */
  sender: MessageSender;
  /** 发送者信息（用户消息时） */
  user?: UserProfile;
  /** 消息类型 */
  type: MessageType;
  /** 消息内容 */
  content: string;
  /** 消息状态 */
  status: MessageStatus;
  /** 附件 */
  attachments?: MessageAttachment[];
  /** Skill 执行结果（如果是 Skill 消息） */
  skillResult?: SkillResult;
  /** 使用的 AI 模型 */
  model?: 'gemini' | 'deepseek';
  /** 消耗的配额 */
  quotaUsed?: number;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间（流式消息会更新） */
  updatedAt?: Date;
}

/**
 * 对话会话
 */
export interface ChatSession {
  /** 会话 ID */
  id: string;
  /** 会话标题 */
  title: string;
  /** 消息列表 */
  messages: ChatMessage[];
  /** 关联的文档 ID */
  documentId?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后活跃时间 */
  lastActiveAt: Date;
}

/**
 * 对话上下文
 */
export interface ChatContext {
  /** 当前会话 */
  session: ChatSession;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大令牌数 */
  maxTokens?: number;
  /** 是否启用流式响应 */
  stream?: boolean;
}

/**
 * AI 聊天请求
 */
export interface ChatRequest {
  /** 用户消息 */
  message: string;
  /** 会话 ID */
  sessionId?: string;
  /** 关联文档 ID */
  documentId?: string;
  /** 附件 */
  attachments?: MessageAttachment[];
  /** 是否使用 Skill */
  useSkills?: boolean;
  /** 指定使用的 Skill */
  skillName?: string;
  /** AI 模型 */
  model?: 'gemini' | 'deepseek';
  /** 是否流式响应 */
  stream?: boolean;
}

/**
 * AI 聊天响应
 */
export interface ChatResponse {
  /** 消息 ID */
  messageId: string;
  /** 响应内容 */
  content: string;
  /** 是否完成 */
  done: boolean;
  /** 使用的 Skill */
  usedSkill?: string;
  /** Skill 执行结果 */
  skillResult?: SkillResult;
  /** 消耗的配额 */
  quotaUsed: number;
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  /** 增量内容 */
  delta: string;
  /** 是否完成 */
  done: boolean;
  /** 元数据 */
  metadata?: {
    skill?: string;
    quotaUsed?: number;
  };
}

/**
 * AI 上下文项目来源
 */
export type AIContextSource = 'selection' | 'file' | 'manual' | 'document';

/**
 * AI 上下文项目
 *
 * 用户可以将选中的文本、文件内容等添加到上下文中
 * AI 会基于这些上下文给出更精准的回答
 */
export interface AIContextItem {
  /** 唯一标识 */
  id: string;
  /** 上下文文本内容 */
  text: string;
  /** 添加时间 */
  addedAt: Date;
  /** 是否已被 AI 使用 */
  used: boolean;
  /** 来源类型 */
  source: AIContextSource;
  /** 来源标签（如文件名、文档标题等） */
  sourceLabel?: string;
  /** 关联的文档 ID */
  documentId?: string;
}
