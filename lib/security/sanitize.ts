/**
 * XSS 防护 - HTML内容净化
 *
 * 使用 DOMPurify 净化用户输入的HTML内容
 */

import DOMPurify from 'isomorphic-dompurify';

// 默认配置 - 允许基本富文本元素
const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // 文本格式
    'p', 'br', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // 列表
    'ul', 'ol', 'li',
    // 链接和图片
    'a', 'img',
    // 表格
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // 代码
    'pre', 'code', 'blockquote',
    // 其他
    'hr', 'sub', 'sup',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'width', 'height',
    'colspan', 'rowspan', 'style',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

// 严格配置 - 只允许纯文本
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'span', 'strong', 'em'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
};

// 富文本配置 - 允许更多格式
const RICH_TEXT_CONFIG: DOMPurify.Config = {
  ...DEFAULT_CONFIG,
  ALLOWED_TAGS: [
    ...DEFAULT_CONFIG.ALLOWED_TAGS as string[],
    'figure', 'figcaption', 'video', 'audio', 'source',
  ],
  ALLOWED_ATTR: [
    ...DEFAULT_CONFIG.ALLOWED_ATTR as string[],
    'controls', 'autoplay', 'loop', 'muted', 'poster',
  ],
};

/**
 * 净化 HTML 内容
 * @param dirty 原始HTML内容
 * @param mode 净化模式: 'default' | 'strict' | 'rich'
 * @returns 净化后的安全HTML
 */
export function sanitizeHtml(
  dirty: string,
  mode: 'default' | 'strict' | 'rich' = 'default'
): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const configs: Record<'default' | 'strict' | 'rich', DOMPurify.Config> = {
    default: DEFAULT_CONFIG,
    strict: STRICT_CONFIG,
    rich: RICH_TEXT_CONFIG,
  };

  return DOMPurify.sanitize(dirty, configs[mode] as Parameters<typeof DOMPurify.sanitize>[1]);
}

/**
 * 净化纯文本（移除所有HTML标签）
 * @param dirty 原始内容
 * @returns 纯文本内容
 */
export function sanitizeText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * 检查内容是否包含潜在危险代码
 * @param content 要检查的内容
 * @returns 是否安全
 */
export function isContentSafe(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return true;
  }

  // 检查危险模式
  const dangerousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror 等事件处理器
    /data:\s*text\/html/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
}

/**
 * 转义HTML特殊字符（用于在HTML属性中显示文本）
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char] ?? char);
}

/**
 * 安全地设置innerHTML（React替代方案）
 * @param html 原始HTML
 * @param mode 净化模式
 * @returns React dangerouslySetInnerHTML对象
 */
export function createSafeHtml(
  html: string,
  mode: 'default' | 'strict' | 'rich' = 'default'
) {
  return {
    __html: sanitizeHtml(html, mode),
  };
}

export default {
  sanitizeHtml,
  sanitizeText,
  isContentSafe,
  escapeHtml,
  createSafeHtml,
};
