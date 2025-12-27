/**
 * File Exporter Service
 *
 * 文件导出服务 - 支持多种格式
 * - HTML: 原生导出
 * - Markdown: HTML 转换
 * - Word (DOCX): 使用简单 HTML 封装
 * - PDF: 使用浏览器打印
 * - Excel (XLSX): 使用 SheetJS
 */

import * as XLSX from 'xlsx';

/**
 * 导出格式类型
 */
export type ExportFormat = 'html' | 'markdown' | 'docx' | 'pdf' | 'xlsx' | 'txt';

/**
 * 导出格式配置
 */
export const EXPORT_FORMATS: Record<
  ExportFormat,
  {
    extension: string;
    mimeType: string;
    description: string;
    icon: string;
    iconColor: string;
  }
> = {
  html: {
    extension: '.html',
    mimeType: 'text/html',
    description: 'HTML 网页',
    icon: 'fa-file-code',
    iconColor: 'text-orange-500',
  },
  markdown: {
    extension: '.md',
    mimeType: 'text/markdown',
    description: 'Markdown 文档',
    icon: 'fa-file-alt',
    iconColor: 'text-purple-500',
  },
  docx: {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Word 文档',
    icon: 'fa-file-word',
    iconColor: 'text-blue-600',
  },
  pdf: {
    extension: '.pdf',
    mimeType: 'application/pdf',
    description: 'PDF 文档',
    icon: 'fa-file-pdf',
    iconColor: 'text-red-600',
  },
  xlsx: {
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'Excel 表格',
    icon: 'fa-file-excel',
    iconColor: 'text-green-600',
  },
  txt: {
    extension: '.txt',
    mimeType: 'text/plain',
    description: '纯文本',
    icon: 'fa-file-alt',
    iconColor: 'text-gray-500',
  },
};

/**
 * 下载文件
 */
export function downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
  const blobOptions: BlobPropertyBag = mimeType ? { type: mimeType } : {};
  const blob = content instanceof Blob ? content : new Blob([content], blobOptions);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 清理文件名 (移除非法字符)
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

/**
 * HTML 模板生成
 */
function generateHtmlDocument(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 2em; }
    h3 { color: #666; }
    p { margin: 1em 0; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; }
    img { max-width: 100%; height: auto; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${content}
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #999; font-size: 12px;">
    导出于 ${new Date().toLocaleString('zh-CN')} | DocuFusion
  </footer>
</body>
</html>`;
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
 * HTML 转纯文本
 */
function htmlToPlainText(html: string): string {
  // 创建临时 DOM 元素
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // 处理换行元素
  const blocks = temp.querySelectorAll('p, div, br, h1, h2, h3, h4, h5, h6, li');
  blocks.forEach((el) => {
    el.insertAdjacentText('afterend', '\n');
  });

  return temp.textContent || temp.innerText || '';
}

/**
 * HTML 转 Markdown
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  // 标题
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // 粗体和斜体
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // 代码
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n');

  // 链接
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // 图片
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // 列表
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>|<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>|<\/ol>/gi, '\n');

  // 引用
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n');
  });

  // 段落和换行
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');

  // 移除剩余 HTML 标签
  md = md.replace(/<[^>]+>/g, '');

  // 解码 HTML 实体
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#039;/g, "'");

  // 清理多余空行
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/**
 * 导出为 HTML
 */
export function exportAsHTML(title: string, content: string): void {
  const filename = sanitizeFilename(title) + '.html';
  const html = generateHtmlDocument(title, content);
  downloadFile(html, filename, EXPORT_FORMATS.html.mimeType);
}

/**
 * 导出为 Markdown
 */
export function exportAsMarkdown(title: string, content: string): void {
  const filename = sanitizeFilename(title) + '.md';
  const markdown = `# ${title}\n\n${htmlToMarkdown(content)}`;
  downloadFile(markdown, filename, EXPORT_FORMATS.markdown.mimeType);
}

/**
 * 导出为纯文本
 */
export function exportAsTxt(title: string, content: string): void {
  const filename = sanitizeFilename(title) + '.txt';
  const text = `${title}\n${'='.repeat(title.length)}\n\n${htmlToPlainText(content)}`;
  downloadFile(text, filename, EXPORT_FORMATS.txt.mimeType);
}

/**
 * 导出为 Word 文档 (DOCX)
 * 使用 HTML 封装方式创建 DOCX
 */
export function exportAsDoc(title: string, content: string): void {
  const filename = sanitizeFilename(title) + '.docx';

  // 创建 Word 兼容的 HTML
  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Microsoft YaHei', SimSun, serif; font-size: 12pt; }
        h1 { font-size: 22pt; font-weight: bold; }
        h2 { font-size: 16pt; font-weight: bold; }
        h3 { font-size: 14pt; font-weight: bold; }
        p { margin: 0 0 8pt 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 4pt 8pt; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${content}
    </body>
    </html>
  `;

  // 创建 Blob (使用 Word 兼容的 MIME 类型)
  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword',
  });

  downloadFile(blob, filename);
}

/**
 * 导出为 PDF (使用浏览器打印)
 */
export function exportAsPdf(title: string, content: string): void {
  // 创建打印窗口
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('无法打开打印窗口，请允许弹出窗口');
    return;
  }

  // 写入内容
  const html = generateHtmlDocument(title, content);
  printWindow.document.write(html);
  printWindow.document.close();

  // 等待内容加载后打印
  printWindow.onload = () => {
    printWindow.print();
    // 打印后可选择关闭窗口
    // printWindow.close();
  };
}

/**
 * 导出为 Excel (XLSX)
 */
export function exportAsXlsx(title: string, content: string): void {
  const filename = sanitizeFilename(title) + '.xlsx';

  // 创建临时 DOM 解析 HTML 表格
  const temp = document.createElement('div');
  temp.innerHTML = content;

  // 查找所有表格
  const tables = temp.querySelectorAll('table');

  if (tables.length === 0) {
    // 如果没有表格，将内容作为单列数据
    const text = htmlToPlainText(content);
    const lines = text.split('\n').filter((line) => line.trim());

    const ws = XLSX.utils.aoa_to_sheet(lines.map((line) => [line]));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '内容');

    const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxData], { type: EXPORT_FORMATS.xlsx.mimeType });
    downloadFile(blob, filename);
    return;
  }

  // 将 HTML 表格转换为 Excel
  const wb = XLSX.utils.book_new();

  tables.forEach((table, index) => {
    const ws = XLSX.utils.table_to_sheet(table);
    const sheetName = `表格${index + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxData], { type: EXPORT_FORMATS.xlsx.mimeType });
  downloadFile(blob, filename);
}

/**
 * 通用导出接口
 */
export function exportFile(
  format: ExportFormat,
  title: string,
  content: string
): void {
  switch (format) {
    case 'html':
      exportAsHTML(title, content);
      break;
    case 'markdown':
      exportAsMarkdown(title, content);
      break;
    case 'docx':
      exportAsDoc(title, content);
      break;
    case 'pdf':
      exportAsPdf(title, content);
      break;
    case 'xlsx':
      exportAsXlsx(title, content);
      break;
    case 'txt':
      exportAsTxt(title, content);
      break;
    default:
      throw new Error(`不支持的导出格式: ${format}`);
  }
}

export default exportFile;
