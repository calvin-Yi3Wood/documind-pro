/**
 * AI Edit Utilities
 *
 * AI 编辑差异对比系统
 * - 清理 AI 输出内容
 * - 解析多方案建议
 * - 生成差异对比 HTML
 * - 选区定位恢复
 */

/**
 * 保存的选区信息
 */
export interface SavedSelection {
  /** 选中的文本 */
  text: string;
  /** 选区前的上下文 (用于定位) */
  contextBefore: string;
  /** 选区后的上下文 (用于定位) */
  contextAfter: string;
  /** 原始 Range 对象 (可能失效) */
  range?: Range;
}

/**
 * 差异对比容器配置
 */
export interface DiffContainerConfig {
  /** 容器唯一 ID */
  diffId: string;
  /** 原始文本 */
  originalText: string;
  /** AI 建议列表 */
  suggestions: string[];
  /** 是否显示接受/拒绝按钮 */
  showActions?: boolean;
}

// ============================================
// 内容清理函数
// ============================================

/**
 * 清理 AI 输出内容
 *
 * @param text - AI 原始输出
 * @returns 清理后的文本
 */
export function cleanAIContent(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. 移除 COT 思考过程标记 (<thinking>...</thinking>)
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<思考>[\s\S]*?<\/思考>/gi, '');
  cleaned = cleaned.replace(/\[思考过程\][\s\S]*?\[\/思考过程\]/gi, '');

  // 2. 移除解释性语句 (常见模式)
  const explanatoryPatterns = [
    /^(好的|当然|没问题|以下是|这是|我来|让我)[，,。.：:].*/gm,
    /^(根据您的要求|按照您的需求|如您所愿)[，,。.：:].*/gm,
    /^(修改后的|优化后的|润色后的)(内容|文本|版本)[：:]/gm,
    /^(希望|如果|请|注意)[这这有您].*/gm,
    /^---+$/gm, // 分隔线
  ];

  for (const pattern of explanatoryPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 3. 移除多余空行 (保留最多一个空行)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 4. 去除首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 解析多方案建议
 *
 * 支持格式:
 * - 方案一：...
 * - 方案二：...
 * - 【方案1】...
 * - 1. ...
 * - Option 1: ...
 *
 * @param content - AI 输出内容
 * @returns 清洗后的建议数组
 */
export function parseMultipleSuggestions(content: string): string[] {
  if (!content) return [];

  // 先清理内容
  const cleaned = cleanAIContent(content);

  // 尝试多种分割模式
  const splitPatterns = [
    // 中文方案格式
    /(?:^|\n)(?:方案|版本|选项)[一二三四五六七八九十\d]+[：:]/,
    // 中文括号格式
    /(?:^|\n)【(?:方案|版本)\d+】/,
    // 数字列表格式
    /(?:^|\n)\d+[.、）)]\s*/,
    // 英文格式
    /(?:^|\n)(?:Option|Version|Suggestion)\s*\d+[：:]/i,
  ];

  for (const pattern of splitPatterns) {
    const parts = cleaned.split(pattern).filter((p) => p.trim());
    if (parts.length > 1) {
      return parts.map((p) => cleanAIContent(p));
    }
  }

  // 如果没有匹配到多方案，返回整个内容作为单一建议
  return [cleaned];
}

// ============================================
// 差异对比 HTML 生成
// ============================================

/**
 * 生成差异对比 HTML 容器
 *
 * @param config - 差异配置
 * @returns HTML 字符串
 */
export function buildDiffContainer(config: DiffContainerConfig): string {
  const { diffId, originalText, suggestions, showActions = true } = config;

  if (suggestions.length === 0) {
    return '';
  }

  // 转义 HTML 特殊字符
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  };

  // 生成单个建议的 HTML
  const buildSuggestionHtml = (suggestion: string, index: number): string => {
    const suggestionId = `${diffId}-suggestion-${index}`;
    const isMultiple = suggestions.length > 1;
    const label = isMultiple ? `方案 ${index + 1}` : 'AI 建议';

    return `
      <div class="ai-diff-suggestion" data-suggestion-id="${suggestionId}">
        ${isMultiple ? `<div class="ai-diff-suggestion-label">${label}</div>` : ''}
        <div class="ai-diff-new-text">${escapeHtml(suggestion)}</div>
        ${
          showActions
            ? `
          <div class="ai-diff-actions">
            <button class="ai-diff-accept" data-action="accept" data-suggestion-id="${suggestionId}" title="接受此建议">
              <i class="fas fa-check"></i> 接受
            </button>
            <button class="ai-diff-reject" data-action="reject" data-suggestion-id="${suggestionId}" title="拒绝此建议">
              <i class="fas fa-times"></i> 拒绝
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;
  };

  // 构建完整容器
  const suggestionsHtml = suggestions.map((s, i) => buildSuggestionHtml(s, i)).join('');

  return `
    <div class="ai-diff-container" data-diff-id="${diffId}" contenteditable="false">
      <div class="ai-diff-header">
        <i class="fas fa-magic"></i>
        <span>AI 编辑建议</span>
        <button class="ai-diff-close" data-action="close" title="关闭">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="ai-diff-original">
        <div class="ai-diff-label">原文</div>
        <div class="ai-diff-old-text">${escapeHtml(originalText)}</div>
      </div>
      <div class="ai-diff-suggestions">
        ${suggestionsHtml}
      </div>
    </div>
  `;
}

/**
 * 简化版差异容器 (单个建议)
 */
export function buildSimpleDiffContainer(
  originalText: string,
  newText: string,
  diffId: string
): string {
  return buildDiffContainer({
    diffId,
    originalText,
    suggestions: [newText],
    showActions: true,
  });
}

// ============================================
// 选区定位恢复系统
// ============================================

/**
 * 保存当前选区信息
 *
 * @param contextLength - 上下文长度 (默认 50 字符)
 * @returns 保存的选区信息，无选区时返回 null
 */
export function saveSelection(contextLength: number = 50): SavedSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const selectedText = range.toString();

  if (!selectedText.trim()) {
    return null;
  }

  // 获取选区前后的上下文
  const container = range.commonAncestorContainer;
  const fullText = container.textContent || '';
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  // 计算上下文
  const contextBefore = fullText.substring(Math.max(0, startOffset - contextLength), startOffset);
  const contextAfter = fullText.substring(endOffset, Math.min(fullText.length, endOffset + contextLength));

  return {
    text: selectedText,
    contextBefore,
    contextAfter,
    range: range.cloneRange(),
  };
}

/**
 * 在编辑器中查找文本并返回 Range
 *
 * 使用 TreeWalker 遍历文本节点，支持跨节点搜索
 *
 * @param editorElement - 编辑器 DOM 元素
 * @param searchText - 要查找的文本
 * @param contextBefore - 可选的前置上下文 (提高定位准确性)
 * @param contextAfter - 可选的后置上下文
 * @returns 匹配的 Range，未找到返回 null
 */
export function findTextInEditor(
  editorElement: HTMLElement,
  searchText: string,
  contextBefore?: string,
  contextAfter?: string
): Range | null {
  if (!editorElement || !searchText) {
    return null;
  }

  // 使用 TreeWalker 遍历所有文本节点
  const walker = document.createTreeWalker(editorElement, NodeFilter.SHOW_TEXT, null);

  // 收集所有文本节点及其内容
  const textNodes: { node: Text; text: string; start: number }[] = [];
  let fullText = '';
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push({
      node,
      text: node.textContent || '',
      start: fullText.length,
    });
    fullText += node.textContent || '';
  }

  // 构建搜索模式 (包含上下文)
  let searchPattern = searchText;
  if (contextBefore) {
    searchPattern = contextBefore + searchPattern;
  }
  if (contextAfter) {
    searchPattern = searchPattern + contextAfter;
  }

  // 在全文中查找
  let matchIndex = fullText.indexOf(searchPattern);

  if (matchIndex === -1) {
    // 尝试不带上下文搜索
    matchIndex = fullText.indexOf(searchText);
    if (matchIndex === -1) {
      return null;
    }
  } else if (contextBefore) {
    // 调整到实际文本开始位置
    matchIndex += contextBefore.length;
  }

  const matchEnd = matchIndex + searchText.length;

  // 找到包含开始和结束位置的文本节点
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;

  for (const { node: textNode, text, start } of textNodes) {
    const nodeEnd = start + text.length;

    // 找开始节点
    if (!startNode && matchIndex >= start && matchIndex < nodeEnd) {
      startNode = textNode;
      startOffset = matchIndex - start;
    }

    // 找结束节点
    if (!endNode && matchEnd > start && matchEnd <= nodeEnd) {
      endNode = textNode;
      endOffset = matchEnd - start;
    }

    if (startNode && endNode) break;
  }

  if (!startNode || !endNode) {
    return null;
  }

  // 创建 Range
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  return range;
}

/**
 * 恢复选区
 *
 * @param savedSelection - 之前保存的选区信息
 * @param editorElement - 编辑器 DOM 元素
 * @returns 是否成功恢复
 */
export function restoreSelection(
  savedSelection: SavedSelection,
  editorElement: HTMLElement
): boolean {
  if (!savedSelection || !editorElement) {
    return false;
  }

  // 尝试使用上下文查找
  const range = findTextInEditor(
    editorElement,
    savedSelection.text,
    savedSelection.contextBefore,
    savedSelection.contextAfter
  );

  if (!range) {
    return false;
  }

  // 设置选区
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  return false;
}

/**
 * 在指定位置插入 HTML 内容
 *
 * @param range - 目标位置的 Range
 * @param html - 要插入的 HTML
 */
export function insertHtmlAtRange(range: Range, html: string): void {
  // 删除选中内容
  range.deleteContents();

  // 创建临时容器解析 HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // 插入所有子节点
  const fragment = document.createDocumentFragment();
  while (temp.firstChild) {
    fragment.appendChild(temp.firstChild);
  }

  range.insertNode(fragment);

  // 折叠选区到插入内容之后
  range.collapse(false);
}

// ============================================
// 差异容器事件处理
// ============================================

/**
 * 处理差异容器中的接受操作
 *
 * @param container - 差异容器元素
 * @param suggestionId - 建议 ID
 * @returns 接受的文本内容
 */
export function handleAcceptSuggestion(
  container: HTMLElement,
  suggestionId: string
): string | null {
  const suggestionEl = container.querySelector(`[data-suggestion-id="${suggestionId}"]`);
  if (!suggestionEl) return null;

  const newTextEl = suggestionEl.querySelector('.ai-diff-new-text');
  if (!newTextEl) return null;

  // 获取建议文本 (将 <br> 转回换行)
  const text = (newTextEl.innerHTML || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  return text;
}

/**
 * 移除差异容器
 *
 * @param diffId - 差异容器 ID
 */
export function removeDiffContainer(diffId: string): void {
  const container = document.querySelector(`[data-diff-id="${diffId}"]`);
  if (container) {
    container.remove();
  }
}

/**
 * 生成唯一的差异 ID
 */
export function generateDiffId(): string {
  return `diff-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export default {
  cleanAIContent,
  parseMultipleSuggestions,
  buildDiffContainer,
  buildSimpleDiffContainer,
  saveSelection,
  findTextInEditor,
  restoreSelection,
  insertHtmlAtRange,
  handleAcceptSuggestion,
  removeDiffContainer,
  generateDiffId,
};
