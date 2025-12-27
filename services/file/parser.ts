/**
 * File Parser Service
 *
 * 文件解析服务 - 支持多种格式
 * - DOCX: 使用 Mammoth.js
 * - PDF: 使用 PDF.js
 * - XLSX: 使用 SheetJS
 * - TXT/MD: 原生处理
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * 文件解析结果
 */
export interface ParseResult {
  /** 解析后的内容 */
  content: string;
  /** 文件类型 */
  type: string;
  /** 原始文件名 */
  filename: string;
  /** 文件大小 (字节) */
  size: number;
  /** 解析是否成功 */
  success: boolean;
  /** 错误信息 (如果失败) */
  error?: string;
}

/**
 * 支持的文件类型
 */
export const SUPPORTED_FILE_TYPES = {
  docx: {
    extensions: ['.docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    description: 'Word 文档',
    icon: 'fa-file-word',
  },
  pdf: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    description: 'PDF 文档',
    icon: 'fa-file-pdf',
  },
  xlsx: {
    extensions: ['.xlsx', '.xls'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    description: 'Excel 表格',
    icon: 'fa-file-excel',
  },
  txt: {
    extensions: ['.txt'],
    mimeTypes: ['text/plain'],
    description: '文本文件',
    icon: 'fa-file-alt',
  },
  md: {
    extensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    description: 'Markdown 文件',
    icon: 'fa-file-code',
  },
} as const;

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

/**
 * 检测文件类型
 */
export function detectFileType(file: File): keyof typeof SUPPORTED_FILE_TYPES | null {
  const ext = getFileExtension(file.name);

  for (const [type, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if ((config.extensions as readonly string[]).includes(ext)) {
      return type as keyof typeof SUPPORTED_FILE_TYPES;
    }
    if ((config.mimeTypes as readonly string[]).includes(file.type)) {
      return type as keyof typeof SUPPORTED_FILE_TYPES;
    }
  }

  return null;
}

/**
 * 检查文件是否支持
 */
export function isFileSupported(file: File): boolean {
  return detectFileType(file) !== null;
}

/**
 * 获取所有支持的扩展名 (用于 input accept)
 */
export function getSupportedExtensions(): string {
  const extensions: string[] = [];
  for (const config of Object.values(SUPPORTED_FILE_TYPES)) {
    extensions.push(...config.extensions);
  }
  return extensions.join(',');
}

/**
 * 解析 DOCX 文件
 */
export async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    // 提取纯文本或返回 HTML
    // mammoth 返回的 HTML 是干净的，可以直接使用
    return result.value;
  } catch (error) {
    console.error('DOCX 解析错误:', error);
    throw new Error(`无法解析 DOCX 文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析 PDF 文件
 * 使用 pdfjs-dist 库
 */
export async function parsePdf(file: File): Promise<string> {
  try {
    // 动态导入 pdfjs-dist (避免 SSR 问题)
    const pdfjsLib = await import('pdfjs-dist');

    // 设置 worker (使用 CDN)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];

    // 遍历所有页面提取文本
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');

      textParts.push(`<!-- 第 ${i} 页 -->\n${pageText}`);
    }

    return textParts.join('\n\n');
  } catch (error) {
    console.error('PDF 解析错误:', error);
    throw new Error(`无法解析 PDF 文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析 Excel 文件
 */
export async function parseXlsx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const htmlParts: string[] = [];

    // 遍历所有工作表
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // 转换为 HTML 表格
      const html = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${sheetName}` });

      htmlParts.push(`<h3>${sheetName}</h3>\n${html}`);
    }

    return htmlParts.join('\n\n');
  } catch (error) {
    console.error('Excel 解析错误:', error);
    throw new Error(`无法解析 Excel 文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析文本文件
 */
export async function parseTxt(file: File): Promise<string> {
  try {
    const text = await file.text();
    // 将纯文本转换为 HTML (保留换行)
    return text
      .split('\n')
      .map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
      .join('\n');
  } catch (error) {
    console.error('文本文件解析错误:', error);
    throw new Error(`无法解析文本文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 解析 Markdown 文件
 */
export async function parseMarkdown(file: File): Promise<string> {
  try {
    const text = await file.text();
    // 简单的 Markdown 到 HTML 转换
    return convertMarkdownToHtml(text);
  } catch (error) {
    console.error('Markdown 解析错误:', error);
    throw new Error(`无法解析 Markdown 文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * 简单的 Markdown 转 HTML
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // 代码
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // 链接
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // 列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

  // 段落 (简单处理)
  html = html
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('<h') || block.startsWith('<li')) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * 通用文件解析入口
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = detectFileType(file);

  if (!fileType) {
    return {
      content: '',
      type: 'unknown',
      filename: file.name,
      size: file.size,
      success: false,
      error: `不支持的文件类型: ${file.name}`,
    };
  }

  try {
    let content: string;

    switch (fileType) {
      case 'docx':
        content = await parseDocx(file);
        break;
      case 'pdf':
        content = await parsePdf(file);
        break;
      case 'xlsx':
        content = await parseXlsx(file);
        break;
      case 'txt':
        content = await parseTxt(file);
        break;
      case 'md':
        content = await parseMarkdown(file);
        break;
      default:
        throw new Error(`未实现的文件类型解析: ${fileType}`);
    }

    return {
      content,
      type: fileType,
      filename: file.name,
      size: file.size,
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      type: fileType,
      filename: file.name,
      size: file.size,
      success: false,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

/**
 * 批量解析文件
 */
export async function parseFiles(files: File[]): Promise<ParseResult[]> {
  return Promise.all(files.map(parseFile));
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default parseFile;
