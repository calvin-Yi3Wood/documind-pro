/**
 * File Services
 *
 * 文件导入导出服务统一入口
 */

// 解析服务
export {
  parseFile,
  parseFiles,
  parseDocx,
  parsePdf,
  parseXlsx,
  parseTxt,
  parseMarkdown,
  detectFileType,
  isFileSupported,
  getSupportedExtensions,
  formatFileSize,
  SUPPORTED_FILE_TYPES,
  type ParseResult,
} from './parser';

// 导出服务
export {
  exportFile,
  exportAsHTML,
  exportAsMarkdown,
  exportAsDoc,
  exportAsPdf,
  exportAsXlsx,
  exportAsTxt,
  downloadFile,
  EXPORT_FORMATS,
  type ExportFormat,
} from './exporter';
